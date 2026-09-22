import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { decryptPayload, renderEmail } from "@/server/email";

// One claim per worker, same shape as Saturday Block's queue: SKIP LOCKED so two drains
// cannot take the same letter, a claim token so a slow worker cannot overwrite a newer claim,
// and a 15-minute stale window so a crashed process does not hold a letter forever.
// A letter that was accepted by SMTP and then lost before the row was marked SENT can be
// sent once more after that window. Three attempts, then FAILED.
const EMAIL_QUEUE_BATCH = 50;
const EMAIL_QUEUE_CHUNK = 20;
export const EMAIL_QUEUE_STALE_MS = 15 * 60 * 1000;
const EMAIL_QUEUE_ATTEMPTS = 3;
const EMAIL_QUEUE_BACKOFF_MS = [60_000, 5 * 60_000] as const;

export type OutboundMail = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
};

export type MailSender = (message: OutboundMail) => Promise<void>;

export type QueuePass = {
  readonly claimed: number;
  readonly sent: number;
  readonly failed: number;
  readonly skipped: boolean;
};

type QueueOptions = {
  readonly send?: MailSender;
  readonly eventKeyPrefix?: string;
  readonly force?: boolean;
};

type ClaimedRow = {
  readonly id: string;
  readonly to: string;
  readonly locale: string;
  readonly kind: string;
  readonly encryptedPayload: string | null;
  readonly attempts: number;
  readonly claimToken: string;
};

let transport: Transporter | undefined;

function smtpTransport(): Transporter {
  const smtp = getServerConfig().smtp;
  if (!smtp) throw new Error("SMTP_NOT_CONFIGURED");
  transport ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10_000,
    tls: { servername: smtp.host },
  });
  return transport;
}

function mailbox(value: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

function fromField(): { readonly from: string; readonly replyTo?: string } {
  const smtp = getServerConfig().smtp;
  if (!smtp) throw new Error("SMTP_NOT_CONFIGURED");
  const name = "비트코인 센터 서울";
  const authUser = smtp.user.trim();
  const preferred = smtp.from.trim();
  // Gmail only lets the authenticated mailbox appear in From. A relay login such as
  // "resend" is not a mailbox, so the visible sender stays SMTP_FROM.
  if (mailbox(authUser) && preferred && authUser.toLowerCase() !== preferred.toLowerCase()) {
    return { from: `${name} <${authUser}>`, replyTo: preferred };
  }
  return { from: `${name} <${preferred || authUser}>` };
}

async function sendWithSmtp(message: OutboundMail): Promise<void> {
  const sender = fromField();
  await smtpTransport().sendMail({
    from: sender.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
}

function publicError(reason: unknown): string {
  const raw = reason instanceof Error ? reason.message : "SEND_FAILED";
  return raw.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/[\r\n]+/g, " ").slice(0, 240);
}

function claimedRows(value: unknown): ClaimedRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): ClaimedRow[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const attempts = typeof item.attempts === "number" ? item.attempts : typeof item.attempts === "bigint" ? Number(item.attempts) : Number.NaN;
    if (typeof item.id !== "string" || typeof item.to !== "string" || typeof item.kind !== "string" || !Number.isInteger(attempts)) return [];
    if (typeof item.claimToken !== "string" || !item.claimToken) return [];
    return [{
      id: item.id,
      to: item.to,
      locale: typeof item.locale === "string" ? item.locale : "ko",
      kind: item.kind,
      encryptedPayload: typeof item.encryptedPayload === "string" ? item.encryptedPayload : null,
      attempts,
      claimToken: item.claimToken,
    }];
  });
}

function outbound(row: ClaimedRow): OutboundMail {
  const recipient = decryptPayload(row.to).v?.trim() ?? "";
  if (!recipient) throw new Error("RECIPIENT_MISSING");
  const payload = row.encryptedPayload ? decryptPayload(row.encryptedPayload) : {};
  const rendered = renderEmail(row.kind, row.locale, payload);
  if (!rendered.subject) throw new Error("LETTER_EMPTY");
  return { to: recipient, subject: rendered.subject, text: rendered.text, html: rendered.html };
}

export async function processEmailQueue(options?: QueueOptions): Promise<QueuePass> {
  const config = getServerConfig();
  const forced = options?.force === true;
  if (forced && !options?.send) throw new Error("EMAIL_QUEUE_FORCE_REQUIRES_SEND");
  if (!forced && (config.emailMode !== "smtp" || !config.smtp)) {
    return { claimed: 0, sent: 0, failed: 0, skipped: true };
  }
  const send = options?.send ?? sendWithSmtp;
  const claimToken = randomUUID();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - EMAIL_QUEUE_STALE_MS);
  const pattern = options?.eventKeyPrefix ? `${options.eventKeyPrefix}%` : null;
  const claimed = claimedRows(await prisma.$queryRaw`
    WITH ready AS (
      SELECT id FROM "EmailOutbox"
      WHERE (
          (status = 'PENDING'::"EmailStatus" AND "nextAttemptAt" <= ${now})
          OR (
            status = 'PROCESSING'::"EmailStatus"
            AND ("claimedAt" IS NULL OR "claimedAt" < ${staleBefore})
          )
        )
        AND attempts < ${EMAIL_QUEUE_ATTEMPTS}
        AND (${pattern}::text IS NULL OR "eventKey" LIKE ${pattern})
      ORDER BY "createdAt" ASC
      LIMIT ${EMAIL_QUEUE_BATCH}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "EmailOutbox" AS mailbox
    SET status = 'PROCESSING'::"EmailStatus",
        "claimedAt" = ${now},
        "claimToken" = ${claimToken},
        "updatedAt" = ${now}
    WHERE mailbox.id IN (SELECT id FROM ready)
    RETURNING mailbox.id, mailbox."to", mailbox.locale, mailbox.kind,
      mailbox."encryptedPayload", mailbox.attempts, mailbox."claimToken"
  `);
  if (claimed.length === 0) return { claimed: 0, sent: 0, failed: 0, skipped: false };

  let sent = 0;
  let failed = 0;
  for (let index = 0; index < claimed.length; index += EMAIL_QUEUE_CHUNK) {
    const chunk = claimed.slice(index, index + EMAIL_QUEUE_CHUNK);
    const results = await Promise.allSettled(chunk.map(async (row) => {
      await send(outbound(row));
      return row;
    }));
    await Promise.all(chunk.map(async (row, resultIndex) => {
      const settled = results[resultIndex];
      if (!settled) return;
      if (settled.status === "fulfilled") {
        const updated = await prisma.emailOutbox.updateMany({
          where: { id: row.id, status: "PROCESSING", claimToken: row.claimToken },
          data: { status: "SENT", sentAt: new Date(), claimedAt: null, claimToken: null, lastError: null },
        });
        if (updated.count === 1) sent += 1;
        return;
      }
      const terminal = row.attempts >= EMAIL_QUEUE_ATTEMPTS - 1;
      const attempts = row.attempts + 1;
      const delay = EMAIL_QUEUE_BACKOFF_MS[Math.min(attempts - 1, EMAIL_QUEUE_BACKOFF_MS.length - 1)] ?? EMAIL_QUEUE_BACKOFF_MS[0];
      const updated = await prisma.emailOutbox.updateMany({
        where: { id: row.id, status: "PROCESSING", claimToken: row.claimToken },
        data: {
          status: terminal ? "FAILED" : "PENDING",
          attempts,
          lastError: publicError(settled.reason),
          nextAttemptAt: terminal ? new Date() : new Date(Date.now() + delay),
          claimedAt: null,
          claimToken: null,
        },
      });
      if (updated.count === 1) failed += 1;
    }));
  }
  return { claimed: claimed.length, sent, failed, skipped: false };
}

let chain: Promise<void> = Promise.resolve();

export function scheduleEmailDelivery(): void {
  let mode: ReturnType<typeof getServerConfig>["emailMode"];
  try {
    mode = getServerConfig().emailMode;
  } catch {
    return;
  }
  if (mode !== "smtp") return;
  chain = chain.then(async () => {
    let again = true;
    while (again) {
      again = false;
      const result = await processEmailQueue();
      if (result.claimed >= EMAIL_QUEUE_BATCH) again = true;
    }
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? `email.queue_failed ${error.name}` : "email.queue_failed");
  });
}

export function flushEmailDelivery(): Promise<void> {
  return chain;
}

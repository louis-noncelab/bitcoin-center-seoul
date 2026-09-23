import "server-only";
import { prisma } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";
import { decryptPayload, renderEmail } from "@/server/email";
import { EMAIL_QUEUE_STALE_MS, scheduleEmailDelivery } from "@/server/email/queue";

export type EmailDeliveryStatus = "CAPTURED" | "PENDING" | "PROCESSING" | "SENT" | "FAILED";

export type EmailLetter = {
  readonly id: string;
  readonly eventKey: string;
  readonly kind: string;
  readonly orderId: string | null;
  readonly recipient: string | null;
  readonly subject: string | null;
  readonly status: EmailDeliveryStatus;
  readonly attempts: number;
  readonly stale: boolean;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly nextAttemptAt: string;
  readonly lastError: string | null;
  readonly readable: boolean;
};

export type EmailDeliveryReport = {
  readonly mode: "capture" | "smtp";
  readonly summary: string;
  readonly counts: Record<EmailDeliveryStatus, number>;
  readonly staleProcessing: number;
  readonly overduePending: number;
  readonly truncated: boolean;
  readonly letters: readonly EmailLetter[];
  readonly failures: readonly EmailLetter[];
};

function orderIdFrom(eventKey: string): string | null {
  return /^(?:order|operator):([0-9a-f-]{36})(?::|$)/i.exec(eventKey)?.[1] ?? null;
}

function letterFrom(row: {
  readonly id: string;
  readonly eventKey: string;
  readonly kind: string;
  readonly locale: string;
  readonly status: EmailDeliveryStatus;
  readonly attempts: number;
  readonly createdAt: Date;
  readonly sentAt: Date | null;
  readonly nextAttemptAt: Date;
  readonly claimedAt: Date | null;
  readonly lastError: string | null;
  readonly to: string;
  readonly encryptedPayload: string | null;
}, staleBefore: Date): EmailLetter {
  const stale = row.status === "PROCESSING" && (row.claimedAt === null || row.claimedAt < staleBefore);
  const base = {
    id: row.id,
    eventKey: row.eventKey,
    kind: row.kind,
    orderId: orderIdFrom(row.eventKey),
    status: row.status,
    attempts: row.attempts,
    stale,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    nextAttemptAt: row.nextAttemptAt.toISOString(),
    lastError: row.lastError,
  };
  try {
    const recipient = decryptPayload(row.to).v?.trim() || null;
    const payload = row.encryptedPayload ? decryptPayload(row.encryptedPayload) : {};
    const subject = payload.subject?.trim() || renderEmail(row.kind, row.locale, payload).subject;
    return { ...base, recipient, subject, readable: Boolean(recipient && subject) };
  } catch {
    return { ...base, recipient: null, subject: null, readable: false };
  }
}

function summary(mode: "capture" | "smtp", counts: Record<EmailDeliveryStatus, number>, staleProcessing: number): string {
  const waiting = counts.PENDING + counts.PROCESSING;
  if (mode === "capture") {
    const stored = counts.CAPTURED + waiting + counts.FAILED;
    if (stored === 0 && counts.SENT === 0) return "보낼 메일이 없습니다.";
    return `기록 모드입니다. 고객과 관리자에게 나가지 않은 메일이 ${stored}통입니다. 메일 서버가 접수한 메일은 ${counts.SENT}통입니다.`;
  }
  if (counts.FAILED > 0 || staleProcessing > 0) {
    return `확인이 필요합니다. 실패 ${counts.FAILED}통, 멈춘 발송 ${staleProcessing}통, 대기 ${counts.PENDING}통, 서버 접수 ${counts.SENT}통.`;
  }
  if (waiting > 0) return `아직 보내는 중입니다. 대기 ${counts.PENDING}통, 보내는 중 ${counts.PROCESSING}통, 서버 접수 ${counts.SENT}통.`;
  if (counts.CAPTURED > 0) return `메일 서버가 접수한 메일은 ${counts.SENT}통입니다. 기록만 남은 메일 ${counts.CAPTURED}통은 아직 나가지 않았습니다.`;
  return `메일 서버가 접수한 메일은 ${counts.SENT}통입니다. 실패하거나 대기 중인 메일은 없습니다.`;
}

const letterSelect = {
  id: true, eventKey: true, kind: true, locale: true, status: true, attempts: true,
  createdAt: true, sentAt: true, nextAttemptAt: true, claimedAt: true, lastError: true,
  to: true, encryptedPayload: true,
} as const;

export async function emailDeliveryReport(): Promise<EmailDeliveryReport> {
  const staleBefore = new Date(Date.now() - EMAIL_QUEUE_STALE_MS);
  const [grouped, staleProcessing, overduePending, recent, failedRows, total] = await Promise.all([
    prisma.emailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailOutbox.count({ where: { status: "PROCESSING", OR: [{ claimedAt: null }, { claimedAt: { lt: staleBefore } }] } }),
    prisma.emailOutbox.count({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } } }),
    prisma.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: letterSelect }),
    prisma.emailOutbox.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 100, select: letterSelect }),
    prisma.emailOutbox.count(),
  ]);
  const counts: Record<EmailDeliveryStatus, number> = { CAPTURED: 0, PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 };
  for (const row of grouped) counts[row.status] = row._count._all;
  const mode = getServerConfig().emailMode;
  return {
    mode,
    summary: summary(mode, counts, staleProcessing),
    counts,
    staleProcessing,
    overduePending,
    truncated: total > 100,
    letters: recent.map((row) => letterFrom(row, staleBefore)),
    failures: failedRows.map((row) => letterFrom(row, staleBefore)),
  };
}

function requireSmtp(): void {
  if (getServerConfig().emailMode !== "smtp") {
    throw new HttpError(409, "EMAIL_CAPTURE_MODE", "기록 모드에서는 메일을 보내지 않습니다.");
  }
}

export async function retryFailedEmail(id: string, actorId: string): Promise<EmailDeliveryReport> {
  requireSmtp();
  const updated = await prisma.emailOutbox.updateMany({
    where: { id, status: "FAILED" },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), claimToken: null, claimedAt: null, lastError: null },
  });
  if (!updated.count) throw new HttpError(409, "EMAIL_NOT_FAILED", "실패한 메일만 다시 보낼 수 있습니다.");
  await prisma.auditLog.create({ data: { actorId, action: "email.retry", targetType: "EmailOutbox", targetId: id, summary: {} } });
  scheduleEmailDelivery();
  return emailDeliveryReport();
}

export async function releaseCapturedEmail(actorId: string): Promise<EmailDeliveryReport> {
  requireSmtp();
  const updated = await prisma.emailOutbox.updateMany({
    where: { status: "CAPTURED" },
    data: { status: "PENDING", nextAttemptAt: new Date(), claimToken: null, claimedAt: null },
  });
  await prisma.auditLog.create({
    data: { actorId, action: "email.release", targetType: "EmailOutbox", targetId: "captured", summary: { count: updated.count } },
  });
  scheduleEmailDelivery();
  return emailDeliveryReport();
}

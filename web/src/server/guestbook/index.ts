import "server-only";
import { cache } from "react";
import { Prisma, type GuestbookEntry } from "@/generated/prisma/client";
import { guestbookRecordSchema, type GuestbookInput } from "@/lib/guestbook-contract";
import { prisma } from "@/server/db";
import { deleteUnusedImages, requireExistingImages } from "@/server/events/images";
import { reserveRevision } from "@/server/events/revision";
import { ApiError } from "@/server/events/errors";

function fromRow(row: GuestbookEntry) {
  return guestbookRecordSchema.parse({
    id: row.id, revision: row.revision, entryNumber: row.entryNumber, volume: row.volume, visitDate: row.visitDate, visitorName: row.visitorName,
    body: row.body, bodyEn: row.bodyEn, images: row.images, is_active: row.isActive,
    created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
  });
}
const orderBy = [{ entryNumber: "desc" }] as const;

export async function listGuestbookAdmin() {
  return (await prisma.guestbookEntry.findMany({ orderBy: [...orderBy] })).map(fromRow);
}

export const guestbookPage = cache(async (page = 1) => {
  const where = { isActive: 1 };
  const [rows, total] = await prisma.$transaction([
    prisma.guestbookEntry.findMany({ where, orderBy: [...orderBy], skip: (page - 1) * 12, take: 12 }),
    prisma.guestbookEntry.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
  return { records: rows.map(fromRow), total, totalPages: Math.max(1, Math.ceil(total / 12)) };
});

export async function saveGuestbook(input: GuestbookInput, id?: number, revision?: number) {
  requireExistingImages(input.images);
  const { is_active, ...fields } = input;
  const data = { ...fields, isActive: is_active };
  const { saved, previous } = await prisma.$transaction(async (tx) => {
    if (id === undefined) return { saved: await tx.guestbookEntry.create({ data }), previous: [] };
    await reserveRevision(tx, "guestbook_entries", id, revision);
    const previous = (await tx.guestbookEntry.findUniqueOrThrow({ where: { id } })).images;
    return { saved: await tx.guestbookEntry.update({ where: { id }, data }), previous };
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "GUESTBOOK_NUMBER_CONFLICT", "이미 사용 중인 고유번호입니다. 다른 번호를 입력해 주세요.");
    }
    throw error;
  });
  await deleteUnusedImages(previous.filter((image) => !saved.images.includes(image)));
  return fromRow(saved);
}

export async function deleteGuestbook(id: number, revision: number) {
  const deleted = await prisma.$transaction(async (tx) => {
    await reserveRevision(tx, "guestbook_entries", id, revision);
    return tx.guestbookEntry.delete({ where: { id } });
  });
  await deleteUnusedImages(deleted.images);
}

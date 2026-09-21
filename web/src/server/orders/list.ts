import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { csvResponse, seoulStamp } from "@/server/admin/csv";
import { createdAtFilter, parseAdminListQuery, searchContains, type AdminListQuery } from "@/server/admin/list-query";
import { orderIncludes, orderView, type OrderDetails } from "./projection";

const orderStatuses = ["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED", "REVIEW"] as const;
const fulfillments = ["PICKUP", "DOMESTIC", "INTERNATIONAL"] as const;
const fulfillmentStatuses = ["UNFULFILLED", "READY", "SHIPPED", "DELIVERED", "COLLECTED"] as const;
const changeStatuses = ["REQUESTED", "ACCEPTED", "REJECTED", "RESOLVED"] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], field: string): T | undefined {
  if (!value) return undefined;
  if (!allowed.includes(value as T)) throw new HttpError(400, "INVALID_INPUT", `${field} 값을 확인해 주세요. / Check ${field}.`);
  return value as T;
}

function orderWhere(url: URL, query: AdminListQuery): Prisma.OrderWhereInput {
  const status = pick(url.searchParams.get("status"), orderStatuses, "status");
  const fulfillment = pick(url.searchParams.get("fulfillment"), fulfillments, "fulfillment");
  const fulfillmentStatus = pick(url.searchParams.get("fulfillmentStatus"), fulfillmentStatuses, "fulfillmentStatus");
  const changeStatus = pick(url.searchParams.get("changeStatus"), changeStatuses, "changeStatus");
  const createdAt = createdAtFilter(query);
  const q = query.q;
  return {
    ...(status ? { status } : {}),
    ...(fulfillment ? { fulfillment } : {}),
    ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
    ...(changeStatus ? { changeRequests: { some: { status: changeStatus } } } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? {
      OR: [
        { id: { contains: q } },
        { customerName: searchContains(q) },
        { customerEmail: searchContains(q) },
        { customerPhone: searchContains(q) },
        { trackingNumber: searchContains(q) },
        { carrier: searchContains(q) },
        { items: { some: { OR: [{ titleKo: searchContains(q) }, { titleEn: searchContains(q) }, { sku: searchContains(q) }] } } },
      ],
    } : {}),
  };
}

function addressLine(address: OrderDetails["address"]): string {
  if (!address || typeof address !== "object") return "";
  const value = address as Record<string, unknown>;
  return ["countryCode", "postalCode", "region", "city", "line1", "line2"]
    .map((key) => typeof value[key] === "string" ? value[key] : "")
    .filter(Boolean)
    .join(" · ");
}

export async function listAdminOrders(url: URL) {
  const query = parseAdminListQuery(url);
  const where = orderWhere(url, query);
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderIncludes,
      orderBy: { createdAt: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const items = rows.map(orderView);
  if (query.format === "csv") {
    return csvResponse(
      "center-orders.csv",
      ["id", "createdAtKST", "status", "fulfillment", "fulfillmentStatus", "customerName", "customerEmail", "customerPhone", "amountSats", "shippingAmountSats", "items", "address", "carrier", "trackingNumber", "paymentStatus"],
      items.map((row) => [
        row.id,
        seoulStamp(new Date(row.createdAt)),
        row.status,
        row.fulfillment,
        row.fulfillmentStatus,
        row.customerName,
        row.customerEmail,
        row.customerPhone,
        row.amountSats,
        row.shippingAmountSats,
        row.items.map((item) => `${item.titleKo} / ${item.titleEn} ×${item.quantity}`).join(" | "),
        addressLine(row.address),
        row.carrier ?? "",
        row.trackingNumber ?? "",
        row.payments.map((payment) => payment.status).join(" | "),
      ]),
      total,
      total > items.length,
    );
  }
  return { items, page: query.page, pageSize: query.pageSize, total };
}

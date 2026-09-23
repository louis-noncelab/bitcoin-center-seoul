import { ApiError } from "./errors";

export function nextTicketStock(current: { readonly stockOnHand: number; readonly reservedStock: number } | null, previousCapacity: number, capacity: number): number {
  if (!current) return capacity;
  const remaining = current.stockOnHand + capacity - previousCapacity;
  if (remaining < current.reservedStock) {
    throw new ApiError(409, "CAPACITY_BELOW_COMMITMENTS", "결제 완료 또는 결제 대기 중인 인원보다 정원을 줄일 수 없습니다.");
  }
  return remaining;
}

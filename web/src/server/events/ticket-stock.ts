export function nextTicketStock(current: { readonly stockOnHand: number; readonly reservedStock: number } | null, previousCapacity: number, capacity: number): number {
  if (!current) return capacity;
  return Math.max(current.reservedStock, current.stockOnHand + capacity - previousCapacity);
}

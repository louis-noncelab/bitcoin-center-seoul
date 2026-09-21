"use client";

import { useEffect, useSyncExternalStore } from "react";
import { z } from "zod";

export const CART_STORAGE_KEY = "center-cart";
export const CART_MAX_SKUS = 30;
export const CART_MAX_QUANTITY = 100;

export type CartLine = { readonly variantId: string; readonly quantity: number };
export type CartAddResult = "ok" | "full" | "invalid";

const variantIdSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const storedSchema = z.object({
  v: z.literal(1),
  items: z.array(z.object({ variantId: variantIdSchema, quantity: z.number().int().min(1).max(CART_MAX_QUANTITY) }).strip()).max(CART_MAX_SKUS),
}).strip();

const EMPTY: readonly CartLine[] = [];
const listeners = new Set<() => void>();

type CartState = { items: readonly CartLine[]; drawer: boolean; hydrated: boolean };
let state: CartState = { items: EMPTY, drawer: false, hydrated: false };

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function persist(items: readonly CartLine[]) {
  const payload = JSON.stringify({ v: 1, items });
  try { globalThis.localStorage?.setItem(CART_STORAGE_KEY, payload); } catch { /* private mode */ }
}

function readStorage(): string | null {
  try { return globalThis.localStorage?.getItem(CART_STORAGE_KEY) ?? null; } catch { return null; }
}

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return mergeLines(parsed.data.items);
  } catch {
    return [];
  }
}

function mergeLines(items: readonly CartLine[]): CartLine[] {
  const merged: CartLine[] = [];
  for (const item of items) {
    const existing = merged.find((line) => line.variantId === item.variantId);
    if (existing) {
      merged.splice(merged.indexOf(existing), 1, { variantId: existing.variantId, quantity: Math.min(CART_MAX_QUANTITY, existing.quantity + item.quantity) });
      continue;
    }
    if (merged.length >= CART_MAX_SKUS) break;
    merged.push({ variantId: item.variantId, quantity: item.quantity });
  }
  return merged;
}

function setItems(items: readonly CartLine[]) {
  const next = items.length ? items : EMPTY;
  state = { ...state, items: next, hydrated: true };
  persist(next);
  emit();
}

export function hydrateCart() {
  if (state.hydrated) return;
  const items = parseCart(readStorage());
  state = { items: items.length ? items : EMPTY, drawer: state.drawer, hydrated: true };
  emit();
}

function prepareWrite() {
  if (!state.hydrated) hydrateCart();
}

export function getCartItems(): readonly CartLine[] {
  return state.items;
}

export function addCartItem(variantId: string, quantity: number): CartAddResult {
  const id = variantIdSchema.safeParse(variantId);
  if (!id.success || !Number.isInteger(quantity) || quantity < 1) return "invalid";
  prepareWrite();
  const current = state.items.find((item) => item.variantId === id.data);
  if (!current && state.items.length >= CART_MAX_SKUS) return "full";
  const nextQuantity = Math.min(CART_MAX_QUANTITY, (current?.quantity ?? 0) + quantity);
  setItems(current
    ? state.items.map((item) => item.variantId === id.data ? { variantId: id.data, quantity: nextQuantity } : item)
    : [...state.items, { variantId: id.data, quantity: Math.min(CART_MAX_QUANTITY, quantity) }]);
  return "ok";
}

export function removeCartItem(variantId: string) {
  prepareWrite();
  setItems(state.items.filter((item) => item.variantId !== variantId));
}

export function updateCartQuantity(variantId: string, quantity: number) {
  prepareWrite();
  if (!Number.isInteger(quantity) || quantity < 1) {
    removeCartItem(variantId);
    return;
  }
  const next = Math.min(CART_MAX_QUANTITY, quantity);
  setItems(state.items.map((item) => item.variantId === variantId ? { variantId: item.variantId, quantity: next } : item));
}

export function clearCart() {
  prepareWrite();
  setItems(EMPTY);
}

export function openCartDrawer() {
  state = { ...state, drawer: true };
  emit();
}

export function closeCartDrawer() {
  if (!state.drawer) return;
  state = { ...state, drawer: false };
  emit();
}

export function resetCartStore() {
  state = { items: EMPTY, drawer: false, hydrated: true };
  try { globalThis.localStorage?.removeItem(CART_STORAGE_KEY); } catch { /* ignore */ }
  emit();
}

export function cartQuantity(items: readonly CartLine[] = state.items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function useCartItems() {
  return useSyncExternalStore(subscribe, getCartItems, () => EMPTY);
}

export function useCartQuantity() {
  return useSyncExternalStore(subscribe, () => cartQuantity(state.items), () => 0);
}

export function useCartDrawerOpen() {
  return useSyncExternalStore(subscribe, () => state.drawer, () => false);
}

export function useCartHydrated() {
  useEffect(() => { hydrateCart(); }, []);
  return useSyncExternalStore(subscribe, () => state.hydrated, () => false);
}

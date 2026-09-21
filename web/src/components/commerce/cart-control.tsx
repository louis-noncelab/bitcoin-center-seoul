"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import "@/styles/commerce.css";
import { CartDrawer } from "./cart-drawer";
import { closeCartDrawer, openCartDrawer, useCartDrawerOpen, useCartHydrated, useCartQuantity } from "./cart-store";

export function CartControl({ locale }: { readonly locale: Locale }) {
  const ko = locale === "ko";
  const hydrated = useCartHydrated();
  const quantity = useCartQuantity();
  const open = useCartDrawerOpen();
  const label = ko ? "장바구니" : "Cart";
  return <>
    <Button variant="quiet" className="header-control commerce-cart-control" aria-label={hydrated && quantity ? `${label} (${quantity})` : label} aria-expanded={open} onClick={() => { if (open) closeCartDrawer(); else openCartDrawer(); }}>
      <ShoppingBag className="icon" aria-hidden="true" />
      {hydrated && quantity > 0 && <span className="commerce-cart-count" aria-hidden="true">{quantity > 99 ? "99+" : quantity}</span>}
    </Button>
    <CartDrawer locale={locale} open={open} />
  </>;
}

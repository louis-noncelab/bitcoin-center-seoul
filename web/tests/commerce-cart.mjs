import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as store from '../src/components/commerce/cart-store.ts';
import { resolveCartLines } from '../src/components/commerce/cart.ts';
import { CheckoutSummary } from '../src/components/commerce/checkout-summary.tsx';

const product = { id: 'book', slug: 'book', titleKo: '책', titleEn: 'Book', descriptionKo: '', descriptionEn: '', imageUrl: '', contentFormat: 'PLAIN', priceKind: 'BTC_FIXED', priceAmount: '100', memberOnly: false, allowedFulfillments: ['PICKUP'], variants: [{ id: 'book-option', sku: 'book', optionLabelKo: '단권', optionLabelEn: 'Single', availableStock: 2 }] };

test('catalog resolution preserves requested quantities and blocks insufficient stock', () => {
  // Given a selected quantity that exceeds available stock and an absent option.
  const items = [{ variantId: 'book-option', quantity: 3 }, { variantId: 'removed', quantity: 1 }];
  // When the catalog is resolved.
  const resolved = resolveCartLines(items, [product]);
  // Then the customer must review the selection instead of silently buying less.
  assert.equal(resolved.lines[0].quantity, 3);
  assert.equal(resolved.lines[0].available, false);
  assert.deepEqual(resolved.missing, ['removed']);
});

test('successful checkout removes only ordered quantities and preserves later cart additions', () => {
  // Given an order in flight while more units and another item are added.
  store.resetCartStore();
  store.addCartItem('book-option', 2);
  const purchased = store.getCartItems();
  store.addCartItem('book-option', 1);
  store.addCartItem('other', 1);
  // When the purchased selection is removed.
  assert.equal(typeof store.removePurchasedCartItems, 'function');
  store.removePurchasedCartItems(purchased);
  // Then only quantities included in the order are removed.
  assert.deepEqual(store.getCartItems(), [{ variantId: 'book-option', quantity: 1 }, { variantId: 'other', quantity: 1 }]);
  store.resetCartStore();
});

test('coupon summary shows gross item subtotal so each displayed line adds to the total', () => {
  // Given 200 sats of merchandise, 50 shipping, and a 20 sat discount.
  const quote = { id: 'q', amountSats: '230', expiresAt: '2030-01-01T00:00:00Z', snapshot: { items: [{ titleKo: '책', titleEn: 'Book', optionLabelKo: '단권', optionLabelEn: 'Single', quantity: 2, amountSats: '200' }], shippingAmountSats: '50', amountSats: '230', shipping: { countryCode: 'KR', requiresPostalCode: true }, coupon: { code: 'SAVE', nameKo: '할인', nameEn: 'Discount', discountSats: '20' } } };
  // When the real summary renders.
  const html = renderToStaticMarkup(createElement(CheckoutSummary, { locale: 'en', items: [{ product, quantity: 2, option: 'Single' }], quote }));
  // Then gross subtotal + shipping - discount equals the shown total.
  assert.match(html, /<dt>Items<\/dt><dd>200 sats<\/dd>/);
  assert.match(html, /<dt>Shipping<\/dt><dd>50 sats<\/dd>/);
  assert.match(html, /<dt>Coupon SAVE<\/dt><dd>20 sats off<\/dd>/);
  assert.match(html, /<dt>Total<\/dt><dd>230 sats<\/dd>/);
});

test('removing and readding an option during checkout preserves the new selection', () => {
  // Given an order in flight followed by an explicit removal and new selection.
  store.resetCartStore();
  store.addCartItem('book-option', 2);
  const purchased = store.getCartItems();
  store.removeCartItem('book-option');
  store.addCartItem('book-option', 1);
  // When the earlier order completes.
  store.removePurchasedCartItems(purchased);
  // Then the newly selected item is not erased by the earlier order.
  assert.deepEqual(store.getCartItems(), [{ variantId: 'book-option', quantity: 1 }]);
  store.resetCartStore();
});

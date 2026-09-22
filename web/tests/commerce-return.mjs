import assert from 'node:assert/strict';
import test from 'node:test';

Object.assign(process.env, { APP_MODE: 'test', APP_ORIGIN: 'http://127.0.0.1:3100', DATABASE_URL: 'postgresql://max@127.0.0.1:5432/center_test', DATA_DIR: '/tmp', TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), PAYMENT_PROVIDER: 'zaprite', PAYMENT_MODE: 'review', EMAIL_MODE: 'capture', TRUST_PROXY: 'false' });
const { createZapriteInvoice } = await import('../src/server/payments/zaprite.ts');
const { publicPayment } = await import('../src/server/payments/access.ts');
const payment = { id: 'payment-one', orderId: 'order-one', bookingId: null, provider: 'ZAPRITE', mode: 'SANDBOX', amountSats: 100n, currency: 'BTC', creationKey: 'creation-one', expiresAt: new Date('2030-01-01T00:00:00Z'), metadata: { locale: 'en' }, externalId: null };

test('provider return retains the order language without exposing access credentials', async () => {
  // Given a payment whose persisted metadata was taken from the authorized order.
  let submitted;
  // When invoice creation emits a provider request to an in-process transport.
  await createZapriteInvoice({ payment, receiver: { provider: 'ZAPRITE', url: 'https://zaprite.review.invalid', accountId: 'default' }, transport: async (request) => {
    submitted = JSON.parse(request.body);
    return { id: 'external-one', checkoutUrl: 'https://zaprite.review.invalid/checkout', status: 'PENDING', totalAmount: 100, currency: 'BTC', externalUniqId: payment.id, expiresAt: payment.expiresAt.toISOString() };
  } });
  // Then redirect language is retained and neither order token nor request secret is in its URL.
  assert.equal(submitted.redirectUrl, 'http://127.0.0.1:3100/en/payments/payment-one');
  assert.deepEqual([...new URL(submitted.redirectUrl).searchParams], []);
});

test('authorized payment projection supplies the real order without exposing internal metadata', () => {
  // Given a payment whose order relation is known by the server.
  // When it is projected after the existing access gate.
  const result = publicPayment(payment);
  // Then the UI can resolve its return route without untrusted query state.
  assert.equal(result.orderId, 'order-one');
  assert.equal('metadata' in result, false);
  assert.equal('accessTokenHash' in result, false);
});

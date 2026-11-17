import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventoryCsv,
  buildOrdersCsv,
  calculateOrderTotals,
  computeStoreAnalytics,
  detectCardBrand,
  formatCardNumber,
  isProductSoldOut,
  isValidCardExpiry,
  isValidCvv,
  isValidEgyptianPhone,
  isValidLuhn,
  validateStockAvailability,
} from './commerce';
import type { Order, PaymentAttempt, Product } from '../types/store';

test('Egyptian phone validation accepts valid mobile prefixes and +20 format', () => {
  assert.equal(isValidEgyptianPhone('01012345678'), true);
  assert.equal(isValidEgyptianPhone('+20 111 234 5678'), true);
  assert.equal(isValidEgyptianPhone('01287654321'), true);
  assert.equal(isValidEgyptianPhone('01555555555'), true);
  assert.equal(isValidEgyptianPhone('01912345678'), false);
  assert.equal(isValidEgyptianPhone('12345'), false);
});

test('Order totals calculate promo discount and free shipping threshold accurately', () => {
  const promos = [{ code: 'ONE10', discountPercent: 10, active: true }];

  const underThreshold = calculateOrderTotals({
    items: [{ price: 1550, qty: 1 }],
    baseShippingCost: 60,
    freeShippingThreshold: 2500,
    promoCode: 'ONE10',
    promoCodes: promos,
  });
  assert.equal(underThreshold.subtotal, 1550);
  assert.equal(underThreshold.discountAmount, 155);
  assert.equal(underThreshold.promoCodeApplied, 'ONE10');
  assert.equal(underThreshold.freeShippingApplied, false);
  assert.equal(underThreshold.shipping, 60);
  assert.equal(underThreshold.total, 1455);

  const overThreshold = calculateOrderTotals({
    items: [
      { price: 1550, qty: 1 },
      { price: 1350, qty: 1 },
    ],
    baseShippingCost: 80,
    freeShippingThreshold: 2500,
  });
  assert.equal(overThreshold.subtotal, 2900);
  assert.equal(overThreshold.freeShippingApplied, true);
  assert.equal(overThreshold.shipping, 0);
  assert.equal(overThreshold.total, 2900);
});

test('Luhn, card brand detection, expiry, and CVV validation work as expected', () => {
  assert.equal(isValidLuhn('4111 1111 1111 1111'), true);
  assert.equal(isValidLuhn('5500 0000 0000 0004'), true);
  assert.equal(isValidLuhn('4111 1111 1111 1112'), false);

  assert.equal(detectCardBrand('4111111111111111'), 'Visa');
  assert.equal(detectCardBrand('5500000000000004'), 'Mastercard');
  assert.equal(detectCardBrand('5078030000000001'), 'Meeza');
  assert.equal(formatCardNumber('4111111111111111'), '4111 1111 1111 1111');

  const fixedNow = new Date('2026-11-15T12:00:00Z');
  assert.equal(isValidCardExpiry('12/28', fixedNow), true);
  assert.equal(isValidCardExpiry('11/26', fixedNow), true);
  assert.equal(isValidCardExpiry('10/26', fixedNow), false);
  assert.equal(isValidCardExpiry('13/28', fixedNow), false);

  assert.equal(isValidCvv('123'), true);
  assert.equal(isValidCvv('1234'), true);
  assert.equal(isValidCvv('12'), false);
});

test('Stock availability and sold-out checks enforce inventory bounds', () => {
  const products: Product[] = [
    {
      id: 'p1',
      name: 'HOODIE',
      price: 1550,
      category: 'hoodies',
      image: '/a.jpg',
      sizes: ['L'],
      description: 'desc',
      stock: 2,
    },
    {
      id: 'p2',
      name: 'TEE',
      price: 890,
      category: 'tees',
      image: '/b.jpg',
      sizes: ['M'],
      description: 'desc',
      stock: 0,
    },
  ];

  assert.equal(isProductSoldOut(products[0]), false);
  assert.equal(isProductSoldOut(products[1]), true);
  assert.equal(validateStockAvailability([{ id: 'p1', qty: 2 }], products).ok, true);
  assert.equal(validateStockAvailability([{ id: 'p1', qty: 3 }], products).ok, false);
  assert.equal(validateStockAvailability([{ id: 'p2', qty: 1 }], products).ok, false);
});

test('Analytics computation and CSV builders track sales, failures, and remaining stock', () => {
  const products: Product[] = [
    {
      id: 'p1',
      name: 'HOODIE',
      price: 1500,
      category: 'hoodies',
      image: '/a.jpg',
      sizes: ['L'],
      description: 'desc',
      stock: 3,
    },
    {
      id: 'p2',
      name: 'TEE',
      price: 800,
      category: 'tees',
      image: '/b.jpg',
      sizes: ['M'],
      description: 'desc',
      stock: 0,
    },
  ];

  const orders: Order[] = [
    {
      id: 'ORD-10001',
      transactionId: 'PAY-AAA1',
      date: '2026-11-17',
      createdAtIso: '2026-11-17T10:00:00Z',
      customerName: 'أحمد',
      customerPhone: '01012345678',
      customerGovernorate: 'القاهرة',
      customerAddress: 'المعادي شارع 9',
      items: [{ id: 'p1', name: 'HOODIE', price: 1500, image: '/a.jpg', size: 'L', qty: 2 }],
      subtotal: 3000,
      discountAmount: 0,
      shipping: 0,
      total: 3000,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      fulfillmentStatus: 'confirmed',
    },
    {
      id: 'ORD-10002',
      transactionId: 'PAY-AAA2',
      date: '2026-11-17',
      createdAtIso: '2026-11-17T11:00:00Z',
      customerName: 'سارة',
      customerPhone: '01112345678',
      customerGovernorate: 'الجيزة',
      customerAddress: 'الدقي',
      items: [{ id: 'p2', name: 'TEE', price: 800, image: '/b.jpg', size: 'M', qty: 1 }],
      subtotal: 800,
      discountAmount: 0,
      shipping: 60,
      total: 860,
      paymentMethod: 'cod',
      paymentStatus: 'cod_pending',
      fulfillmentStatus: 'cancelled',
    },
  ];

  const attempts: PaymentAttempt[] = [
    {
      id: 'ATT-1',
      createdAtIso: '2026-11-17T10:00:00Z',
      method: 'card',
      status: 'succeeded',
      reason: 'تم تأكيد الدفع بنجاح',
      amount: 3000,
      orderId: 'ORD-10001',
    },
    {
      id: 'ATT-2',
      createdAtIso: '2026-11-17T10:05:00Z',
      method: 'card',
      status: 'failed',
      reason: 'رمز التحقق OTP غير صحيح',
      amount: 1500,
    },
  ];

  const analytics = computeStoreAnalytics(products, orders, attempts);
  assert.equal(analytics.totalRevenue, 3000);
  assert.equal(analytics.paidRevenue, 3000);
  assert.equal(analytics.totalUnitsSold, 2);
  assert.equal(analytics.totalRemainingStock, 3);
  assert.equal(analytics.soldOutProductsCount, 1);
  assert.equal(analytics.successfulOrdersCount, 1);
  assert.equal(analytics.cancelledOrdersCount, 1);
  assert.equal(analytics.failedAttemptsCount, 1);
  assert.equal(analytics.successRatePercent, 33);

  const ordersCsv = buildOrdersCsv(orders);
  assert.ok(ordersCsv.startsWith('\uFEFF'));
  assert.ok(ordersCsv.includes('ORD-10001'));

  const invCsv = buildInventoryCsv(analytics.productBreakdown);
  assert.ok(invCsv.startsWith('\uFEFF'));
  assert.ok(invCsv.includes('SOLD OUT'));
});

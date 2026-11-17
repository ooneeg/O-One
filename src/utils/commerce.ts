import type {
  CartItem,
  Order,
  PaymentAttempt,
  Product,
  ProductAnalyticsRow,
  PromoCode,
  StoreAnalytics,
} from '../types/store';

export interface TotalsBreakdown {
  subtotal: number;
  discountAmount: number;
  promoCodeApplied: string | null;
  shipping: number;
  freeShippingApplied: boolean;
  total: number;
}

export function normalizeDigits(input: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const extendedArabic = '۰۱۲۳۴۵۶۷۸۹';
  return input
    .replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(extendedArabic.indexOf(d)));
}

export function isValidEgyptianPhone(rawPhone: string): boolean {
  const cleaned = normalizeDigits(rawPhone).replace(/[\s\-()+]/g, '');
  let local = cleaned;
  if (cleaned.startsWith('0020')) {
    local = cleaned.slice(4);
  } else if (cleaned.startsWith('20') && cleaned.length >= 12) {
    local = cleaned.slice(2);
  }
  if (/^1[0125][0-9]{8}$/.test(local)) {
    local = `0${local}`;
  }
  return /^01[0125][0-9]{8}$/.test(local);
}

export function findActivePromo(codeInput: string, promoCodes: PromoCode[]): PromoCode | null {
  const normalized = codeInput.trim().toUpperCase();
  if (!normalized) return null;
  return promoCodes.find((p) => p.active && p.code.toUpperCase() === normalized) || null;
}

export function calculateOrderTotals(params: {
  items: Pick<CartItem, 'price' | 'qty'>[];
  baseShippingCost: number;
  freeShippingThreshold: number;
  promoCode?: string;
  promoCodes?: PromoCode[];
}): TotalsBreakdown {
  const subtotal = params.items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.price)) * Math.max(0, Math.floor(item.qty)),
    0,
  );

  if (subtotal === 0) {
    return {
      subtotal: 0,
      discountAmount: 0,
      promoCodeApplied: null,
      shipping: 0,
      freeShippingApplied: false,
      total: 0,
    };
  }

  const matchedPromo =
    params.promoCode && params.promoCodes
      ? findActivePromo(params.promoCode, params.promoCodes)
      : null;

  const discountAmount = matchedPromo
    ? Math.round((subtotal * matchedPromo.discountPercent) / 100)
    : 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const freeShippingApplied =
    params.freeShippingThreshold > 0 && discountedSubtotal >= params.freeShippingThreshold;
  const shipping = freeShippingApplied ? 0 : Math.max(0, Number(params.baseShippingCost));

  return {
    subtotal,
    discountAmount,
    promoCodeApplied: matchedPromo ? matchedPromo.code : null,
    shipping,
    freeShippingApplied,
    total: discountedSubtotal + shipping,
  };
}

export function sanitizeCardNumber(input: string): string {
  return normalizeDigits(input).replace(/\D/g, '').slice(0, 19);
}

export function formatCardNumber(input: string): string {
  const digits = sanitizeCardNumber(input);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function detectCardBrand(cardNumber: string): 'Visa' | 'Mastercard' | 'Meeza' | 'Card' {
  const digits = sanitizeCardNumber(cardNumber);
  if (digits.startsWith('5078')) return 'Meeza';
  if (digits.startsWith('4')) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(digits)) {
    return 'Mastercard';
  }
  return 'Card';
}

export function isValidLuhn(cardNumber: string): boolean {
  const digits = sanitizeCardNumber(cardNumber);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidCardExpiry(expiry: string, now: Date = new Date()): boolean {
  const normalized = normalizeDigits(expiry).trim();
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(normalized);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export function isValidCvv(cvv: string): boolean {
  const digits = normalizeDigits(cvv).replace(/\D/g, '');
  return digits.length === 3 || digits.length === 4;
}

export function formatEgp(amount: number): string {
  return `${amount.toLocaleString('en-US')} EGP`;
}

export function isProductSoldOut(product: Pick<Product, 'stock'> | { stock?: number; isSoldOut?: boolean }): boolean {
  if ('isSoldOut' in product && typeof product.isSoldOut === 'boolean') {
    if (typeof product.stock === 'number') {
      return product.stock <= 0;
    }
    return product.isSoldOut;
  }
  return Math.max(0, Math.floor(Number(product.stock ?? 0))) <= 0;
}

export function validateStockAvailability(
  requestedItems: Array<{ id: string; qty: number }>,
  products: Array<Pick<Product, 'id' | 'name' | 'stock'>>,
): { ok: true } | { ok: false; reason: string; productId?: string } {
  const requestedTotals = new Map<string, number>();
  for (const item of requestedItems) {
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    requestedTotals.set(item.id, (requestedTotals.get(item.id) || 0) + qty);
  }

  for (const [productId, totalQty] of requestedTotals.entries()) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      return { ok: false, reason: 'أحد المنتجات المطلوبة غير متاح حالياً', productId };
    }
    const available = Math.max(0, Math.floor(Number(prod.stock)));
    if (available <= 0) {
      return {
        ok: false,
        reason: `عذراً، المنتج "${prod.name}" نفذت كميته بالكامل (SOLD OUT)`,
        productId,
      };
    }
    if (totalQty > available) {
      return {
        ok: false,
        reason: `الكمية المطلوبة من "${prod.name}" تتجاوز المتاح حالياً بالمخزون`,
        productId,
      };
    }
  }

  return { ok: true };
}

export function computeStoreAnalytics(
  products: Product[],
  orders: Order[],
  paymentAttempts: PaymentAttempt[],
): StoreAnalytics {
  const activeOrders = orders.filter((o) => o.fulfillmentStatus !== 'cancelled');
  const cancelledOrdersCount = orders.length - activeOrders.length;

  const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const paidRevenue = activeOrders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  let totalUnitsSold = 0;
  const soldByProduct = new Map<string, { units: number; revenue: number }>();

  for (const order of activeOrders) {
    for (const item of order.items) {
      const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
      const lineRev = Math.max(0, Number(item.price) || 0) * qty;
      totalUnitsSold += qty;
      const existing = soldByProduct.get(item.id) || { units: 0, revenue: 0 };
      soldByProduct.set(item.id, {
        units: existing.units + qty,
        revenue: existing.revenue + lineRev,
      });
    }
  }

  const productBreakdown: ProductAnalyticsRow[] = products.map((p) => {
    const stats = soldByProduct.get(p.id) || { units: 0, revenue: 0 };
    const remainingStock = Math.max(0, Math.floor(Number(p.stock) || 0));
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      remainingStock,
      unitsSold: stats.units,
      revenue: stats.revenue,
      isSoldOut: remainingStock <= 0,
    };
  });

  const totalRemainingStock = productBreakdown.reduce((sum, p) => sum + p.remainingStock, 0);
  const soldOutProductsCount = productBreakdown.filter((p) => p.isSoldOut).length;
  const failedAttemptsCount = paymentAttempts.filter((a) => a.status === 'failed').length;
  const successfulOrdersCount = activeOrders.length;

  const denominator = successfulOrdersCount + failedAttemptsCount + cancelledOrdersCount;
  const successRatePercent =
    denominator === 0 ? 100 : Math.round((successfulOrdersCount / denominator) * 100);

  return {
    totalRevenue,
    paidRevenue,
    totalUnitsSold,
    totalRemainingStock,
    soldOutProductsCount,
    successfulOrdersCount,
    cancelledOrdersCount,
    failedAttemptsCount,
    successRatePercent,
    productBreakdown,
  };
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildOrdersCsv(orders: Order[]): string {
  const headers = [
    'رقم الطلب',
    'رقم المعاملة',
    'التاريخ',
    'اسم العميل',
    'رقم الهاتف',
    'المحافظة',
    'العنوان',
    'القطع',
    'الإجمالي (EGP)',
    'وسيلة الدفع',
    'حالة الدفع',
    'حالة الشحن',
    'بوليصة الشحن (AWB)',
  ];
  const rows = orders.map((o) => [
    escapeCsvCell(o.id),
    escapeCsvCell(o.transactionId),
    escapeCsvCell(o.date),
    escapeCsvCell(o.customerName),
    escapeCsvCell(o.customerPhone),
    escapeCsvCell(o.customerGovernorate),
    escapeCsvCell(o.customerAddress),
    escapeCsvCell(o.items.map((i) => `${i.name} (${i.size}) x${i.qty}`).join(' | ')),
    escapeCsvCell(o.total),
    escapeCsvCell(o.paymentBrand || o.paymentMethod),
    escapeCsvCell(o.paymentStatus),
    escapeCsvCell(o.fulfillmentStatus),
    escapeCsvCell(o.shipmentWaybill || ''),
  ]);
  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')}`;
}

export function buildInventoryCsv(breakdown: ProductAnalyticsRow[]): string {
  const headers = [
    'كود المنتج',
    'اسم المنتج',
    'القسم',
    'السعر (EGP)',
    'القطع المتوفرة',
    'القطع المباعة',
    'إيرادات المنتج (EGP)',
    'الحالة',
  ];
  const rows = breakdown.map((p) => [
    escapeCsvCell(p.id),
    escapeCsvCell(p.name),
    escapeCsvCell(p.category),
    escapeCsvCell(p.price),
    escapeCsvCell(p.remainingStock),
    escapeCsvCell(p.unitsSold),
    escapeCsvCell(p.revenue),
    escapeCsvCell(p.isSoldOut ? 'SOLD OUT' : 'متوفر'),
  ]);
  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')}`;
}

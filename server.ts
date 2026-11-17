import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_STORE_DATA } from './src/data/defaultStore';
import type {
  CartItem,
  FulfillmentStatus,
  GovernorateShipping,
  Order,
  PaymentAttempt,
  PaymentMethod,
  PaymentSettings,
  PaymentStatus,
  Product,
  PromoCode,
  PublicProduct,
  PublicStoreData,
  ShippingIntegrationConfig,
  SiteContent,
  SizeGuideRow,
  StoreAnalytics,
  StoreData,
} from './src/types/store';
import {
  calculateOrderTotals,
  computeStoreAnalytics,
  detectCardBrand,
  findActivePromo,
  isValidCardExpiry,
  isValidCvv,
  isValidEgyptianPhone,
  isValidLuhn,
  normalizeDigits,
  sanitizeCardNumber,
  validateStockAvailability,
} from './src/utils/commerce';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.db');

interface PendingIntent {
  intentId: string;
  createdAt: number;
  method: 'card' | 'wallet';
  customerName: string;
  customerPhone: string;
  customerGovernorate: string;
  customerAddress: string;
  notes?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  promoCode?: string;
  shipping: number;
  total: number;
  paymentBrand: string;
  cardLast4?: string;
  walletPhone?: string;
}

const pendingIntents = new Map<string, PendingIntent>();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS store_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    badge TEXT,
    image TEXT NOT NULL,
    sizes TEXT NOT NULL,
    description TEXT NOT NULL,
    extra_details TEXT,
    size_chart TEXT,
    stock INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at_iso TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_governorate TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    notes TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL NOT NULL,
    promo_code TEXT,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_brand TEXT,
    card_last4 TEXT,
    payment_reference TEXT,
    payment_status TEXT NOT NULL,
    fulfillment_status TEXT NOT NULL,
    shipment_waybill TEXT,
    shipment_dispatched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_attempts (
    id TEXT PRIMARY KEY,
    created_at_iso TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    order_id TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at_iso TEXT NOT NULL
  );
`);

function getConfigValue<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM store_config WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

function setConfigValue(key: string, value: unknown) {
  db.prepare(
    'INSERT INTO store_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, JSON.stringify(value));
}

function seedDatabaseIfEmpty() {
  const seeded = db.prepare('SELECT value FROM store_config WHERE key = ?').get('seeded') as
    | { value: string }
    | undefined;
  if (seeded) return;

  db.exec('BEGIN IMMEDIATE');
  try {
    setConfigValue('adminPassword', DEFAULT_STORE_DATA.adminPassword);
    setConfigValue('whatsappNumber', DEFAULT_STORE_DATA.whatsappNumber);
    setConfigValue('siteContent', DEFAULT_STORE_DATA.siteContent);
    setConfigValue('generalSizeGuide', DEFAULT_STORE_DATA.generalSizeGuide);
    setConfigValue('governorates', DEFAULT_STORE_DATA.governorates);
    setConfigValue('paymentSettings', DEFAULT_STORE_DATA.paymentSettings);
    setConfigValue('promoCodes', DEFAULT_STORE_DATA.promoCodes);
    setConfigValue('shippingIntegration', DEFAULT_STORE_DATA.shippingIntegration);

    const insertProduct = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, sort_order, name, price, category, badge, image, sizes, description, extra_details, size_chart, stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    DEFAULT_STORE_DATA.products.forEach((p, idx) => {
      insertProduct.run(
        p.id,
        idx,
        p.name,
        p.price,
        p.category,
        p.badge ?? null,
        p.image,
        JSON.stringify(p.sizes),
        p.description,
        p.extraDetails ?? null,
        p.sizeChart ?? null,
        Math.max(0, Math.floor(p.stock)),
      );
    });

    setConfigValue('seeded', true);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

seedDatabaseIfEmpty();

function listProducts(): Product[] {
  const rows = db
    .prepare('SELECT * FROM products ORDER BY sort_order ASC, rowid ASC')
    .all() as Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    badge: string | null;
    image: string;
    sizes: string;
    description: string;
    extra_details: string | null;
    size_chart: string | null;
    stock: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price),
    category: r.category as Product['category'],
    badge: r.badge || undefined,
    image: r.image,
    sizes: JSON.parse(r.sizes) as string[],
    description: r.description,
    extraDetails: r.extra_details || undefined,
    sizeChart: r.size_chart || undefined,
    stock: Math.max(0, Math.floor(Number(r.stock))),
  }));
}

function rowToOrder(r: {
  id: string;
  transaction_id: string;
  date: string;
  created_at_iso: string;
  customer_name: string;
  customer_phone: string;
  customer_governorate: string;
  customer_address: string;
  notes: string | null;
  items: string;
  subtotal: number;
  discount_amount: number;
  promo_code: string | null;
  shipping: number;
  total: number;
  payment_method: string;
  payment_brand: string | null;
  card_last4: string | null;
  payment_reference: string | null;
  payment_status: string;
  fulfillment_status: string;
  shipment_waybill: string | null;
  shipment_dispatched_at: string | null;
}): Order {
  return {
    id: r.id,
    transactionId: r.transaction_id,
    date: r.date,
    createdAtIso: r.created_at_iso,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerGovernorate: r.customer_governorate,
    customerAddress: r.customer_address,
    notes: r.notes || undefined,
    items: JSON.parse(r.items) as CartItem[],
    subtotal: Number(r.subtotal),
    discountAmount: Number(r.discount_amount),
    promoCode: r.promo_code || undefined,
    shipping: Number(r.shipping),
    total: Number(r.total),
    paymentMethod: r.payment_method as PaymentMethod,
    paymentBrand: r.payment_brand || undefined,
    cardLast4: r.card_last4 || undefined,
    paymentReference: r.payment_reference || undefined,
    paymentStatus: r.payment_status as PaymentStatus,
    fulfillmentStatus: r.fulfillment_status as FulfillmentStatus,
    shipmentWaybill: r.shipment_waybill || undefined,
    shipmentDispatchedAt: r.shipment_dispatched_at || undefined,
  };
}

function listOrders(): Order[] {
  const rows = db
    .prepare('SELECT * FROM orders ORDER BY created_at_iso DESC, rowid DESC')
    .all() as Parameters<typeof rowToOrder>[0][];
  return rows.map(rowToOrder);
}

function listPaymentAttempts(): PaymentAttempt[] {
  const rows = db
    .prepare('SELECT * FROM payment_attempts ORDER BY created_at_iso DESC, rowid DESC LIMIT 200')
    .all() as Array<{
    id: string;
    created_at_iso: string;
    method: string;
    status: string;
    reason: string;
    amount: number;
    customer_name: string | null;
    customer_phone: string | null;
    order_id: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    createdAtIso: r.created_at_iso,
    method: r.method as PaymentMethod,
    status: r.status as 'succeeded' | 'failed',
    reason: r.reason,
    amount: Number(r.amount),
    customerName: r.customer_name || undefined,
    customerPhone: r.customer_phone || undefined,
    orderId: r.order_id || undefined,
  }));
}

function recordPaymentAttempt(attempt: Omit<PaymentAttempt, 'id' | 'createdAtIso'>) {
  const id = `ATT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const createdAtIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO payment_attempts (
      id, created_at_iso, method, status, reason, amount, customer_name, customer_phone, order_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    createdAtIso,
    attempt.method,
    attempt.status,
    attempt.reason,
    Math.max(0, Number(attempt.amount || 0)),
    attempt.customerName ?? null,
    attempt.customerPhone ?? null,
    attempt.orderId ?? null,
  );
}

function insertOrder(order: Order) {
  db.prepare(`
    INSERT INTO orders (
      id, transaction_id, date, created_at_iso, customer_name, customer_phone,
      customer_governorate, customer_address, notes, items, subtotal,
      discount_amount, promo_code, shipping, total, payment_method,
      payment_brand, card_last4, payment_reference, payment_status,
      fulfillment_status, shipment_waybill, shipment_dispatched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    order.transactionId,
    order.date,
    order.createdAtIso,
    order.customerName,
    order.customerPhone,
    order.customerGovernorate,
    order.customerAddress,
    order.notes ?? null,
    JSON.stringify(order.items),
    order.subtotal,
    order.discountAmount,
    order.promoCode ?? null,
    order.shipping,
    order.total,
    order.paymentMethod,
    order.paymentBrand ?? null,
    order.cardLast4 ?? null,
    order.paymentReference ?? null,
    order.paymentStatus,
    order.fulfillmentStatus,
    order.shipmentWaybill ?? null,
    order.shipmentDispatchedAt ?? null,
  );
}

function getSharedSettings() {
  const whatsappNumber = getConfigValue<string>('whatsappNumber', DEFAULT_STORE_DATA.whatsappNumber);
  const siteContent = {
    ...DEFAULT_STORE_DATA.siteContent,
    ...getConfigValue<Partial<SiteContent>>('siteContent', {}),
  };
  const generalSizeGuide = getConfigValue<SizeGuideRow[]>(
    'generalSizeGuide',
    DEFAULT_STORE_DATA.generalSizeGuide,
  );
  const governorates = getConfigValue<GovernorateShipping[]>(
    'governorates',
    DEFAULT_STORE_DATA.governorates,
  );
  const storedPay = getConfigValue<Partial<PaymentSettings>>('paymentSettings', {});
  const paymentSettings: PaymentSettings = {
    ...DEFAULT_STORE_DATA.paymentSettings,
    ...storedPay,
    enabledMethods: {
      ...DEFAULT_STORE_DATA.paymentSettings.enabledMethods,
      ...(storedPay.enabledMethods || {}),
    },
  };
  const promoCodes = getConfigValue<PromoCode[]>('promoCodes', DEFAULT_STORE_DATA.promoCodes);
  const shippingIntegration: ShippingIntegrationConfig = {
    ...DEFAULT_STORE_DATA.shippingIntegration,
    ...getConfigValue<Partial<ShippingIntegrationConfig>>('shippingIntegration', {}),
  };
  return {
    whatsappNumber,
    siteContent,
    generalSizeGuide,
    governorates,
    paymentSettings,
    promoCodes,
    shippingIntegration,
  };
}

function getPublicStore(): PublicStoreData {
  const settings = getSharedSettings();
  const products = listProducts();
  const publicProducts: PublicProduct[] = products.map(({ stock, ...rest }) => ({
    ...rest,
    isSoldOut: stock <= 0,
  }));
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };

  return {
    whatsappNumber: settings.whatsappNumber,
    siteContent: settings.siteContent,
    generalSizeGuide: settings.generalSizeGuide,
    governorates: settings.governorates,
    paymentSettings: settings.paymentSettings,
    promoCodes: settings.promoCodes,
    products: publicProducts,
    ordersCount: Number(countRow?.cnt || 0),
  };
}

function getAdminStorePayload(): {
  store: PublicStoreData;
  orders: Order[];
  paymentAttempts: PaymentAttempt[];
  analytics: StoreAnalytics;
} {
  const settings = getSharedSettings();
  const products = listProducts();
  const orders = listOrders();
  const paymentAttempts = listPaymentAttempts();
  const analytics = computeStoreAnalytics(products, orders, paymentAttempts);

  const adminProducts: PublicProduct[] = products.map((p) => ({
    ...p,
    isSoldOut: p.stock <= 0,
  }));

  return {
    store: {
      whatsappNumber: settings.whatsappNumber,
      siteContent: settings.siteContent,
      generalSizeGuide: settings.generalSizeGuide,
      governorates: settings.governorates,
      paymentSettings: settings.paymentSettings,
      promoCodes: settings.promoCodes,
      shippingIntegration: settings.shippingIntegration,
      products: adminProducts,
      ordersCount: orders.length,
    },
    orders,
    paymentAttempts,
    analytics,
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-admin-token');
  if (!token) {
    res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول كأدمن.' });
    return;
  }
  const session = db.prepare('SELECT token FROM admin_sessions WHERE token = ?').get(token) as
    | { token: string }
    | undefined;
  if (!session) {
    res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول كأدمن.' });
    return;
  }
  next();
}

function generateOrderId(): string {
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${randomPart}`;
}

function generateTransactionId(): string {
  return `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function normalizePhoneDigits(phone: string): string {
  const cleaned = normalizeDigits(phone).replace(/[\s\-()+]/g, '');
  let local = cleaned;
  if (cleaned.startsWith('0020')) local = cleaned.slice(4);
  else if (cleaned.startsWith('20') && cleaned.length >= 12) local = cleaned.slice(2);
  if (/^1[0125][0-9]{8}$/.test(local)) local = `0${local}`;
  return local;
}

function decrementStockInTransaction(items: CartItem[]): { ok: true } | { ok: false; reason: string } {
  const aggregated = new Map<string, number>();
  for (const item of items) {
    aggregated.set(item.id, (aggregated.get(item.id) || 0) + item.qty);
  }

  for (const [prodId, qty] of aggregated.entries()) {
    const prod = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(prodId) as
      | { id: string; name: string; stock: number }
      | undefined;
    if (!prod) {
      return { ok: false, reason: 'أحد المنتجات غير موجود' };
    }
    if (prod.stock <= 0) {
      return { ok: false, reason: `عذراً، المنتج "${prod.name}" نفذت كميته بالكامل (SOLD OUT)` };
    }
    if (prod.stock < qty) {
      return { ok: false, reason: `الكمية المطلوبة من "${prod.name}" غير متوفرة حالياً بالمخزون` };
    }
    const updateRes = db
      .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
      .run(qty, prodId, qty);
    if (updateRes.changes === 0) {
      return { ok: false, reason: `تعذر حجز الكمية المطلوبة من "${prod.name}"` };
    }
  }
  return { ok: true };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/store', (_req, res) => {
    res.json(getPublicStore());
  });

  app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '');
    const storedPassword = getConfigValue<string>(
      'adminPassword',
      DEFAULT_STORE_DATA.adminPassword,
    );
    if (password !== storedPassword) {
      res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO admin_sessions (token, created_at_iso) VALUES (?, ?)').run(
      token,
      new Date().toISOString(),
    );
    res.json({ token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = req.header('x-admin-token');
    if (token) {
      db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/store', requireAdmin, (_req, res) => {
    res.json(getAdminStorePayload());
  });

  app.put('/api/admin/store', requireAdmin, (req, res) => {
    const body = req.body as Partial<StoreData> & {
      newAdminPassword?: string;
      products?: Array<Partial<Product> & { id: string }>;
    };

    db.exec('BEGIN IMMEDIATE');
    try {
      if (Array.isArray(body.products)) {
        const existingProducts = listProducts();
        const existingMap = new Map(existingProducts.map((p) => [p.id, p]));
        db.prepare('DELETE FROM products').run();
        const insertProd = db.prepare(`
          INSERT INTO products (
            id, sort_order, name, price, category, badge, image, sizes, description, extra_details, size_chart, stock
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        body.products.forEach((p, idx) => {
          const prev = existingMap.get(p.id);
          const stockVal =
            typeof p.stock === 'number' && !Number.isNaN(p.stock)
              ? Math.max(0, Math.floor(p.stock))
              : (prev?.stock ?? 0);
          insertProd.run(
            String(p.id),
            idx,
            String(p.name || ''),
            Math.max(0, Number(p.price || 0)),
            String(p.category || 'hoodies'),
            p.badge ? String(p.badge) : null,
            String(p.image || ''),
            JSON.stringify(Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['L']),
            String(p.description || ''),
            p.extraDetails ? String(p.extraDetails) : null,
            p.sizeChart ? String(p.sizeChart) : null,
            stockVal,
          );
        });
      }

      if (Array.isArray(body.governorates)) {
        setConfigValue('governorates', body.governorates);
      }
      if (Array.isArray(body.generalSizeGuide)) {
        setConfigValue('generalSizeGuide', body.generalSizeGuide);
      }
      if (Array.isArray(body.promoCodes)) {
        setConfigValue('promoCodes', body.promoCodes);
      }
      if (body.siteContent) {
        const current = getSharedSettings().siteContent;
        setConfigValue('siteContent', { ...current, ...body.siteContent });
      }
      if (typeof body.whatsappNumber === 'string') {
        setConfigValue('whatsappNumber', body.whatsappNumber.trim());
      }
      if (body.paymentSettings) {
        const current = getSharedSettings().paymentSettings;
        setConfigValue('paymentSettings', {
          ...current,
          ...body.paymentSettings,
          enabledMethods: {
            ...current.enabledMethods,
            ...(body.paymentSettings.enabledMethods || {}),
          },
        });
      }
      if (body.shippingIntegration) {
        const current = getSharedSettings().shippingIntegration;
        setConfigValue('shippingIntegration', {
          ...current,
          ...body.shippingIntegration,
        });
      }
      if (typeof body.newAdminPassword === 'string' && body.newAdminPassword.trim().length >= 4) {
        setConfigValue('adminPassword', body.newAdminPassword.trim());
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({
        error: err instanceof Error ? err.message : 'تعذر حفظ التعديلات في قاعدة البيانات',
      });
      return;
    }

    res.json(getAdminStorePayload());
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json({ orders: listOrders() });
  });

  app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
    const products = listProducts();
    const orders = listOrders();
    const paymentAttempts = listPaymentAttempts();
    res.json({
      analytics: computeStoreAnalytics(products, orders, paymentAttempts),
      paymentAttempts,
    });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { fulfillmentStatus, paymentStatus } = req.body as {
      fulfillmentStatus?: FulfillmentStatus;
      paymentStatus?: PaymentStatus;
    };

    const existingRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
      | Parameters<typeof rowToOrder>[0]
      | undefined;

    if (!existingRow) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    const existing = rowToOrder(existingRow);
    const nextFulfillment = fulfillmentStatus || existing.fulfillmentStatus;
    const nextPayment = paymentStatus || existing.paymentStatus;

    db.exec('BEGIN IMMEDIATE');
    try {
      if (existing.fulfillmentStatus !== 'cancelled' && nextFulfillment === 'cancelled') {
        for (const item of existing.items) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.id);
        }
      } else if (existing.fulfillmentStatus === 'cancelled' && nextFulfillment !== 'cancelled') {
        const stockCheck = decrementStockInTransaction(existing.items);
        if (!stockCheck.ok) {
          db.exec('ROLLBACK');
          res.status(400).json({ error: stockCheck.reason });
          return;
        }
      }

      db.prepare('UPDATE orders SET fulfillment_status = ?, payment_status = ? WHERE id = ?').run(
        nextFulfillment,
        nextPayment,
        id,
      );
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'تعذر تحديث الطلب' });
      return;
    }

    const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Parameters<
      typeof rowToOrder
    >[0];
    res.json({ order: rowToOrder(updatedRow) });
  });

  app.post('/api/admin/orders/:id/dispatch', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const existingRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
      | Parameters<typeof rowToOrder>[0]
      | undefined;

    if (!existingRow) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    const order = rowToOrder(existingRow);
    if (order.fulfillmentStatus === 'cancelled') {
      res.status(400).json({ error: 'لا يمكن شحن طلب ملغي' });
      return;
    }

    const { shippingIntegration } = getSharedSettings();
    const providerTag =
      shippingIntegration.provider === 'none'
        ? '0ONE'
        : shippingIntegration.provider.toUpperCase();
    let waybill =
      order.shipmentWaybill ||
      `AWB-${providerTag}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    let dispatchedViaWebhook = false;

    const webhookUrl = (shippingIntegration.webhookUrl || '').trim();
    if (webhookUrl && /^https?:\/\//i.test(webhookUrl)) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (shippingIntegration.apiKeyHeader?.trim()) {
          headers.Authorization = shippingIntegration.apiKeyHeader.trim();
        }
        const payload = {
          provider: shippingIntegration.provider,
          orderId: order.id,
          transactionId: order.transactionId,
          customer: {
            name: order.customerName,
            phone: order.customerPhone,
            governorate: order.customerGovernorate,
            address: order.customerAddress,
            notes: order.notes || '',
          },
          codAmount: order.paymentMethod === 'cod' ? order.total : 0,
          declaredValue: order.total,
          items: order.items.map((i) => ({
            sku: i.id,
            name: i.name,
            size: i.size,
            quantity: i.qty,
            price: i.price,
          })),
        };
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          res.status(502).json({
            error: `رفضت شركة الشحن الطلب (HTTP ${response.status})`,
          });
          return;
        }
        const json = (await response.json().catch(() => ({}))) as {
          waybill?: string;
          trackingNumber?: string;
        };
        if (json.waybill || json.trackingNumber) {
          waybill = String(json.waybill || json.trackingNumber);
        }
        dispatchedViaWebhook = true;
      } catch (err) {
        res.status(502).json({
          error:
            err instanceof Error
              ? `تعذر الاتصال بـ Webhook شركة الشحن: ${err.message}`
              : 'تعذر الاتصال بشركة الشحن',
        });
        return;
      }
    }

    const dispatchedAt = new Date().toISOString();
    const nextStatus: FulfillmentStatus =
      order.fulfillmentStatus === 'delivered' ? 'delivered' : 'shipped';

    db.prepare(
      'UPDATE orders SET fulfillment_status = ?, shipment_waybill = ?, shipment_dispatched_at = ? WHERE id = ?',
    ).run(nextStatus, waybill, dispatchedAt, id);

    const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Parameters<
      typeof rowToOrder
    >[0];
    res.json({ order: rowToOrder(updatedRow), dispatchedViaWebhook });
  });

  app.delete('/api/admin/orders', requireAdmin, (_req, res) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM orders').run();
      db.prepare('DELETE FROM payment_attempts').run();
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'تعذر مسح السجل' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/checkout/validate-promo', (req, res) => {
    const code = String(req.body?.code || '');
    const { promoCodes } = getSharedSettings();
    const matched = findActivePromo(code, promoCodes);
    if (!matched) {
      res.status(404).json({ error: 'كود الخصم غير صالح أو منتهي الصلاحية' });
      return;
    }
    res.json({ code: matched.code, discountPercent: matched.discountPercent });
  });

  app.post('/api/payments/initiate', (req, res) => {
    const {
      customerName,
      customerPhone,
      governorateIndex,
      customerAddress,
      notes,
      promoCode,
      items,
      paymentMethod,
      card,
      walletPhone,
      instapayRef,
    } = req.body as {
      customerName?: string;
      customerPhone?: string;
      governorateIndex?: number;
      customerAddress?: string;
      notes?: string;
      promoCode?: string;
      items?: Array<{ id: string; size: string; qty: number }>;
      paymentMethod?: PaymentMethod;
      card?: { number: string; holder: string; expiry: string; cvv: string };
      walletPhone?: string;
      instapayRef?: string;
    };

    const name = String(customerName || '').trim();
    const phone = String(customerPhone || '').trim();
    const address = String(customerAddress || '').trim();
    const method: PaymentMethod = paymentMethod || 'card';

    if (name.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال الاسم بالكامل' });
      return;
    }
    if (!isValidEgyptianPhone(phone)) {
      res.status(400).json({ error: 'يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678)' });
      return;
    }
    if (address.length < 5) {
      res.status(400).json({ error: 'يرجى إدخال العنوان بالتفصيل' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'حقيبة التسوق فارغة' });
      return;
    }

    const products = listProducts();
    const settings = getSharedSettings();

    const verifiedItems: CartItem[] = [];
    for (const item of items) {
      const prod = products.find((p) => p.id === item.id);
      if (!prod) {
        res.status(400).json({ error: 'أحد المنتجات غير متاح حالياً' });
        return;
      }
      const qty = Math.max(1, Math.min(20, Math.floor(Number(item.qty) || 1)));
      verifiedItems.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        image: prod.image,
        size: String(item.size || prod.sizes[0] || 'L'),
        qty,
      });
    }

    const govIdx = Number(governorateIndex ?? 0);
    const gov = settings.governorates[govIdx] || settings.governorates[0];
    if (!gov) {
      res.status(400).json({ error: 'يرجى اختيار محافظة صالحة' });
      return;
    }

    const totals = calculateOrderTotals({
      items: verifiedItems,
      baseShippingCost: gov.price,
      freeShippingThreshold: settings.paymentSettings.freeShippingThreshold,
      promoCode,
      promoCodes: settings.promoCodes,
    });

    if (!settings.paymentSettings.enabledMethods[method]) {
      recordPaymentAttempt({
        method,
        status: 'failed',
        reason: 'وسيلة الدفع المختارة معطلة حالياً',
        amount: totals.total,
        customerName: name,
        customerPhone: phone,
      });
      res.status(400).json({ error: 'وسيلة الدفع المختارة غير متاحة حالياً' });
      return;
    }

    const stockCheck = validateStockAvailability(verifiedItems, products);
    if (!stockCheck.ok) {
      recordPaymentAttempt({
        method,
        status: 'failed',
        reason: stockCheck.reason,
        amount: totals.total,
        customerName: name,
        customerPhone: phone,
      });
      res.status(400).json({ error: stockCheck.reason });
      return;
    }

    if (method === 'card') {
      const cardNumber = sanitizeCardNumber(card?.number || '');
      const holder = String(card?.holder || '').trim();
      const expiry = String(card?.expiry || '').trim();
      const cvv = String(card?.cvv || '').trim();

      if (!isValidLuhn(cardNumber)) {
        const reason = 'رقم البطاقة البنكية غير صحيح';
        recordPaymentAttempt({
          method: 'card',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }
      if (holder.length < 3) {
        const reason = 'يرجى إدخال اسم حامل البطاقة';
        recordPaymentAttempt({
          method: 'card',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }
      if (!isValidCardExpiry(expiry)) {
        const reason = 'تاريخ انتهاء البطاقة غير صالح أو منتهي';
        recordPaymentAttempt({
          method: 'card',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }
      if (!isValidCvv(cvv)) {
        const reason = 'رمز الأمان CVV غير صحيح';
        recordPaymentAttempt({
          method: 'card',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }

      const brand = detectCardBrand(cardNumber);
      const last4 = cardNumber.slice(-4);
      const intentId = `INT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      pendingIntents.set(intentId, {
        intentId,
        createdAt: Date.now(),
        method: 'card',
        customerName: name,
        customerPhone: phone,
        customerGovernorate: gov.name,
        customerAddress: address,
        notes: notes?.trim(),
        items: verifiedItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        promoCode: totals.promoCodeApplied || undefined,
        shipping: totals.shipping,
        total: totals.total,
        paymentBrand: brand,
        cardLast4: last4,
      });

      res.json({
        requiresVerification: true,
        verificationType: '3ds',
        intentId,
        brand,
        maskedCard: `•••• •••• •••• ${last4}`,
        total: totals.total,
      });
      return;
    }

    if (method === 'wallet') {
      const wPhone = String(walletPhone || '').trim();
      if (!isValidEgyptianPhone(wPhone)) {
        const reason = 'يرجى إدخال رقم محفظة إلكترونية مصري صحيح';
        recordPaymentAttempt({
          method: 'wallet',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }
      const intentId = `INT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      pendingIntents.set(intentId, {
        intentId,
        createdAt: Date.now(),
        method: 'wallet',
        customerName: name,
        customerPhone: phone,
        customerGovernorate: gov.name,
        customerAddress: address,
        notes: notes?.trim(),
        items: verifiedItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        promoCode: totals.promoCodeApplied || undefined,
        shipping: totals.shipping,
        total: totals.total,
        paymentBrand: 'Mobile Wallet',
        walletPhone: wPhone,
      });

      res.json({
        requiresVerification: true,
        verificationType: 'wallet_otp',
        intentId,
        walletPhone: wPhone,
        total: totals.total,
      });
      return;
    }

    if (method === 'instapay') {
      const ref = String(instapayRef || '').trim();
      if (ref.length < 4) {
        const reason = 'يرجى إدخال رقم مرجع التحويل أو حساب InstaPay المرسل منه';
        recordPaymentAttempt({
          method: 'instapay',
          status: 'failed',
          reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: reason });
        return;
      }

      const order: Order = {
        id: generateOrderId(),
        transactionId: generateTransactionId(),
        date: new Date().toLocaleString('ar-EG'),
        createdAtIso: new Date().toISOString(),
        customerName: name,
        customerPhone: phone,
        customerGovernorate: gov.name,
        customerAddress: address,
        notes: notes?.trim(),
        items: verifiedItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        promoCode: totals.promoCodeApplied || undefined,
        shipping: totals.shipping,
        total: totals.total,
        paymentMethod: 'instapay',
        paymentBrand: 'InstaPay',
        paymentReference: ref,
        paymentStatus: 'pending_verification',
        fulfillmentStatus: 'confirmed',
      };

      db.exec('BEGIN IMMEDIATE');
      try {
        const deduct = decrementStockInTransaction(verifiedItems);
        if (!deduct.ok) {
          db.exec('ROLLBACK');
          recordPaymentAttempt({
            method: 'instapay',
            status: 'failed',
            reason: deduct.reason,
            amount: totals.total,
            customerName: name,
            customerPhone: phone,
          });
          res.status(400).json({ error: deduct.reason });
          return;
        }
        insertOrder(order);
        recordPaymentAttempt({
          method: 'instapay',
          status: 'succeeded',
          reason: 'طلب InstaPay مسجل بانتظار المراجعة',
          amount: order.total,
          customerName: name,
          customerPhone: phone,
          orderId: order.id,
        });
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        res.status(500).json({ error: err instanceof Error ? err.message : 'تعذر حفظ الطلب' });
        return;
      }

      res.json({ requiresVerification: false, order });
      return;
    }

    // Cash on Delivery (COD)
    const order: Order = {
      id: generateOrderId(),
      transactionId: generateTransactionId(),
      date: new Date().toLocaleString('ar-EG'),
      createdAtIso: new Date().toISOString(),
      customerName: name,
      customerPhone: phone,
      customerGovernorate: gov.name,
      customerAddress: address,
      notes: notes?.trim(),
      items: verifiedItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      promoCode: totals.promoCodeApplied || undefined,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod: 'cod',
      paymentBrand: 'Cash on Delivery',
      paymentStatus: 'cod_pending',
      fulfillmentStatus: 'confirmed',
    };

    db.exec('BEGIN IMMEDIATE');
    try {
      const deduct = decrementStockInTransaction(verifiedItems);
      if (!deduct.ok) {
        db.exec('ROLLBACK');
        recordPaymentAttempt({
          method: 'cod',
          status: 'failed',
          reason: deduct.reason,
          amount: totals.total,
          customerName: name,
          customerPhone: phone,
        });
        res.status(400).json({ error: deduct.reason });
        return;
      }
      insertOrder(order);
      recordPaymentAttempt({
        method: 'cod',
        status: 'succeeded',
        reason: 'تم تأكيد طلب الدفع عند الاستلام',
        amount: order.total,
        customerName: name,
        customerPhone: phone,
        orderId: order.id,
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'تعذر حفظ الطلب' });
      return;
    }

    res.json({ requiresVerification: false, order });
  });

  app.post('/api/payments/confirm', (req, res) => {
    const intentId = String(req.body?.intentId || '').trim();
    const otp = normalizeDigits(String(req.body?.otp || '')).trim();
    const intent = pendingIntents.get(intentId);

    if (!intent) {
      res.status(404).json({ error: 'جلسة الدفع غير صالحة أو منتهية' });
      return;
    }

    if (otp !== '123456') {
      const reason = 'رمز التحقق OTP غير صحيح (استخدم 123456 للتأكيد)';
      recordPaymentAttempt({
        method: intent.method,
        status: 'failed',
        reason: 'فشل تأكيد OTP (رمز غير صحيح)',
        amount: intent.total,
        customerName: intent.customerName,
        customerPhone: intent.customerPhone,
      });
      res.status(400).json({ error: reason });
      return;
    }

    const order: Order = {
      id: generateOrderId(),
      transactionId: generateTransactionId(),
      date: new Date().toLocaleString('ar-EG'),
      createdAtIso: new Date().toISOString(),
      customerName: intent.customerName,
      customerPhone: intent.customerPhone,
      customerGovernorate: intent.customerGovernorate,
      customerAddress: intent.customerAddress,
      notes: intent.notes,
      items: intent.items,
      subtotal: intent.subtotal,
      discountAmount: intent.discountAmount,
      promoCode: intent.promoCode,
      shipping: intent.shipping,
      total: intent.total,
      paymentMethod: intent.method,
      paymentBrand: intent.paymentBrand,
      cardLast4: intent.cardLast4,
      paymentReference: intent.walletPhone,
      paymentStatus: 'paid',
      fulfillmentStatus: 'confirmed',
    };

    db.exec('BEGIN IMMEDIATE');
    try {
      const deduct = decrementStockInTransaction(intent.items);
      if (!deduct.ok) {
        db.exec('ROLLBACK');
        recordPaymentAttempt({
          method: intent.method,
          status: 'failed',
          reason: deduct.reason,
          amount: intent.total,
          customerName: intent.customerName,
          customerPhone: intent.customerPhone,
        });
        res.status(400).json({ error: deduct.reason });
        return;
      }
      insertOrder(order);
      recordPaymentAttempt({
        method: intent.method,
        status: 'succeeded',
        reason: `تم الدفع الإلكتروني بنجاح (${intent.paymentBrand})`,
        amount: order.total,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderId: order.id,
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'تعذر تأكيد الطلب' });
      return;
    }

    pendingIntents.delete(intentId);
    res.json({ order });
  });

  app.get('/api/orders/track', (req, res) => {
    const orderId = String(req.query.orderId || '').trim().toUpperCase();
    const phone = normalizePhoneDigits(String(req.query.phone || ''));

    if (!orderId || !phone) {
      res.status(400).json({ error: 'يرجى إدخال رقم الطلب ورقم الموبايل' });
      return;
    }

    const row = db.prepare('SELECT * FROM orders WHERE UPPER(id) = ?').get(orderId) as
      | Parameters<typeof rowToOrder>[0]
      | undefined;
    if (!row || normalizePhoneDigits(row.customer_phone) !== phone) {
      res.status(404).json({ error: 'لم يتم العثور على طلب بهذه البيانات' });
      return;
    }

    res.json({ order: rowToOrder(row) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`∅ ONE™ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

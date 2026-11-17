import type {
  FulfillmentStatus,
  Order,
  PaymentAttempt,
  PaymentMethod,
  PaymentStatus,
  Product,
  PublicStoreData,
  StoreAnalytics,
  StoreData,
} from '../types/store';

export interface AdminStoreResponse {
  store: PublicStoreData;
  orders: Order[];
  paymentAttempts: PaymentAttempt[];
  analytics: StoreAnalytics;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'حدث خطأ في الاتصال بالخادم');
  }
  return data as T;
}

export async function fetchStore(): Promise<PublicStoreData> {
  const res = await fetch('/api/store');
  return parseJson<PublicStoreData>(res);
}

export async function adminLogin(password: string): Promise<{ token: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return parseJson<{ token: string }>(res);
}

export async function adminLogout(token: string): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers: { 'x-admin-token': token },
  });
}

export async function fetchAdminStore(token: string): Promise<AdminStoreResponse> {
  const res = await fetch('/api/admin/store', {
    headers: { 'x-admin-token': token },
  });
  return parseJson<AdminStoreResponse>(res);
}

export async function updateAdminStore(
  token: string,
  payload: Partial<Omit<StoreData, 'products'>> & {
    products?: Array<Partial<Product> & { id: string }>;
    newAdminPassword?: string;
  },
): Promise<AdminStoreResponse> {
  const res = await fetch('/api/admin/store', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify(payload),
  });
  return parseJson<AdminStoreResponse>(res);
}

export async function fetchAdminOrders(token: string): Promise<{ orders: Order[] }> {
  const res = await fetch('/api/admin/orders', {
    headers: { 'x-admin-token': token },
  });
  return parseJson<{ orders: Order[] }>(res);
}

export async function fetchAdminAnalytics(token: string): Promise<{
  analytics: StoreAnalytics;
  paymentAttempts: PaymentAttempt[];
}> {
  const res = await fetch('/api/admin/analytics', {
    headers: { 'x-admin-token': token },
  });
  return parseJson<{ analytics: StoreAnalytics; paymentAttempts: PaymentAttempt[] }>(res);
}

export async function updateAdminOrder(
  token: string,
  orderId: string,
  patch: { fulfillmentStatus?: FulfillmentStatus; paymentStatus?: PaymentStatus },
): Promise<{ order: Order }> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify(patch),
  });
  return parseJson<{ order: Order }>(res);
}

export async function dispatchAdminOrder(
  token: string,
  orderId: string,
): Promise<{ order: Order; dispatchedViaWebhook: boolean }> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/dispatch`, {
    method: 'POST',
    headers: { 'x-admin-token': token },
  });
  return parseJson<{ order: Order; dispatchedViaWebhook: boolean }>(res);
}

export async function clearAdminOrders(token: string): Promise<void> {
  const res = await fetch('/api/admin/orders', {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function validatePromoCode(
  code: string,
): Promise<{ code: string; discountPercent: number }> {
  const res = await fetch('/api/checkout/validate-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return parseJson<{ code: string; discountPercent: number }>(res);
}

export interface InitiatePaymentPayload {
  customerName: string;
  customerPhone: string;
  governorateIndex: number;
  customerAddress: string;
  notes?: string;
  promoCode?: string;
  items: Array<{ id: string; size: string; qty: number }>;
  paymentMethod: PaymentMethod;
  card?: { number: string; holder: string; expiry: string; cvv: string };
  walletPhone?: string;
  instapayRef?: string;
}

export type InitiatePaymentResponse =
  | {
      requiresVerification: true;
      verificationType: '3ds' | 'wallet_otp';
      intentId: string;
      brand?: string;
      maskedCard?: string;
      walletPhone?: string;
      total: number;
    }
  | {
      requiresVerification: false;
      order: Order;
    };

export async function initiatePayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResponse> {
  const res = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<InitiatePaymentResponse>(res);
}

export async function confirmPayment(intentId: string, otp: string): Promise<{ order: Order }> {
  const res = await fetch('/api/payments/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intentId, otp }),
  });
  return parseJson<{ order: Order }>(res);
}

export async function trackOrder(orderId: string, phone: string): Promise<{ order: Order }> {
  const params = new URLSearchParams({ orderId, phone });
  const res = await fetch(`/api/orders/track?${params.toString()}`);
  return parseJson<{ order: Order }>(res);
}

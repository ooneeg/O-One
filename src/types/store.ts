export type ProductCategory = 'hoodies' | 'tees' | 'pants';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  badge?: string;
  image: string;
  sizes: string[];
  description: string;
  extraDetails?: string;
  sizeChart?: string;
  stock: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  badge?: string;
  image: string;
  sizes: string[];
  description: string;
  extraDetails?: string;
  sizeChart?: string;
  isSoldOut: boolean;
  stock?: number;
}

export interface GovernorateShipping {
  name: string;
  price: number;
}

export interface SizeGuideRow {
  size: string;
  chest: string;
  length: string;
  shoulder: string;
}

export interface SiteContent {
  announcement: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  manifestoHeadline: string;
  manifestoSub: string;
  manifestoBody: string;
  footerContact: string;
}

export type PaymentMethod = 'card' | 'wallet' | 'instapay' | 'cod';

export type PaymentStatus = 'paid' | 'pending_verification' | 'cod_pending' | 'failed';

export type FulfillmentStatus = 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface PromoCode {
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface PaymentSettings {
  freeShippingThreshold: number;
  instapayHandle: string;
  walletNumber: string;
  enabledMethods: {
    card: boolean;
    wallet: boolean;
    instapay: boolean;
    cod: boolean;
  };
}

export type ShippingProvider = 'none' | 'bosta' | 'aramex' | 'mylerz' | 'custom';

export interface ShippingIntegrationConfig {
  provider: ShippingProvider;
  webhookUrl: string;
  apiKeyHeader?: string;
  autoDispatch: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  qty: number;
}

export interface Order {
  id: string;
  transactionId: string;
  date: string;
  createdAtIso: string;
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
  paymentMethod: PaymentMethod;
  paymentBrand?: string;
  cardLast4?: string;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipmentWaybill?: string;
  shipmentDispatchedAt?: string;
}

export interface PaymentAttempt {
  id: string;
  createdAtIso: string;
  method: PaymentMethod;
  status: 'succeeded' | 'failed';
  reason: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  orderId?: string;
}

export interface ProductAnalyticsRow {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  remainingStock: number;
  unitsSold: number;
  revenue: number;
  isSoldOut: boolean;
}

export interface StoreAnalytics {
  totalRevenue: number;
  paidRevenue: number;
  totalUnitsSold: number;
  totalRemainingStock: number;
  soldOutProductsCount: number;
  successfulOrdersCount: number;
  cancelledOrdersCount: number;
  failedAttemptsCount: number;
  successRatePercent: number;
  productBreakdown: ProductAnalyticsRow[];
}

export interface StoreData {
  adminPassword: string;
  whatsappNumber: string;
  siteContent: SiteContent;
  generalSizeGuide: SizeGuideRow[];
  governorates: GovernorateShipping[];
  products: Product[];
  paymentSettings: PaymentSettings;
  promoCodes: PromoCode[];
  shippingIntegration: ShippingIntegrationConfig;
  orders: Order[];
  paymentAttempts: PaymentAttempt[];
}

export type PublicStoreData = Omit<
  StoreData,
  'adminPassword' | 'orders' | 'products' | 'shippingIntegration' | 'paymentAttempts'
> & {
  products: PublicProduct[];
  ordersCount: number;
  shippingIntegration?: ShippingIntegrationConfig;
};

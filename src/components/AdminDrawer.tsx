import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  Download,
  KeyRound,
  Pencil,
  PenSquare,
  Plus,
  Printer,
  Receipt,
  Ruler,
  Send,
  Shirt,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import type {
  FulfillmentStatus,
  GovernorateShipping,
  Order,
  PaymentAttempt,
  PaymentSettings,
  Product,
  ProductCategory,
  PromoCode,
  PublicProduct,
  PublicStoreData,
  ShippingIntegrationConfig,
  ShippingProvider,
  SiteContent,
  SizeGuideRow,
  StoreAnalytics,
} from '../types/store';
import {
  clearAdminOrders,
  dispatchAdminOrder,
  fetchAdminStore,
  updateAdminOrder,
  updateAdminStore,
} from '../utils/api';
import {
  buildInventoryCsv,
  buildOrdersCsv,
  computeStoreAnalytics,
  formatEgp,
} from '../utils/commerce';
import { SmartImage } from './SmartImage';

export type AdminTab =
  | 'products'
  | 'analytics'
  | 'shipping'
  | 'payments'
  | 'sizes'
  | 'content'
  | 'orders'
  | 'security';

interface AdminDrawerProps {
  open: boolean;
  activeTab: AdminTab;
  token: string;
  store: PublicStoreData;
  editingProduct: PublicProduct | null;
  onChangeTab: (tab: AdminTab) => void;
  onClose: () => void;
  onStoreUpdated: (nextStore: PublicStoreData) => void;
  onClearEditingProduct: () => void;
  onNotify: (msg: string) => void;
}

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'products', label: 'المنتجات والمخزون' },
  { id: 'analytics', label: 'التحليلات والمبيعات' },
  { id: 'orders', label: 'الطلبات' },
  { id: 'shipping', label: 'الشحن والربط' },
  { id: 'payments', label: 'المدفوعات والعروض' },
  { id: 'sizes', label: 'جدول المقاسات' },
  { id: 'content', label: 'الواجهة' },
  { id: 'security', label: 'الأمان' },
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  hoodies: 'هوديز',
  tees: 'تيشيرتات',
  pants: 'بناطيل',
};

function downloadCsvFile(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminDrawer({
  open,
  activeTab,
  token,
  store,
  editingProduct,
  onChangeTab,
  onClose,
  onStoreUpdated,
  onClearEditingProduct,
  onNotify,
}: AdminDrawerProps) {
  const [editId, setEditId] = useState<string>('');
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodCat, setProdCat] = useState<ProductCategory>('hoodies');
  const [prodBadge, setProdBadge] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodSizes, setProdSizes] = useState('S, M, L, XL');
  const [prodDesc, setProdDesc] = useState('');
  const [prodExtra, setProdExtra] = useState('');
  const [prodSizeChart, setProdSizeChart] = useState('');

  const [govs, setGovs] = useState<GovernorateShipping[]>(store.governorates);
  const [newGovName, setNewGovName] = useState('');
  const [newGovPrice, setNewGovPrice] = useState('');
  const [shipIntegration, setShipIntegration] = useState<ShippingIntegrationConfig>(
    store.shippingIntegration || {
      provider: 'none',
      webhookUrl: '',
      apiKeyHeader: '',
      autoDispatch: false,
    },
  );

  const [paySettings, setPaySettings] = useState<PaymentSettings>(store.paymentSettings);
  const [promos, setPromos] = useState<PromoCode[]>(store.promoCodes);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPercent, setNewPromoPercent] = useState('10');

  const [sizeRows, setSizeRows] = useState<SizeGuideRow[]>(store.generalSizeGuide);
  const [siteContent, setSiteContent] = useState<SiteContent>(store.siteContent);
  const [whatsappNumber, setWhatsappNumber] = useState(store.whatsappNumber);

  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [analytics, setAnalytics] = useState<StoreAnalytics>(() =>
    computeStoreAnalytics(
      store.products.map((p) => ({ ...p, stock: typeof p.stock === 'number' ? p.stock : 0 })),
      [],
      [],
    ),
  );
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'inventory' | 'orders'>('inventory');

  useEffect(() => {
    setGovs(store.governorates);
    setPaySettings(store.paymentSettings);
    setPromos(store.promoCodes);
    setSizeRows(store.generalSizeGuide);
    setSiteContent(store.siteContent);
    setWhatsappNumber(store.whatsappNumber);
    if (store.shippingIntegration) {
      setShipIntegration(store.shippingIntegration);
    }
  }, [store]);

  useEffect(() => {
    if (editingProduct) {
      setEditId(editingProduct.id);
      setProdName(editingProduct.name);
      setProdPrice(String(editingProduct.price));
      setProdStock(String(typeof editingProduct.stock === 'number' ? editingProduct.stock : 0));
      setProdCat(editingProduct.category);
      setProdBadge(editingProduct.badge || '');
      setProdImage(editingProduct.image);
      setProdSizes(editingProduct.sizes.join(', '));
      setProdDesc(editingProduct.description);
      setProdExtra(editingProduct.extraDetails || '');
      setProdSizeChart(editingProduct.sizeChart || '');
    }
  }, [editingProduct]);

  async function refreshAdminData() {
    if (!token) return;
    try {
      const data = await fetchAdminStore(token);
      onStoreUpdated(data.store);
      setOrders(data.orders);
      setPaymentAttempts(data.paymentAttempts);
      setAnalytics(data.analytics);
    } catch {
      // ignore background refresh error
    }
  }

  useEffect(() => {
    if (open && token) {
      void refreshAdminData();
    }
  }, [open, token, activeTab]);

  if (!open) return null;

  function resetProdForm() {
    setEditId('');
    setProdName('');
    setProdPrice('');
    setProdStock('10');
    setProdCat('hoodies');
    setProdBadge('');
    setProdImage('');
    setProdSizes('S, M, L, XL');
    setProdDesc('');
    setProdExtra('');
    setProdSizeChart('');
    onClearEditingProduct();
  }

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
        onNotify('تم رفع الصورة بنجاح');
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveStorePatch(patch: Parameters<typeof updateAdminStore>[1], msg: string) {
    setSaving(true);
    try {
      const updated = await updateAdminStore(token, patch);
      onStoreUpdated(updated.store);
      setOrders(updated.orders);
      setPaymentAttempts(updated.paymentAttempts);
      setAnalytics(updated.analytics);
      onNotify(msg);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(prodPrice);
    const stockNum = Math.max(0, Math.floor(Number(prodStock)));
    if (!prodName.trim() || Number.isNaN(priceNum) || priceNum <= 0 || Number.isNaN(stockNum)) {
      onNotify('يرجى إدخال اسم المنتج والسعر والكمية المتوفرة بشكل صحيح');
      return;
    }

    const sizesList = prodSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const productObj: Product = {
      id: editId || `prod-${Date.now()}`,
      name: prodName.trim(),
      price: priceNum,
      category: prodCat,
      badge: prodBadge.trim() || undefined,
      image:
        prodImage.trim() || '/src/assets/images/product_binary_hoodie_1794940767464.jpg',
      sizes: sizesList.length > 0 ? sizesList : ['S', 'M', 'L', 'XL'],
      description: prodDesc.trim(),
      extraDetails: prodExtra.trim() || undefined,
      sizeChart: prodSizeChart.trim() || undefined,
      stock: stockNum,
    };

    const existingAsProducts: Product[] = store.products.map((p) => ({
      ...p,
      stock: typeof p.stock === 'number' ? p.stock : 0,
    }));

    const nextProducts = editId
      ? existingAsProducts.map((p) => (p.id === editId ? productObj : p))
      : [productObj, ...existingAsProducts];

    await saveStorePatch(
      { products: nextProducts },
      editId ? 'تم تعديل المنتج والمخزون وحفظه' : 'تمت إضافة المنتج الجديد ونشره',
    );
    resetProdForm();
  }

  async function handleDeleteProduct(id: string) {
    const nextProducts = store.products
      .filter((p) => p.id !== id)
      .map((p) => ({ ...p, stock: typeof p.stock === 'number' ? p.stock : 0 }));
    await saveStorePatch({ products: nextProducts }, 'تم حذف المنتج');
  }

  async function handleSaveShipping() {
    await saveStorePatch(
      {
        governorates: govs,
        paymentSettings: paySettings,
        shippingIntegration: shipIntegration,
      },
      'تم حفظ إعدادات الشحن والربط مع شركة التوصيل',
    );
  }

  function handleAddGovernorate() {
    const priceNum = Number(newGovPrice);
    if (!newGovName.trim() || Number.isNaN(priceNum)) {
      onNotify('أدخل اسم المحافظة وسعر الشحن');
      return;
    }
    setGovs([...govs, { name: newGovName.trim(), price: priceNum }]);
    setNewGovName('');
    setNewGovPrice('');
  }

  async function handleSavePayments() {
    await saveStorePatch(
      {
        paymentSettings: paySettings,
        promoCodes: promos,
      },
      'تم حفظ إعدادات الدفع الإلكتروني وأكواد الخصم',
    );
  }

  function handleAddPromo() {
    const pct = Number(newPromoPercent);
    const code = newPromoCode.trim().toUpperCase();
    if (!code || Number.isNaN(pct) || pct <= 0 || pct > 90) {
      onNotify('أدخل كود خصم ونسبة صالحة (1-90%)');
      return;
    }
    setPromos([...promos, { code, discountPercent: pct, active: true }]);
    setNewPromoCode('');
  }

  async function handleUpdateOrderStatus(orderId: string, fulfillmentStatus: FulfillmentStatus) {
    try {
      const { order } = await updateAdminOrder(token, orderId, { fulfillmentStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
      await refreshAdminData();
      onNotify('تم تحديث حالة الطلب');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تحديث الطلب');
    }
  }

  async function handleVerifyInstapay(orderId: string) {
    try {
      const { order } = await updateAdminOrder(token, orderId, { paymentStatus: 'paid' });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
      await refreshAdminData();
      onNotify('تم تأكيد استلام التحويل');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تأكيد التحويل');
    }
  }

  async function handleDispatchToCourier(orderId: string) {
    setDispatchingId(orderId);
    try {
      const { order, dispatchedViaWebhook } = await dispatchAdminOrder(token, orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
      onNotify(
        dispatchedViaWebhook
          ? `تم إرسال الطلب لشركة الشحن بنجاح (${order.shipmentWaybill})`
          : `تم إصدار بوليصة الشحن وتجهيز الطلب (${order.shipmentWaybill})`,
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر إرسال الطلب لشركة الشحن');
    } finally {
      setDispatchingId(null);
    }
  }

  async function handleClearOrders() {
    try {
      await clearAdminOrders(token);
      setOrders([]);
      setPaymentAttempts([]);
      await refreshAdminData();
      onNotify('تم مسح سجل الطلبات والتحليلات');
    } catch {
      onNotify('تعذر مسح سجل الطلبات');
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      onNotify('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    await saveStorePatch({ newAdminPassword: newPassword.trim() }, 'تم تحديث كلمة المرور بنجاح');
    setNewPassword('');
  }

  function triggerPrint(mode: 'inventory' | 'orders') {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 80);
  }

  function handleExportOrdersCsv() {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`0one-orders-${today}.csv`, buildOrdersCsv(orders));
    onNotify('تم تصدير ملف بيانات العملاء والطلبات (CSV)');
  }

  function handleExportInventoryCsv() {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`0one-inventory-${today}.csv`, buildInventoryCsv(analytics.productBreakdown));
    onNotify('تم تصدير تقرير المخزون والقطع المتوفرة (CSV)');
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="لوحة تحكم الأدمن" className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm print:hidden"
      />
      <aside className="absolute top-0 right-0 bottom-0 w-full max-w-3xl bg-charcoal border-l border-white/15 flex flex-col shadow-2xl print:hidden">
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-obsidian">
          <div>
            <p className="text-[11px] font-mono text-emerald-400">AUTHENTICATED OWNER</p>
            <h2 className="font-display font-extrabold text-xl text-white">
              لوحة تحكم <span dir="ltr" className="inline-block">∅ ONE</span> الكاملة
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق لوحة التحكم"
            className="w-9 h-9 rounded-xl bg-white/10 text-white hover:bg-white hover:text-black transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="أقسام لوحة التحكم"
          className="flex flex-wrap border-b border-white/10 bg-obsidian/60 px-4 gap-1"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(tab.id)}
                className={`py-2.5 px-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {tab.id === 'products' && <Shirt className="w-3.5 h-3.5" />}
                {tab.id === 'analytics' && <BarChart3 className="w-3.5 h-3.5" />}
                {tab.id === 'shipping' && <Truck className="w-3.5 h-3.5" />}
                {tab.id === 'payments' && <CreditCard className="w-3.5 h-3.5" />}
                {tab.id === 'sizes' && <Ruler className="w-3.5 h-3.5" />}
                {tab.id === 'content' && <PenSquare className="w-3.5 h-3.5" />}
                {tab.id === 'orders' && <Receipt className="w-3.5 h-3.5" />}
                {tab.id === 'security' && <KeyRound className="w-3.5 h-3.5" />}
                <span>
                  {tab.label}
                  {tab.id === 'orders' ? ` (${orders.length})` : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'products' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProduct}
                className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4"
              >
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>{editId ? `تعديل المنتج: ${prodName}` : 'إضافة منتج جديد للمتجر'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label htmlFor="adm-pname" className="text-xs text-neutral-400 block mb-1">
                      اسم القطعة
                    </label>
                    <input
                      id="adm-pname"
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="01 Binary Heavy Hoodie"
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-pprice" className="text-xs text-neutral-400 block mb-1">
                      السعر (EGP)
                    </label>
                    <input
                      id="adm-pprice"
                      type="number"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="1450"
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-pstock" className="text-xs text-neutral-400 block mb-1">
                      الكمية المتوفرة (للأدمن فقط)
                    </label>
                    <input
                      id="adm-pstock"
                      type="number"
                      min={0}
                      required
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      placeholder="15"
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="adm-pcat" className="text-xs text-neutral-400 block mb-1">
                      القسم
                    </label>
                    <select
                      id="adm-pcat"
                      value={prodCat}
                      onChange={(e) => setProdCat(e.target.value as ProductCategory)}
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    >
                      <option value="hoodies">هوديز (Hoodies)</option>
                      <option value="tees">تيشيرتات (Oversized Tees)</option>
                      <option value="pants">بناطيل (Pants)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adm-pbadge" className="text-xs text-neutral-400 block mb-1">
                      وسم فرعي (اختياري)
                    </label>
                    <input
                      id="adm-pbadge"
                      type="text"
                      value={prodBadge}
                      onChange={(e) => setProdBadge(e.target.value)}
                      placeholder="NEW DROP"
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adm-pimg" className="text-xs text-neutral-400 block mb-1">
                    صورة المنتج (رابط أو رفع من جهازك)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="adm-pimg"
                      type="text"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="/src/assets/images/..."
                      className="flex-1 bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setProdImage)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="adm-psizes" className="text-xs text-neutral-400 block mb-1">
                    المقاسات المتاحة (افصل بفاصلة)
                  </label>
                  <input
                    id="adm-psizes"
                    type="text"
                    value={prodSizes}
                    onChange={(e) => setProdSizes(e.target.value)}
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="adm-pdesc" className="text-xs text-neutral-400 block mb-1">
                    الوصف العام
                  </label>
                  <textarea
                    id="adm-pdesc"
                    rows={2}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label htmlFor="adm-pextra" className="text-xs text-neutral-300 block mb-1">
                    مواصفات وتفاصيل إضافية
                  </label>
                  <textarea
                    id="adm-pextra"
                    rows={2}
                    value={prodExtra}
                    onChange={(e) => setProdExtra(e.target.value)}
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label htmlFor="adm-pchart" className="text-xs text-neutral-300 block mb-1">
                    جدول مقاسات القطعة
                  </label>
                  <textarea
                    id="adm-pchart"
                    rows={2}
                    value={prodSizeChart}
                    onChange={(e) => setProdSizeChart(e.target.value)}
                    placeholder="S: الصدر 58 سم | الطول 69 سم"
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : editId ? 'تحديث القطعة' : 'حفظ ونشر القطعة'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={resetProdForm}
                      className="px-4 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-sm"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-neutral-300">
                    المنتجات الحالية ({store.products.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => triggerPrint('inventory')}
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 bg-obsidian border border-white/15 px-3 py-1.5 rounded-lg"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة المخزون</span>
                  </button>
                </div>
                {store.products.map((p) => {
                  const stockVal = typeof p.stock === 'number' ? p.stock : 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 bg-obsidian p-3 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SmartImage
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-14 object-cover rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400 tabular-nums mt-0.5">
                            <span dir="ltr">{formatEgp(p.price)}</span>
                            <span>·</span>
                            <span>{CATEGORY_LABELS[p.category]}</span>
                            <span>·</span>
                            <span
                              className={
                                stockVal <= 0
                                  ? 'text-red-400 font-bold'
                                  : stockVal <= 3
                                    ? 'text-amber-300 font-bold'
                                    : 'text-emerald-400 font-bold'
                              }
                            >
                              {stockVal <= 0 ? 'SOLD OUT (0)' : `المتبقي: ${stockVal} قطعة`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-label={`تعديل ${p.name}`}
                          onClick={() => {
                            setEditId(p.id);
                            setProdName(p.name);
                            setProdPrice(String(p.price));
                            setProdStock(String(stockVal));
                            setProdCat(p.category);
                            setProdBadge(p.badge || '');
                            setProdImage(p.image);
                            setProdSizes(p.sizes.join(', '));
                            setProdDesc(p.description);
                            setProdExtra(p.extraDetails || '');
                            setProdSizeChart(p.sizeChart || '');
                          }}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white hover:text-black transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`حذف ${p.name}`}
                          onClick={() => void handleDeleteProduct(p.id)}
                          className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-base">تراكر المبيعات والمخزون للأدمن</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    إحصائيات حية للقطع المباعة والمتبقية والعمليات الناجحة والفاشلة
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportInventoryCsv}
                    className="bg-obsidian border border-white/15 hover:border-white/40 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير المخزون CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPrint('inventory')}
                    className="bg-white text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-200 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة تقرير المتجر</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-obsidian border border-white/10 rounded-2xl p-4 space-y-1">
                  <p className="text-[11px] text-neutral-400">إجمالي المبيعات</p>
                  <p dir="ltr" className="font-mono font-bold text-lg text-emerald-400 tabular-nums text-right">
                    {formatEgp(analytics.totalRevenue)}
                  </p>
                  <p dir="ltr" className="text-[11px] font-mono text-neutral-500 tabular-nums text-right">
                    Paid: {formatEgp(analytics.paidRevenue)}
                  </p>
                </div>

                <div className="bg-obsidian border border-white/10 rounded-2xl p-4 space-y-1">
                  <p className="text-[11px] text-neutral-400">القطع المباعة</p>
                  <p className="font-mono font-bold text-lg text-white tabular-nums">
                    {analytics.totalUnitsSold} قطعة
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    طلبات فعّالة: {analytics.successfulOrdersCount}
                  </p>
                </div>

                <div className="bg-obsidian border border-white/10 rounded-2xl p-4 space-y-1">
                  <p className="text-[11px] text-neutral-400">المتبقي بالمخزون</p>
                  <p className="font-mono font-bold text-lg text-white tabular-nums">
                    {analytics.totalRemainingStock} قطعة
                  </p>
                  <p className="text-[11px] text-red-400">
                    نفذت كميتها: {analytics.soldOutProductsCount}
                  </p>
                </div>

                <div className="bg-obsidian border border-white/10 rounded-2xl p-4 space-y-1">
                  <p className="text-[11px] text-neutral-400">نجاح / فشل الدفع</p>
                  <p className="font-mono font-bold text-lg text-white tabular-nums">
                    {analytics.successRatePercent}%
                  </p>
                  <p className="text-[11px] text-neutral-400 tabular-nums">
                    <span className="text-emerald-400">{analytics.successfulOrdersCount} ناجحة</span>
                    {' · '}
                    <span className="text-red-400">
                      {analytics.failedAttemptsCount + analytics.cancelledOrdersCount} فاشلة/ملغاة
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-sm text-white">تفاصيل المخزون والمبيعات لكل منتج</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse tabular-nums">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="py-2.5 pl-3">القطعة</th>
                        <th className="py-2.5 px-2">السعر</th>
                        <th className="py-2.5 px-2">المباع</th>
                        <th className="py-2.5 px-2">المتبقي</th>
                        <th className="py-2.5 px-2">الإيرادات</th>
                        <th className="py-2.5 pr-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {analytics.productBreakdown.map((row) => (
                        <tr key={row.id}>
                          <td dir="ltr" className="py-2.5 pl-3 font-semibold text-white text-right">
                            {row.name}
                          </td>
                          <td dir="ltr" className="py-2.5 px-2 font-mono text-neutral-300 text-right">
                            {formatEgp(row.price)}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-white">{row.unitsSold}</td>
                          <td
                            className={`py-2.5 px-2 font-mono font-bold ${
                              row.remainingStock <= 0
                                ? 'text-red-400'
                                : row.remainingStock <= 3
                                  ? 'text-amber-300'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {row.remainingStock}
                          </td>
                          <td dir="ltr" className="py-2.5 px-2 font-mono text-emerald-400 text-right">
                            {formatEgp(row.revenue)}
                          </td>
                          <td className="py-2.5 pr-2">
                            {row.isSoldOut ? (
                              <span dir="ltr" className="font-mono font-bold text-red-400">
                                SOLD OUT
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">متوفر</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-sm text-white">
                  سجل محاولات الدفع (الناجحة والفاشلة — {paymentAttempts.length})
                </h4>
                {paymentAttempts.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-4 text-center">
                    لا توجد محاولات دفع مسجلة حتى الآن.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {paymentAttempts.map((att) => (
                      <div
                        key={att.id}
                        className="flex flex-wrap items-center justify-between gap-2 bg-charcoal border border-white/10 rounded-xl px-3.5 py-2.5 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                att.status === 'succeeded' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {att.status === 'succeeded' ? 'عملية ناجحة' : 'عملية فاشلة'}
                            </span>
                            <span className="text-neutral-500">·</span>
                            <span dir="ltr" className="font-mono uppercase text-neutral-300">
                              {att.method}
                            </span>
                            {att.orderId && (
                              <>
                                <span className="text-neutral-500">·</span>
                                <span dir="ltr" className="font-mono text-white">
                                  {att.orderId}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-neutral-300">
                            {att.reason}
                            {att.customerName ? ` — ${att.customerName}` : ''}
                          </p>
                        </div>
                        <div className="text-left" dir="ltr">
                          <p className="font-mono font-bold text-white tabular-nums">
                            {formatEgp(att.amount)}
                          </p>
                          <p className="font-mono text-[10px] text-neutral-500">
                            {new Date(att.createdAtIso).toLocaleString('ar-EG')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-5">
              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-5">
                <h3 className="font-bold text-white text-base">إدارة المحافظات وحد الشحن المجاني</h3>

                <div>
                  <label htmlFor="adm-free-ship" className="block text-xs text-neutral-400 mb-1">
                    حد الشحن المجاني (EGP) — اجعله 0 لإلغاء الشحن المجاني
                  </label>
                  <input
                    id="adm-free-ship"
                    type="number"
                    value={paySettings.freeShippingThreshold}
                    onChange={(e) =>
                      setPaySettings({
                        ...paySettings,
                        freeShippingThreshold: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>

                <div className="flex gap-2 bg-charcoal p-3 rounded-xl border border-white/10">
                  <input
                    type="text"
                    value={newGovName}
                    onChange={(e) => setNewGovName(e.target.value)}
                    placeholder="اسم المحافظة"
                    className="flex-1 bg-obsidian border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={newGovPrice}
                    onChange={(e) => setNewGovPrice(e.target.value)}
                    placeholder="السعر"
                    className="w-24 bg-obsidian border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddGovernorate}
                    className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    إضافة
                  </button>
                </div>

                <div className="space-y-2.5">
                  {govs.map((g, idx) => (
                    <div
                      key={`${g.name}-${idx}`}
                      className="flex items-center justify-between gap-3 bg-charcoal p-3 rounded-xl border border-white/10"
                    >
                      <span className="text-xs font-bold text-white">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          aria-label={`سعر الشحن لمحافظة ${g.name}`}
                          value={g.price}
                          onChange={(e) => {
                            const next = [...govs];
                            next[idx] = { ...g, price: Number(e.target.value) || 0 };
                            setGovs(next);
                          }}
                          className="w-20 bg-obsidian border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-xs text-neutral-400">EGP</span>
                        <button
                          type="button"
                          aria-label={`حذف محافظة ${g.name}`}
                          onClick={() => setGovs(govs.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base">ربط شركة الشحن (API / Webhook)</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    اربط المتجر بشركة الشحن (Bosta / Aramex / Mylerz أو Webhook مخصص) لإرسال بيانات الطلبات وإصدار البوليصة بضغطة زر.
                  </p>
                </div>

                <div>
                  <label htmlFor="adm-ship-provider" className="block text-xs text-neutral-400 mb-1">
                    شركة الشحن
                  </label>
                  <select
                    id="adm-ship-provider"
                    value={shipIntegration.provider}
                    onChange={(e) =>
                      setShipIntegration({
                        ...shipIntegration,
                        provider: e.target.value as ShippingProvider,
                      })
                    }
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="none">إصدار بوليصة داخلية / تجهيز للربط لاحقاً</option>
                    <option value="bosta">Bosta (بوسطة)</option>
                    <option value="aramex">Aramex (أرامكس)</option>
                    <option value="mylerz">Mylerz (مايلرز)</option>
                    <option value="custom">Custom Courier Webhook</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="adm-ship-webhook" className="block text-xs text-neutral-400 mb-1">
                    رابط API / Webhook لشركة الشحن (اختياري)
                  </label>
                  <input
                    id="adm-ship-webhook"
                    type="url"
                    dir="ltr"
                    value={shipIntegration.webhookUrl}
                    onChange={(e) =>
                      setShipIntegration({ ...shipIntegration, webhookUrl: e.target.value })
                    }
                    placeholder="https://api.courier-partner.com/v1/shipments"
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left"
                  />
                </div>

                <div>
                  <label htmlFor="adm-ship-key" className="block text-xs text-neutral-400 mb-1">
                    مفتاح الربط API Key / Bearer Token (اختياري)
                  </label>
                  <input
                    id="adm-ship-key"
                    type="password"
                    dir="ltr"
                    value={shipIntegration.apiKeyHeader || ''}
                    onChange={(e) =>
                      setShipIntegration({ ...shipIntegration, apiKeyHeader: e.target.value })
                    }
                    placeholder="Bearer sk_live_..."
                    className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left"
                  />
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveShipping()}
                  className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition"
                >
                  حفظ إعدادات الشحن والربط
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-base">بوابات الدفع الإلكتروني المفعلة</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(
                    [
                      ['card', 'البطاقات البنكية (Visa / Mastercard / Meeza)'],
                      ['wallet', 'المحافظ الإلكترونية (فودافون / أورانج / اتصالات)'],
                      ['instapay', 'إنستا باي (InstaPay)'],
                      ['cod', 'الدفع عند الاستلام (COD)'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 bg-charcoal border border-white/10 rounded-xl p-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={paySettings.enabledMethods[key]}
                        onChange={(e) =>
                          setPaySettings({
                            ...paySettings,
                            enabledMethods: {
                              ...paySettings.enabledMethods,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 accent-white"
                      />
                      <span className="text-white font-semibold">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="adm-ipa" className="block text-xs text-neutral-400 mb-1">
                      عنوان InstaPay لاستلام التحويلات
                    </label>
                    <input
                      id="adm-ipa"
                      type="text"
                      dir="ltr"
                      value={paySettings.instapayHandle}
                      onChange={(e) =>
                        setPaySettings({ ...paySettings, instapayHandle: e.target.value })
                      }
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-wallet-num" className="block text-xs text-neutral-400 mb-1">
                      رقم محفظة الاستقبال (فودافون كاش)
                    </label>
                    <input
                      id="adm-wallet-num"
                      type="text"
                      dir="ltr"
                      value={paySettings.walletNumber}
                      onChange={(e) =>
                        setPaySettings({ ...paySettings, walletNumber: e.target.value })
                      }
                      className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-base">أكواد الخصم (Promo Codes)</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="CODE20"
                    className="flex-1 bg-charcoal border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase"
                  />
                  <input
                    type="number"
                    value={newPromoPercent}
                    onChange={(e) => setNewPromoPercent(e.target.value)}
                    placeholder="%"
                    className="w-20 bg-charcoal border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddPromo}
                    className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    إضافة
                  </button>
                </div>
                <div className="space-y-2">
                  {promos.map((p, idx) => (
                    <div
                      key={p.code}
                      className="flex items-center justify-between bg-charcoal px-3.5 py-2.5 rounded-xl border border-white/10 text-xs"
                    >
                      <span dir="ltr" className="font-mono font-bold text-white">
                        {p.code} — {p.discountPercent}% OFF
                      </span>
                      <button
                        type="button"
                        aria-label={`حذف كود ${p.code}`}
                        onClick={() => setPromos(promos.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSavePayments()}
                  className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition"
                >
                  حفظ إعدادات الدفع والأكواد
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sizes' && (
            <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-base">تعديل جدول المقاسات العام</h3>
              <div className="space-y-2.5">
                {sizeRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-5 gap-2 items-center bg-charcoal p-2.5 rounded-xl border border-white/10"
                  >
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx] = { ...row, size: e.target.value };
                        setSizeRows(next);
                      }}
                      className="bg-obsidian border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                    />
                    <input
                      type="text"
                      value={row.chest}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx] = { ...row, chest: e.target.value };
                        setSizeRows(next);
                      }}
                      className="bg-obsidian border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                    />
                    <input
                      type="text"
                      value={row.length}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx] = { ...row, length: e.target.value };
                        setSizeRows(next);
                      }}
                      className="bg-obsidian border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                    />
                    <input
                      type="text"
                      value={row.shoulder}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx] = { ...row, shoulder: e.target.value };
                        setSizeRows(next);
                      }}
                      className="bg-obsidian border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                    />
                    <button
                      type="button"
                      aria-label={`حذف مقاس ${row.size}`}
                      onClick={() => setSizeRows(sizeRows.filter((_, i) => i !== idx))}
                      className="text-red-400 flex justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSizeRows([...sizeRows, { size: 'XXL', chest: '70', length: '80', shoulder: '68' }])
                }
                className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold"
              >
                + إضافة مقاس جديد
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveStorePatch({ generalSizeGuide: sizeRows }, 'تم حفظ جدول المقاسات العام')
                }
                className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm"
              >
                حفظ الجدول
              </button>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-base">تعديل نصوص وصور الواجهة</h3>

              <div>
                <label htmlFor="cms-wa" className="text-xs text-neutral-400 block mb-1">
                  رقم واتساب خدمة العملاء
                </label>
                <input
                  id="cms-wa"
                  type="text"
                  dir="ltr"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                />
              </div>

              <div>
                <label htmlFor="cms-hero-img" className="text-xs text-neutral-400 block mb-1">
                  صورة الواجهة الرئيسية
                </label>
                <div className="flex gap-2">
                  <input
                    id="cms-hero-img"
                    type="text"
                    value={siteContent.heroImage}
                    onChange={(e) =>
                      setSiteContent({ ...siteContent, heroImage: e.target.value })
                    }
                    className="flex-1 bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                  <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, (url) =>
                          setSiteContent({ ...siteContent, heroImage: url }),
                        )
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="cms-ann" className="text-xs text-neutral-400 block mb-1">
                  شريط الإعلانات العلوي
                </label>
                <input
                  id="cms-ann"
                  type="text"
                  value={siteContent.announcement}
                  onChange={(e) =>
                    setSiteContent({ ...siteContent, announcement: e.target.value })
                  }
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="cms-htitle" className="text-xs text-neutral-400 block mb-1">
                  العنوان الرئيسي
                </label>
                <input
                  id="cms-htitle"
                  type="text"
                  value={siteContent.heroTitle}
                  onChange={(e) => setSiteContent({ ...siteContent, heroTitle: e.target.value })}
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="cms-hsub" className="text-xs text-neutral-400 block mb-1">
                  الوصف
                </label>
                <textarea
                  id="cms-hsub"
                  rows={2}
                  value={siteContent.heroSubtitle}
                  onChange={(e) =>
                    setSiteContent({ ...siteContent, heroSubtitle: e.target.value })
                  }
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="cms-fcontact" className="text-xs text-neutral-400 block mb-1">
                  بيانات التواصل (الفوتر)
                </label>
                <input
                  id="cms-fcontact"
                  type="text"
                  value={siteContent.footerContact}
                  onChange={(e) =>
                    setSiteContent({ ...siteContent, footerContact: e.target.value })
                  }
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveStorePatch(
                    { siteContent, whatsappNumber },
                    'تم حفظ تعديلات الواجهة بنجاح',
                  )
                }
                className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition"
              >
                حفظ التعديلات
              </button>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-white text-base">
                  طلبات العملاء والمدفوعات ({orders.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {orders.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportOrdersCsv}
                        className="bg-obsidian border border-white/15 hover:border-white/40 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير CSV للشحن</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPrint('orders')}
                        className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة بيانات العملاء</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleClearOrders()}
                        className="text-xs text-red-400 hover:underline px-2"
                      >
                        مسح السجل
                      </button>
                    </>
                  )}
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm bg-obsidian rounded-2xl border border-white/10">
                  لا توجد طلبات حتى الآن.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-obsidian border border-white/10 rounded-2xl p-4 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-2">
                        <div>
                          <span dir="ltr" className="font-mono font-bold text-white">
                            {o.id}
                          </span>
                          <span className="text-neutral-500 mx-2">·</span>
                          <span dir="ltr" className="font-mono text-neutral-400">
                            {o.transactionId}
                          </span>
                          {o.shipmentWaybill && (
                            <>
                              <span className="text-neutral-500 mx-2">·</span>
                              <span dir="ltr" className="font-mono text-emerald-400 font-bold">
                                {o.shipmentWaybill}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-neutral-400">{o.date}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <p>
                          <strong className="text-neutral-300">العميل:</strong> {o.customerName} (
                          <span dir="ltr" className="font-mono">
                            {o.customerPhone}
                          </span>
                          )
                        </p>
                        <p>
                          <strong className="text-neutral-300">الدفع:</strong>{' '}
                          <span dir="ltr">{o.paymentBrand || o.paymentMethod}</span> ·{' '}
                          <span
                            className={
                              o.paymentStatus === 'paid' ? 'text-emerald-400 font-bold' : 'text-amber-300'
                            }
                          >
                            {o.paymentStatus === 'paid' && 'مدفوع'}
                            {o.paymentStatus === 'pending_verification' && 'بانتظار التأكيد'}
                            {o.paymentStatus === 'cod_pending' && 'عند الاستلام'}
                          </span>
                        </p>
                      </div>

                      <p>
                        <strong className="text-neutral-300">العنوان:</strong> {o.customerGovernorate} —{' '}
                        {o.customerAddress}
                      </p>

                      {o.paymentReference && (
                        <p className="text-neutral-300">
                          <strong>مرجع الدفع:</strong>{' '}
                          <span dir="ltr" className="font-mono">
                            {o.paymentReference}
                          </span>
                        </p>
                      )}

                      <div className="bg-charcoal p-2.5 rounded-xl space-y-1">
                        {o.items.map((item) => (
                          <div key={`${item.id}-${item.size}`} className="flex justify-between gap-2">
                            <span dir="ltr" className="text-right">
                              {item.name} ({item.size}) × {item.qty}
                            </span>
                            <span dir="ltr" className="font-mono tabular-nums shrink-0">
                              {formatEgp(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <label htmlFor={`status-${o.id}`} className="text-neutral-400">
                            حالة الشحن:
                          </label>
                          <select
                            id={`status-${o.id}`}
                            value={o.fulfillmentStatus}
                            onChange={(e) =>
                              void handleUpdateOrderStatus(
                                o.id,
                                e.target.value as FulfillmentStatus,
                              )
                            }
                            className="bg-charcoal border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                          >
                            <option value="confirmed">تم التأكيد</option>
                            <option value="preparing">جاري التجهيز</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="delivered">تم التسليم</option>
                            <option value="cancelled">ملغي</option>
                          </select>

                          {o.paymentStatus === 'pending_verification' && (
                            <button
                              type="button"
                              onClick={() => void handleVerifyInstapay(o.id)}
                              className="bg-emerald-500 text-black px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تأكيد التحويل</span>
                            </button>
                          )}

                          {o.fulfillmentStatus !== 'cancelled' && (
                            <button
                              type="button"
                              disabled={dispatchingId === o.id}
                              onClick={() => void handleDispatchToCourier(o.id)}
                              className="bg-white/10 hover:bg-white hover:text-black text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {dispatchingId === o.id
                                  ? 'جاري الإرسال...'
                                  : o.shipmentWaybill
                                    ? 'تحديث البوليصة'
                                    : 'إرسال لشركة الشحن'}
                              </span>
                            </button>
                          )}
                        </div>
                        <span dir="ltr" className="font-mono font-bold text-sm text-emerald-400 tabular-nums">
                          {formatEgp(o.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <form
              onSubmit={handleUpdatePassword}
              className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-white text-base">تغيير كلمة مرور الأدمن</h3>
              <div>
                <label htmlFor="adm-newpass" className="text-xs text-neutral-400 block mb-1">
                  كلمة المرور الجديدة (4 أحرف على الأقل)
                </label>
                <input
                  id="adm-newpass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition"
              >
                تحديث كلمة المرور
              </button>
            </form>
          )}
        </div>
      </aside>

      <div
        id="admin-print-sheet"
        className="hidden print:block fixed inset-0 bg-white text-black p-8 overflow-visible z-[100]"
      >
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-extrabold">
              ∅ ONE™ — {printMode === 'inventory' ? 'تقرير المخزون والمبيعات' : 'تقرير طلبات العملاء والشحن'}
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              تاريخ التقرير: {new Date().toLocaleString('ar-EG')}
            </p>
          </div>
          <div dir="ltr" className="text-xs font-mono">
            EST. 2025 · EGYPT
          </div>
        </div>

        {printMode === 'inventory' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3 text-xs border border-black p-3">
              <div>
                <span className="text-neutral-600 block">إجمالي المبيعات</span>
                <strong dir="ltr">{formatEgp(analytics.totalRevenue)}</strong>
              </div>
              <div>
                <span className="text-neutral-600 block">القطع المباعة</span>
                <strong>{analytics.totalUnitsSold} قطعة</strong>
              </div>
              <div>
                <span className="text-neutral-600 block">القطع المتوفرة</span>
                <strong>{analytics.totalRemainingStock} قطعة</strong>
              </div>
              <div>
                <span className="text-neutral-600 block">العمليات الناجحة / الفاشلة</span>
                <strong>
                  {analytics.successfulOrdersCount} /{' '}
                  {analytics.failedAttemptsCount + analytics.cancelledOrdersCount}
                </strong>
              </div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-neutral-200 border-b border-black">
                  <th className="p-2 border border-black">المنتج</th>
                  <th className="p-2 border border-black">القسم</th>
                  <th className="p-2 border border-black">السعر</th>
                  <th className="p-2 border border-black">المباع</th>
                  <th className="p-2 border border-black">المتوفر</th>
                  <th className="p-2 border border-black">الإيراد</th>
                  <th className="p-2 border border-black">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {analytics.productBreakdown.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 border border-black font-bold">{r.name}</td>
                    <td className="p-2 border border-black">{CATEGORY_LABELS[r.category]}</td>
                    <td dir="ltr" className="p-2 border border-black font-mono">
                      {formatEgp(r.price)}
                    </td>
                    <td className="p-2 border border-black font-mono">{r.unitsSold}</td>
                    <td className="p-2 border border-black font-mono font-bold">
                      {r.remainingStock}
                    </td>
                    <td dir="ltr" className="p-2 border border-black font-mono">
                      {formatEgp(r.revenue)}
                    </td>
                    <td className="p-2 border border-black font-bold">
                      {r.isSoldOut ? 'SOLD OUT' : 'متوفر'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-right text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-neutral-200 border-b border-black">
                <th className="p-2 border border-black">الطلب</th>
                <th className="p-2 border border-black">العميل والهاتف</th>
                <th className="p-2 border border-black">المحافظة والعنوان</th>
                <th className="p-2 border border-black">القطع</th>
                <th className="p-2 border border-black">الإجمالي</th>
                <th className="p-2 border border-black">الدفع / الشحن</th>
                <th className="p-2 border border-black">البوليصة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td dir="ltr" className="p-2 border border-black font-mono font-bold">
                    {o.id}
                  </td>
                  <td className="p-2 border border-black">
                    {o.customerName}
                    <div dir="ltr" className="font-mono">
                      {o.customerPhone}
                    </div>
                  </td>
                  <td className="p-2 border border-black">
                    {o.customerGovernorate} — {o.customerAddress}
                  </td>
                  <td className="p-2 border border-black">
                    {o.items.map((i) => `${i.name} (${i.size}) x${i.qty}`).join(' | ')}
                  </td>
                  <td dir="ltr" className="p-2 border border-black font-mono font-bold">
                    {formatEgp(o.total)}
                  </td>
                  <td className="p-2 border border-black">
                    {o.paymentStatus} / {o.fulfillmentStatus}
                  </td>
                  <td dir="ltr" className="p-2 border border-black font-mono">
                    {o.shipmentWaybill || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

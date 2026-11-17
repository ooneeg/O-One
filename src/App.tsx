import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AdminDrawer, type AdminTab } from './components/AdminDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { LookbookSection } from './components/LookbookSection';
import { ManifestoSection } from './components/ManifestoSection';
import { Navbar, type ActivePage } from './components/Navbar';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { ProductModal } from './components/ProductModal';
import { ProductsSection } from './components/ProductsSection';
import { ShopCatalogView } from './components/ShopCatalogView';
import { SizeGuideModal } from './components/SizeGuideModal';
import { DEFAULT_STORE_DATA } from './data/defaultStore';
import type {
  CartItem,
  ProductCategory,
  PublicProduct,
  PublicStoreData,
} from './types/store';
import { adminLogout, fetchAdminStore, fetchStore, updateAdminStore } from './utils/api';
import { isProductSoldOut } from './utils/commerce';

const INITIAL_PUBLIC_STORE: PublicStoreData = {
  whatsappNumber: DEFAULT_STORE_DATA.whatsappNumber,
  siteContent: DEFAULT_STORE_DATA.siteContent,
  generalSizeGuide: DEFAULT_STORE_DATA.generalSizeGuide,
  governorates: DEFAULT_STORE_DATA.governorates,
  paymentSettings: DEFAULT_STORE_DATA.paymentSettings,
  promoCodes: DEFAULT_STORE_DATA.promoCodes,
  products: DEFAULT_STORE_DATA.products.map(({ stock, ...rest }) => ({
    ...rest,
    isSoldOut: stock <= 0,
  })),
  ordersCount: 0,
};

export default function App() {
  const [store, setStore] = useState<PublicStoreData>(INITIAL_PUBLIC_STORE);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('0one_cart_v1');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [activeCategory, setActiveCategory] = useState<'all' | ProductCategory>('all');
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackPrefill, setTrackPrefill] = useState<{ orderId?: string; phone?: string }>({});

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('0one_admin_token');
    } catch {
      return null;
    }
  });
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('products');
  const [editingProduct, setEditingProduct] = useState<PublicProduct | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  async function refreshStoreData(tokenOverride?: string | null) {
    const activeTok = tokenOverride === undefined ? adminToken : tokenOverride;
    if (activeTok) {
      try {
        const res = await fetchAdminStore(activeTok);
        setStore(res.store);
        return;
      } catch {
        setAdminToken(null);
        try {
          sessionStorage.removeItem('0one_admin_token');
        } catch {
          // ignore
        }
      }
    }
    try {
      const data = await fetchStore();
      setStore(data);
    } catch {
      // ignore initial offline fallback
    }
  }

  useEffect(() => {
    void refreshStoreData(adminToken);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('0one_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  }

  function addItemToCartState(product: PublicProduct, size: string) {
    setCart((prev) => {
      const existing = prev.findIndex((item) => item.id === product.id && item.size === size);
      if (existing > -1) {
        const next = [...prev];
        next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          size,
          qty: 1,
        },
      ];
    });
  }

  function handleAddToCart(product: PublicProduct, size: string) {
    if (isProductSoldOut(product)) {
      notify('عذراً، هذه القطعة غير متوفرة حالياً (SOLD OUT)');
      return;
    }
    addItemToCartState(product, size);
    setSelectedProduct(null);
    setCartOpen(true);
    notify('تمت إضافة القطعة إلى الحقيبة');
  }

  function handleBuyNow(product: PublicProduct, size: string) {
    if (isProductSoldOut(product)) {
      notify('عذراً، هذه القطعة غير متوفرة حالياً (SOLD OUT)');
      return;
    }
    addItemToCartState(product, size);
    setSelectedProduct(null);
    setCartOpen(false);
    setToastMsg(null);
    setCheckoutOpen(true);
  }

  function handleNavigateHome(sectionId?: string) {
    setActivePage('home');
    if (sectionId) {
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleNavigateShop() {
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleUpdateCartQty(index: number, delta: number) {
    setCart((prev) => {
      const next = [...prev];
      const updatedQty = next[index].qty + delta;
      if (updatedQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], qty: updatedQty };
      }
      return next;
    });
  }

  function handleRemoveCartItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdminTrigger() {
    if (adminToken) {
      setAdminDrawerOpen(true);
    } else {
      setAdminLoginOpen(true);
    }
  }

  function handleAdminSuccess(token: string) {
    setAdminToken(token);
    try {
      sessionStorage.setItem('0one_admin_token', token);
    } catch {
      // ignore
    }
    setAdminLoginOpen(false);
    setAdminDrawerOpen(true);
    void refreshStoreData(token);
    notify('تم تفعيل وضع الأدمن بنجاح');
  }

  async function handleLogoutAdmin() {
    if (adminToken) {
      await adminLogout(adminToken).catch(() => {});
    }
    setAdminToken(null);
    try {
      sessionStorage.removeItem('0one_admin_token');
    } catch {
      // ignore
    }
    setAdminDrawerOpen(false);
    await refreshStoreData(null);
    notify('تم تسجيل الخروج من وضع الأدمن');
  }

  async function handleDeleteProductFromGrid(productId: string) {
    if (!adminToken) return;
    try {
      const nextProducts = store.products
        .filter((p) => p.id !== productId)
        .map((p) => ({ ...p, stock: typeof p.stock === 'number' ? p.stock : 0 }));
      const { store: updated } = await updateAdminStore(adminToken, { products: nextProducts });
      setStore(updated);
      notify('تم حذف القطعة');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذر حذف القطعة');
    }
  }

  const totalCartItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const hideChromeOnPrint = adminDrawerOpen || checkoutOpen;

  return (
    <div className="min-h-screen bg-obsidian text-chalk flex flex-col">
      <div className={hideChromeOnPrint ? 'print:hidden flex flex-col flex-1' : 'flex flex-col flex-1'}>
        <Navbar
          announcement={store.siteContent.announcement}
          cartCount={totalCartItems}
          isAdmin={Boolean(adminToken)}
          activePage={activePage}
          onNavigateHome={handleNavigateHome}
          onNavigateShop={handleNavigateShop}
          onOpenCart={() => setCartOpen(true)}
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
          onOpenTrackOrder={() => {
            setTrackPrefill({});
            setTrackModalOpen(true);
          }}
          onOpenAdminDrawer={() => setAdminDrawerOpen(true)}
          onLogoutAdmin={() => void handleLogoutAdmin()}
        />

        <main className="flex-1">
          {activePage === 'shop' ? (
            <ShopCatalogView
              products={store.products}
              activeCategory={activeCategory}
              isAdmin={Boolean(adminToken)}
              onSelectCategory={setActiveCategory}
              onOpenProduct={setSelectedProduct}
              onBackHome={() => handleNavigateHome('top')}
            />
          ) : (
            <>
              <HeroSection
                siteContent={store.siteContent}
                onOpenFirstProduct={() => {
                  if (store.products[0]) setSelectedProduct(store.products[0]);
                }}
              />

              <ProductsSection
                products={store.products}
                activeCategory={activeCategory}
                isAdmin={Boolean(adminToken)}
                onSelectCategory={setActiveCategory}
                onOpenProduct={setSelectedProduct}
                onEditProduct={(prod) => {
                  setEditingProduct(prod);
                  setAdminTab('products');
                  setAdminDrawerOpen(true);
                }}
                onDeleteProduct={(id) => void handleDeleteProductFromGrid(id)}
              />

              <ManifestoSection siteContent={store.siteContent} />
              <LookbookSection />
            </>
          )}
        </main>

        <Footer
          footerContact={store.siteContent.footerContact}
          whatsappNumber={store.whatsappNumber}
          isAdmin={Boolean(adminToken)}
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
          onOpenTrackOrder={() => {
            setTrackPrefill({});
            setTrackModalOpen(true);
          }}
          onAdminTrigger={handleAdminTrigger}
        />
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onOpenSizeGuide={() => setSizeGuideOpen(true)}
      />

      <SizeGuideModal
        open={sizeGuideOpen}
        rows={store.generalSizeGuide}
        onClose={() => setSizeGuideOpen(false)}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        freeShippingThreshold={store.paymentSettings.freeShippingThreshold}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setToastMsg(null);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={cart}
        governorates={store.governorates}
        paymentSettings={store.paymentSettings}
        promoCodes={store.promoCodes}
        onClose={() => setCheckoutOpen(false)}
        onOrderCompleted={() => {
          setCart([]);
          void refreshStoreData(adminToken);
        }}
        onTrackOrder={(orderId, phone) => {
          setCheckoutOpen(false);
          setTrackPrefill({ orderId, phone });
          setTrackModalOpen(true);
        }}
      />

      <OrderTrackingModal
        open={trackModalOpen}
        initialOrderId={trackPrefill.orderId}
        initialPhone={trackPrefill.phone}
        onClose={() => setTrackModalOpen(false)}
      />

      <AdminLoginModal
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={handleAdminSuccess}
      />

      {adminToken && (
        <AdminDrawer
          open={adminDrawerOpen}
          activeTab={adminTab}
          token={adminToken}
          store={store}
          editingProduct={editingProduct}
          onChangeTab={setAdminTab}
          onClose={() => setAdminDrawerOpen(false)}
          onStoreUpdated={setStore}
          onClearEditingProduct={() => setEditingProduct(null)}
          onNotify={notify}
        />
      )}

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-white text-black px-5 py-3 rounded-xl shadow-2xl font-bold text-xs sm:text-sm flex items-center gap-2.5 print:hidden"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

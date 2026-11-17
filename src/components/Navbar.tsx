import { useState } from 'react';
import { Menu, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';

export type ActivePage = 'home' | 'shop';

interface NavbarProps {
  announcement: string;
  cartCount: number;
  isAdmin: boolean;
  activePage: ActivePage;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateShop: () => void;
  onOpenCart: () => void;
  onOpenSizeGuide: () => void;
  onOpenTrackOrder: () => void;
  onOpenAdminDrawer: () => void;
  onLogoutAdmin: () => void;
}

export function Navbar({
  announcement,
  cartCount,
  isAdmin,
  activePage,
  onNavigateHome,
  onNavigateShop,
  onOpenCart,
  onOpenSizeGuide,
  onOpenTrackOrder,
  onOpenAdminDrawer,
  onLogoutAdmin,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {isAdmin && (
        <div className="bg-white text-black px-4 py-2 border-b border-neutral-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span>وضع الأدمن مُفعّل — يمكنك تعديل المنتجات والمخزون والمدفوعات وإدارة الطلبات</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAdminDrawer}
                className="bg-black text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>لوحة التحكم</span>
              </button>
              <button
                type="button"
                onClick={onLogoutAdmin}
                className="bg-neutral-200 text-black px-3 py-1.5 rounded-lg hover:bg-neutral-300 transition whitespace-nowrap shrink-0"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-charcoal border-b border-white/10 text-[11px] sm:text-xs py-2 px-4 text-center text-neutral-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span dir="ltr" className="hidden sm:inline font-mono text-neutral-500">
            EST. 2025 · EGYPT
          </span>
          <span className="mx-auto font-sans font-medium truncate">{announcement}</span>
          <span dir="ltr" className="hidden sm:inline font-mono text-neutral-500">
            01 BINARY SERIES
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => onNavigateHome('top')}
              className="flex items-center gap-2.5 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg"
            >
              <span className="w-9 h-9 bg-white text-black rounded-lg flex items-center justify-center p-1.5 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current" aria-hidden="true">
                  <path d="M25 22 H68 L58 36 H34 C29 36 26 39 26 44 V62 L14 74 V40 C14 29 18 22 25 22 Z" />
                  <path d="M75 78 H32 L42 64 H66 C71 64 74 61 74 56 V38 L86 26 V60 C86 71 82 78 75 78 Z" />
                  <polygon points="88,12 93,17 12,88 7,83" />
                </svg>
              </span>
              <span dir="ltr" className="font-display font-extrabold text-xl tracking-tight text-white">
                ∅ ONE™
              </span>
            </button>
          </div>

          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-neutral-300"
          >
            <button
              type="button"
              onClick={() => onNavigateHome('collection')}
              className={`hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0 ${
                activePage === 'home' ? 'text-white' : ''
              }`}
            >
              المجموعة الجديدة
            </button>
            <button
              type="button"
              onClick={onNavigateShop}
              aria-current={activePage === 'shop' ? 'page' : undefined}
              className={`hover:text-white underline-offset-4 transition whitespace-nowrap shrink-0 ${
                activePage === 'shop' ? 'text-white underline font-bold' : 'hover:underline'
              }`}
            >
              صفحة الشراء
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome('manifesto')}
              className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0"
            >
              هوية البراند
            </button>
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0"
            >
              دليل المقاسات
            </button>
            <button
              type="button"
              onClick={onOpenTrackOrder}
              className="hover:text-white hover:underline underline-offset-4 transition whitespace-nowrap shrink-0"
            >
              تتبع طلبك
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`حقيبة التسوق (${cartCount} قطع)`}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-neutral-200 transition whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">الحقيبة</span>
              <span className="bg-black text-white text-xs min-w-[20px] h-5 px-1.5 rounded-md flex items-center justify-center font-mono tabular-nums">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="قائمة الجوال"
            className="md:hidden bg-charcoal border-t border-white/10 px-4 py-3 flex flex-col gap-2 text-sm font-semibold text-neutral-200"
          >
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateHome('collection');
              }}
              className="py-2 text-right hover:text-white"
            >
              المجموعة الجديدة
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateShop();
              }}
              className="py-2 text-right font-bold text-white"
            >
              صفحة الشراء
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateHome('manifesto');
              }}
              className="py-2 text-right hover:text-white"
            >
              هوية البراند
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSizeGuide();
              }}
              className="py-2 text-right hover:text-white"
            >
              دليل المقاسات
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrackOrder();
              }}
              className="py-2 text-right hover:text-white"
            >
              تتبع طلبك
            </button>
          </nav>
        )}
      </header>
    </>
  );
}

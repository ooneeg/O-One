import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, ShoppingBag } from 'lucide-react';
import type { ProductCategory, PublicProduct } from '../types/store';
import { formatEgp, isProductSoldOut } from '../utils/commerce';
import { SmartImage } from './SmartImage';

interface ShopCatalogViewProps {
  products: PublicProduct[];
  activeCategory: 'all' | ProductCategory;
  isAdmin: boolean;
  onSelectCategory: (cat: 'all' | ProductCategory) => void;
  onOpenProduct: (product: PublicProduct) => void;
  onBackHome: () => void;
}

const CATEGORIES: Array<{ id: 'all' | ProductCategory; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'hoodies', label: 'هوديز' },
  { id: 'tees', label: 'تيشيرتات' },
  { id: 'pants', label: 'بناطيل' },
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  hoodies: 'هوديز',
  tees: 'تيشيرتات',
  pants: 'بناطيل',
};

export function ShopCatalogView({
  products,
  activeCategory,
  isAdmin,
  onSelectCategory,
  onOpenProduct,
  onBackHome,
}: ShopCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const catMatch = activeCategory === 'all' || p.category === activeCategory;
      const textMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q));
      return catMatch && textMatch;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, activeCategory, searchQuery, sortBy]);

  return (
    <section
      aria-labelledby="shop-page-title"
      className="py-10 sm:py-14 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10">
        <div>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition mb-3"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </button>
          <h1 id="shop-page-title" className="font-display font-extrabold text-3xl sm:text-4xl text-white">
            صفحة الشراء والمنتجات
          </h1>
          <p className="text-sm text-neutral-400 mt-1.5">
            اختر القطعة المناسبة لعرض المقاسات والمواصفات والبدء في عملية الشراء الإلكتروني
          </p>
        </div>

        <div className="text-xs font-mono text-neutral-400 tabular-nums">
          {filteredProducts.length} قطعة معروضة
        </div>
      </div>

      <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="تصفية منتجات صفحة الشراء"
          className="flex items-center gap-1.5 p-1 bg-charcoal border border-white/10 rounded-xl overflow-x-auto no-scrollbar"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap shrink-0 min-h-[38px] ${
                  active
                    ? 'bg-white text-black'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="shop-search-input" className="sr-only">
              ابحث عن منتج
            </label>
            <input
              id="shop-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القطعة..."
              className="w-full bg-charcoal border border-white/15 rounded-xl pr-10 pl-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-white focus:outline-none"
            />
          </div>

          <label htmlFor="shop-sort-select" className="sr-only">
            ترتيب المنتجات
          </label>
          <select
            id="shop-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'price-asc' | 'price-desc')}
            className="bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-white focus:outline-none"
          >
            <option value="default">الترتيب الافتراضي</option>
            <option value="price-asc">السعر: من الأقل للأعلى</option>
            <option value="price-desc">السعر: من الأعلى للأقل</option>
          </select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 border border-white/10 rounded-2xl bg-charcoal text-neutral-400 space-y-3">
          <p className="text-sm">لا توجد منتجات مطابقة لبحثك حالياً.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSelectCategory('all');
            }}
            className="text-xs font-bold text-white underline underline-offset-4"
          >
            عرض جميع المنتجات
          </button>
        </div>
      ) : (
        <div data-testid="shop-rows-list" className="space-y-4">
          {filteredProducts.map((prod) => {
            const soldOut = isProductSoldOut(prod);
            return (
              <article
                key={prod.id}
                data-testid={`shop-row-${prod.id}`}
                className="group bg-charcoal border border-white/10 hover:border-white/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-5 transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => onOpenProduct(prod)}
                  aria-label={`عرض تفاصيل ${prod.name}`}
                  className="relative w-full sm:w-32 md:w-36 aspect-[3/4] rounded-xl overflow-hidden bg-obsidian shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <SmartImage
                    src={prod.image}
                    alt={prod.name}
                    fallbackTitle={prod.name}
                    className={`w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ${
                      soldOut ? 'opacity-50 grayscale' : ''
                    }`}
                  />
                  {soldOut && (
                    <span
                      dir="ltr"
                      className="absolute top-2 right-2 bg-red-600 text-white font-mono font-bold text-[10px] tracking-wider px-2 py-0.5 rounded"
                    >
                      SOLD OUT
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span>{CATEGORY_LABELS[prod.category]}</span>
                    {prod.badge && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span dir="ltr" className="font-mono text-white/90">
                          {prod.badge}
                        </span>
                      </>
                    )}
                    {soldOut && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span dir="ltr" className="font-mono font-bold text-red-400">
                          SOLD OUT
                        </span>
                      </>
                    )}
                    {isAdmin && typeof prod.stock === 'number' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          المخزون: {prod.stock}
                        </span>
                      </>
                    )}
                  </div>

                  <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => onOpenProduct(prod)}
                      className="text-right hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                    >
                      {prod.name}
                    </button>
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
                    {prod.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-400">
                    <span>المقاسات المتاحة:</span>
                    <span dir="ltr" className="font-mono text-neutral-200">
                      {prod.sizes.join(' · ')}
                    </span>
                  </div>
                </div>

                <div className="sm:border-r sm:border-white/10 sm:pr-5 flex sm:flex-col items-center sm:items-end justify-between gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                  <div className="text-right sm:text-left">
                    <span className="text-[11px] text-neutral-400 block">السعر</span>
                    <span dir="ltr" className="font-mono font-bold text-xl text-white tabular-nums">
                      {formatEgp(prod.price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenProduct(prod)}
                    aria-label={
                      soldOut
                        ? `${prod.name} غير متاح حالياً (SOLD OUT)`
                        : `اختر المقاس وابدأ الشراء لـ ${prod.name}`
                    }
                    className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[42px] ${
                      soldOut
                        ? 'bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-950'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {soldOut ? (
                      <span dir="ltr" className="font-mono">
                        SOLD OUT · نفذت الكمية
                      </span>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>اختر المقاس والشراء</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

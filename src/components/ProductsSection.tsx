import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type { ProductCategory, PublicProduct } from '../types/store';
import { formatEgp, isProductSoldOut } from '../utils/commerce';
import { SmartImage } from './SmartImage';

interface ProductsSectionProps {
  products: PublicProduct[];
  activeCategory: 'all' | ProductCategory;
  isAdmin: boolean;
  onSelectCategory: (cat: 'all' | ProductCategory) => void;
  onOpenProduct: (product: PublicProduct) => void;
  onEditProduct: (product: PublicProduct) => void;
  onDeleteProduct: (productId: string) => void;
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

export function ProductsSection({
  products,
  activeCategory,
  isAdmin,
  onSelectCategory,
  onOpenProduct,
  onEditProduct,
  onDeleteProduct,
}: ProductsSectionProps) {
  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <section id="collection" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="font-mono text-xs tracking-wider text-neutral-400 mb-2">
            01. DROP 01 COLLECTION
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
            أحدث الإصدارات
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="تصفية المنتجات حسب القسم"
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
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-white/10 rounded-2xl bg-charcoal text-neutral-400">
          لا توجد منتجات في هذا القسم حالياً.
        </div>
      ) : (
        <div
          data-testid="products-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {filtered.map((prod) => {
            const soldOut = isProductSoldOut(prod);
            return (
              <article
                key={prod.id}
                data-testid={`product-card-${prod.id}`}
                className="group bg-charcoal border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/30 transition-all duration-200"
              >
                <div className="relative aspect-[3/4] bg-obsidian overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onOpenProduct(prod)}
                    aria-label={`عرض تفاصيل ${prod.name}`}
                    className="block w-full h-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <SmartImage
                      src={prod.image}
                      alt={prod.name}
                      fallbackTitle={prod.name}
                      className={`w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ${
                        soldOut ? 'opacity-50 grayscale' : ''
                      }`}
                    />
                  </button>

                  {soldOut && (
                    <div
                      dir="ltr"
                      className="absolute top-3 right-3 bg-red-600 text-white font-mono font-bold text-[11px] tracking-wider px-2.5 py-1 rounded-md shadow-lg pointer-events-none"
                    >
                      SOLD OUT
                    </div>
                  )}

                  {isAdmin && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditProduct(prod)}
                          aria-label={`تعديل ${prod.name}`}
                          className="bg-emerald-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-300 transition flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod.id)}
                          aria-label={`حذف ${prod.name}`}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {typeof prod.stock === 'number' && (
                        <span className="bg-black/85 border border-white/20 text-white text-[11px] font-mono px-2 py-0.5 rounded-md tabular-nums self-start">
                          المخزون: {prod.stock}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1.5">
                      <span>{CATEGORY_LABELS[prod.category]}</span>
                      {prod.badge && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr" className="font-mono text-white/90">
                            {prod.badge}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base text-white leading-snug">
                      <button
                        type="button"
                        dir="ltr"
                        onClick={() => onOpenProduct(prod)}
                        className="text-right w-full hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                      >
                        {prod.name}
                      </button>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <span
                      dir="ltr"
                      className="font-mono font-bold text-base sm:text-lg text-white tabular-nums"
                    >
                      {formatEgp(prod.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenProduct(prod)}
                      aria-label={
                        soldOut
                          ? `${prod.name} نفذت الكمية`
                          : `التفاصيل والمقاسات لـ ${prod.name}`
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[38px] ${
                        soldOut
                          ? 'bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-950'
                          : 'bg-white/10 hover:bg-white hover:text-black text-white'
                      }`}
                    >
                      <span>{soldOut ? 'SOLD OUT' : 'التفاصيل والمقاسات'}</span>
                      {!soldOut && <ArrowLeft className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

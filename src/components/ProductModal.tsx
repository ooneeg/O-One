import { useEffect, useState } from 'react';
import { CreditCard, ShoppingBag, X } from 'lucide-react';
import type { PublicProduct } from '../types/store';
import { formatEgp, isProductSoldOut } from '../utils/commerce';
import { SmartImage } from './SmartImage';

interface ProductModalProps {
  product: PublicProduct | null;
  onClose: () => void;
  onAddToCart: (product: PublicProduct, size: string) => void;
  onBuyNow: (product: PublicProduct, size: string) => void;
  onOpenSizeGuide: () => void;
}

export function ProductModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenSizeGuide,
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>('L');

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes[0] || 'L');
    }
  }, [product]);

  if (!product) return null;

  const soldOut = isProductSoldOut(product);

  const sizeRows = (product.sizeChart || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-charcoal border border-white/15 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="aspect-[3/4] md:aspect-auto bg-obsidian relative">
            <SmartImage
              src={product.image}
              alt={product.name}
              fallbackTitle={product.name}
              className={`w-full h-full object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`}
            />
            {soldOut && (
              <div
                dir="ltr"
                className="absolute top-4 right-4 bg-red-600 text-white font-mono font-bold text-xs tracking-wider px-3 py-1.5 rounded-lg shadow-xl"
              >
                SOLD OUT
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex justify-between items-start gap-2">
                <span dir="ltr" className="text-xs font-mono uppercase text-neutral-400">
                  ∅ ONE · {product.category.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق تفاصيل المنتج"
                  className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white hover:text-black transition flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2
                id="pdp-title"
                dir="ltr"
                className="font-display font-bold text-2xl text-white mt-2 text-right"
              >
                {product.name}
              </h2>
              <div className="flex items-center justify-between gap-2 mt-2">
                <p dir="ltr" className="font-mono text-xl font-bold text-white tabular-nums text-right">
                  {formatEgp(product.price)}
                </p>
                {soldOut && (
                  <span
                    dir="ltr"
                    className="font-mono text-xs font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-lg"
                  >
                    SOLD OUT · نفذت الكمية
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-300 mt-4 leading-relaxed">{product.description}</p>

              {product.extraDetails && product.extraDetails.trim() !== '' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold text-white mb-1.5">المواصفات والخامة</h3>
                  <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                    {product.extraDetails}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-neutral-300">اختر المقاس:</span>
                  <button
                    type="button"
                    onClick={onOpenSizeGuide}
                    className="text-xs underline text-neutral-400 hover:text-white"
                  >
                    جدول المقاسات العام
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const active = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={soldOut}
                        onClick={() => setSelectedSize(size)}
                        aria-pressed={active}
                        className={`px-4 py-2 rounded-lg font-mono text-xs font-bold border transition min-w-[44px] min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'bg-white text-black border-white'
                            : 'bg-obsidian text-neutral-300 border-white/15 hover:border-white/40'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-xs font-bold text-white mb-2">دليل مقاسات القطعة</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs font-mono border-collapse tabular-nums">
                    <thead>
                      <tr className="bg-obsidian text-white border-b border-white/15">
                        <th className="py-2 px-2">المقاس</th>
                        <th className="py-2 px-2">العرض / الخصر</th>
                        <th className="py-2 px-2">الطول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-neutral-300">
                      {sizeRows.length > 0 ? (
                        sizeRows.map((line, i) => {
                          const parts = line.split(':');
                          if (parts.length >= 2) {
                            const sName = parts[0].trim();
                            const dimParts = parts[1].split('|');
                            return (
                              <tr key={i}>
                                <td className="py-2 font-bold text-white">{sName}</td>
                                <td className="py-2">{dimParts[0]?.trim() || '-'}</td>
                                <td className="py-2">{dimParts[1]?.trim() || '-'}</td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={i}>
                              <td colSpan={3} className="py-2 text-white">
                                {line}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-3 text-neutral-400">
                            متوفر بقصّة Oversized مريحة وفق الجدول العام.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {soldOut ? (
              <div className="pt-4 border-t border-white/10 space-y-2.5">
                <p
                  role="status"
                  className="text-xs text-red-300 bg-red-950/50 border border-red-500/30 rounded-xl px-4 py-3 text-center font-semibold"
                >
                  عذراً، نفذت كمية هذه القطعة حالياً (SOLD OUT) ولا يمكن شراؤها حتى يتم تجديد المخزون.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled
                    className="w-full bg-white/10 text-neutral-400 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>اشترِ الآن</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="w-full bg-obsidian border border-white/10 text-neutral-500 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>أضف للحقيبة</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onBuyNow(product, selectedSize)}
                  className="w-full bg-white text-black py-3.5 rounded-xl font-bold text-sm hover:bg-neutral-200 transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>اشترِ الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddToCart(product, selectedSize)}
                  className="w-full bg-obsidian border border-white/25 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-white/10 transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>أضف للحقيبة</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

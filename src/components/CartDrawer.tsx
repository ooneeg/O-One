import { CreditCard, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import type { CartItem } from '../types/store';
import { formatEgp } from '../utils/commerce';
import { SmartImage } from './SmartImage';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  freeShippingThreshold: number;
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  freeShippingThreshold,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const remainingForFree = Math.max(0, freeShippingThreshold - subtotal);
  const progress =
    freeShippingThreshold > 0
      ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))
      : 100;

  return (
    <div role="dialog" aria-modal="true" aria-label="حقيبة التسوق" className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-hidden="true"
      />
      <aside className="absolute top-0 left-0 bottom-0 w-full max-w-md bg-charcoal border-r border-white/15 flex flex-col justify-between p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span>حقيبة التسوق</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق حقيبة التسوق"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white hover:text-black transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length > 0 && freeShippingThreshold > 0 && (
          <div className="mt-4 bg-obsidian border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                {remainingForFree === 0
                  ? 'مبروك! حصلت على شحن مجاني لطلبك'
                  : `أضف ${formatEgp(remainingForFree)} للحصول على شحن مجاني`}
              </span>
              <span className="font-mono tabular-nums text-neutral-400">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-20 text-neutral-400 space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm">حقيبة التسوق فارغة حالياً</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.id}-${item.size}`}
                className="flex gap-3 bg-obsidian p-3 rounded-xl border border-white/10 items-center"
              >
                <SmartImage
                  src={item.image}
                  alt={item.name}
                  fallbackTitle={item.name}
                  className="w-16 h-20 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs text-white truncate">{item.name}</h3>
                  <p dir="ltr" className="text-[11px] font-mono text-neutral-400 mt-0.5 tabular-nums text-right">
                    SIZE: {item.size} · {formatEgp(item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, -1)}
                        aria-label={`إنقاص كمية ${item.name}`}
                        className="w-7 h-7 rounded-lg bg-charcoal border border-white/15 flex items-center justify-center hover:border-white/40 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold tabular-nums w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, 1)}
                        aria-label={`زيادة كمية ${item.name}`}
                        className="w-7 h-7 rounded-lg bg-charcoal border border-white/15 flex items-center justify-center hover:border-white/40 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      aria-label={`إزالة ${item.name} من الحقيبة`}
                      className="text-neutral-500 hover:text-red-400 p-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-neutral-300">المجموع الفرعي:</span>
            <span dir="ltr" className="font-mono text-lg text-white tabular-nums">
              {formatEgp(subtotal)}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            يتم احتساب الشحن والخصومات في الخطوة التالية مع اختيار وسيلة الدفع الإلكتروني.
          </p>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onProceedToCheckout}
            className="w-full bg-white text-black py-3.5 rounded-xl font-bold text-sm hover:bg-neutral-200 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            <CreditCard className="w-4 h-4" />
            <span>متابعة للدفع الإلكتروني</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

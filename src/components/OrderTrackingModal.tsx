import { useEffect, useState } from 'react';
import { CheckCircle2, PackageCheck, Search, Truck, X } from 'lucide-react';
import type { FulfillmentStatus, Order } from '../types/store';
import { trackOrder } from '../utils/api';
import { formatEgp } from '../utils/commerce';

interface OrderTrackingModalProps {
  open: boolean;
  initialOrderId?: string;
  initialPhone?: string;
  onClose: () => void;
}

const STEPS: Array<{ key: FulfillmentStatus; label: string }> = [
  { key: 'confirmed', label: 'تم تأكيد الطلب' },
  { key: 'preparing', label: 'جاري التجهيز' },
  { key: 'shipped', label: 'تم الشحن' },
  { key: 'delivered', label: 'تم التسليم' },
];

export function OrderTrackingModal({
  open,
  initialOrderId = '',
  initialPhone = '',
  onClose,
}: OrderTrackingModalProps) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState(initialPhone);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setOrderId(initialOrderId);
      setPhone(initialPhone);
      setErrorMsg(null);
      if (initialOrderId && initialPhone) {
        void runLookup(initialOrderId, initialPhone);
      } else {
        setFoundOrder(null);
      }
    }
  }, [open, initialOrderId, initialPhone]);

  async function runLookup(idToLookup: string, phoneToLookup: string) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { order } = await trackOrder(idToLookup, phoneToLookup);
      setFoundOrder(order);
    } catch (err) {
      setFoundOrder(null);
      setErrorMsg(err instanceof Error ? err.message : 'لم يتم العثور على الطلب');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runLookup(orderId, phone);
  }

  if (!open) return null;

  const activeIdx = foundOrder
    ? STEPS.findIndex((s) => s.key === foundOrder.fulfillmentStatus)
    : -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-order-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-charcoal border border-white/15 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="track-order-title" className="font-display font-bold text-xl text-white">
              تتبع حالة الطلب والدفع
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              أدخل رقم الطلب ورقم الموبايل المسجل لمتابعة حالة الشحن والدفع
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق تتبع الطلب"
            className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white hover:text-black flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label htmlFor="track-id" className="block text-xs text-neutral-400 mb-1">
              رقم الطلب
            </label>
            <input
              id="track-id"
              type="text"
              dir="ltr"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              placeholder="ORD-12345"
              className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white uppercase focus:border-white focus:outline-none"
            />
          </div>
          <div className="sm:col-span-5">
            <label htmlFor="track-phone" className="block text-xs text-neutral-400 mb-1">
              رقم الموبايل
            </label>
            <input
              id="track-phone"
              type="tel"
              dir="ltr"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-right focus:border-white focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              aria-label="بحث عن الطلب"
              className="w-full bg-white text-black py-2.5 rounded-xl font-bold text-sm hover:bg-neutral-200 transition flex items-center justify-center min-h-[42px]"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs"
          >
            {errorMsg}
          </div>
        )}

        {foundOrder && (
          <div className="bg-obsidian border border-white/10 rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <p dir="ltr" className="font-mono font-bold text-base text-white">
                  {foundOrder.id}
                </p>
                <p className="text-xs text-neutral-400">{foundOrder.date}</p>
              </div>
              <div className="text-left">
                <span className="font-mono text-xs text-neutral-400 block">
                  {foundOrder.transactionId}
                </span>
                <span
                  className={`text-xs font-bold ${
                    foundOrder.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {foundOrder.paymentStatus === 'paid' && 'مدفوع إلكترونياً'}
                  {foundOrder.paymentStatus === 'pending_verification' && 'قيد مراجعة التحويل'}
                  {foundOrder.paymentStatus === 'cod_pending' && 'الدفع عند الاستلام'}
                </span>
              </div>
            </div>

            {foundOrder.fulfillmentStatus === 'cancelled' ? (
              <p className="text-sm font-bold text-red-400">تم إلغاء هذا الطلب</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center">
                {STEPS.map((st, idx) => {
                  const done = idx <= activeIdx;
                  return (
                    <div key={st.key} className="space-y-1.5">
                      <div
                        className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center border ${
                          done
                            ? 'bg-white text-black border-white'
                            : 'bg-charcoal text-neutral-500 border-white/15'
                        }`}
                      >
                        {idx === 0 && <CheckCircle2 className="w-4 h-4" />}
                        {idx === 1 && <PackageCheck className="w-4 h-4" />}
                        {idx === 2 && <Truck className="w-4 h-4" />}
                        {idx === 3 && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <p className={`text-[11px] font-bold ${done ? 'text-white' : 'text-neutral-500'}`}>
                        {st.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
              {foundOrder.items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex justify-between text-neutral-300">
                  <span>
                    {item.name} ({item.size}) × {item.qty}
                  </span>
                  <span dir="ltr" className="font-mono tabular-nums">
                    {formatEgp(item.price * item.qty)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm text-white">
                <span>الإجمالي:</span>
                <span dir="ltr" className="font-mono tabular-nums">
                  {formatEgp(foundOrder.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

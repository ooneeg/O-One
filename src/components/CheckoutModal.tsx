import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Lock,
  Printer,
  ShieldCheck,
  Smartphone,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CartItem,
  GovernorateShipping,
  Order,
  PaymentMethod,
  PaymentSettings,
  PromoCode,
} from '../types/store';
import { confirmPayment, initiatePayment, validatePromoCode } from '../utils/api';
import {
  calculateOrderTotals,
  detectCardBrand,
  formatCardNumber,
  formatEgp,
  isValidEgyptianPhone,
} from '../utils/commerce';
import { SmartImage } from './SmartImage';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  governorates: GovernorateShipping[];
  paymentSettings: PaymentSettings;
  promoCodes: PromoCode[];
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
  onTrackOrder: (orderId: string, phone: string) => void;
}

type CheckoutStep = 'details' | 'verification' | 'receipt';

const METHOD_META: Record<
  PaymentMethod,
  { title: string; subtitle: string }
> = {
  card: {
    title: 'بطاقة بنكية (فيزا / ماستركارد / ميزة)',
    subtitle: 'دفع فوري مؤمن ببروتوكول 3D Secure',
  },
  wallet: {
    title: 'محفظة إلكترونية (فودافون / أورانج / اتصالات كاش)',
    subtitle: 'ادفع برقم محفظتك وتأكيد OTP فوري',
  },
  instapay: {
    title: 'إنستا باي (InstaPay)',
    subtitle: 'تحويل لحظي مباشر لحساب البراند',
  },
  cod: {
    title: 'الدفع عند الاستلام (COD)',
    subtitle: 'ادفع نقداً لمندوب الشحن عند الاستلام',
  },
};

export function CheckoutModal({
  open,
  items,
  governorates,
  paymentSettings,
  promoCodes,
  onClose,
  onOrderCompleted,
  onTrackOrder,
}: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorateIndex, setGovernorateIndex] = useState(0);
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  const availableMethods = (['card', 'wallet', 'instapay', 'cod'] as PaymentMethod[]).filter(
    (m) => paymentSettings.enabledMethods[m],
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    availableMethods[0] || 'card',
  );

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [walletPhone, setWalletPhone] = useState('');
  const [instapayRef, setInstapayRef] = useState('');
  const [copiedIpa, setCopiedIpa] = useState(false);

  const [verificationType, setVerificationType] = useState<'3ds' | 'wallet_otp'>('3ds');
  const [intentId, setIntentId] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('details');
      setErrorMsg(null);
      setOtpInput('');
      setCompletedOrder(null);
      if (!availableMethods.includes(paymentMethod)) {
        setPaymentMethod(availableMethods[0] || 'cod');
      }
    }
  }, [open]);

  if (!open) return null;

  const selectedGov = governorates[governorateIndex] || governorates[0] || { name: 'القاهرة', price: 60 };
  const totals = calculateOrderTotals({
    items,
    baseShippingCost: selectedGov.price,
    freeShippingThreshold: paymentSettings.freeShippingThreshold,
    promoCode: appliedPromo,
    promoCodes,
  });

  const cardBrand = detectCardBrand(cardNumber);

  async function handleApplyPromo() {
    setPromoFeedback(null);
    const trimmed = promoInput.trim();
    if (!trimmed) {
      setAppliedPromo('');
      return;
    }
    try {
      const res = await validatePromoCode(trimmed);
      setAppliedPromo(res.code);
      setPromoFeedback(`تم تطبيق كود ${res.code} بخصم ${res.discountPercent}%`);
    } catch (err) {
      setAppliedPromo('');
      setPromoFeedback(err instanceof Error ? err.message : 'كود الخصم غير صالح');
    }
  }

  function handleExpiryChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  }

  async function handleCopyIpa() {
    try {
      await navigator.clipboard.writeText(paymentSettings.instapayHandle);
      setCopiedIpa(true);
      setTimeout(() => setCopiedIpa(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  }

  async function handleSubmitCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (customerName.trim().length < 2) {
      setErrorMsg('يرجى إدخال الاسم بالكامل');
      return;
    }
    if (!isValidEgyptianPhone(customerPhone)) {
      setErrorMsg('يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678)');
      return;
    }
    if (customerAddress.trim().length < 5) {
      setErrorMsg('يرجى إدخال العنوان بالتفصيل');
      return;
    }

    setSubmitting(true);
    try {
      const response = await initiatePayment({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        governorateIndex,
        customerAddress: customerAddress.trim(),
        notes: notes.trim() || undefined,
        promoCode: appliedPromo || undefined,
        items: items.map((i) => ({ id: i.id, size: i.size, qty: i.qty })),
        paymentMethod,
        card:
          paymentMethod === 'card'
            ? {
                number: cardNumber,
                holder: cardHolder,
                expiry: cardExpiry,
                cvv: cardCvv,
              }
            : undefined,
        walletPhone: paymentMethod === 'wallet' ? walletPhone : undefined,
        instapayRef: paymentMethod === 'instapay' ? instapayRef : undefined,
      });

      if (response.requiresVerification) {
        setIntentId(response.intentId);
        setVerificationType(response.verificationType);
        setMaskedTarget(
          response.verificationType === '3ds'
            ? `${response.brand || 'Card'} · ${response.maskedCard}`
            : response.walletPhone || walletPhone,
        );
        setStep('verification');
      } else {
        setCompletedOrder(response.order);
        onOrderCompleted(response.order);
        setStep('receipt');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر إتمام عملية الدفع');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { order } = await confirmPayment(intentId, otpInput);
      setCompletedOrder(order);
      onOrderCompleted(order);
      setStep('receipt');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل التحقق من رمز الأمان');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-charcoal border border-white/15 rounded-2xl max-w-5xl w-full shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-obsidian border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 id="checkout-modal-title" className="font-display font-bold text-lg text-white">
                {step === 'receipt' ? 'تم تأكيد الطلب بنجاح' : 'بوابة الدفع الإلكتروني الآمنة'}
              </h2>
              <p className="text-xs text-neutral-400">
                {step === 'details' && 'أكمل بيانات الشحن واختر وسيلة الدفع المناسبة'}
                {step === 'verification' && 'التحقق الثنائي لإتمام المعاملة المالية'}
                {step === 'receipt' && 'فاتورة إلكترونية موثقة من متجر ∅ ONE™'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الدفع"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white hover:text-black text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'details' && (
            <form onSubmit={handleSubmitCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <section className="space-y-4">
                  <h3 className="font-bold text-sm text-white border-b border-white/10 pb-2">
                    01. بيانات العميل والشحن
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="chk-name" className="block text-xs text-neutral-300 mb-1.5">
                        الاسم بالكامل
                      </label>
                      <input
                        id="chk-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="أحمد محمد"
                        className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="chk-phone" className="block text-xs text-neutral-300 mb-1.5">
                        رقم الموبايل (واتساب)
                      </label>
                      <input
                        id="chk-phone"
                        type="tel"
                        required
                        dir="ltr"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="01012345678"
                        className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-right focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="chk-gov" className="block text-xs text-neutral-300 mb-1.5">
                        المحافظة
                      </label>
                      <select
                        id="chk-gov"
                        value={governorateIndex}
                        onChange={(e) => setGovernorateIndex(Number(e.target.value))}
                        className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                      >
                        {governorates.map((g, idx) => (
                          <option key={g.name} value={idx}>
                            {g.name} ({g.price} EGP)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="chk-notes" className="block text-xs text-neutral-300 mb-1.5">
                        ملاحظات إضافية (اختياري)
                      </label>
                      <input
                        id="chk-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="مواعيد التوصيل المفضلة"
                        className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="chk-address" className="block text-xs text-neutral-300 mb-1.5">
                      العنوان بالتفصيل
                    </label>
                    <input
                      id="chk-address"
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="الشارع، رقم العمارة، الدور، علامة مميزة"
                      className="w-full bg-obsidian border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-bold text-sm text-white border-b border-white/10 pb-2">
                    02. وسيلة الدفع الإلكتروني
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableMethods.map((m) => {
                      const active = paymentMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(m);
                            setErrorMsg(null);
                          }}
                          aria-pressed={active}
                          className={`p-3.5 rounded-xl border text-right transition flex items-start gap-3 ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'bg-obsidian text-white border-white/15 hover:border-white/35'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            {m === 'card' && <CreditCard className="w-4 h-4" />}
                            {m === 'wallet' && <Smartphone className="w-4 h-4" />}
                            {m === 'instapay' && <Wallet className="w-4 h-4" />}
                            {m === 'cod' && <Banknote className="w-4 h-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-bold text-xs">{METHOD_META[m].title}</span>
                            <span
                              className={`block text-[11px] mt-0.5 ${
                                active ? 'text-neutral-700' : 'text-neutral-400'
                              }`}
                            >
                              {METHOD_META[m].subtitle}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="bg-obsidian border border-white/15 rounded-xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>بيانات البطاقة البنكية</span>
                        </span>
                        <span className="font-mono text-neutral-300">{cardBrand}</span>
                      </div>

                      <div>
                        <label htmlFor="card-num" className="block text-xs text-neutral-400 mb-1">
                          رقم البطاقة
                        </label>
                        <input
                          id="card-num"
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="4111 1111 1111 1111"
                          className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left focus:border-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="card-holder" className="block text-xs text-neutral-400 mb-1">
                          الاسم على البطاقة
                        </label>
                        <input
                          id="card-holder"
                          type="text"
                          dir="ltr"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="AHMED MOHAMED"
                          className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left focus:border-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="card-exp" className="block text-xs text-neutral-400 mb-1">
                            تاريخ الانتهاء (MM/YY)
                          </label>
                          <input
                            id="card-exp"
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            required
                            value={cardExpiry}
                            onChange={(e) => handleExpiryChange(e.target.value)}
                            placeholder="12/28"
                            className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left focus:border-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="card-cvv" className="block text-xs text-neutral-400 mb-1">
                            رمز الأمان CVV
                          </label>
                          <input
                            id="card-cvv"
                            type="password"
                            inputMode="numeric"
                            dir="ltr"
                            maxLength={4}
                            required
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="123"
                            className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-left focus:border-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'wallet' && (
                    <div className="bg-obsidian border border-white/15 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        أدخل رقم المحفظة الإلكترونية (فودافون كاش / أورانج كاش / اتصالات كاش / WE Pay) لإرسال طلب تأكيد الدفع.
                      </p>
                      <div>
                        <label htmlFor="wallet-phone" className="block text-xs text-neutral-400 mb-1">
                          رقم المحفظة الإلكترونية
                        </label>
                        <input
                          id="wallet-phone"
                          type="tel"
                          dir="ltr"
                          required
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          placeholder="01012345678"
                          className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white text-right focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'instapay' && (
                    <div className="bg-obsidian border border-white/15 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        قم بتحويل مبلغ{' '}
                        <strong dir="ltr" className="font-mono text-white tabular-nums">
                          {formatEgp(totals.total)}
                        </strong>{' '}
                        عبر تطبيق InstaPay إلى عنوان الدفع التالي ثم أدخل رقم مرجع العملية:
                      </p>
                      <div className="flex items-center justify-between gap-2 bg-charcoal border border-white/10 rounded-xl px-3.5 py-2.5">
                        <span dir="ltr" className="font-mono text-sm font-bold text-white">
                          {paymentSettings.instapayHandle}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyIpa}
                          className="text-xs bg-white/10 hover:bg-white hover:text-black text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          {copiedIpa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedIpa ? 'تم النسخ' : 'نسخ'}</span>
                        </button>
                      </div>
                      <div>
                        <label htmlFor="instapay-ref" className="block text-xs text-neutral-400 mb-1">
                          رقم مرجع التحويل أو حسابك على InstaPay
                        </label>
                        <input
                          id="instapay-ref"
                          type="text"
                          required
                          value={instapayRef}
                          onChange={(e) => setInstapayRef(e.target.value)}
                          placeholder="مثال: REF-928374 أو ahmed@instapay"
                          className="w-full bg-charcoal border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div className="bg-obsidian border border-white/15 rounded-xl p-4 text-xs text-neutral-300 leading-relaxed">
                      سيتم تأكيد طلبك الآن والدفع نقداً لمندوب الشحن عند الاستلام بمبلغ{' '}
                      <strong dir="ltr" className="font-mono text-white tabular-nums">
                        {formatEgp(totals.total)}
                      </strong>
                      .
                    </div>
                  )}
                </section>

                {errorMsg && (
                  <div
                    role="alert"
                    className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs font-semibold"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm hover:bg-neutral-200 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'جاري معالجة الطلب...'
                      : paymentMethod === 'cod'
                        ? `تأكيد الطلب (${formatEgp(totals.total)})`
                        : `متابعة للدفع (${formatEgp(totals.total)})`}
                  </span>
                </button>
              </div>

              <aside className="lg:col-span-5 bg-obsidian border border-white/10 rounded-2xl p-5 space-y-5 h-fit">
                <h3 className="font-bold text-sm text-white border-b border-white/10 pb-2.5">
                  ملخص الطلب ({items.reduce((s, i) => s + i.qty, 0)} قطع)
                </h3>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                      <SmartImage
                        src={item.image}
                        alt={item.name}
                        fallbackTitle={item.name}
                        className="w-12 h-14 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[11px] font-mono text-neutral-400 tabular-nums">
                          {item.size} × {item.qty}
                        </p>
                      </div>
                      <span dir="ltr" className="text-xs font-mono text-white tabular-nums shrink-0">
                        {formatEgp(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10">
                  <label htmlFor="promo-code-input" className="block text-xs text-neutral-400 mb-1.5">
                    كود الخصم (مثال: ONE10)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo-code-input"
                      type="text"
                      dir="ltr"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="ONE10"
                      className="flex-1 bg-charcoal border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase focus:border-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="bg-white/10 hover:bg-white hover:text-black text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>تطبيق</span>
                    </button>
                  </div>
                  {promoFeedback && (
                    <p
                      className={`text-xs mt-1.5 ${
                        appliedPromo ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {promoFeedback}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>المجموع الفرعي:</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {formatEgp(totals.subtotal)}
                    </span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>الخصم ({totals.promoCodeApplied}):</span>
                      <span dir="ltr" className="font-mono tabular-nums">
                        -{formatEgp(totals.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-300">
                    <span>الشحن ({selectedGov.name}):</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {totals.freeShippingApplied ? 'مجاني' : formatEgp(totals.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10 text-base font-bold text-white">
                    <span>الإجمالي النهائي:</span>
                    <span dir="ltr" className="font-mono text-xl tabular-nums">
                      {formatEgp(totals.total)}
                    </span>
                  </div>
                </div>
              </aside>
            </form>
          )}

          {step === 'verification' && (
            <form onSubmit={handleConfirmOtp} className="max-w-md mx-auto py-6 space-y-5">
              <div className="bg-obsidian border border-white/15 rounded-2xl p-6 space-y-4 text-center">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                <div>
                  <h3 className="font-display font-bold text-xl text-white">
                    {verificationType === '3ds'
                      ? 'تأكيد الأمان البنكي (3D Secure)'
                      : 'تأكيد دفع المحفظة الإلكترونية'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    تم إرسال رمز تحقق (OTP) للمعاملات عبر{' '}
                    <span dir="ltr" className="font-mono text-white">
                      {maskedTarget}
                    </span>{' '}
                    بقيمة{' '}
                    <span dir="ltr" className="font-mono text-white font-bold">
                      {formatEgp(totals.total)}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <label htmlFor="otp-input" className="block text-xs text-neutral-300 mb-1.5">
                    أدخل رمز التحقق (OTP)
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full bg-charcoal border border-white/20 rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-mono text-white focus:border-white focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-400 text-center mt-2 font-mono">
                    رمز التحقق التجريبي للبوابة: <span className="text-white select-all">123456</span>
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="bg-red-950/60 border border-red-500/40 text-red-200 px-3 py-2.5 rounded-xl text-xs"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('details');
                      setErrorMsg(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-charcoal border border-white/15 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>رجوع</span>
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {submitting ? 'جاري التأكيد...' : 'تأكيد الدفع وإصدار الفاتورة'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'receipt' && completedOrder && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-obsidian border border-white/15 rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="font-display font-bold text-xl text-white">
                        تم استلام طلبك بنجاح
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{completedOrder.date}</p>
                    </div>
                  </div>
                  <div className="text-left" dir="ltr">
                    <p className="font-mono text-sm font-bold text-white">{completedOrder.id}</p>
                    <p className="font-mono text-xs text-neutral-400">
                      {completedOrder.transactionId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-neutral-400">بيانات العميل والتوصيل</p>
                    <p className="text-white font-bold">{completedOrder.customerName}</p>
                    <p className="font-mono text-neutral-300">{completedOrder.customerPhone}</p>
                    <p className="text-neutral-300">
                      {completedOrder.customerGovernorate} — {completedOrder.customerAddress}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-neutral-400">حالة الدفع الإلكتروني</p>
                    <p className="text-white font-bold">
                      <span dir="ltr" className="inline-block">
                        {completedOrder.paymentBrand || completedOrder.paymentMethod}
                        {completedOrder.cardLast4 ? ` (•••• ${completedOrder.cardLast4})` : ''}
                      </span>
                    </p>
                    <p
                      className={`font-semibold ${
                        completedOrder.paymentStatus === 'paid'
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {completedOrder.paymentStatus === 'paid' && 'مدفوع إلكترونياً ومؤكد'}
                      {completedOrder.paymentStatus === 'pending_verification' &&
                        'قيد مراجعة تحويل InstaPay'}
                      {completedOrder.paymentStatus === 'cod_pending' && 'الدفع نقداً عند الاستلام'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
                  {completedOrder.items.map((item) => (
                    <div
                      key={`${item.id}-${item.size}`}
                      className="flex justify-between text-neutral-200"
                    >
                      <span dir="ltr" className="text-right">
                        {item.name} ({item.size}) × {item.qty}
                      </span>
                      <span dir="ltr" className="font-mono tabular-nums">
                        {formatEgp(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                  {completedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>الخصم ({completedOrder.promoCode}):</span>
                      <span dir="ltr" className="font-mono tabular-nums">
                        -{formatEgp(completedOrder.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>الشحن:</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {completedOrder.shipping === 0
                        ? 'مجاني'
                        : formatEgp(completedOrder.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10 text-base font-bold text-white">
                    <span>الإجمالي المدفوع / المستحق:</span>
                    <span dir="ltr" className="font-mono text-lg text-emerald-400 tabular-nums">
                      {formatEgp(completedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-3 rounded-xl bg-obsidian border border-white/15 text-white text-xs font-bold hover:border-white/40 transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTrackOrder(completedOrder.id, completedOrder.customerPhone)}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-neutral-200 transition"
                >
                  تتبع حالة الطلب الآن
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

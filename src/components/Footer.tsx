import { Lock, MessageCircle, Unlock } from 'lucide-react';

interface FooterProps {
  footerContact: string;
  whatsappNumber: string;
  isAdmin: boolean;
  onOpenSizeGuide: () => void;
  onOpenTrackOrder: () => void;
  onAdminTrigger: () => void;
}

export function Footer({
  footerContact,
  whatsappNumber,
  isAdmin,
  onOpenSizeGuide,
  onOpenTrackOrder,
  onAdminTrigger,
}: FooterProps) {
  const cleanWa = whatsappNumber.replace(/\D/g, '') || '201000000000';
  const waUrl = `https://wa.me/${cleanWa}`;

  return (
    <>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        className="fixed bottom-5 left-5 z-30 bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      <footer className="bg-charcoal border-t border-white/10 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
            <div>
              <div className="mb-3" dir="ltr">
                <span className="font-display font-extrabold text-2xl text-white">∅ ONE™</span>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
                براند ملابس ستريت وير مستقل. نصنع قطعاً تعبر عن شخصيتك بدون قيود مع تجربة دفع إلكتروني آمنة.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-4 text-sm">روابط سريعة</h3>
              <ul className="space-y-2.5 text-sm text-neutral-400">
                <li>
                  <a href="#collection" className="hover:text-white transition">
                    المتجر
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenSizeGuide}
                    className="hover:text-white transition"
                  >
                    جدول المقاسات العام
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenTrackOrder}
                    className="hover:text-white transition"
                  >
                    تتبع حالة الطلب
                  </button>
                </li>
                <li>
                  <a href="#manifesto" className="hover:text-white transition">
                    عن البراند
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-4 text-sm">تواصل معنا ووسائل الدفع</h3>
              <p className="text-sm text-neutral-400 mb-3">{footerContact}</p>
              <p className="text-xs text-neutral-500 font-mono">
                VISA · MASTERCARD · MEEZA · INSTAPAY · MOBILE WALLETS · COD
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
            <p>© 2026 ∅ ONE™ CLOTHING CO. ALL RIGHTS RESERVED.</p>
            <button
              type="button"
              data-testid="footer-admin-lock"
              onClick={onAdminTrigger}
              aria-label={isAdmin ? 'فتح لوحة تحكم الأدمن' : 'دخول الأدمن'}
              title={isAdmin ? 'لوحة تحكم الأدمن' : 'دخول الأدمن'}
              className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition flex items-center justify-center"
            >
              {isAdmin ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}

import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { SiteContent } from '../types/store';
import { SmartImage } from './SmartImage';

interface HeroSectionProps {
  siteContent: SiteContent;
  onOpenFirstProduct: () => void;
}

export function HeroSection({ siteContent, onOpenFirstProduct }: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative bg-grid-pattern border-b border-white/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-right">
            <div className="space-y-5">
              <p dir="ltr" className="text-xs font-mono tracking-widest text-neutral-400 text-right">
                INDEPENDENT STREETWEAR · DROP 01
              </p>

              <h1
                dir="ltr"
                className="font-display font-extrabold text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.08] tracking-tight text-white text-right [text-wrap:balance]"
              >
                {siteContent.heroTitle}
              </h1>

              <p className="text-neutral-300 text-base sm:text-lg max-w-xl leading-relaxed">
                {siteContent.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#collection"
                  className="bg-white text-black px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base hover:bg-neutral-200 transition inline-flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <span>تسوق المجموعة الآن</span>
                  <ArrowLeft className="w-4 h-4" />
                </a>
                <a
                  href="#manifesto"
                  className="px-6 py-3.5 rounded-xl border border-white/20 text-white font-semibold text-sm sm:text-base hover:bg-white/5 transition whitespace-nowrap shrink-0"
                >
                  فلسفة ∅ ONE
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/10 text-xs">
              <div>
                <p dir="ltr" className="font-mono text-white font-bold text-sm tabular-nums mb-0.5 text-right">
                  450 GSM
                </p>
                <p className="text-neutral-400">قطن مصري فاخر</p>
              </div>
              <div>
                <p dir="ltr" className="font-mono text-white font-bold text-sm mb-0.5 text-right">
                  BOXY FIT
                </p>
                <p className="text-neutral-400">قصّات أوفر سايز</p>
              </div>
              <div>
                <p className="font-mono text-white font-bold text-sm flex items-center gap-1.5 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>PAY ONLINE</span>
                </p>
                <p className="text-neutral-400">فيزا · محفظة · إنستا باي</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-charcoal h-[400px] sm:h-[480px] lg:h-[520px] group">
              <SmartImage
                src={siteContent.heroImage}
                alt="حملة ∅ ONE للستريت وير في القاهرة"
                fallbackTitle="∅ ONE™ STREETWEAR"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-neutral-300">FEATURED PIECE · 01</p>
                  <p className="font-display font-bold text-lg sm:text-xl text-white mt-0.5">
                    BINARY CODE HEAVY HOODIE
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenFirstProduct}
                  aria-label="عرض تفاصيل قطعة BINARY CODE HEAVY HOODIE"
                  className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition shrink-0"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

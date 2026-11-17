import { Cpu, Globe, Infinity as InfinityIcon } from 'lucide-react';
import type { SiteContent } from '../types/store';

interface ManifestoSectionProps {
  siteContent: SiteContent;
}

export function ManifestoSection({ siteContent }: ManifestoSectionProps) {
  return (
    <section id="manifesto" className="py-20 bg-charcoal border-y border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-obsidian border border-white/10 p-8 sm:p-14 text-center">
          <p className="font-mono text-xs tracking-widest text-neutral-400 mb-4">
            02. BRAND IDENTITY
          </p>
          <h2
            dir="ltr"
            className="font-display font-extrabold text-3xl sm:text-5xl text-white mb-4 tracking-tight [text-wrap:balance]"
          >
            {siteContent.manifestoHeadline}
          </h2>
          <p
            dir="ltr"
            className="font-mono text-xs sm:text-sm text-neutral-400 tracking-wider mb-6"
          >
            {siteContent.manifestoSub}
          </p>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-10">
            {siteContent.manifestoBody}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <div className="py-2">
              <Globe className="w-5 h-5 text-white mx-auto mb-2.5" strokeWidth={1.75} />
              <h3 className="font-bold text-sm text-white">خامات بمعايير عالمية</h3>
              <p className="text-xs text-neutral-400 mt-1">قطن مصري 450 GSM معالج ضد الوبر</p>
            </div>
            <div className="py-2">
              <Cpu className="w-5 h-5 text-white mx-auto mb-2.5" strokeWidth={1.75} />
              <h3 className="font-bold text-sm text-white">تصاميم معمارية رقمية</h3>
              <p className="text-xs text-neutral-400 mt-1">مستوحاة من الهندسة والرموز الثنائية</p>
            </div>
            <div className="py-2">
              <InfinityIcon className="w-5 h-5 text-white mx-auto mb-2.5" strokeWidth={1.75} />
              <h3 className="font-bold text-sm text-white">قطع أساسية مستدامة</h3>
              <p className="text-xs text-neutral-400 mt-1">قصّات Boxy Oversized تعيش طويلاً</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { LOOKBOOK_IMAGES } from '../data/defaultStore';
import { SmartImage } from './SmartImage';

export function LookbookSection() {
  return (
    <section id="lookbook" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-xs text-neutral-400 mb-1.5">03. VISUAL ARCHIVE</p>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            LOOKBOOK 01
          </h2>
        </div>
        <span className="font-mono text-xs text-neutral-400">WEAR THE CODE</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LOOKBOOK_IMAGES.map((item) => (
          <figure
            key={item.caption}
            className="rounded-2xl overflow-hidden border border-white/10 bg-charcoal aspect-[3/4] relative group"
          >
            <SmartImage
              src={item.src}
              alt={item.caption}
              fallbackTitle={item.caption}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            <figcaption
              dir="ltr"
              className="absolute bottom-4 right-4 text-xs font-mono text-white tracking-wider"
            >
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

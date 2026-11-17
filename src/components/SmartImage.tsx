import { useState } from 'react';
import { Shirt } from 'lucide-react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SmartImage({ src, alt, className = '', fallbackTitle }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-charcoal via-obsidian to-concrete text-neutral-400 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shirt className="w-10 h-10 mb-3 text-neutral-500" strokeWidth={1.5} />
        <span className="font-display text-sm font-bold tracking-wide text-chalk">∅ ONE™</span>
        {fallbackTitle && (
          <span className="text-xs text-neutral-400 mt-1 line-clamp-2">{fallbackTitle}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

import { X } from 'lucide-react';
import type { SizeGuideRow } from '../types/store';

interface SizeGuideModalProps {
  open: boolean;
  rows: SizeGuideRow[];
  onClose: () => void;
}

export function SizeGuideModal({ open, rows, onClose }: SizeGuideModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-charcoal border border-white/15 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 id="size-guide-title" className="font-display font-bold text-xl text-white">
            جدول المقاسات العام (OVERSIZED FIT)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق جدول المقاسات"
            className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white hover:text-black flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          جميع قطع ∅ ONE مصممة بقصّة Boxy Oversized مريحة. الأبعاد بالسنتيمتر (CM).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs font-mono border-collapse tabular-nums">
            <thead>
              <tr className="bg-obsidian text-white border-b border-white/15">
                <th className="py-3 px-2">المقاس</th>
                <th className="py-3 px-2">عرض الصدر</th>
                <th className="py-3 px-2">الطول</th>
                <th className="py-3 px-2">الكتف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-neutral-300">
              {rows.map((r) => (
                <tr key={r.size}>
                  <td className="py-2.5 font-bold text-white">{r.size}</td>
                  <td className="py-2.5">{r.chest}</td>
                  <td className="py-2.5">{r.length}</td>
                  <td className="py-2.5">{r.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

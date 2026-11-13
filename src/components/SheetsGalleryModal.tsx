import { useEffect, useState } from 'react';
import { X, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { REFERENCE_SHEETS } from '../data/nuclearPhysicsCurriculum';

interface SheetsGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SheetsGalleryModal({ isOpen, onClose }: SheetsGalleryModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [orientedSrc, setOrientedSrc] = useState<string>('');

  const activeSheet = REFERENCE_SHEETS[selectedIndex];

  useEffect(() => {
    if (!isOpen || !activeSheet) return;
    if (activeSheet.upright) {
      setOrientedSrc(activeSheet.imagePath);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setOrientedSrc(canvas.toDataURL('image/png'));
      } else {
        setOrientedSrc(activeSheet.imagePath);
      }
    };
    img.onerror = () => {
      if (!cancelled) setOrientedSrc(activeSheet.imagePath);
    };
    img.src = activeSheet.imagePath;

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeSheet]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Fiches manuscrites originales 2BAC"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] bg-[#0b0f19] border border-white/[0.12] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-sky-300 shrink-0" />
            <h2 className="font-display text-base font-semibold text-slate-50 truncate">
              Fiches Originales — Physique Nucléaire 2BAC (Taha Winmers)
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-100 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {zoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
              <span>{zoomed ? 'Ajuster' : 'Agrandir'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-0">
          {/* Sheet List */}
          <div className="border-b md:border-b-0 md:border-r border-white/[0.08] overflow-y-auto hud-scroll p-3 space-y-1 bg-[#07090f]">
            {REFERENCE_SHEETS.map((sheet, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={sheet.sheetNumber}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    active
                      ? 'bg-sky-400/12 border-sky-400/40 text-slate-50'
                      : 'bg-transparent border-transparent hover:bg-white/[0.04] text-slate-400'
                  }`}
                >
                  <div className="text-xs font-mono-tabular text-sky-300">
                    Fiche {sheet.sheetNumber}
                  </div>
                  <div className="text-xs font-medium text-slate-100 mt-0.5 line-clamp-1">
                    {sheet.title.replace(/^Fiche \d+ — /, '')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {sheet.topics}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sheet Preview */}
          <div className="flex flex-col min-h-0 bg-[#07090f]">
            <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-100 truncate">
                {activeSheet.title}
              </span>
              <span className="text-xs text-slate-400 truncate hidden sm:inline">
                {activeSheet.topics}
              </span>
            </div>
            <div className="flex-1 overflow-auto hud-scroll p-4 flex items-center justify-center">
              <img
                src={orientedSrc || activeSheet.imagePath}
                alt={activeSheet.title}
                referrerPolicy="no-referrer"
                className={`rounded-xl border border-white/[0.1] transition-transform duration-200 ${
                  zoomed ? 'max-w-none w-[900px]' : 'max-h-[64vh] w-auto object-contain'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Atom } from 'lucide-react';
import { ChapterId } from '../types/lesson';
import { SCIENTISTS } from '../data/scientistsAndQuiz';
import { MathFormula } from './MathFormula';

interface ScientistsPanelProps {
  chapterId: ChapterId;
}

export function ScientistsPanel({ chapterId }: ScientistsPanelProps) {
  const chapterMatchedIndex = SCIENTISTS.findIndex((s) =>
    s.chapters.includes(chapterId)
  );
  const [selectedIdx, setSelectedIdx] = useState(
    chapterMatchedIndex >= 0 ? chapterMatchedIndex : 0
  );
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const idx = SCIENTISTS.findIndex((s) => s.chapters.includes(chapterId));
    if (idx >= 0) setSelectedIdx(idx);
  }, [chapterId]);

  const scientist = SCIENTISTS[selectedIdx] ?? SCIENTISTS[0];
  const hasError = Boolean(imgFailed[scientist.id]);

  return (
    <div className="divide-y divide-white/[0.07]">
      {/* Scholar Selector */}
      <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto hud-scroll bg-[#07090f]/60">
        {SCIENTISTS.map((s, idx) => {
          const active = idx === selectedIdx;
          const isFeatured = s.chapters.includes(chapterId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 border ${
                active
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 font-semibold'
                  : isFeatured
                  ? 'text-slate-100 bg-white/[0.04] border-white/[0.09] hover:bg-white/[0.08]'
                  : 'text-slate-400 bg-transparent border-transparent hover:text-slate-100 hover:bg-white/[0.04]'
              }`}
            >
              {s.name.split(' ').slice(-1)[0]}
            </button>
          );
        })}
      </div>

      {/* Documentary Portrait & Biography */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-28 rounded-xl overflow-hidden border border-white/[0.12] bg-[#07090f] shrink-0 flex items-center justify-center">
            {!hasError ? (
              <>
                <img
                  src={scientist.portraitSrc}
                  alt={`Portrait documentaire de ${scientist.name}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImgFailed((prev) => ({ ...prev, [scientist.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#07090f]/90 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2">
                <Atom className="w-5 h-5 text-amber-300 mb-1" />
                <span className="text-[10px] font-mono-tabular text-slate-400">
                  {scientist.name.split(' ').slice(-1)[0]}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 pt-0.5">
            <div className="text-[11px] font-mono-tabular text-amber-300 font-medium">
              {scientist.lifespan}
            </div>
            <h2 className="font-display text-base font-semibold text-slate-50 leading-tight mt-1">
              {scientist.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {scientist.role}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-slate-200 leading-[1.6]">
          {scientist.discovery}
        </p>

        <div className="pt-3 border-t border-white/[0.06]">
          <div className="text-[11px] font-mono-tabular text-sky-300 mb-1.5">
            Contribution clé
          </div>
          <div className="text-slate-50 overflow-x-auto py-0.5">
            <MathFormula latex={scientist.keyFormulaLatex} />
          </div>
        </div>

        <blockquote className="pt-3 border-t border-white/[0.06] text-xs italic text-slate-400 leading-relaxed">
          « {scientist.quote} »
        </blockquote>
      </div>
    </div>
  );
}

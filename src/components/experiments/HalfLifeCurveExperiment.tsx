import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ISOTOPE_PRESETS } from '../../data/nuclearPhysicsCurriculum';
import { MathFormula } from '../MathFormula';

export function HalfLifeCurveExperiment() {
  const [mode, setMode] = useState<'N' | 'a'>('N');
  const [tHalfNorm, setTHalfNorm] = useState<number>(1.0);
  const [halfLifeFactor, setHalfLifeFactor] = useState<number>(1.0);
  const [showTangent, setShowTangent] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(false);
  const [selectedIsoId, setSelectedIsoId] = useState<string>('c14');
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedIso = useMemo(
    () => ISOTOPE_PRESETS.find((i) => i.id === selectedIsoId) ?? ISOTOPE_PRESETS[2],
    [selectedIsoId]
  );

  // Smooth real-time decay playback
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setTHalfNorm((prev) => {
        const next = prev + dt * 0.55;
        return next > 4 ? 0 : Number(next.toFixed(3));
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const maxTimeAxis = 4;
  const effectiveTHalf = halfLifeFactor; // relative t_1/2 on [0..4] axis
  const lambdaRel = Math.LN2 / effectiveTHalf;
  const tauRel = 1 / lambdaRel; // 1.4427 * effectiveTHalf

  const w = 520;
  const h = 276;
  const padL = 56;
  const padR = 24;
  const padT = 24;
  const padB = 38;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const toX = (t: number) => padL + (t / maxTimeAxis) * plotW;
  const toY = (ratio: number) => padT + (1 - ratio) * plotH;

  const curvePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 84; i++) {
      const t = (i / 84) * maxTimeAxis;
      const y = Math.exp(-lambdaRel * t);
      pts.push(`${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [lambdaRel]);

  const areaPath = useMemo(
    () =>
      `${curvePath} L ${toX(maxTimeAxis).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(
        1
      )} ${toY(0).toFixed(1)} Z`,
    [curvePath]
  );

  const ratio = Math.exp(-lambdaRel * tHalfNorm);
  const currentX = toX(tHalfNorm);
  const currentY = toY(ratio);
  const halfX = toX(effectiveTHalf);
  const halfY = toY(0.5);
  const tauX = toX(Math.min(maxTimeAxis, tauRel));
  const tauY = toY(Math.exp(-1));

  const remainingAtoms = Math.round(64 * ratio);
  const a0 = 1000;
  const currentActivity = Math.max(1, Math.round(a0 * ratio));
  const computedAge = (Math.log(a0 / currentActivity) / Math.LN2).toFixed(2);

  const handleSvgPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    setPlaying(false);
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    const norm = Math.max(0, Math.min(maxTimeAxis, ((relX - padL) / plotW) * maxTimeAxis));
    setTHalfNorm(Number(norm.toFixed(2)));
  };

  const axisSymbol = mode === 'N' ? 'N(t)' : 'a(t)';
  const initSymbol = mode === 'N' ? 'N₀' : 'a₀';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
      aria-label="Module 3 : Loi de décroissance, Demi-vie et Constante τ"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#00F2FE]/18">
        <div>
          <div className="text-xs font-mono-tabular text-[#00F2FE]">
            03 · Loi de Décroissance & Datation · Fiches 7, 8, 9 & 10
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F3F4F6] mt-1">
            Decay Law & Half-Life Calculator (t₁/₂ & τ)
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
            Faites glisser le curseur sur la courbe ou ajustez la demi-vie t₁/₂ pour observer l’évolution de N(t), la tangente à t = 0 (τ) et l’activité a(t).
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070A12] border border-[#00F2FE]/22">
          <button
            type="button"
            onClick={() => setMode('N')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              mode === 'N'
                ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            Noyaux N(t)
          </button>
          <button
            type="button"
            onClick={() => setMode('a')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              mode === 'a'
                ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            Activité a(t) · Bq
          </button>
        </div>
      </div>

      {/* HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Main Interactive Curve Canvas (8 cols) */}
        <div className="lg:col-span-8 hud-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
            <span className="text-[#94A3B8]">
              Loi exponentielle :{' '}
              <span className="text-[#00F2FE] font-semibold">
                {axisSymbol} = {initSymbol} · e⁻λᵗ
              </span>
            </span>
            <span className="text-[#F3F4F6]">
              t = {tHalfNorm.toFixed(2)} u · t₁/₂ = {effectiveTHalf.toFixed(2)} · {selectedIso.name}
            </span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto cursor-ew-resize rounded-xl bg-[#070A12] border border-[#00F2FE]/22 select-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleSvgPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) handleSvgPointer(e);
            }}
          >
            <defs>
              <linearGradient id="hud-decay-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.28" />
                <stop offset="65%" stopColor="#7F00FF" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#070A12" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Reference Grid Lines */}
            {[0.5, Math.exp(-1), 0.25, 0.125].map((r, idx) => (
              <line
                key={idx}
                x1={padL}
                y1={toY(r)}
                x2={w - padR}
                y2={toY(r)}
                stroke="rgba(0, 242, 254, 0.12)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Axes */}
            <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#00F2FE" strokeOpacity="0.6" strokeWidth="1.5" />
            <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#00F2FE" strokeOpacity="0.6" strokeWidth="1.5" />

            {/* Axis Labels */}
            <text x={padL - 8} y={padT + 4} textAnchor="end" fill="#F3F4F6" fontSize="11" fontFamily="JetBrains Mono">
              {initSymbol}
            </text>
            <text x={padL - 8} y={halfY + 4} textAnchor="end" fill="#FF5252" fontSize="10.5" fontFamily="JetBrains Mono">
              {initSymbol}/2
            </text>
            <text x={padL - 8} y={tauY + 4} textAnchor="end" fill="#A855F7" fontSize="10" fontFamily="JetBrains Mono">
              0,37{initSymbol}
            </text>
            <text x={w - padR} y={h - 12} textAnchor="end" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono">
              Temps t (échelle relative)
            </text>

            {/* Area Fill */}
            <path d={areaPath} fill="url(#hud-decay-grad)" />

            {/* Half-life t_1/2 projections */}
            <line x1={halfX} y1={halfY} x2={halfX} y2={h - padB} stroke="#FF5252" strokeWidth="1.3" strokeDasharray="4 3" />
            <line x1={padL} y1={halfY} x2={halfX} y2={halfY} stroke="#FF5252" strokeWidth="1.3" strokeDasharray="4 3" />
            <circle cx={halfX} cy={halfY} r="4" fill="#FF5252" />
            <text x={halfX} y={h - 16} textAnchor="middle" fill="#FF5252" fontSize="11" fontFamily="JetBrains Mono">
              t₁/₂
            </text>

            {/* Tangent at t=0 intersecting time axis at tau */}
            {showTangent && (
              <g>
                <line
                  x1={padL}
                  y1={padT}
                  x2={toX(tauRel)}
                  y2={h - padB}
                  stroke="#A855F7"
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                />
                {tauRel <= maxTimeAxis && (
                  <>
                    <line
                      x1={tauX}
                      y1={tauY}
                      x2={tauX}
                      y2={h - padB}
                      stroke="rgba(168, 85, 247, 0.55)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle cx={tauX} cy={h - padB} r="4" fill="#A855F7" />
                    <circle cx={tauX} cy={tauY} r="3.5" fill="#A855F7" />
                    <text x={Math.min(w - 58, tauX + 5)} y={h - 16} textAnchor="start" fill="#A855F7" fontSize="11" fontFamily="JetBrains Mono">
                      τ = 1/λ
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Exponential Curve */}
            <path d={curvePath} fill="none" stroke="#00F2FE" strokeWidth="2.8" strokeLinecap="round" />

            {/* Scrubbed Cursor */}
            <line x1={currentX} y1={currentY} x2={currentX} y2={h - padB} stroke="rgba(243,244,246,0.45)" strokeWidth="1.2" />
            <circle cx={currentX} cy={currentY} r="6" fill="#F3F4F6" stroke="#00F2FE" strokeWidth="2.5" />
          </svg>

          {/* Dual Sliders & Playback Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
            <div className="md:col-span-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#00F2FE] hover:bg-[#67E8F9] text-[#0B0F19] rounded-lg transition-colors whitespace-nowrap"
              >
                {playing ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Simuler</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setTHalfNorm(0);
                }}
                className="p-2 rounded-lg bg-[#070A12] border border-[#00F2FE]/22 text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
                title="Réinitialiser t = 0"
                aria-label="Réinitialiser t = 0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowTangent((s) => !s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  showTangent
                    ? 'bg-[#7F00FF]/28 border-[#7F00FF] text-[#F3F4F6]'
                    : 'bg-[#070A12] border-[#00F2FE]/18 text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                Tangente τ
              </button>
            </div>

            <label className="md:col-span-4 flex flex-col gap-1 text-xs">
              <span className="font-mono-tabular text-[#94A3B8]">
                Temps t = <strong className="text-[#00F2FE]">{tHalfNorm.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.05}
                value={tHalfNorm}
                onChange={(e) => {
                  setPlaying(false);
                  setTHalfNorm(parseFloat(e.target.value));
                }}
                className="hud-slider w-full"
              />
            </label>

            <label className="md:col-span-3 flex flex-col gap-1 text-xs">
              <span className="font-mono-tabular text-[#94A3B8]">
                t₁/₂ = <strong className="text-[#FF5252]">{effectiveTHalf.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={halfLifeFactor}
                onChange={(e) => setHalfLifeFactor(parseFloat(e.target.value))}
                className="hud-slider w-full"
              />
            </label>
          </div>
        </div>

        {/* Right Telemetry, 64-Nucleus Chamber & Formulas (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* 64-Atom Sample Chamber */}
          <div className="hud-panel rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
                Échantillon (64 noyaux)
              </h2>
              <span className="text-xs font-mono-tabular text-[#00F2FE]">
                {(ratio * 100).toFixed(1)}% restants
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1.5 p-3 rounded-xl bg-[#070A12] border border-[#00F2FE]/18">
              {Array.from({ length: 64 }).map((_, idx) => {
                const alive = idx < remainingAtoms;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-full transition-colors duration-200 ${
                      alive
                        ? 'bg-[#00F2FE] shadow-[0_0_8px_rgba(0,242,254,0.45)]'
                        : 'bg-[#7F00FF]/25'
                    }`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono-tabular text-xs">
              <div className="p-2.5 rounded-xl bg-[#070A12] border border-[#00F2FE]/18">
                <div className="text-[#94A3B8]">Restants N(t)</div>
                <div className="text-base font-semibold text-[#00F2FE] mt-0.5">
                  {remainingAtoms} / 64
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070A12] border border-[#7F00FF]/28">
                <div className="text-[#94A3B8]">Désintégrés N_D</div>
                <div className="text-base font-semibold text-[#F3F4F6] mt-0.5">
                  {64 - remainingAtoms} / 64
                </div>
              </div>
            </div>
          </div>

          {/* Isotope Half-life & Dating Formulas */}
          <div className="flex-1 hud-panel-purple rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {['c14', 'p30', 'u238'].map((id) => {
                const iso = ISOTOPE_PRESETS.find((x) => x.id === id);
                if (!iso) return null;
                return (
                  <button
                    key={iso.id}
                    type="button"
                    onClick={() => setSelectedIsoId(iso.id)}
                    className={`px-2.5 py-1 text-xs font-mono-tabular rounded-lg border transition-colors ${
                      selectedIsoId === iso.id
                        ? 'bg-[#00F2FE]/20 border-[#00F2FE] text-[#F3F4F6]'
                        : 'bg-[#070A12] border-[#00F2FE]/15 text-[#94A3B8] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {iso.A}
                    {iso.symbol} ({iso.halfLifeLabel})
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-[#F3F4F6] space-y-2 pt-1 overflow-x-auto">
              <MathFormula latex="t_{1/2} = \frac{\ln 2}{\lambda} = \tau \ln 2 \quad ; \quad N(\tau) = 0{,}37\,N_0" />
              <MathFormula latex="a(t) = \lambda N(t) = a_0 e^{-\lambda t} \quad [\text{Bq}]" />
              <MathFormula latex="t = \frac{\ln(a_0 / a(t))}{\ln 2} \cdot t_{1/2}" />
            </div>

            <div className="pt-2 border-t border-[#00F2FE]/15 flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-[#94A3B8]">Activité : {currentActivity} Bq</span>
              <span className="text-[#FF5252]">Âge t ≈ {computedAge} · t₁/₂</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

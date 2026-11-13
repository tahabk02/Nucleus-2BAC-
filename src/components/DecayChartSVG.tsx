import React, { useMemo, useRef } from 'react';
import { CurveKind } from '../types/lesson';
import {
  ASTON_LANDMARKS,
  CURVE_DESCRIPTORS,
  evaluateAstonElPerA,
  getAstonZoneInfo,
} from '../data/nuclearCurves';

interface DecayChartSVGProps {
  curveKind: CurveKind;
  tHalfNormalized: number; // 0..4 (for Aston mapped to A = 2..238)
  showTangent: boolean;
  n0Label: string;
  halfLifeLabel: string;
  onChangeTime: (tNorm: number) => void;
}

export function DecayChartSVG({
  curveKind,
  tHalfNormalized,
  showTangent,
  n0Label,
  halfLifeLabel,
  onChangeTime,
}: DecayChartSVGProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const maxHalfLives = 4;
  const tauNorm = 1 / Math.LN2; // ≈ 1.4427

  const w = 360;
  const h = 198;
  const padL = 46;
  const padR = 18;
  const padT = 20;
  const padB = 32;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const toX = (tNorm: number) => padL + (tNorm / maxHalfLives) * plotW;
  const toY = (ratio: number) => padT + (1 - ratio) * plotH;

  // Exponential N(t) / a(t) path
  const expPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * maxHalfLives;
      const y = Math.exp(-t * Math.LN2);
      pts.push(`${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  // Daughter / Disintegrated N_D(t) = N0(1 - e^-λt) path
  const daughterPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * maxHalfLives;
      const y = 1 - Math.exp(-t * Math.LN2);
      pts.push(`${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  // Log-linear path: ln(N0 / N(t)) / (4 * ln 2) -> linear 0..1
  const logLinearPath = useMemo(() => {
    return `M ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(maxHalfLives).toFixed(1)} ${toY(1).toFixed(1)}`;
  }, []);

  // Descending linear path for ln N(t) = -λt + ln N0 and ln(N(t)/N0) = -λt (from 1 down to 0)
  const lnDownPath = useMemo(() => {
    return `M ${toX(0).toFixed(1)} ${toY(1).toFixed(1)} L ${toX(maxHalfLives).toFixed(1)} ${toY(0).toFixed(1)}`;
  }, []);

  // Aston path: El/A across A ∈ [2, 238], normalized over [0, 9.5 MeV]
  const astonPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      const a = 2 + u * 236;
      const elPerA = evaluateAstonElPerA(a);
      const yNorm = Math.min(1, elPerA / 9.5);
      pts.push(
        `${i === 0 ? 'M' : 'L'} ${toX(u * maxHalfLives).toFixed(1)} ${toY(yNorm).toFixed(1)}`
      );
    }
    return pts.join(' ');
  }, []);

  const areaPath = useMemo(() => {
    const base =
      curveKind === 'aston'
        ? astonPath
        : curveKind === 'log-linear'
        ? logLinearPath
        : curveKind === 'ln-nt' || curveKind === 'ln-neg'
        ? lnDownPath
        : expPath;
    if (curveKind === 'ln-neg') {
      return `${base} L ${toX(maxHalfLives).toFixed(1)} ${toY(1).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(1).toFixed(1)} Z`;
    }
    return `${base} L ${toX(maxHalfLives).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`;
  }, [curveKind, astonPath, logLinearPath, lnDownPath, expPath]);

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    const norm = Math.max(0, Math.min(maxHalfLives, ((relX - padL) / plotW) * maxHalfLives));
    onChangeTime(Number(norm.toFixed(2)));
  };

  const descriptor =
    CURVE_DESCRIPTORS.find((d) => d.id === curveKind) ?? CURVE_DESCRIPTORS[0];

  const remainingRatio = Math.exp(-tHalfNormalized * Math.LN2);
  const disintegratedRatio = 1 - remainingRatio;
  const lnRatio = tHalfNormalized * Math.LN2;
  const currentA = Math.round(2 + (tHalfNormalized / maxHalfLives) * 236);
  const currentElPerA = evaluateAstonElPerA(currentA);
  const astonZone = getAstonZoneInfo(currentA);

  const currentX = toX(tHalfNormalized);
  const currentY =
    curveKind === 'log-linear'
      ? toY(tHalfNormalized / maxHalfLives)
      : curveKind === 'ln-nt' || curveKind === 'ln-neg'
      ? toY(1 - tHalfNormalized / maxHalfLives)
      : curveKind === 'aston'
      ? toY(Math.min(1, currentElPerA / 9.5))
      : toY(remainingRatio);

  const halfX = toX(1);
  const halfY = toY(0.5);
  const tauX = toX(tauNorm);
  const tauY = toY(Math.exp(-1));

  return (
    <div className="select-none">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
        <span className="truncate font-mono-tabular text-[11px]" style={{ color: descriptor.accentHex }}>
          {descriptor.formula}
        </span>
        <span className="font-mono-tabular text-slate-200 whitespace-nowrap shrink-0">
          {curveKind === 'aston'
            ? `A = ${currentA} · ${currentElPerA.toFixed(2)} MeV`
            : curveKind === 'log-linear'
            ? `ln(N₀/N) = ${lnRatio.toFixed(2)}`
            : curveKind === 'ln-nt'
            ? `Δln N = −${lnRatio.toFixed(2)}`
            : curveKind === 'ln-neg'
            ? `ln(N/N₀) = −${lnRatio.toFixed(2)}`
            : `t = ${tHalfNormalized.toFixed(2)} t₁/₂ (${Math.round(remainingRatio * 100)}%)`}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto cursor-ew-resize rounded-xl bg-[#07090f] border border-white/[0.08]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
      >
        <defs>
          <linearGradient id="decay-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={descriptor.accentHex} stopOpacity="0.22" />
            <stop offset="100%" stopColor={descriptor.accentHex} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Aston colored physics bands */}
        {curveKind === 'aston' && (
          <g opacity="0.11">
            <rect
              x={padL}
              y={padT}
              width={((24 - 2) / 236) * plotW}
              height={plotH}
              fill="#ff4dff"
            />
            <rect
              x={padL + ((24 - 2) / 236) * plotW}
              y={padT}
              width={((185 - 24) / 236) * plotW}
              height={plotH}
              fill="#10b981"
            />
            <rect
              x={padL + ((185 - 2) / 236) * plotW}
              y={padT}
              width={((238 - 185) / 236) * plotW}
              height={plotH}
              fill="#ffb703"
            />
          </g>
        )}

        {/* Horizontal dashed guides */}
        {(curveKind === 'decay-nd' || curveKind === 'activity') &&
          [0.5, Math.exp(-1)].map((r, idx) => (
            <line
              key={idx}
              x1={padL}
              y1={toY(r)}
              x2={w - padR}
              y2={toY(r)}
              stroke="rgba(148,163,184,0.14)"
              strokeDasharray="3 3"
            />
          ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#475569" strokeWidth="1.4" />
        <line
          x1={padL}
          y1={curveKind === 'ln-neg' ? padT : h - padB}
          x2={w - padR}
          y2={curveKind === 'ln-neg' ? padT : h - padB}
          stroke="#475569"
          strokeWidth="1.4"
        />

        {/* Axis labels */}
        {curveKind === 'aston' ? (
          <>
            <text x={padL - 6} y={padT + 5} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              9,5
            </text>
            <text x={padL - 6} y={toY(5 / 9.5) + 3} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              5,0
            </text>
            <text x={padL - 6} y={h - padB} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">
              MeV
            </text>
            <text x={w - padR} y={h - 10} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              Nombre de masse A
            </text>
          </>
        ) : curveKind === 'log-linear' ? (
          <>
            <text x={padL - 6} y={padT + 5} textAnchor="end" fill="#10b981" fontSize="9.5" fontFamily="JetBrains Mono">
              4·ln2
            </text>
            <text x={padL - 6} y={toY(0.5) + 3} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              2·ln2
            </text>
            <text x={padL - 6} y={h - padB + 3} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              0
            </text>
            <text x={w - padR} y={h - 10} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              t (t₁/₂)
            </text>
          </>
        ) : curveKind === 'ln-nt' ? (
          <>
            <text x={padL - 6} y={padT + 5} textAnchor="end" fill="#f59e0b" fontSize="9.5" fontFamily="JetBrains Mono">
              ln N₀
            </text>
            <text x={padL - 6} y={toY(0.75) + 3} textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">
              −ln2
            </text>
            <text x={padL - 6} y={toY(1 - 1 / (4 * Math.LN2)) + 3} textAnchor="end" fill="#10b981" fontSize="8.5" fontFamily="JetBrains Mono">
              −1
            </text>
            <text x={padL - 6} y={h - padB + 3} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              0
            </text>
            <text x={w - padR} y={h - 10} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              ln(N₀)/λ
            </text>
          </>
        ) : curveKind === 'ln-neg' ? (
          <>
            <text x={padL - 6} y={padT + 4} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              0
            </text>
            <text x={padL - 6} y={toY(0.75) + 3} textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">
              −ln2
            </text>
            <text x={padL - 6} y={toY(1 - 1 / (4 * Math.LN2)) + 3} textAnchor="end" fill="#10b981" fontSize="8.5" fontFamily="JetBrains Mono">
              −1
            </text>
            <text x={padL - 6} y={h - padB + 3} textAnchor="end" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono">
              −4ln2
            </text>
            <text x={w - padR} y={padT - 6} textAnchor="end" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono">
              t (t₁/₂)
            </text>
          </>
        ) : (
          <>
            <text x={padL - 8} y={padT + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              {curveKind === 'activity' ? 'a₀' : 'N₀'}
            </text>
            <text x={padL - 6} y={halfY + 3} textAnchor="end" fill="#fb7185" fontSize="9.5" fontFamily="JetBrains Mono">
              {curveKind === 'activity' ? 'a₀/2' : 'N₀/2'}
            </text>
            <text x={padL - 6} y={tauY + 3} textAnchor="end" fill="#f5b041" fontSize="9" fontFamily="JetBrains Mono">
              0,37
            </text>
            <text x={w - padR} y={h - 10} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              t
            </text>
          </>
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#decay-area-grad)" />

        {/* Curve-specific annotations */}
        {(curveKind === 'decay-nd' || curveKind === 'activity') && (
          <>
            <line x1={halfX} y1={halfY} x2={halfX} y2={h - padB} stroke="#f96449" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padL} y1={halfY} x2={halfX} y2={halfY} stroke="#f96449" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={halfX} cy={halfY} r="3.5" fill="#f96449" />
            <text x={halfX} y={h - 14} textAnchor="middle" fill="#fb7185" fontSize="9.5" fontFamily="JetBrains Mono">
              t₁/₂
            </text>

            {showTangent && (
              <g>
                <line
                  x1={padL}
                  y1={padT}
                  x2={tauX}
                  y2={h - padB}
                  stroke="#f5b041"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                {curveKind === 'decay-nd' && (
                  <line
                    x1={padL}
                    y1={h - padB}
                    x2={tauX}
                    y2={padT}
                    stroke="rgba(249,100,73,0.45)"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                )}
                <circle cx={tauX} cy={h - padB} r="3.2" fill="#f5b041" />
                <text x={tauX + 3} y={h - 14} textAnchor="start" fill="#f5b041" fontSize="10" fontFamily="JetBrains Mono">
                  τ
                </text>
              </g>
            )}
          </>
        )}

        {/* Daughter N_D(t) curve in decay-nd mode */}
        {curveKind === 'decay-nd' && (
          <>
            <path
              d={daughterPath}
              fill="none"
              stroke="#f96449"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle
              cx={currentX}
              cy={toY(disintegratedRatio)}
              r="4.2"
              fill="#f8fafc"
              stroke="#f96449"
              strokeWidth="2"
            />
          </>
        )}

        {/* Log-linear Bac slope triangle */}
        {curveKind === 'log-linear' && showTangent && (
          <g>
            <line
              x1={toX(1)}
              y1={toY(0.25)}
              x2={toX(2)}
              y2={toY(0.25)}
              stroke="#f5b041"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <line
              x1={toX(2)}
              y1={toY(0.25)}
              x2={toX(2)}
              y2={toY(0.5)}
              stroke="#f5b041"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <text x={toX(1.5)} y={toY(0.25) + 12} textAnchor="middle" fill="#f5b041" fontSize="9" fontFamily="JetBrains Mono">
              Δt = t₁/₂
            </text>
            <text x={toX(2) + 4} y={toY(0.375) + 3} textAnchor="start" fill="#f5b041" fontSize="9" fontFamily="JetBrains Mono">
              Δy = ln2
            </text>
          </g>
        )}

        {/* Fiche 11 landmarks (t1/2 and tau projections on ln N(t) & ln(N/N0)) */}
        {(curveKind === 'ln-nt' || curveKind === 'ln-neg') && (
          <g>
            {/* t1/2 projection -> yNorm = 0.75 */}
            <line
              x1={padL}
              y1={toY(0.75)}
              x2={toX(1)}
              y2={toY(0.75)}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={toX(1)}
              y1={curveKind === 'ln-neg' ? padT : h - padB}
              x2={toX(1)}
              y2={toY(0.75)}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={toX(1)} cy={toY(0.75)} r="3.2" fill="#38bdf8" />
            <text
              x={toX(1)}
              y={curveKind === 'ln-neg' ? padT - 6 : h - 14}
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              t₁/₂
            </text>

            {/* tau projection -> yNorm = 1 - 1/(4 ln2) */}
            <line
              x1={padL}
              y1={toY(1 - 1 / (4 * Math.LN2))}
              x2={tauX}
              y2={toY(1 - 1 / (4 * Math.LN2))}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={tauX}
              y1={curveKind === 'ln-neg' ? padT : h - padB}
              x2={tauX}
              y2={toY(1 - 1 / (4 * Math.LN2))}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={tauX} cy={toY(1 - 1 / (4 * Math.LN2))} r="3.2" fill="#10b981" />
            <text
              x={tauX + 3}
              y={curveKind === 'ln-neg' ? padT - 6 : h - 14}
              textAnchor="start"
              fill="#10b981"
              fontSize="9.5"
              fontFamily="JetBrains Mono"
            >
              τ
            </text>
          </g>
        )}

        {/* Aston landmark isotope pins */}
        {curveKind === 'aston' &&
          ASTON_LANDMARKS.map((lm) => {
            const lx = toX(((lm.A - 2) / 236) * maxHalfLives);
            const ly = toY(Math.min(1, lm.elPerA / 9.5));
            return (
              <g key={lm.label}>
                <circle cx={lx} cy={ly} r="2.8" fill="#f8fafc" />
                <text
                  x={lx}
                  y={ly - 7}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                >
                  {lm.label}
                </text>
              </g>
            );
          })}

        {/* Primary curve path */}
        <path
          d={
            curveKind === 'aston'
              ? astonPath
              : curveKind === 'log-linear'
              ? logLinearPath
              : curveKind === 'ln-nt' || curveKind === 'ln-neg'
              ? lnDownPath
              : expPath
          }
          fill="none"
          stroke={descriptor.accentHex}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Active simulation cursor */}
        <line
          x1={currentX}
          y1={currentY}
          x2={currentX}
          y2={curveKind === 'ln-neg' ? padT : h - padB}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
        />
        <circle
          cx={currentX}
          cy={currentY}
          r="5"
          fill="#f8fafc"
          stroke={curveKind === 'aston' ? astonZone.colorHex : descriptor.accentHex}
          strokeWidth="2.2"
        />
      </svg>

      {/* Contextual Footer Readout */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono-tabular">
        {curveKind === 'aston' ? (
          <>
            <span style={{ color: astonZone.colorHex }}>{astonZone.label}</span>
            <span>E_l/A = {currentElPerA.toFixed(2)} MeV</span>
          </>
        ) : curveKind === 'log-linear' ? (
          <>
            <span>Pente λ = ln(2)/t₁/₂</span>
            <span>t₁/₂ = {halfLifeLabel}</span>
          </>
        ) : curveKind === 'ln-nt' ? (
          <>
            <span className="text-amber-300">Pente a = −λ = −ΔlnN / Δt</span>
            <span>t₁/₂ = {halfLifeLabel}</span>
          </>
        ) : curveKind === 'ln-neg' ? (
          <>
            <span className="text-fuchsia-300">À t = τ : ln(N/N₀) = −1</span>
            <span>t₁/₂ = {halfLifeLabel}</span>
          </>
        ) : curveKind === 'decay-nd' ? (
          <>
            <span className="text-sky-300">■ N(t) {Math.round(remainingRatio * 100)}%</span>
            <span className="text-[#f96449]">■ N_D {Math.round(disintegratedRatio * 100)}%</span>
            <span>t₁/₂ = {halfLifeLabel}</span>
          </>
        ) : (
          <>
            <span>Initial : {n0Label}</span>
            <span>t₁/₂ = {halfLifeLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ISOTOPE_PRESETS } from '../../data/nuclearPhysicsCurriculum';
import { MathFormula } from '../MathFormula';
import { Segre3DCanvas } from './Segre3DCanvas';

interface SegrePoint {
  z: number;
  n: number;
  kind: 'stable' | 'beta-minus' | 'beta-plus' | 'alpha';
}

export function SegreValleyExperiment() {
  const [selectedId, setSelectedId] = useState<string>('c12');
  const [hoveredPoint, setHoveredPoint] = useState<SegrePoint | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  const selectedIso = useMemo(
    () => ISOTOPE_PRESETS.find((i) => i.id === selectedId) ?? ISOTOPE_PRESETS[0],
    [selectedId]
  );

  // Segré stability valley scatter dataset (Z from 2 to 94)
  const scatterPoints = useMemo<SegrePoint[]>(() => {
    const pts: SegrePoint[] = [];
    for (let z = 2; z <= 94; z += 2) {
      const nStable = Math.round(z + 0.0062 * z * z);
      if (z <= 82) {
        pts.push({ z, n: nStable, kind: 'stable' });
        pts.push({ z, n: nStable + 3, kind: 'beta-minus' });
        pts.push({ z, n: nStable + 6, kind: 'beta-minus' });
        if (z > 4) {
          pts.push({ z, n: Math.max(1, nStable - 3), kind: 'beta-plus' });
          pts.push({ z, n: Math.max(1, nStable - 5), kind: 'beta-plus' });
        }
      } else {
        pts.push({ z, n: nStable, kind: 'alpha' });
        pts.push({ z, n: nStable + 4, kind: 'alpha' });
      }
    }
    return pts;
  }, []);

  const w = 540;
  const h = 340;
  const padL = 52;
  const padR = 24;
  const padT = 20;
  const padB = 42;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxZ = 100;
  const maxN = 155;
  const toX = (z: number) => padL + (z / maxZ) * plotW;
  const toY = (n: number) => padT + (1 - n / maxN) * plotH;

  const selX = toX(selectedIso.Z);
  const selY = toY(selectedIso.N);

  const stabilityDiagnostic =
    selectedIso.Z <= 20 && selectedIso.N === selectedIso.Z
      ? 'Noyau léger stable (N = Z)'
      : selectedIso.Z > 82
      ? 'Noyau lourd (Z > 82) : instable, émetteur α'
      : selectedIso.id === 'c14'
      ? 'Excès de neutrons : instable β⁻'
      : selectedIso.id === 'p30'
      ? 'Excès de protons : instable β⁺'
      : 'Vallée de stabilité (N > Z pour Z > 20)';

  const colorForKind = (kind: SegrePoint['kind']) => {
    switch (kind) {
      case 'stable':
        return '#00F2FE';
      case 'beta-minus':
        return '#A855F7';
      case 'beta-plus':
        return '#FF5252';
      case 'alpha':
        return '#F59E0B';
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
      aria-label="Module 4 : Vallée de stabilité de Segré"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#00F2FE]/18">
        <div>
          <div className="text-xs font-mono-tabular text-[#00F2FE]">
            04 · Cartographie (Z, N) & Filiation · Fiche 6
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F3F4F6] mt-1">
            Segré Stability Valley (2D / 3D)
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
            Explorez la vallée de stabilité en vue matricielle 2D ou en relief 3D pour tester les règles de stabilité des noyaux légers et lourds.
          </p>
        </div>

        {/* Target Isotope Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ISOTOPE_PRESETS.map((iso) => (
            <button
              key={iso.id}
              type="button"
              onClick={() => setSelectedId(iso.id)}
              className={`px-2.5 py-1.5 text-xs font-mono-tabular rounded-lg border transition-colors whitespace-nowrap ${
                selectedId === iso.id
                  ? 'bg-[#00F2FE] border-[#00F2FE] text-[#0B0F19] font-semibold'
                  : 'bg-[#111827] border-[#00F2FE]/20 text-[#94A3B8] hover:text-[#F3F4F6] hover:border-[#00F2FE]/45'
              }`}
            >
              {iso.A}
              {iso.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Scatter Matrix 2D / 3D Viewport (8 cols) */}
        <div className="lg:col-span-8 hud-panel rounded-2xl p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tabular">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FE]" />
                Stable
              </span>
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                Émetteur β⁻
              </span>
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5252]" />
                Émetteur β⁺
              </span>
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                Lourd α (A &gt; 200)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hoveredPoint && viewMode === '2d' && (
                <span className="text-[#00F2FE]">
                  Z={hoveredPoint.z}, N={hoveredPoint.n} (A={hoveredPoint.z + hoveredPoint.n})
                </span>
              )}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#070A12] border border-[#00F2FE]/25">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    viewMode === '2d'
                      ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                  }`}
                >
                  Matrice 2D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    viewMode === '3d'
                      ? 'bg-[#7F00FF] text-[#F3F4F6] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                  }`}
                >
                  Vallée 3D
                </button>
              </div>
            </div>
          </div>

          {viewMode === '2d' ? (
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="w-full h-auto rounded-xl bg-[#070A12] border border-[#00F2FE]/22"
            >
              {/* Grid */}
              {[20, 40, 60, 80].map((zTick) => (
                <g key={`z-${zTick}`}>
                  <line
                    x1={toX(zTick)}
                    y1={padT}
                    x2={toX(zTick)}
                    y2={h - padB}
                    stroke="rgba(0, 242, 254, 0.08)"
                  />
                  <text
                    x={toX(zTick)}
                    y={h - padB + 15}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {zTick}
                  </text>
                </g>
              ))}

              {[30, 60, 90, 120, 150].map((nTick) => (
                <g key={`n-${nTick}`}>
                  <line
                    x1={padL}
                    y1={toY(nTick)}
                    x2={w - padR}
                    y2={toY(nTick)}
                    stroke="rgba(0, 242, 254, 0.08)"
                  />
                  <text
                    x={padL - 8}
                    y={toY(nTick) + 3}
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {nTick}
                  </text>
                </g>
              ))}

              {/* Axes */}
              <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#00F2FE" strokeOpacity="0.6" strokeWidth="1.5" />
              <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#00F2FE" strokeOpacity="0.6" strokeWidth="1.5" />
              <text x={padL - 10} y={padT + 8} textAnchor="end" fill="#F3F4F6" fontSize="11" fontFamily="JetBrains Mono">
                N
              </text>
              <text x={w - padR} y={h - 10} textAnchor="end" fill="#F3F4F6" fontSize="11" fontFamily="JetBrains Mono">
                Protons Z
              </text>

              {/* N = Z Bisector */}
              <line
                x1={toX(0)}
                y1={toY(0)}
                x2={toX(100)}
                y2={toY(100)}
                stroke="#F3F4F6"
                strokeOpacity="0.4"
                strokeWidth="1.3"
                strokeDasharray="5 4"
              />
              <text
                x={toX(86)}
                y={toY(90)}
                fill="#F3F4F6"
                fillOpacity="0.7"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                N = Z
              </text>

              {/* Vertical Isotope Rule Z = const */}
              <line
                x1={selX}
                y1={padT}
                x2={selX}
                y2={h - padB}
                stroke="#00F2FE"
                strokeOpacity="0.45"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />

              {/* Scatter Points */}
              {scatterPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={toX(pt.z)}
                  cy={toY(pt.n)}
                  r={pt.kind === 'stable' ? 3.3 : 2.6}
                  fill={colorForKind(pt.kind)}
                  fillOpacity={pt.kind === 'stable' ? 0.95 : 0.72}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Target Nucleus */}
              <circle
                cx={selX}
                cy={selY}
                r="7.5"
                fill="#F3F4F6"
                fillOpacity="0.16"
                stroke="#F3F4F6"
                strokeWidth="2"
              />
              <circle cx={selX} cy={selY} r="3.5" fill="#FF5252" />
              <text
                x={Math.min(w - 64, selX + 10)}
                y={Math.max(padT + 14, selY - 6)}
                fill="#F3F4F6"
                fontSize="11"
                fontWeight="600"
                fontFamily="JetBrains Mono"
              >
                {selectedIso.A}
                {selectedIso.symbol}
              </text>
            </svg>
          ) : (
            <Segre3DCanvas
              selectedZ={selectedIso.Z}
              selectedN={selectedIso.N}
              heightClass="h-[340px] sm:h-[390px]"
            />
          )}
        </div>

        {/* Right Stability Rules & Uranium Family Solver (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Diagnostic Card */}
          <div className="hud-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
                Analyse : {selectedIso.name}
              </h2>
              <span className="text-xs font-mono-tabular text-[#00F2FE]">
                N/Z = {(selectedIso.N / selectedIso.Z).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#070A12] border border-[#00F2FE]/25 text-xs text-[#00F2FE] font-medium">
              {stabilityDiagnostic}
            </div>

            <ul className="space-y-2 text-xs text-[#94A3B8] leading-relaxed">
              <li>
                <strong className="text-[#F3F4F6]">Z ≤ 20 (légers) :</strong> les noyaux stables vérifient{' '}
                <span className="font-mono-tabular text-[#00F2FE]">N = Z</span>.
              </li>
              <li>
                <strong className="text-[#F3F4F6]">Z &gt; 20 :</strong> la stabilité exige{' '}
                <span className="font-mono-tabular text-[#A855F7]">N &gt; Z</span> pour compenser la répulsion entre protons.
              </li>
              <li>
                <strong className="text-[#F3F4F6]">Z &gt; 82 (lourds) :</strong> tous instables (désintégration α).
              </li>
              <li>
                <strong className="text-[#F3F4F6]">Isotopes :</strong> alignés sur la droite verticale{' '}
                <span className="font-mono-tabular text-[#F3F4F6]">Z = {selectedIso.Z}</span>.
              </li>
            </ul>
          </div>

          {/* Uranium-238 Radioactive Family Solver (Fiche 6) */}
          <div className="flex-1 hud-panel-purple rounded-2xl p-5 space-y-2.5">
            <h3 className="font-display text-base font-semibold text-[#00F2FE]">
              Famille Radioactive d’Uranium (Fiche 6)
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Bilan de filiation de l’Uranium 238 jusqu’au Plomb 206 stable :
            </p>
            <div className="text-xs text-[#F3F4F6] space-y-1.5 overflow-x-auto">
              <MathFormula latex="{}^{238}_{92}\text{U} \longrightarrow {}^{206}_{82}\text{Pb} + x\,{}^{4}_{2}\text{He} + y\,{}^{0}_{-1}e" />
              <MathFormula latex="x = \frac{238 - 206}{4} = 8\;\alpha \quad ; \quad y = 82 - 92 + 2(8) = 6\;\beta^-" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

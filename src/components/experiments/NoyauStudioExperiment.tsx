import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus, Layers, Focus, Orbit } from 'lucide-react';
import { ISOTOPE_PRESETS } from '../../data/nuclearPhysicsCurriculum';
import { IonChargeState } from '../../types/lesson';
import { MathFormula } from '../MathFormula';
import { Nucleus3DCanvas, NucleusCameraPreset } from './Nucleus3DCanvas';

export function NoyauStudioExperiment() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('c12');
  const [protons, setProtons] = useState<number>(6);
  const [neutrons, setNeutrons] = useState<number>(6);
  const [ionState, setIonState] = useState<IonChargeState>('neutral');
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<NucleusCameraPreset>('atom');

  const activePreset = useMemo(
    () => ISOTOPE_PRESETS.find((p) => p.id === selectedPresetId) ?? ISOTOPE_PRESETS[0],
    [selectedPresetId]
  );

  const massNumberA = protons + neutrons;
  const electronCount =
    ionState === 'anion'
      ? protons + 2
      : ionState === 'cation'
      ? Math.max(0, protons - 2)
      : protons;

  const symbolDisplay = protons === activePreset.Z ? activePreset.symbol : 'X';
  const ionSuffix =
    ionState === 'anion' ? '^{2-}' : ionState === 'cation' ? '^{2+}' : '';

  const handleSelectPreset = (id: string) => {
    const found = ISOTOPE_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setSelectedPresetId(found.id);
    setProtons(found.Z);
    setNeutrons(found.N);
    setCameraPreset('nucleus');
  };

  const handleNucleusClick = () => {
    setCameraPreset((prev) => (prev === 'nucleus' ? 'atom' : 'nucleus'));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
      aria-label="Module 1 : Noyau & Atomic Structure Hub"
    >
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#00F2FE]/18">
        <div>
          <div className="text-xs font-mono-tabular text-[#00F2FE]">
            01 · Structure Atomique & Isotopes · Fiche 2
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F3F4F6] mt-1">
            Noyau & Atomic Structure Hub
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
            Cliquez sur le noyau 3D ou sélectionnez un nucléide pour zoomer, explorer les protons (rouge corail), neutrons (argent glacé) et électrons en orbite.
          </p>
        </div>

        {/* Nuclide Presets Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ISOTOPE_PRESETS.slice(0, 6).map((iso) => {
            const active =
              selectedPresetId === iso.id && protons === iso.Z && neutrons === iso.N;
            return (
              <button
                key={iso.id}
                type="button"
                onClick={() => handleSelectPreset(iso.id)}
                className={`px-3 py-1.5 text-xs font-mono-tabular rounded-lg border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#00F2FE]/18 border-[#00F2FE] text-[#F3F4F6] shadow-[0_0_14px_rgba(0,242,254,0.22)]'
                    : 'bg-[#111827] border-[#00F2FE]/18 text-[#94A3B8] hover:text-[#F3F4F6] hover:border-[#00F2FE]/45'
                }`}
              >
                {iso.A}
                {iso.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 3D Observatory Stage (7 cols) */}
        <div className="lg:col-span-7 hud-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="relative">
            <Nucleus3DCanvas
              mode="explorer"
              protons={protons}
              neutrons={neutrons}
              electrons={electronCount}
              explodeAmount={explodeAmount}
              cameraPreset={cameraPreset}
              onNucleusClick={handleNucleusClick}
              heightClass="h-[340px] sm:h-[410px]"
            />

            {/* Top-Left Symbolic Notation Readout */}
            <div className="absolute top-3.5 left-3.5 bg-[#0B0F19]/92 border border-[#00F2FE]/30 rounded-xl px-3.5 py-2 pointer-events-none">
              <div className="text-[11px] font-mono-tabular text-[#00F2FE]">
                Notation symbolique
              </div>
              <div className="text-lg font-semibold text-[#F3F4F6] mt-0.5">
                <MathFormula
                  latex={`{}^{${massNumberA}}_{${protons}} \\text{${symbolDisplay}}${ionSuffix}`}
                />
              </div>
            </div>

            {/* Top-Right Camera Zoom Selector */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-1 p-1 rounded-xl bg-[#0B0F19]/92 border border-[#7F00FF]/35">
              <button
                type="button"
                onClick={() => setCameraPreset('atom')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  cameraPreset === 'atom'
                    ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                <Orbit className="w-3 h-3" />
                <span>Atome</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('nucleus')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  cameraPreset === 'nucleus'
                    ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                <Focus className="w-3 h-3" />
                <span>Zoom Noyau</span>
              </button>
            </div>

            {/* Bottom-Left Particle Legend */}
            <div className="absolute bottom-3.5 left-3.5 flex flex-wrap items-center gap-4 bg-[#0B0F19]/92 border border-[#00F2FE]/20 rounded-xl px-3.5 py-2 text-xs font-mono-tabular pointer-events-none">
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5252]" />
                Protons Z = {protons}
              </span>
              <span className="flex items-center gap-1.5 text-[#F3F4F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DBEAFE]" />
                Neutrons N = {neutrons}
              </span>
              <span className="flex items-center gap-1.5 text-[#00F2FE]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FE]" />
                Électrons = {electronCount}
              </span>
            </div>
          </div>

          {/* Viewport Interactive Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
            {/* Protons Stepper */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#070A12] border border-[#FF5252]/28">
              <span className="text-xs text-[#94A3B8]">Protons (Z)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setProtons((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/10 transition-colors"
                  aria-label="Diminuer Z"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-sm font-semibold text-[#FF5252] w-7 text-center">
                  {protons}
                </span>
                <button
                  type="button"
                  onClick={() => setProtons((p) => Math.min(95, p + 1))}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/10 transition-colors"
                  aria-label="Augmenter Z"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Neutrons Stepper */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#070A12] border border-[#00F2FE]/25">
              <span className="text-xs text-[#94A3B8]">Neutrons (N)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNeutrons((n) => Math.max(0, n - 1))}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/10 transition-colors"
                  aria-label="Diminuer N"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-sm font-semibold text-[#DBEAFE] w-7 text-center">
                  {neutrons}
                </span>
                <button
                  type="button"
                  onClick={() => setNeutrons((n) => Math.min(150, n + 1))}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/10 transition-colors"
                  aria-label="Augmenter N"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Exploded View Slider */}
            <label className="flex flex-col gap-1.5 px-3.5 py-2 rounded-xl bg-[#070A12] border border-[#7F00FF]/30">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Layers className="w-3.5 h-3.5 text-[#00F2FE]" />
                  <span>Séparation</span>
                </span>
                <span className="font-mono-tabular text-[#00F2FE]">
                  {Math.round(explodeAmount * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodeAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setExplodeAmount(val);
                  if (val > 0.2 && cameraPreset === 'atom') {
                    setCameraPreset('exploded');
                  }
                }}
                className="hud-slider w-full"
              />
            </label>
          </div>
        </div>

        {/* Right Analytical HUD Panels (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card 1: Mass Number A, Atomic Number Z & Ionization */}
          <div className="hud-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                Propriétés du Nucléide
              </h2>
              <span className="text-xs font-mono-tabular text-[#00F2FE]">
                A = Z + N
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono-tabular">
              <div className="p-3 rounded-xl bg-[#070A12] border border-[#00F2FE]/20">
                <div className="text-[11px] text-[#94A3B8]">Masse A</div>
                <div className="text-xl font-semibold text-[#F3F4F6] mt-0.5">
                  {massNumberA}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#070A12] border border-[#FF5252]/25">
                <div className="text-[11px] text-[#94A3B8]">Charge Z</div>
                <div className="text-xl font-semibold text-[#FF5252] mt-0.5">
                  {protons}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#070A12] border border-[#7F00FF]/35">
                <div className="text-[11px] text-[#94A3B8]">Électrons e⁻</div>
                <div className="text-xl font-semibold text-[#00F2FE] mt-0.5">
                  {electronCount}
                </div>
              </div>
            </div>

            {/* Ionization Selector */}
            <div className="space-y-2">
              <div className="text-xs text-[#94A3B8]">
                État électronique (Fiche 2)
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#070A12] border border-[#00F2FE]/20">
                {(['neutral', 'anion', 'cation'] as IonChargeState[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setIonState(st)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      ionState === st
                        ? 'bg-[#00F2FE] text-[#0B0F19] font-semibold'
                        : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {st === 'neutral'
                      ? 'Neutre (Z)'
                      : st === 'anion'
                      ? 'Anion (Z+2)'
                      : 'Cation (Z−2)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Isotopes & Unified Atomic Mass Unit */}
          <div className="flex-1 hud-panel-purple rounded-2xl p-5 divide-y divide-[#00F2FE]/12 space-y-3.5">
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-semibold text-[#00F2FE]">
                Isotopes & Familles Chimiques
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Deux isotopes appartiennent au même élément (même numéro atomique Z) mais diffèrent par leur nombre de neutrons N et donc leur masse A.
              </p>
              <div className="text-sm text-[#F3F4F6] py-1 overflow-x-auto">
                <MathFormula latex="{}^{12}_6\text{C} \; ; \; {}^{13}_6\text{C} \; ; \; {}^{14}_6\text{C} \quad (\text{même } Z=6)" />
              </div>
            </div>

            <div className="pt-3.5 space-y-1.5">
              <h3 className="font-display text-base font-semibold text-[#F3F4F6]">
                Unité de masse atomique (u) & Énergie
              </h3>
              <div className="text-sm text-[#00F2FE] py-1 overflow-x-auto">
                <MathFormula latex="1\,\text{u} = \frac{1}{12}m({}^{12}_6\text{C}) = 1{,}66 \times 10^{-27}\,\text{kg}" />
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Relation d’équivalence :{' '}
                <span className="font-mono-tabular text-[#F3F4F6]">1 u · c² = 931,5 MeV</span> · Défaut de masse{' '}
                <span className="font-mono-tabular text-[#00F2FE]">Δm = Zmₚ + Nmₙ − m_noyau</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

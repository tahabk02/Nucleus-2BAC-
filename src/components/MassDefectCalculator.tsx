import { useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { MASS_DEFECT_PRESETS } from '../data/nuclearPhysicsCurriculum';
import {
  AMU_TO_MEV,
  MASS_NEUTRON_U,
  MASS_PROTON_U,
  computeMassDefectBreakdown,
} from '../lib/physics';
import { MathFormula } from './MathFormula';

type EnergyUnit = 'MeV' | 'GeV' | 'J';

interface MassDefectCalculatorProps {
  presetId: string;
  Z: number;
  N: number;
  nucleusMassU: number;
  bindingRatio: number;
  onSelectPreset: (preset: {
    id: string;
    Z: number;
    N: number;
    nucleusMassU: number;
  }) => void;
  onChangeCustom: (Z: number, N: number, nucleusMassU: number) => void;
  onChangeBindingRatio: (v: number) => void;
  onTriggerPulse: () => void;
}

export function MassDefectCalculator({
  presetId,
  Z,
  N,
  nucleusMassU,
  bindingRatio,
  onSelectPreset,
  onChangeCustom,
  onChangeBindingRatio,
  onTriggerPulse,
}: MassDefectCalculatorProps) {
  const [unit, setUnit] = useState<EnergyUnit>('MeV');

  const breakdown = computeMassDefectBreakdown(Z, N, nucleusMassU);
  const activePreset = MASS_DEFECT_PRESETS.find((p) => p.id === presetId);
  const displaySymbol = activePreset ? activePreset.symbol : 'X';
  const ironBenchmark = 8.79;
  const stabilityPct = Math.max(
    0,
    Math.min(100, (breakdown.energyPerNucleonMeV / ironBenchmark) * 100)
  );
  const massLossPct =
    breakdown.nucleonsMassU > 0
      ? (breakdown.deltaMassU / breakdown.nucleonsMassU) * 100
      : 0;

  const formatEnergy = () => {
    if (unit === 'J') {
      const exp = breakdown.bindingEnergyJoules;
      return `${exp.toExponential(3).replace('.', ',')} J`;
    }
    if (unit === 'GeV') {
      return `${(breakdown.bindingEnergyMeV / 1000).toFixed(4).replace('.', ',')} GeV`;
    }
    return `${breakdown.bindingEnergyMeV.toFixed(2).replace('.', ',')} MeV`;
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header Row: Nuclide Preset Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>Noyau étudié</span>
          <span className="font-mono-tabular text-amber-300">
            <sup className="mr-0.5">{breakdown.A}</sup>
            <sub className="mr-0.5">{breakdown.Z}</sub>
            {displaySymbol} · N = {breakdown.N}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1">
          {MASS_DEFECT_PRESETS.map((preset) => {
            const active = presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`py-1.5 px-1 text-xs font-mono-tabular rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-400/15 text-amber-200 border-amber-400/40'
                    : 'bg-[#07090f] text-slate-400 hover:text-slate-100 border-white/[0.06]'
                }`}
              >
                {preset.A}{preset.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editable Nuclear Parameters (Z, N, m_noyau) */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.07]">
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400 block">Protons Z</span>
          <input
            type="number"
            min={1}
            max={118}
            step={1}
            value={Z}
            onChange={(e) => {
              const nextZ = parseInt(e.target.value, 10);
              if (Number.isFinite(nextZ)) {
                const estMass = Math.max(0.5, (nextZ + N) * 0.992);
                onChangeCustom(nextZ, N, presetId === 'custom' ? nucleusMassU : Number(estMass.toFixed(4)));
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100 bg-[#07090f] border border-white/[0.1] rounded-lg focus:outline-none focus:border-amber-400/60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400 block">Neutrons N</span>
          <input
            type="number"
            min={0}
            max={160}
            step={1}
            value={N}
            onChange={(e) => {
              const nextN = parseInt(e.target.value, 10);
              if (Number.isFinite(nextN)) {
                const estMass = Math.max(0.5, (Z + nextN) * 0.992);
                onChangeCustom(Z, nextN, presetId === 'custom' ? nucleusMassU : Number(estMass.toFixed(4)));
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100 bg-[#07090f] border border-white/[0.1] rounded-lg focus:outline-none focus:border-amber-400/60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400 block">m(noyau) [u]</span>
          <input
            type="number"
            min={0.5}
            max={300}
            step={0.001}
            value={Number(nucleusMassU.toFixed(6))}
            onChange={(e) => {
              const nextM = parseFloat(e.target.value);
              if (Number.isFinite(nextM)) {
                onChangeCustom(Z, N, nextM);
              }
            }}
            className="w-full px-2 py-1.5 text-xs font-mono-tabular text-slate-100 bg-[#07090f] border border-white/[0.1] rounded-lg focus:outline-none focus:border-amber-400/60"
          />
        </label>
      </div>

      {/* 3D Comparator Interactive Assembly Control */}
      <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-medium">
            Comparateur 3D : Cohésion du noyau
          </span>
          <span className="font-mono-tabular text-amber-300">
            {Math.round(bindingRatio * 100)}%
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={bindingRatio}
          onChange={(e) => onChangeBindingRatio(parseFloat(e.target.value))}
          className="studio-slider w-full"
          aria-label="Ratio de cohésion et conversion de masse en énergie"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onTriggerPulse}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#07090f] bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Libérer E = Δm·c²</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(MASS_DEFECT_PRESETS[1])}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
            title="Réinitialiser sur ¹²C"
            aria-label="Réinitialiser sur Carbone 12"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step-by-Step Mass Comparison Breakdown */}
      <div className="pt-3 border-t border-white/[0.07] space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">
            1. Nucléons libres ({breakdown.Z}·mₚ + {breakdown.N}·mₙ)
          </span>
          <span className="font-mono-tabular text-slate-100">
            {breakdown.nucleonsMassU.toFixed(6).replace('.', ',')} u
          </span>
        </div>

        <div className="text-[11px] font-mono-tabular text-slate-500 flex justify-between">
          <span>
            {breakdown.Z} × {MASS_PROTON_U} + {breakdown.N} × {MASS_NEUTRON_U}
          </span>
          <span>A = {breakdown.A}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">2. Masse du noyau lié m(X)</span>
          <span className="font-mono-tabular text-sky-300">
            {breakdown.nucleusMassU.toFixed(6).replace('.', ',')} u
          </span>
        </div>

        {/* Visual Mass Conservation Bar */}
        <div className="space-y-1 pt-0.5">
          <div className="h-2.5 w-full rounded-full bg-[#07090f] border border-white/[0.08] overflow-hidden flex">
            <div
              className="h-full bg-sky-400/80 transition-all duration-200"
              style={{ width: `${Math.max(72, 100 - Math.min(24, massLossPct * 22))}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-200"
              style={{
                width: `${
                  breakdown.isValid
                    ? Math.min(24, Math.max(4, massLossPct * 22))
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400">
            <span>m(noyau)</span>
            <span className="text-amber-300">
              Δm = {breakdown.deltaMassU.toFixed(6).replace('.', ',')} u (−
              {massLossPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* E = Δm·c² Result Box */}
      <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-300">
            Énergie de liaison E_l = Δm·c²
          </span>
          <div className="flex items-center gap-0.5 p-0.5 bg-[#07090f] border border-white/[0.07] rounded-md">
            {(['MeV', 'GeV', 'J'] as EnergyUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-2 py-0.5 text-[10px] font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                  unit === u
                    ? 'bg-[#151c2c] text-amber-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {breakdown.isValid ? (
          <>
            <div className="p-3 rounded-xl bg-[#07090f] border border-amber-400/25 space-y-1.5">
              <div className="text-xl font-semibold font-mono-tabular text-amber-300">
                {formatEnergy()}
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400">
                Δm = {breakdown.deltaMassKg.toExponential(3).replace('.', ',')} kg · ×{' '}
                {AMU_TO_MEV} MeV/u
              </div>
              <div className="pt-1 overflow-x-auto text-slate-200">
                <MathFormula
                  latex={`E_\\ell = ${breakdown.deltaMassU.toFixed(4)} \\times 931{,}5 = ${breakdown.bindingEnergyMeV.toFixed(2)}\\;\\text{MeV}`}
                />
              </div>
            </div>

            {/* Energy per nucleon E_l / A & Stability vs Fe-56 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className="text-slate-400">Cohésion E_l / A</span>
                <span className="text-emerald-300 font-semibold">
                  {breakdown.energyPerNucleonMeV.toFixed(2).replace('.', ',')} MeV/nucléon
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#07090f] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${stabilityPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
                <span>0 MeV</span>
                <span>Référence ⁵⁶Fe : 8,79 MeV/nucléon</span>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-xs text-rose-200">
            Attention : m(noyau) doit être strictement inférieure à{' '}
            {breakdown.nucleonsMassU.toFixed(4)} u pour obtenir un défaut de masse
            positif (Δm &gt; 0).
          </div>
        )}
      </div>
    </div>
  );
}

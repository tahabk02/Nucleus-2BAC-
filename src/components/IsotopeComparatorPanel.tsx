import { ArrowLeftRight, CheckCircle2, Flame } from 'lucide-react';
import {
  COMPARATOR_ISOTOPES,
  COMPARATOR_QUICK_PAIRS,
} from '../data/nuclearPhysicsCurriculum';
import { computeMassDefectBreakdown } from '../lib/physics';
import { MathFormula } from './MathFormula';

interface IsotopeComparatorPanelProps {
  leftId: string;
  rightId: string;
  explode: number;
  onSelectLeft: (id: string) => void;
  onSelectRight: (id: string) => void;
  onSwap: () => void;
  onChangeExplode: (v: number) => void;
}

export function IsotopeComparatorPanel({
  leftId,
  rightId,
  explode,
  onSelectLeft,
  onSelectRight,
  onSwap,
  onChangeExplode,
}: IsotopeComparatorPanelProps) {
  const leftIso =
    COMPARATOR_ISOTOPES.find((i) => i.id === leftId) ?? COMPARATOR_ISOTOPES[3];
  const rightIso =
    COMPARATOR_ISOTOPES.find((i) => i.id === rightId) ?? COMPARATOR_ISOTOPES[4];

  const leftStats = computeMassDefectBreakdown(
    leftIso.Z,
    leftIso.N,
    leftIso.nucleusMassU
  );
  const rightStats = computeMassDefectBreakdown(
    rightIso.Z,
    rightIso.N,
    rightIso.nucleusMassU
  );

  const dZ = rightIso.Z - leftIso.Z;
  const dN = rightIso.N - leftIso.N;
  const dA = rightIso.A - leftIso.A;
  const dDeltaM = rightStats.deltaMassU - leftStats.deltaMassU;
  const dEl = rightStats.bindingEnergyMeV - leftStats.bindingEnergyMeV;
  const dElPerA =
    rightStats.energyPerNucleonMeV - leftStats.energyPerNucleonMeV;

  const sameElement = leftIso.Z === rightIso.Z;
  const maxDm = Math.max(leftStats.deltaMassU, rightStats.deltaMassU, 0.001);
  const maxEl = Math.max(
    leftStats.bindingEnergyMeV,
    rightStats.bindingEnergyMeV,
    1
  );
  const maxElPerA = Math.max(
    leftStats.energyPerNucleonMeV,
    rightStats.energyPerNucleonMeV,
    8.79
  );

  const formatSigned = (val: number, decimals: number, unit: string) => {
    const sign = val > 0 ? '+' : val < 0 ? '−' : '';
    return `${sign}${Math.abs(val).toFixed(decimals).replace('.', ',')} ${unit}`;
  };

  const formatSignedInt = (val: number) => {
    if (val === 0) return '0';
    return val > 0 ? `+${val}` : `−${Math.abs(val)}`;
  };

  const cohesionWinner =
    Math.abs(dElPerA) < 0.005
      ? 'Cohésion équivalente'
      : dElPerA > 0
      ? `${rightIso.A}${rightIso.symbol} plus stable (${formatSigned(dElPerA, 2, 'MeV/nuc')})`
      : `${leftIso.A}${leftIso.symbol} plus stable (+${Math.abs(dElPerA).toFixed(2).replace('.', ',')} MeV/nuc)`;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Quick Iconic Pair Buttons */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
          <span>Paires 2BAC</span>
          <span className={sameElement ? 'text-emerald-300' : 'text-sky-300'}>
            {sameElement
              ? `Vrais isotopes (Z = ${leftIso.Z})`
              : `Noyaux distincts (Z = ${leftIso.Z} vs ${rightIso.Z})`}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {COMPARATOR_QUICK_PAIRS.map((pair) => {
            const active = leftId === pair.leftId && rightId === pair.rightId;
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => {
                  onSelectLeft(pair.leftId);
                  onSelectRight(pair.rightId);
                }}
                className={`py-1.5 px-1 text-[11px] font-mono-tabular rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#151c2c] text-sky-300 border-sky-400/40'
                    : 'bg-[#07090f] text-slate-400 hover:text-slate-100 border-white/[0.06]'
                }`}
              >
                {pair.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual Isotope A & B Selectors + Swap */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 pt-3 border-t border-white/[0.07]">
        <label className="block space-y-1 min-w-0">
          <span className="text-[11px] font-mono-tabular text-sky-300 block">
            Isotope A (Gauche)
          </span>
          <select
            value={leftIso.id}
            onChange={(e) => onSelectLeft(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-100 bg-[#07090f] border border-sky-400/35 rounded-lg focus:outline-none focus:border-sky-400"
          >
            {COMPARATOR_ISOTOPES.map((iso) => (
              <option key={iso.id} value={iso.id}>
                {iso.A}{iso.symbol} · {iso.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onSwap}
          className="p-2 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] rounded-lg transition-colors shrink-0"
          title="Inverser Isotope A et Isotope B"
          aria-label="Inverser les deux isotopes"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        <label className="block space-y-1 min-w-0">
          <span className="text-[11px] font-mono-tabular text-amber-300 block">
            Isotope B (Droite)
          </span>
          <select
            value={rightIso.id}
            onChange={(e) => onSelectRight(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-100 bg-[#07090f] border border-amber-400/35 rounded-lg focus:outline-none focus:border-amber-400"
          >
            {COMPARATOR_ISOTOPES.map((iso) => (
              <option key={iso.id} value={iso.id}>
                {iso.A}{iso.symbol} · {iso.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Nucleon Composition Comparison */}
      <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-200">
            Composition en nucléons
          </span>
          <span className="font-mono-tabular text-[11px] text-slate-400">
            ΔZ = {formatSignedInt(dZ)} · ΔN = {formatSignedInt(dN)} · ΔA = {formatSignedInt(dA)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono-tabular">
          <div className="p-2.5 rounded-xl bg-[#07090f] border border-sky-400/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sky-300 font-semibold">
                <sup>{leftIso.A}</sup>
                <sub>{leftIso.Z}</sub>
                {leftIso.symbol}
              </span>
              <span className="text-[10px] text-slate-400">
                {leftIso.stable ? 'Stable' : 'Radioactif'}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#f96449]">{leftIso.Z} p⁺</span>
              <span className="text-sky-200">{leftIso.N} n⁰</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex">
              <div
                className="h-full bg-[#f96449]"
                style={{ width: `${(leftIso.Z / leftIso.A) * 100}%` }}
              />
              <div
                className="h-full bg-[#9fd8ff]"
                style={{ width: `${(leftIso.N / leftIso.A) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#07090f] border border-amber-400/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-semibold">
                <sup>{rightIso.A}</sup>
                <sub>{rightIso.Z}</sub>
                {rightIso.symbol}
              </span>
              <span className="text-[10px] text-slate-400">
                {rightIso.stable ? 'Stable' : 'Radioactif'}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#f96449]">{rightIso.Z} p⁺</span>
              <span className="text-sky-200">{rightIso.N} n⁰</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex">
              <div
                className="h-full bg-[#f96449]"
                style={{ width: `${(rightIso.Z / rightIso.A) * 100}%` }}
              />
              <div
                className="h-full bg-[#9fd8ff]"
                style={{ width: `${(rightIso.N / rightIso.A) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3D Nucleon Separation Slider */}
        <label className="block space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular">
            <span className="text-slate-400">Vue éclatée 3D (A & B)</span>
            <span className="text-sky-300">{Math.round(explode * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={explode}
            onChange={(e) => onChangeExplode(parseFloat(e.target.value))}
            className="studio-slider w-full"
          />
        </label>
      </div>

      {/* Mass Defect Δm & Binding Energy E_l Side-by-Side Matrix */}
      <div className="pt-3 border-t border-white/[0.07] space-y-3 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">
              Défaut de masse Δm [u]
            </span>
            <span className="font-mono-tabular text-[11px] text-amber-300">
              Δ(Δm) = {formatSigned(dDeltaM, 4, 'u')}
            </span>
          </div>

          <div className="space-y-1 font-mono-tabular text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-10 text-sky-300 shrink-0">
                {leftIso.A}{leftIso.symbol}
              </span>
              <div className="flex-1 h-2 bg-[#07090f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${(leftStats.deltaMassU / maxDm) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right text-slate-200 shrink-0">
                {leftStats.deltaMassU.toFixed(4).replace('.', ',')} u
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-10 text-amber-300 shrink-0">
                {rightIso.A}{rightIso.symbol}
              </span>
              <div className="flex-1 h-2 bg-[#07090f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${(rightStats.deltaMassU / maxDm) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right text-slate-200 shrink-0">
                {rightStats.deltaMassU.toFixed(4).replace('.', ',')} u
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">
              Énergie de liaison E_l = Δm·c²
            </span>
            <span className="font-mono-tabular text-[11px] text-amber-300">
              ΔE_l = {formatSigned(dEl, 1, 'MeV')}
            </span>
          </div>

          <div className="space-y-1 font-mono-tabular text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-10 text-sky-300 shrink-0">
                {leftIso.A}{leftIso.symbol}
              </span>
              <div className="flex-1 h-2 bg-[#07090f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{
                    width: `${(leftStats.bindingEnergyMeV / maxEl) * 100}%`,
                  }}
                />
              </div>
              <span className="w-24 text-right text-slate-200 shrink-0">
                {leftStats.bindingEnergyMeV.toFixed(1).replace('.', ',')} MeV
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-10 text-amber-300 shrink-0">
                {rightIso.A}{rightIso.symbol}
              </span>
              <div className="flex-1 h-2 bg-[#07090f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${(rightStats.bindingEnergyMeV / maxEl) * 100}%`,
                  }}
                />
              </div>
              <span className="w-24 text-right text-slate-200 shrink-0">
                {rightStats.bindingEnergyMeV.toFixed(1).replace('.', ',')} MeV
              </span>
            </div>
          </div>
        </div>

        {/* Energy per Nucleon E_l / A (Stability Verdict) */}
        <div className="p-3 rounded-xl bg-[#07090f] border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Cohésion par nucléon E_l / A
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono-tabular text-emerald-300 font-semibold">
              {Math.abs(dElPerA) >= 0.005 ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Flame className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{cohesionWinner}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono-tabular">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-sky-300">
                  {leftIso.A}{leftIso.symbol}
                </span>
                <span className="text-slate-100">
                  {leftStats.energyPerNucleonMeV.toFixed(2).replace('.', ',')} MeV
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{
                    width: `${(leftStats.energyPerNucleonMeV / maxElPerA) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-300">
                  {rightIso.A}{rightIso.symbol}
                </span>
                <span className="text-slate-100">
                  {rightStats.energyPerNucleonMeV.toFixed(2).replace('.', ',')} MeV
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${(rightStats.energyPerNucleonMeV / maxElPerA) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-1 overflow-x-auto text-slate-300">
            <MathFormula
              latex={`\\Delta\\!\\left(\\frac{E_\\ell}{A}\\right) = ${rightStats.energyPerNucleonMeV.toFixed(2)} - ${leftStats.energyPerNucleonMeV.toFixed(2)} = ${(rightStats.energyPerNucleonMeV - leftStats.energyPerNucleonMeV).toFixed(2)}\\;\\text{MeV/nuc}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

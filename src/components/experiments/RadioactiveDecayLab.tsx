import { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw } from 'lucide-react';
import { DecayMode } from '../../types/lesson';
import { MathFormula } from '../MathFormula';
import { Nucleus3DCanvas } from './Nucleus3DCanvas';

interface DecayExperimentConfig {
  mode: DecayMode;
  label: string;
  badge: string;
  parent: { symbol: string; name: string; A: number; Z: number };
  daughter: { symbol: string; name: string; A: number; Z: number };
  emitted: { symbolLatex: string; label: string; dA: number; dZ: number };
  equationLatex: string;
  mechanismLatex: string;
  mechanismNote: string;
  soddyA: string;
  soddyZ: string;
}

const DECAY_LAB_MODES: Record<DecayMode, DecayExperimentConfig> = {
  alpha: {
    mode: 'alpha',
    label: 'Radioactivité α',
    badge: 'Émission ⁴₂He',
    parent: { symbol: 'U', name: 'Uranium 238', A: 238, Z: 92 },
    daughter: { symbol: 'Th', name: 'Thorium 234', A: 234, Z: 90 },
    emitted: { symbolLatex: '{}^{4}_{2}\\text{He}', label: 'Particule α (Hélium)', dA: 4, dZ: 2 },
    equationLatex: '{}^{238}_{92}\\text{U} \\longrightarrow {}^{234}_{90}\\text{Th} + {}^{4}_{2}\\text{He}',
    mechanismLatex: '\\Delta A = -4 \\quad ; \\quad \\Delta Z = -2 \\quad ; \\quad \\Delta N = -2',
    mechanismNote:
      'Caractéristique des noyaux lourds (A > 200) qui expulsent un noyau d’hélium très stable pour gagner en stabilité.',
    soddyA: '238 = 234 + 4 \\implies A_{\\text{fils}} = 234',
    soddyZ: '92 = 90 + 2 \\implies Z_{\\text{fils}} = 90',
  },
  'beta-minus': {
    mode: 'beta-minus',
    label: 'Radioactivité β⁻',
    badge: 'Émission ⁰₋₁e',
    parent: { symbol: 'Th', name: 'Thorium 234', A: 234, Z: 90 },
    daughter: { symbol: 'Pa', name: 'Protactinium 234', A: 234, Z: 91 },
    emitted: { symbolLatex: '{}^{0}_{-1}e', label: 'Électron β⁻', dA: 0, dZ: -1 },
    equationLatex: '{}^{234}_{90}\\text{Th} \\longrightarrow {}^{234}_{91}\\text{Pa} + {}^{0}_{-1}e',
    mechanismLatex: '{}^{1}_{0}n \\longrightarrow {}^{1}_{1}p + {}^{0}_{-1}e',
    mechanismNote:
      'Dans un noyau trop riche en neutrons, un neutron se transforme spontanément en proton avec émission d’un électron rapide.',
    soddyA: '234 = 234 + 0 \\implies A_{\\text{fils}} = 234',
    soddyZ: '90 = 91 + (-1) \\implies Z_{\\text{fils}} = 91',
  },
  'beta-plus': {
    mode: 'beta-plus',
    label: 'Radioactivité β⁺',
    badge: 'Émission ⁰₊₁e',
    parent: { symbol: 'P', name: 'Phosphore 30', A: 30, Z: 15 },
    daughter: { symbol: 'Si', name: 'Silicium 30', A: 30, Z: 14 },
    emitted: { symbolLatex: '{}^{0}_{+1}e', label: 'Positon β⁺', dA: 0, dZ: 1 },
    equationLatex: '{}^{30}_{15}\\text{P} \\longrightarrow {}^{30}_{14}\\text{Si} + {}^{0}_{+1}e',
    mechanismLatex: '{}^{1}_{1}p \\longrightarrow {}^{1}_{0}n + {}^{0}_{+1}e',
    mechanismNote:
      'Dans un noyau artificiel trop riche en protons, un proton se convertit en neutron en libérant son antiparticule : le positon.',
    soddyA: '30 = 30 + 0 \\implies A_{\\text{fils}} = 30',
    soddyZ: '15 = 14 + 1 \\implies Z_{\\text{fils}} = 14',
  },
  gamma: {
    mode: 'gamma',
    label: 'Rayonnement γ',
    badge: 'Photon γ',
    parent: { symbol: 'X^*', name: 'Noyau excité', A: 60, Z: 27 },
    daughter: { symbol: 'X', name: 'État fondamental', A: 60, Z: 27 },
    emitted: { symbolLatex: '\\gamma', label: 'Photon électromagnétique', dA: 0, dZ: 0 },
    equationLatex: '{}^{A}_{Z}\\text{X}^* \\longrightarrow {}^{A}_{Z}\\text{X} + \\gamma',
    mechanismLatex: '\\Delta E = h\\nu = E_{\\text{excité}} - E_{\\text{fondamental}}',
    mechanismNote:
      'Désexcitation du noyau fils après une désintégration α ou β : ni A ni Z ne changent, seule l’énergie est évacuée.',
    soddyA: 'A = A + 0 \\implies \\Delta A = 0',
    soddyZ: 'Z = Z + 0 \\implies \\Delta Z = 0',
  },
};

export function RadioactiveDecayLab() {
  const [decayMode, setDecayMode] = useState<DecayMode>('alpha');
  const [step, setStep] = useState<0 | 1 | 2>(2);
  const [pulseKey, setPulseKey] = useState<number>(1);

  const cfg = DECAY_LAB_MODES[decayMode];

  const handleModeSwitch = (mode: DecayMode) => {
    setDecayMode(mode);
    setStep(2);
    setPulseKey((k) => k + 1);
  };

  const handleReplay = () => {
    setStep(2);
    setPulseKey((k) => k + 1);
  };

  const stepLabels = [
    '1. Noyau père instable',
    '2. Réarrangement nucléaire',
    '3. Fission & particule émise',
  ] as const;

  const totalReactantA = cfg.parent.A;
  const totalProductA = cfg.daughter.A + cfg.emitted.dA;
  const totalReactantZ = cfg.parent.Z;
  const totalProductZ = cfg.daughter.Z + cfg.emitted.dZ;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
      aria-label="Module 2 : Radioactivity Decay Lab"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#00F2FE]/18">
        <div>
          <div className="text-xs font-mono-tabular text-[#00F2FE]">
            02 · Lois de Conservation de Soddy · Fiches 3, 4 & 5
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F3F4F6] mt-1">
            Radioactivity Decay Lab (α, β⁻, β⁺, γ)
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
            Simulez la désintégration spontanée étape par étape et vérifiez en temps réel la conservation du nombre de masse A et du nombre de charge Z.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['alpha', 'beta-minus', 'beta-plus', 'gamma'] as DecayMode[]).map((mode) => {
            const active = decayMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeSwitch(mode)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#00F2FE] border-[#00F2FE] text-[#0B0F19] font-semibold shadow-[0_0_16px_rgba(0,242,254,0.28)]'
                    : 'bg-[#111827] border-[#00F2FE]/20 text-[#94A3B8] hover:text-[#F3F4F6] hover:border-[#00F2FE]/45'
                }`}
              >
                {DECAY_LAB_MODES[mode].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 3D Reaction Stage (7 cols) */}
        <div className="lg:col-span-7 hud-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="relative">
            <Nucleus3DCanvas
              mode="decay"
              protons={cfg.parent.Z}
              neutrons={cfg.parent.A - cfg.parent.Z}
              cameraPreset="decay"
              decayMode={decayMode}
              decayStep={step}
              decayPulseKey={pulseKey}
              heightClass="h-[340px] sm:h-[395px]"
            />

            <div className="absolute top-3.5 left-3.5 bg-[#0B0F19]/92 border border-[#00F2FE]/28 rounded-xl px-3.5 py-2 pointer-events-none">
              <div className="text-[11px] font-mono-tabular text-[#00F2FE]">
                {cfg.badge}
              </div>
              <div className="text-sm font-medium text-[#F3F4F6] mt-0.5">
                {cfg.parent.name} → {cfg.daughter.name}
              </div>
            </div>

            <div className="absolute bottom-3.5 right-3.5 bg-[#0B0F19]/92 border border-[#7F00FF]/35 rounded-xl px-3 py-1.5 text-xs font-mono-tabular pointer-events-none">
              <span className="text-[#94A3B8]">Particule : </span>
              <span className="text-[#F3F4F6]">{cfg.emitted.label}</span>
            </div>
          </div>

          {/* Step-by-Step Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#070A12] border border-[#00F2FE]/18">
              {stepLabels.map((label, idx) => {
                const sIdx = idx as 0 | 1 | 2;
                const active = step === sIdx;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setStep(sIdx);
                      if (sIdx === 2) setPulseKey((k) => k + 1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#7F00FF]/35 text-[#F3F4F6] border border-[#7F00FF]/70'
                        : 'text-[#94A3B8] hover:text-[#F3F4F6] border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="p-2 rounded-lg bg-[#070A12] border border-[#00F2FE]/22 text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
                title="Réinitialiser au noyau père"
                aria-label="Réinitialiser au noyau père"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReplay}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#00F2FE] hover:bg-[#67E8F9] text-[#0B0F19] rounded-lg transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Émettre la particule</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Algebraic Soddy Breakdown (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card 1: Reaction Equation & Real-Time Soddy Balance */}
          <div className="hud-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular text-[#00F2FE]">
                Équation bilan · Lois de Soddy
              </span>
              <span className="text-xs font-mono-tabular text-[#F3F4F6]">
                ΣA: {totalReactantA} = {totalProductA} · ΣZ: {totalReactantZ} = {totalProductZ}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070A12] border border-[#00F2FE]/25 text-[#F3F4F6] overflow-x-auto">
              <MathFormula latex={cfg.equationLatex} displayMode />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#070A12] border border-[#00F2FE]/18 space-y-1">
                <div className="text-[11px] font-mono-tabular text-[#00F2FE]">
                  Conservation de A
                </div>
                <div className="text-xs text-[#F3F4F6] overflow-x-auto">
                  <MathFormula latex={cfg.soddyA} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#070A12] border border-[#FF5252]/25 space-y-1">
                <div className="text-[11px] font-mono-tabular text-[#FF5252]">
                  Conservation de Z
                </div>
                <div className="text-xs text-[#F3F4F6] overflow-x-auto">
                  <MathFormula latex={cfg.soddyZ} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Internal Nuclear Mechanism */}
          <div className="flex-1 hud-panel-purple rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-[#F3F4F6]">
              Mécanisme interne dans le noyau
            </h3>
            <div className="p-3 rounded-xl bg-[#070A12] border border-[#7F00FF]/35 text-sm text-[#00F2FE] overflow-x-auto">
              <MathFormula latex={cfg.mechanismLatex} />
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {cfg.mechanismNote}
            </p>
            <div className="pt-2 border-t border-[#00F2FE]/14 flex items-center justify-between text-xs font-mono-tabular text-[#94A3B8]">
              <span>Spontanée · Aléatoire · Inéluctable</span>
              <span className="text-[#00F2FE]">Indépendante de P, T</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

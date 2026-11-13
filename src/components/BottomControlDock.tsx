import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  MonitorPlay,
  HelpCircle,
  Scale,
  ArrowLeftRight,
} from 'lucide-react';
import {
  CurveKind,
  DecayMode,
  IonChargeState,
  IsotopePreset,
  LessonChapter,
} from '../types/lesson';
import {
  COMPARATOR_ISOTOPES,
  COMPARATOR_QUICK_PAIRS,
  DECAY_MODES,
  ISOTOPE_PRESETS,
  MASS_DEFECT_PRESETS,
} from '../data/nuclearPhysicsCurriculum';
import { computeMassDefectBreakdown } from '../lib/physics';
import {
  CURVE_DESCRIPTORS,
  evaluateAstonElPerA,
  getAstonZoneInfo,
} from '../data/nuclearCurves';

interface BottomControlDockProps {
  chapters: LessonChapter[];
  activeChapterIndex: number;
  dockHidden: boolean;
  onToggleDock: () => void;
  onSelectChapter: (index: number) => void;
  selectedIsotope: IsotopePreset;
  onSelectIsotope: (iso: IsotopePreset) => void;
  ionState: IonChargeState;
  onChangeIonState: (s: IonChargeState) => void;
  explodeAmount: number;
  onChangeExplode: (v: number) => void;
  decayMode: DecayMode;
  onChangeDecayMode: (m: DecayMode) => void;
  onTriggerDecay: () => void;
  tHalfNormalized: number;
  onChangeTime: (v: number) => void;
  curveKind: CurveKind;
  onChangeCurveKind: (c: CurveKind) => void;
  simSpeed: number;
  onChangeSimSpeed: (s: number) => void;
  showTangent: boolean;
  onToggleTangent: () => void;
  isPlayingDecay: boolean;
  onTogglePlayDecay: () => void;
  videoPlaying: boolean;
  onToggleVideo: () => void;
  pageReaderMode: boolean;
  onTogglePageReader: () => void;
  pageFlipped: boolean;
  onTogglePageFlip: () => void;
  onResetCamera: () => void;
  massDefectPresetId: string;
  massDefectZ: number;
  massDefectN: number;
  massDefectNucleusU: number;
  massDefectBindingRatio: number;
  onSelectMassDefectPreset: (preset: {
    id: string;
    Z: number;
    N: number;
    nucleusMassU: number;
  }) => void;
  onChangeMassDefectBindingRatio: (v: number) => void;
  onTriggerMassDefectPulse: () => void;
  quizActive: boolean;
  onToggleQuizHud: () => void;
  comparatorMode: boolean;
  comparatorLeftId: string;
  comparatorRightId: string;
  comparatorExplode: number;
  onToggleComparatorMode: () => void;
  onSelectComparatorPair: (leftId: string, rightId: string) => void;
  onSwapComparator: () => void;
  onChangeComparatorExplode: (v: number) => void;
}

export function BottomControlDock({
  chapters,
  activeChapterIndex,
  dockHidden,
  onToggleDock,
  onSelectChapter,
  selectedIsotope,
  onSelectIsotope,
  ionState,
  onChangeIonState,
  explodeAmount,
  onChangeExplode,
  decayMode,
  onChangeDecayMode,
  onTriggerDecay,
  tHalfNormalized,
  onChangeTime,
  curveKind,
  onChangeCurveKind,
  simSpeed,
  onChangeSimSpeed,
  showTangent,
  onToggleTangent,
  isPlayingDecay,
  onTogglePlayDecay,
  videoPlaying,
  onToggleVideo,
  pageReaderMode,
  onTogglePageReader,
  pageFlipped,
  onTogglePageFlip,
  onResetCamera,
  massDefectPresetId,
  massDefectZ,
  massDefectN,
  massDefectNucleusU,
  massDefectBindingRatio,
  onSelectMassDefectPreset,
  onChangeMassDefectBindingRatio,
  onTriggerMassDefectPulse,
  quizActive,
  onToggleQuizHud,
  comparatorMode,
  comparatorLeftId,
  comparatorRightId,
  comparatorExplode,
  onToggleComparatorMode,
  onSelectComparatorPair,
  onSwapComparator,
  onChangeComparatorExplode,
}: BottomControlDockProps) {
  const activeChapter = chapters[activeChapterIndex];

  const a0 = 1000;
  const currentA = Math.max(1, Math.round(a0 * Math.exp(-tHalfNormalized * Math.LN2)));
  const astonMassA = Math.round(2 + (tHalfNormalized / 4) * 236);
  const astonElPerA = evaluateAstonElPerA(astonMassA);
  const astonZone = getAstonZoneInfo(astonMassA);
  const mdBreakdown = computeMassDefectBreakdown(
    massDefectZ,
    massDefectN,
    massDefectNucleusU
  );
  const compLeftIso =
    COMPARATOR_ISOTOPES.find((i) => i.id === comparatorLeftId) ?? COMPARATOR_ISOTOPES[3];
  const compRightIso =
    COMPARATOR_ISOTOPES.find((i) => i.id === comparatorRightId) ?? COMPARATOR_ISOTOPES[4];
  const compLeftStats = computeMassDefectBreakdown(
    compLeftIso.Z,
    compLeftIso.N,
    compLeftIso.nucleusMassU
  );
  const compRightStats = computeMassDefectBreakdown(
    compRightIso.Z,
    compRightIso.N,
    compRightIso.nucleusMassU
  );
  const compDeltaEl =
    compRightStats.bindingEnergyMeV - compLeftStats.bindingEnergyMeV;
  const progressPct = ((activeChapterIndex + 1) / chapters.length) * 100;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(920px,94vw)] transition-transform duration-300 ease-out pointer-events-none ${
        dockHidden ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
    >
      {/* Floating Quick-Bar: 3D Page Reader + 180° Flip + Cinema Mode */}
      <div className="flex justify-center items-center gap-2 mb-1.5 pointer-events-auto overflow-x-auto">
        <button
          type="button"
          onClick={onTogglePageReader}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border rounded-t-lg shadow-lg transition-colors whitespace-nowrap shrink-0 ${
            pageReaderMode
              ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
              : 'bg-[#0b0f19]/95 text-slate-200 hover:text-white border-white/[0.1]'
          }`}
          title="Zoomer sur la page de cours 3D (touche L)"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-300" />
          <span>{pageReaderMode ? 'Quitter Page 3D' : 'Lire Page 3D'}</span>
        </button>

        <button
          type="button"
          onClick={onTogglePageFlip}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border rounded-t-lg shadow-lg transition-colors whitespace-nowrap shrink-0 ${
            pageFlipped
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              : 'bg-[#0b0f19]/95 text-slate-200 hover:text-white border-white/[0.1]'
          }`}
          title="Retourner la page 3D à 180° vers la fiche manuscrite (touche F)"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-300" />
          <span>{pageFlipped ? 'Voir Cours 3D' : 'Fiche Manuscrite 3D'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleComparatorMode}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border rounded-t-lg shadow-lg transition-colors whitespace-nowrap shrink-0 ${
            comparatorMode
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              : 'bg-[#0b0f19]/95 text-slate-200 hover:text-white border-white/[0.1]'
          }`}
          title="Comparateur d’Isotopes 3D côte à côte (touche C)"
        >
          <Scale className="w-3.5 h-3.5 text-amber-300" />
          <span>{comparatorMode ? 'Quitter Comparateur' : 'Comparateur 3D'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleQuizHud}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border rounded-t-lg shadow-lg transition-colors whitespace-nowrap shrink-0 ${
            quizActive
              ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
              : 'bg-[#0b0f19]/95 text-slate-200 hover:text-white border-white/[0.1]'
          }`}
          title="Ouvrir le Quiz HUD du chapitre actif (touche Q)"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-300" />
          <span>Quiz HUD</span>
        </button>

        <button
          type="button"
          onClick={onToggleDock}
          className="flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-medium text-slate-200 hover:text-white bg-[#0b0f19]/95 border border-white/[0.1] rounded-t-lg shadow-lg transition-colors whitespace-nowrap shrink-0"
          title="Basculer le panneau de contrôle (touche H)"
        >
          {dockHidden ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-300" />
              <span>Contrôles</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-300" />
              <span>Mode Cinéma</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Shell */}
      <div className="pointer-events-auto bg-[#0b0f19]/94 border border-white/[0.09] rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] overflow-hidden">
        <div
          className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden="true"
        />

        <div className="px-5 py-3 space-y-2.5">
          {/* Contextual Simulation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-white/[0.07]">
            {comparatorMode ? (
              <>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    Comparaison :
                  </span>
                  {COMPARATOR_QUICK_PAIRS.map((pair) => {
                    const active =
                      comparatorLeftId === pair.leftId &&
                      comparatorRightId === pair.rightId;
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        onClick={() => onSelectComparatorPair(pair.leftId, pair.rightId)}
                        className={`px-2.5 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-sky-400/15 text-sky-300 border border-sky-400/35'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                        }`}
                      >
                        {pair.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-200 whitespace-nowrap shrink-0">
                    <span className="font-mono-tabular text-slate-400">
                      Éclaté <span className="text-slate-100">{Math.round(comparatorExplode * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={comparatorExplode}
                      onChange={(e) => onChangeComparatorExplode(parseFloat(e.target.value))}
                      className="studio-slider w-24"
                    />
                  </label>

                  <span className="text-xs font-mono-tabular text-amber-300 whitespace-nowrap shrink-0">
                    ΔE_l = {compDeltaEl >= 0 ? '+' : '−'}
                    {Math.abs(compDeltaEl).toFixed(1)} MeV
                  </span>

                  <button
                    type="button"
                    onClick={onSwapComparator}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-sky-300" />
                    <span>Inverser</span>
                  </button>
                </div>
              </>
            ) : (
              <>
            {activeChapter.visualKind === 'nucleus-intro' && (
              <>
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    Isotope :
                  </span>
                  <div className="flex items-center gap-1">
                    {ISOTOPE_PRESETS.slice(0, 6).map((iso) => (
                      <button
                        key={iso.id}
                        type="button"
                        onClick={() => onSelectIsotope(iso)}
                        className={`px-2.5 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedIsotope.id === iso.id
                            ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                        }`}
                      >
                        {iso.A}{iso.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 p-0.5 bg-[#07090f] border border-white/[0.06] rounded-lg">
                    {(['neutral', 'anion', 'cation'] as IonChargeState[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onChangeIonState(st)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          ionState === st
                            ? 'bg-[#151c2c] text-sky-300'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {st === 'neutral'
                          ? 'Neutre'
                          : st === 'anion'
                          ? 'Anion X²⁻'
                          : 'Cation X²⁺'}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-200 whitespace-nowrap shrink-0">
                    <span className="font-mono-tabular text-slate-400">
                      Éclaté <span className="text-slate-100">{Math.round(explodeAmount * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={explodeAmount}
                      onChange={(e) => onChangeExplode(parseFloat(e.target.value))}
                      className="studio-slider w-24"
                    />
                  </label>
                </div>
              </>
            )}

            {activeChapter.visualKind.startsWith('emission-') && (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-400 mr-1 whitespace-nowrap">
                    Mode :
                  </span>
                  {(['alpha', 'beta-minus', 'beta-plus', 'gamma'] as DecayMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChangeDecayMode(mode)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          decayMode === mode
                            ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                        }`}
                      >
                        {DECAY_MODES[mode].label}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onTogglePlayDecay}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-200 hover:text-white bg-sky-400/12 hover:bg-sky-400/20 border border-sky-400/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {isPlayingDecay ? (
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
                    onClick={onTriggerDecay}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#07090f] bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Émettre Particule</span>
                  </button>
                </div>
              </>
            )}

            {activeChapter.visualKind === 'segre-scatter' && (
              <>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    Cible :
                  </span>
                  {ISOTOPE_PRESETS.map((iso) => (
                    <button
                      key={iso.id}
                      type="button"
                      onClick={() => onSelectIsotope(iso)}
                      className={`px-2 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedIsotope.id === iso.id
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      {iso.A}{iso.symbol}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono-tabular whitespace-nowrap shrink-0">
                  <span className="text-emerald-400">■ Stable</span>
                  <span className="text-sky-300">■ β⁻</span>
                  <span className="text-fuchsia-300">■ β⁺</span>
                  <span className="text-amber-300">■ α</span>
                </div>
              </>
            )}

            {activeChapter.visualKind.startsWith('curve-') && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 6-Curve Switcher */}
                  <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[#07090f] border border-white/[0.06] rounded-lg">
                    {CURVE_DESCRIPTORS.map((desc) => (
                      <button
                        key={desc.id}
                        type="button"
                        onClick={() => onChangeCurveKind(desc.id)}
                        className={`px-2 py-1 text-[11px] font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          curveKind === desc.id
                            ? 'bg-[#151c2c] text-sky-300'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {desc.shortLabel}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onTogglePlayDecay}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#07090f] bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                  >
                    {isPlayingDecay ? (
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

                  {/* Speed selector */}
                  <div className="flex items-center gap-0.5 p-0.5 bg-[#07090f] border border-white/[0.06] rounded-lg">
                    {[0.5, 1, 2].map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => onChangeSimSpeed(sp)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                          simSpeed === sp
                            ? 'bg-[#151c2c] text-amber-300'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {sp}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-200 whitespace-nowrap shrink-0">
                    <span className="font-mono-tabular">
                      {curveKind === 'aston'
                        ? `A = ${astonMassA}`
                        : `t = ${tHalfNormalized.toFixed(2)} t₁/₂`}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.05}
                      value={tHalfNormalized}
                      onChange={(e) => onChangeTime(parseFloat(e.target.value))}
                      className="studio-slider w-28 sm:w-36"
                    />
                  </label>

                  {curveKind === 'aston' ? (
                    <div
                      className="text-xs font-mono-tabular whitespace-nowrap shrink-0"
                      style={{ color: astonZone.colorHex }}
                    >
                      E_l/A = {astonElPerA.toFixed(2)} MeV
                    </div>
                  ) : curveKind === 'activity' ? (
                    <div className="text-xs font-mono-tabular text-[#f96449] whitespace-nowrap shrink-0">
                      a(t) = {currentA} Bq
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onToggleTangent}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        showTangent
                          ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      {curveKind === 'log-linear' || curveKind === 'ln-nt' || curveKind === 'ln-neg'
                        ? 'Triangle Pente λ'
                        : 'Tangente τ = 1/λ'}
                    </button>
                  )}
                </div>
              </>
            )}

            {activeChapter.visualKind === 'mass-defect' && (
              <>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    Noyau Δm :
                  </span>
                  {MASS_DEFECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectMassDefectPreset(preset)}
                      className={`px-2 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        massDefectPresetId === preset.id
                          ? 'bg-amber-400/15 text-amber-300 border border-amber-400/35'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      {preset.A}{preset.symbol}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-200 whitespace-nowrap shrink-0">
                    <span className="font-mono-tabular text-slate-400">
                      Cohésion <span className="text-amber-300">{Math.round(massDefectBindingRatio * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={massDefectBindingRatio}
                      onChange={(e) => onChangeMassDefectBindingRatio(parseFloat(e.target.value))}
                      className="studio-slider w-24"
                    />
                  </label>

                  <span className="text-xs font-mono-tabular text-amber-300 whitespace-nowrap shrink-0">
                    E_l = {mdBreakdown.bindingEnergyMeV.toFixed(1)} MeV
                  </span>

                  <button
                    type="button"
                    onClick={onTriggerMassDefectPulse}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#07090f] bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Libérer E = Δmc²</span>
                  </button>
                </div>
              </>
            )}
              </>
            )}
          </div>

          {/* Chapter Navigation Row */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectChapter(Math.max(0, activeChapterIndex - 1))}
              disabled={activeChapterIndex === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <div className="flex items-center gap-1 overflow-x-auto">
              {chapters.map((ch, idx) => {
                const active = idx === activeChapterIndex;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onSelectChapter(idx)}
                    className={`px-2.5 py-1 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-sky-300 border-sky-400'
                        : 'text-slate-400 border-transparent hover:text-slate-100'
                    }`}
                  >
                    {ch.navLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onToggleVideo}
                className={`p-1.5 rounded-lg transition-colors ${
                  videoPlaying
                    ? 'text-sky-300 bg-sky-400/12'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                title={videoPlaying ? 'Mettre en pause le moniteur 3D' : 'Lire le moniteur 3D'}
                aria-label="Moniteur vidéo 3D"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onResetCamera}
                className="p-1.5 text-slate-400 hover:text-sky-300 rounded-lg transition-colors"
                title="Recentrer la caméra 3D"
                aria-label="Recentrer la caméra 3D"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onSelectChapter(Math.min(chapters.length - 1, activeChapterIndex + 1))
                }
                disabled={activeChapterIndex === chapters.length - 1}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Crisp Cerulean Progress Line */}
        <div className="h-[2px] w-full bg-[#07090f]">
          <div
            className="h-full bg-sky-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

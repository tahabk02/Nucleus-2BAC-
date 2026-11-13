import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Pause,
  Play,
  Scale,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CurveKind,
  DecayHistoryPoint,
  DecayMode,
  IonChargeState,
  IsotopePreset,
  LessonChapter,
} from '../types/lesson';
import { DECAY_MODES, NUCLEAR_CHAPTERS } from '../data/nuclearPhysicsCurriculum';
import { CHAPTER_QUIZZES } from '../data/scientistsAndQuiz';
import {
  CURVE_DESCRIPTORS,
  evaluateAstonElPerA,
  getAstonZoneInfo,
} from '../data/nuclearCurves';
import { MathFormula } from './MathFormula';
import { DecayChartSVG } from './DecayChartSVG';
import { DecayHistoryChart } from './DecayHistoryChart';
import { ScientificDiagramSVG } from './ScientificDiagramSVG';
import { ScientistsPanel } from './ScientistsPanel';
import { HUDQuizPanel } from './HUDQuizPanel';
import { MassDefectCalculator } from './MassDefectCalculator';
import { IsotopeComparatorPanel } from './IsotopeComparatorPanel';

type OverlayTab = 'cours' | 'graph' | 'history' | 'calc' | 'savants' | 'quiz';

interface LessonCardOverlayProps {
  chapter: LessonChapter;
  isotope: IsotopePreset;
  ionState: IonChargeState;
  electronCount: number;
  decayMode: DecayMode;
  decayCount: number;
  tHalfNormalized: number;
  curveKind: CurveKind;
  onChangeCurveKind: (c: CurveKind) => void;
  isPlayingDecay: boolean;
  onTogglePlayDecay: () => void;
  showTangent: boolean;
  pageReaderMode?: boolean;
  onChangeTime: (tNorm: number) => void;
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
  onChangeMassDefectCustom: (Z: number, N: number, nucleusMassU: number) => void;
  onChangeMassDefectBindingRatio: (v: number) => void;
  onTriggerMassDefectPulse: () => void;
  quizToggleSignal?: number;
  onQuizActiveChange?: (active: boolean) => void;
  comparatorMode?: boolean;
  comparatorLeftId: string;
  comparatorRightId: string;
  comparatorExplode: number;
  onToggleComparatorMode: () => void;
  onSelectComparatorLeft: (id: string) => void;
  onSelectComparatorRight: (id: string) => void;
  onSwapComparator: () => void;
  onChangeComparatorExplode: (v: number) => void;
  decayHistory: DecayHistoryPoint[];
  onResetDecayHistory: () => void;
  onTriggerDecay: () => void;
}

export function LessonCardOverlay({
  chapter,
  isotope,
  ionState,
  electronCount,
  decayMode,
  decayCount,
  tHalfNormalized,
  curveKind,
  onChangeCurveKind,
  isPlayingDecay,
  onTogglePlayDecay,
  showTangent,
  pageReaderMode = false,
  onChangeTime,
  massDefectPresetId,
  massDefectZ,
  massDefectN,
  massDefectNucleusU,
  massDefectBindingRatio,
  onSelectMassDefectPreset,
  onChangeMassDefectCustom,
  onChangeMassDefectBindingRatio,
  onTriggerMassDefectPulse,
  quizToggleSignal = 0,
  onQuizActiveChange,
  comparatorMode = false,
  comparatorLeftId,
  comparatorRightId,
  comparatorExplode,
  onToggleComparatorMode,
  onSelectComparatorLeft,
  onSelectComparatorRight,
  onSwapComparator,
  onChangeComparatorExplode,
  decayHistory,
  onResetDecayHistory,
  onTriggerDecay,
}: LessonCardOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<OverlayTab>('cours');
  const [curveViewMode, setCurveViewMode] = useState<'curves' | 'history'>('curves');
  const lastQuizSignalRef = useRef(quizToggleSignal);

  useEffect(() => {
    setCollapsed(pageReaderMode);
  }, [pageReaderMode]);

  useEffect(() => {
    if (comparatorMode) setCollapsed(false);
  }, [comparatorMode]);

  useEffect(() => {
    if (quizToggleSignal !== lastQuizSignalRef.current) {
      lastQuizSignalRef.current = quizToggleSignal;
      if (collapsed || activeTab !== 'quiz') {
        setCollapsed(false);
        setActiveTab('quiz');
      } else {
        setActiveTab('cours');
      }
    }
  }, [quizToggleSignal, collapsed, activeTab]);

  useEffect(() => {
    onQuizActiveChange?.(!collapsed && activeTab === 'quiz');
  }, [collapsed, activeTab, onQuizActiveChange]);

  const showGraphTab =
    chapter.visualKind.startsWith('curve-') || chapter.id === 'intro-nucleus';
  const showHistoryTab = chapter.visualKind.startsWith('emission-');
  const showMassDefectTab = chapter.visualKind === 'mass-defect';
  const showDiagram =
    chapter.visualKind === 'nucleus-intro' ||
    chapter.visualKind.startsWith('emission-');
  const remainingPct = Math.exp(-tHalfNormalized * Math.LN2) * 100;
  const decayedPct = 100 - remainingPct;
  const astonMassA = Math.round(2 + (tHalfNormalized / 4) * 236);
  const astonElPerA = evaluateAstonElPerA(astonMassA);
  const astonZone = getAstonZoneInfo(astonMassA);
  const activeDecayInfo = DECAY_MODES[decayMode];
  const chapterQuizCount = CHAPTER_QUIZZES.filter(
    (q) => q.chapterId === chapter.id
  ).length;

  useEffect(() => {
    if (showMassDefectTab) {
      setActiveTab('calc');
    } else if (activeTab === 'calc') {
      setActiveTab('cours');
    } else if (!showGraphTab && activeTab === 'graph') {
      setActiveTab('cours');
    } else if (!showHistoryTab && activeTab === 'history') {
      setActiveTab('cours');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id, showGraphTab, showMassDefectTab, showHistoryTab]);

  const accentColorMap: Record<string, string> = {
    cyan: 'text-sky-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    emerald: 'text-emerald-300',
    magenta: 'text-fuchsia-300',
    white: 'text-slate-100',
  };

  return (
    <aside
      className="fixed top-[68px] left-4 sm:left-5 z-20 w-[min(410px,calc(100vw-2rem))] pointer-events-auto"
      aria-label="Fiches, savants et quiz du chapitre"
    >
      <div className="relative bg-[#0b0f19]/94 border border-white/[0.09] rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Top subtle platinum specular hairline */}
        <div
          className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden="true"
        />

        {/* Editorial Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-white/[0.07]">
          <div className="min-w-0">
            {comparatorMode ? (
              <>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-tabular">
                  <span className="text-sky-300 font-medium">Mode Comparateur 3D</span>
                  <span aria-hidden="true">·</span>
                  <span>Isotope A vs B</span>
                  <span aria-hidden="true">·</span>
                  <span>2BAC</span>
                </div>
                <h1 className="font-display text-[17px] sm:text-[18px] font-semibold text-slate-50 leading-snug mt-1 text-balance">
                  Comparateur d’Isotopes
                </h1>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-tabular">
                  <span className="text-sky-300 font-medium">
                    {String(chapter.index).padStart(2, '0')} / {String(NUCLEAR_CHAPTERS.length - 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{chapter.sheetRefs}</span>
                  <span aria-hidden="true">·</span>
                  <span>2BAC</span>
                </div>
                <h1 className="font-display text-[17px] sm:text-[18px] font-semibold text-slate-50 leading-snug mt-1 text-balance">
                  {chapter.title.replace(/^\d+\.\s*/, '')}
                </h1>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {comparatorMode && (
              <button
                type="button"
                onClick={onToggleComparatorMode}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:text-white bg-amber-400/12 hover:bg-amber-400/20 border border-amber-400/35 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Cours</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-sky-300" />
                  <span>Ouvrir</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-sky-300" />
                  <span>Réduire</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="overlay-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[calc(100vh-268px)] overflow-y-auto hud-scroll"
            >
            {/* Persistent Segmented Navigation (hidden in Comparator mode) */}
            {!comparatorMode && (
            <div className="px-4 py-2 border-b border-white/[0.07] bg-[#07090f]/75">
              <div
                className="flex items-center gap-1 p-1 bg-[#07090f] rounded-lg border border-white/[0.05]"
                role="tablist"
                aria-label="Sections du module"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'cours'}
                  onClick={() => setActiveTab('cours')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'cours'
                      ? 'bg-[#151c2c] text-sky-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Cours</span>
                </button>

                {showGraphTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'graph'}
                    onClick={() => setActiveTab('graph')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === 'graph'
                        ? 'bg-[#151c2c] text-sky-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 shrink-0" />
                    <span>Courbe</span>
                  </button>
                )}

                {showHistoryTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === 'history'
                        ? 'bg-[#151c2c] text-sky-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span>Historique</span>
                  </button>
                )}

                {showMassDefectTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'calc'}
                    onClick={() => setActiveTab('calc')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === 'calc'
                        ? 'bg-[#151c2c] text-amber-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 shrink-0" />
                    <span>Calcul Δm</span>
                  </button>
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'savants'}
                  onClick={() => setActiveTab('savants')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'savants'
                      ? 'bg-[#151c2c] text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Savants</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'quiz'}
                  onClick={() => setActiveTab('quiz')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'quiz'
                      ? 'bg-[#151c2c] text-sky-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Quiz · {chapterQuizCount}</span>
                </button>
              </div>
            </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={comparatorMode ? 'comparator-panel' : `${chapter.id}-${activeTab}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="divide-y divide-white/[0.06]"
              >
                {comparatorMode ? (
                  <IsotopeComparatorPanel
                    leftId={comparatorLeftId}
                    rightId={comparatorRightId}
                    explode={comparatorExplode}
                    onSelectLeft={onSelectComparatorLeft}
                    onSelectRight={onSelectComparatorRight}
                    onSwap={onSwapComparator}
                    onChangeExplode={onChangeComparatorExplode}
                  />
                ) : activeTab === 'savants' ? (
                  <ScientistsPanel chapterId={chapter.id} />
                ) : activeTab === 'quiz' ? (
                  <HUDQuizPanel chapterId={chapter.id} />
                ) : showMassDefectTab && activeTab === 'calc' ? (
                  <MassDefectCalculator
                    presetId={massDefectPresetId}
                    Z={massDefectZ}
                    N={massDefectN}
                    nucleusMassU={massDefectNucleusU}
                    bindingRatio={massDefectBindingRatio}
                    onSelectPreset={onSelectMassDefectPreset}
                    onChangeCustom={onChangeMassDefectCustom}
                    onChangeBindingRatio={onChangeMassDefectBindingRatio}
                    onTriggerPulse={onTriggerMassDefectPulse}
                  />
                ) : showHistoryTab && activeTab === 'history' ? (
                  <div className="p-4 sm:p-5">
                    <DecayHistoryChart
                      history={decayHistory}
                      isotope={isotope}
                      decayMode={decayMode}
                      isPlaying={isPlayingDecay}
                      onTogglePlay={onTogglePlayDecay}
                      onReset={onResetDecayHistory}
                      onEmitBurst={onTriggerDecay}
                    />
                  </div>
                ) : showGraphTab && activeTab === 'graph' ? (
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {chapter.visualKind.startsWith('curve-') && (
                      <div className="flex items-center gap-1 p-0.5 bg-[#07090f] border border-white/[0.06] rounded-lg">
                        <button
                          type="button"
                          onClick={() => setCurveViewMode('curves')}
                          className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                            curveViewMode === 'curves'
                              ? 'bg-[#151c2c] text-sky-300'
                              : 'text-slate-400 hover:text-slate-100'
                          }`}
                        >
                          Courbes 2BAC
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurveViewMode('history')}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                            curveViewMode === 'history'
                              ? 'bg-[#151c2c] text-sky-300'
                              : 'text-slate-400 hover:text-slate-100'
                          }`}
                        >
                          <Activity className="w-3 h-3 shrink-0" />
                          <span>Historique Pères / Fils</span>
                        </button>
                      </div>
                    )}

                    {chapter.visualKind.startsWith('curve-') && curveViewMode === 'history' ? (
                      <DecayHistoryChart
                        history={decayHistory}
                        isotope={isotope}
                        decayMode={decayMode}
                        isPlaying={isPlayingDecay}
                        onTogglePlay={onTogglePlayDecay}
                        onReset={onResetDecayHistory}
                        onEmitBurst={onTriggerDecay}
                      />
                    ) : (
                      <>
                    {/* Curve Selector Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {CURVE_DESCRIPTORS.map((desc) => {
                          const active = curveKind === desc.id;
                          return (
                            <button
                              key={desc.id}
                              type="button"
                              onClick={() => onChangeCurveKind(desc.id)}
                              className={`px-2 py-1 text-[11px] font-mono-tabular rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                                active
                                  ? 'bg-[#151c2c] text-slate-50 border-sky-400/40'
                                  : 'bg-[#07090f]/70 text-slate-400 hover:text-slate-100 border-white/[0.06]'
                              }`}
                            >
                              {desc.shortLabel}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={onTogglePlayDecay}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#07090f] bg-slate-100 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        {isPlayingDecay ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Simuler</span>
                          </>
                        )}
                      </button>
                    </div>

                    <DecayChartSVG
                      curveKind={curveKind}
                      tHalfNormalized={tHalfNormalized}
                      showTangent={showTangent}
                      n0Label={
                        curveKind === 'activity' ? '1 000 Bq' : 'N₀ (100%)'
                      }
                      halfLifeLabel={isotope.halfLifeLabel}
                      onChangeTime={onChangeTime}
                    />

                    {curveKind === 'aston' ? (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] font-mono-tabular">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Nombre de masse A
                          </div>
                          <div className="text-base font-semibold text-amber-300 mt-0.5">
                            A = {astonMassA}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Énergie E_l / A
                          </div>
                          <div className="text-base font-semibold mt-0.5" style={{ color: astonZone.colorHex }}>
                            {astonElPerA.toFixed(2)} MeV
                          </div>
                        </div>
                      </div>
                    ) : curveKind === 'log-linear' ? (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] font-mono-tabular">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            ln(N₀ / N(t))
                          </div>
                          <div className="text-base font-semibold text-emerald-300 mt-0.5">
                            {(tHalfNormalized * Math.LN2).toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Fraction restante
                          </div>
                          <div className="text-base font-semibold text-sky-300 mt-0.5">
                            {remainingPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ) : curveKind === 'ln-nt' || curveKind === 'ln-neg' ? (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] font-mono-tabular">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            {curveKind === 'ln-nt' ? 'ln N(t) − ln N₀' : 'ln(N(t) / N₀)'}
                          </div>
                          <div
                            className={`text-base font-semibold mt-0.5 ${
                              curveKind === 'ln-nt' ? 'text-amber-300' : 'text-fuchsia-300'
                            }`}
                          >
                            −{(tHalfNormalized * Math.LN2).toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Rapport N(t) / N₀
                          </div>
                          <div className="text-base font-semibold text-sky-300 mt-0.5">
                            {remainingPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] font-mono-tabular">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            {curveKind === 'activity' ? 'Activité a(t)' : 'Restants N(t)'}
                          </div>
                          <div className="text-base font-semibold text-sky-300 mt-0.5">
                            {curveKind === 'activity'
                              ? `${Math.max(1, Math.round(1000 * (remainingPct / 100)))} Bq`
                              : `${remainingPct.toFixed(1)}%`}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Désintégrés N_D
                          </div>
                          <div className="text-base font-semibold text-[#f96449] mt-0.5">
                            {decayedPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Contextual Telemetry Strip */}
                    {chapter.visualKind === 'nucleus-intro' && (
                      <div className="px-5 py-3.5 bg-white/[0.02] flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Noyau actif · {isotope.name}
                          </div>
                          <div className="text-base font-semibold text-slate-50 mt-0.5">
                            <MathFormula
                              latex={`{}^{${isotope.A}}_{${isotope.Z}} \\text{${isotope.symbol}}${
                                ionState === 'anion'
                                  ? '^{2-}'
                                  : ionState === 'cation'
                                  ? '^{2+}'
                                  : ''
                              }`}
                            />
                          </div>
                        </div>
                        <div className="text-right font-mono-tabular text-xs space-y-0.5">
                          <div className="text-[#f96449]">Z = {isotope.Z} p⁺</div>
                          <div className="text-sky-200">N = {isotope.N} n⁰</div>
                          <div className="text-sky-400">e⁻ = {electronCount}</div>
                        </div>
                      </div>
                    )}

                    {chapter.visualKind.startsWith('emission-') && (
                      <div className="px-5 py-3.5 bg-white/[0.02] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-100">
                            {activeDecayInfo.label}
                          </span>
                          <span className="font-mono-tabular text-sky-300">
                            Émissions : {decayCount}
                          </span>
                        </div>
                        <div className="text-sm text-slate-100 py-0.5 overflow-x-auto">
                          <MathFormula latex={activeDecayInfo.exampleLatex} />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {activeDecayInfo.mechanismText}
                        </p>
                      </div>
                    )}

                    {/* Scientific Vector Diagram */}
                    {showDiagram && (
                      <div className="px-5 py-3.5">
                        <ScientificDiagramSVG visualKind={chapter.visualKind} />
                      </div>
                    )}

                    {/* Definition Section */}
                    <div className="px-5 py-4">
                      <p className="text-[13.5px] text-slate-200 leading-[1.6]">
                        {chapter.keyDefinition}
                      </p>
                    </div>

                    {/* Clean Typographic Formula Bands */}
                    {chapter.formulas.map((f) => (
                      <div key={f.id} className="px-5 py-4 space-y-1.5">
                        <div
                          className={`text-[11px] font-mono-tabular font-medium ${
                            accentColorMap[f.accent] || 'text-sky-300'
                          }`}
                        >
                          {f.title}
                        </div>
                        <div className="text-slate-50 overflow-x-auto py-1">
                          <MathFormula latex={f.latex} />
                        </div>
                        <div className="text-xs text-slate-400">
                          {f.caption}
                        </div>
                      </div>
                    ))}

                    {/* Highlights */}
                    <div className="px-5 py-4 space-y-2.5 bg-white/[0.015]">
                      {chapter.highlights.map((h, i) => (
                        <div key={i} className="text-xs leading-relaxed">
                          <span className="font-semibold text-slate-100">
                            {h.label} :{' '}
                          </span>
                          <span className="text-slate-400">{h.detail}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

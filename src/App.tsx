import { useEffect, useRef, useState } from 'react';
import {
  COMPARATOR_ISOTOPES,
  NUCLEAR_CHAPTERS,
} from './data/nuclearPhysicsCurriculum';
import { useLessonStore } from './store/lessonStore';
import { NuclearSceneEngine, SceneStateUpdate } from './three/NuclearSceneEngine';
import { LessonCardOverlay } from './components/LessonCardOverlay';
import { BottomControlDock } from './components/BottomControlDock';
import { SheetsGalleryModal } from './components/SheetsGalleryModal';

import { computeMassDefectBreakdown } from './lib/physics';

const TOP_PHASE_SHORTCUTS = [
  { label: 'Noyau', index: 0 },
  { label: 'Énergie Δm', index: 10 },
  { label: 'Radioactivité', index: 1 },
  { label: 'Décroissance', index: 5 },
  { label: 'Segré', index: 8 },
];

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NuclearSceneEngine | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [quizToggleSignal, setQuizToggleSignal] = useState(0);
  const [quizActive, setQuizActive] = useState(false);

  const activeIndex = useLessonStore((s) => s.activeIndex);
  const selectedIsotope = useLessonStore((s) => s.selectedIsotope);
  const ionState = useLessonStore((s) => s.ionState);
  const explodeAmount = useLessonStore((s) => s.explodeAmount);
  const decayMode = useLessonStore((s) => s.decayMode);
  const decayCount = useLessonStore((s) => s.decayCount);
  const tHalfNormalized = useLessonStore((s) => s.tHalfNormalized);
  const curveKind = useLessonStore((s) => s.curveKind);
  const simSpeed = useLessonStore((s) => s.simSpeed);
  const showTangent = useLessonStore((s) => s.showTangent);
  const isPlayingDecay = useLessonStore((s) => s.isPlayingDecay);
  const videoPlaying = useLessonStore((s) => s.videoPlaying);
  const dockHidden = useLessonStore((s) => s.dockHidden);
  const sheetsOpen = useLessonStore((s) => s.sheetsOpen);
  const pageReaderMode = useLessonStore((s) => s.pageReaderMode);
  const pageFlipped = useLessonStore((s) => s.pageFlipped);
  const reducedMotion = useLessonStore((s) => s.reducedMotion);
  const massDefectPresetId = useLessonStore((s) => s.massDefectPresetId);
  const massDefectZ = useLessonStore((s) => s.massDefectZ);
  const massDefectN = useLessonStore((s) => s.massDefectN);
  const massDefectNucleusU = useLessonStore((s) => s.massDefectNucleusU);
  const massDefectBindingRatio = useLessonStore((s) => s.massDefectBindingRatio);
  const massDefectPulseCount = useLessonStore((s) => s.massDefectPulseCount);
  const comparatorMode = useLessonStore((s) => s.comparatorMode);
  const comparatorLeftId = useLessonStore((s) => s.comparatorLeftId);
  const comparatorRightId = useLessonStore((s) => s.comparatorRightId);
  const comparatorExplode = useLessonStore((s) => s.comparatorExplode);
  const decayHistory = useLessonStore((s) => s.decayHistory);

  const goTo = useLessonStore((s) => s.goTo);
  const nextChapter = useLessonStore((s) => s.nextChapter);
  const prevChapter = useLessonStore((s) => s.prevChapter);
  const setIsotope = useLessonStore((s) => s.setIsotope);
  const setIonState = useLessonStore((s) => s.setIonState);
  const setExplodeAmount = useLessonStore((s) => s.setExplodeAmount);
  const setDecayMode = useLessonStore((s) => s.setDecayMode);
  const incrementDecayCount = useLessonStore((s) => s.incrementDecayCount);
  const setTHalfNormalized = useLessonStore((s) => s.setTHalfNormalized);
  const setCurveKind = useLessonStore((s) => s.setCurveKind);
  const setSimSpeed = useLessonStore((s) => s.setSimSpeed);
  const toggleTangent = useLessonStore((s) => s.toggleTangent);
  const setPlayingDecay = useLessonStore((s) => s.setPlayingDecay);
  const toggleVideoPlaying = useLessonStore((s) => s.toggleVideoPlaying);
  const toggleDock = useLessonStore((s) => s.toggleDock);
  const setSheetsOpen = useLessonStore((s) => s.setSheetsOpen);
  const togglePageReader = useLessonStore((s) => s.togglePageReader);
  const setPageReaderMode = useLessonStore((s) => s.setPageReaderMode);
  const togglePageFlip = useLessonStore((s) => s.togglePageFlip);
  const setReducedMotion = useLessonStore((s) => s.setReducedMotion);
  const selectMassDefectPreset = useLessonStore((s) => s.selectMassDefectPreset);
  const setMassDefectCustom = useLessonStore((s) => s.setMassDefectCustom);
  const setMassDefectBindingRatio = useLessonStore((s) => s.setMassDefectBindingRatio);
  const triggerMassDefectPulse = useLessonStore((s) => s.triggerMassDefectPulse);
  const toggleComparatorMode = useLessonStore((s) => s.toggleComparatorMode);
  const setComparatorMode = useLessonStore((s) => s.setComparatorMode);
  const setComparatorLeftId = useLessonStore((s) => s.setComparatorLeftId);
  const setComparatorRightId = useLessonStore((s) => s.setComparatorRightId);
  const swapComparatorIsotopes = useLessonStore((s) => s.swapComparatorIsotopes);
  const setComparatorExplode = useLessonStore((s) => s.setComparatorExplode);
  const recordDecayHistoryStep = useLessonStore((s) => s.recordDecayHistoryStep);
  const recordManualDecayBurst = useLessonStore((s) => s.recordManualDecayBurst);
  const resetDecayHistory = useLessonStore((s) => s.resetDecayHistory);

  const chapter = NUCLEAR_CHAPTERS[activeIndex] ?? NUCLEAR_CHAPTERS[0];
  const mdBreakdown = computeMassDefectBreakdown(
    massDefectZ,
    massDefectN,
    massDefectNucleusU
  );
  const compLeftPreset =
    COMPARATOR_ISOTOPES.find((i) => i.id === comparatorLeftId) ?? COMPARATOR_ISOTOPES[3];
  const compRightPreset =
    COMPARATOR_ISOTOPES.find((i) => i.id === comparatorRightId) ?? COMPARATOR_ISOTOPES[4];
  const compLeftBreakdown = computeMassDefectBreakdown(
    compLeftPreset.Z,
    compLeftPreset.N,
    compLeftPreset.nucleusMassU
  );
  const compRightBreakdown = computeMassDefectBreakdown(
    compRightPreset.Z,
    compRightPreset.N,
    compRightPreset.nucleusMassU
  );

  const electronCount =
    ionState === 'anion'
      ? selectedIsotope.Z + 2
      : ionState === 'cation'
      ? Math.max(0, selectedIsotope.Z - 2)
      : selectedIsotope.Z;

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setReducedMotion]);

  // Mount persistent Three.js NuclearSceneEngine once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const initialState: SceneStateUpdate = {
      chapterId: chapter.id,
      chapterIndex: activeIndex,
      visualKind: chapter.visualKind,
      fxColorHex: chapter.fxColorHex,
      videoTitle: chapter.videoTitle,
      videoCaption: chapter.videoCaption,
      videoPlaying,
      pageReaderMode,
      pageFlipped,
      isotope: selectedIsotope,
      electronCount,
      explodeAmount,
      decayProgress: tHalfNormalized,
      curveKind,
      showTangent,
      reducedMotion,
      holograms: chapter.holograms,
      cameraPos: chapter.cameraPos,
      cameraTarget: chapter.cameraTarget,
      fov: chapter.fov,
      massDefect: {
        Z: mdBreakdown.Z,
        N: mdBreakdown.N,
        deltaMassU: Math.max(0, mdBreakdown.deltaMassU),
        bindingEnergyMeV: Math.max(0, mdBreakdown.bindingEnergyMeV),
        bindingRatio: massDefectBindingRatio,
        pulseCount: massDefectPulseCount,
      },
      comparator: {
        active: comparatorMode,
        explode: comparatorExplode,
        left: {
          id: compLeftPreset.id,
          symbol: compLeftPreset.symbol,
          name: compLeftPreset.name,
          A: compLeftPreset.A,
          Z: compLeftPreset.Z,
          N: compLeftPreset.N,
          stable: compLeftPreset.stable,
          deltaMassU: compLeftBreakdown.deltaMassU,
          bindingEnergyMeV: compLeftBreakdown.bindingEnergyMeV,
          energyPerNucleonMeV: compLeftBreakdown.energyPerNucleonMeV,
        },
        right: {
          id: compRightPreset.id,
          symbol: compRightPreset.symbol,
          name: compRightPreset.name,
          A: compRightPreset.A,
          Z: compRightPreset.Z,
          N: compRightPreset.N,
          stable: compRightPreset.stable,
          deltaMassU: compRightBreakdown.deltaMassU,
          bindingEnergyMeV: compRightBreakdown.bindingEnergyMeV,
          energyPerNucleonMeV: compRightBreakdown.energyPerNucleonMeV,
        },
      },
    };

    const engine = new NuclearSceneEngine(container, initialState, {
      onContextLost: setContextLost,
      onSelectChapter: (idx) => goTo(idx),
      onFocusActivePage: () => setPageReaderMode(true),
      onTogglePageFlip: () => togglePageFlip(),
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push reactive state updates to Three.js scene without remounting
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.applyState({
      chapterId: chapter.id,
      chapterIndex: activeIndex,
      visualKind: chapter.visualKind,
      fxColorHex: chapter.fxColorHex,
      videoTitle: chapter.videoTitle,
      videoCaption: chapter.videoCaption,
      videoPlaying,
      pageReaderMode,
      pageFlipped,
      isotope: selectedIsotope,
      electronCount,
      explodeAmount,
      decayProgress: tHalfNormalized,
      curveKind,
      showTangent,
      reducedMotion,
      holograms: chapter.holograms,
      cameraPos: chapter.cameraPos,
      cameraTarget: chapter.cameraTarget,
      fov: chapter.fov,
      massDefect: {
        Z: mdBreakdown.Z,
        N: mdBreakdown.N,
        deltaMassU: Math.max(0, mdBreakdown.deltaMassU),
        bindingEnergyMeV: Math.max(0, mdBreakdown.bindingEnergyMeV),
        bindingRatio: massDefectBindingRatio,
        pulseCount: massDefectPulseCount,
      },
      comparator: {
        active: comparatorMode,
        explode: comparatorExplode,
        left: {
          id: compLeftPreset.id,
          symbol: compLeftPreset.symbol,
          name: compLeftPreset.name,
          A: compLeftPreset.A,
          Z: compLeftPreset.Z,
          N: compLeftPreset.N,
          stable: compLeftPreset.stable,
          deltaMassU: compLeftBreakdown.deltaMassU,
          bindingEnergyMeV: compLeftBreakdown.bindingEnergyMeV,
          energyPerNucleonMeV: compLeftBreakdown.energyPerNucleonMeV,
        },
        right: {
          id: compRightPreset.id,
          symbol: compRightPreset.symbol,
          name: compRightPreset.name,
          A: compRightPreset.A,
          Z: compRightPreset.Z,
          N: compRightPreset.N,
          stable: compRightPreset.stable,
          deltaMassU: compRightBreakdown.deltaMassU,
          bindingEnergyMeV: compRightBreakdown.bindingEnergyMeV,
          energyPerNucleonMeV: compRightBreakdown.energyPerNucleonMeV,
        },
      },
    });
  }, [
    chapter,
    activeIndex,
    videoPlaying,
    pageReaderMode,
    pageFlipped,
    selectedIsotope,
    electronCount,
    explodeAmount,
    tHalfNormalized,
    curveKind,
    showTangent,
    reducedMotion,
    mdBreakdown.Z,
    mdBreakdown.N,
    mdBreakdown.deltaMassU,
    mdBreakdown.bindingEnergyMeV,
    massDefectBindingRatio,
    massDefectPulseCount,
    comparatorMode,
    comparatorExplode,
    compLeftPreset,
    compRightPreset,
    compLeftBreakdown.deltaMassU,
    compLeftBreakdown.bindingEnergyMeV,
    compLeftBreakdown.energyPerNucleonMeV,
    compRightBreakdown.deltaMassU,
    compRightBreakdown.bindingEnergyMeV,
    compRightBreakdown.energyPerNucleonMeV,
  ]);

  // Playback loop for simulated curves & real-time parent/daughter population history
  useEffect(() => {
    if (!isPlayingDecay) return;
    let last = performance.now();
    let sampleAccum = 0;
    let emitAccum = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      sampleAccum += dt;
      emitAccum += dt;

      const state = useLessonStore.getState();
      const rawNext = state.tHalfNormalized + dt * 0.55 * state.simSpeed;
      const wrapped = rawNext > 4 ? 0 : Number(rawNext.toFixed(3));
      setTHalfNormalized(wrapped);

      if (sampleAccum >= 0.11 || rawNext > 4) {
        recordDecayHistoryStep(wrapped, sampleAccum);
        sampleAccum = 0;
      }

      const activeCh = NUCLEAR_CHAPTERS[state.activeIndex];
      if (activeCh?.visualKind.startsWith('emission-') && emitAccum >= 0.55) {
        emitAccum = 0;
        engineRef.current?.triggerDecay(state.decayMode);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlayingDecay, setTHalfNormalized, recordDecayHistoryStep]);

  // Keyboard navigation (ArrowLeft / ArrowRight / H / L / F / Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sheetsOpen) {
        if (e.key === 'Escape') setSheetsOpen(false);
        return;
      }
      if (e.key === 'Escape' && comparatorMode) setComparatorMode(false);
      else if (e.key === 'Escape' && pageReaderMode) setPageReaderMode(false);
      else if (e.key === 'ArrowRight') nextChapter();
      else if (e.key === 'ArrowLeft') prevChapter();
      else if (e.key.toLowerCase() === 'h') toggleDock();
      else if (e.key.toLowerCase() === 'l') togglePageReader();
      else if (e.key.toLowerCase() === 'f') togglePageFlip();
      else if (e.key.toLowerCase() === 'q') setQuizToggleSignal((n) => n + 1);
      else if (e.key.toLowerCase() === 'c') toggleComparatorMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    sheetsOpen,
    comparatorMode,
    pageReaderMode,
    nextChapter,
    prevChapter,
    toggleDock,
    setSheetsOpen,
    setComparatorMode,
    setPageReaderMode,
    togglePageReader,
    togglePageFlip,
    toggleComparatorMode,
  ]);

  const handleTriggerDecay = () => {
    incrementDecayCount();
    recordManualDecayBurst();
    engineRef.current?.triggerDecay(decayMode);
  };

  const handleChangeDecayMode = (mode: typeof decayMode) => {
    setDecayMode(mode);
    incrementDecayCount();
    engineRef.current?.triggerDecay(mode);
  };

  const handleResetCamera = () => {
    engineRef.current?.focusCameraPreset(chapter.cameraPos, chapter.cameraTarget);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07090f] text-slate-100 select-none">
      {/* Persistent Full-Viewport 3D Observatory Canvas */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 z-0"
        aria-label="Observatoire 3D de Physique Nucléaire"
      />

      {contextLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#07090f]/95 p-6 text-center">
          <div className="max-w-md space-y-2 rounded-2xl bg-[#0b0f19] border border-white/10 p-6">
            <h2 className="font-display text-lg font-semibold text-white">
              Contexte WebGL interrompu
            </h2>
            <p className="text-sm text-slate-400">
              Le rendu 3D est en attente de restauration par le navigateur.
            </p>
          </div>
        </div>
      )}

      {/* Top Bar (Strict 3-Zone Contract) */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-8 px-5 sm:px-7 py-3.5 bg-[#07090f]/90 border-b border-white/[0.08]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            goTo(0);
          }}
          className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          Nucleus 2BAC
        </a>

        <nav
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400"
          aria-label="Navigation rapide des chapitres"
        >
          {TOP_PHASE_SHORTCUTS.map((item) => {
            const isActive =
              item.index === 1
                ? activeIndex >= 1 && activeIndex <= 4
                : item.index === 5
                ? (activeIndex >= 5 && activeIndex <= 7) || activeIndex === 9
                : activeIndex === item.index;
            return (
              <a
                key={item.label}
                href={`#chapitre-${item.index}`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(item.index);
                }}
                className={`py-0.5 border-b transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-sky-300 border-sky-400'
                    : 'border-transparent hover:text-slate-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSheetsOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#07090f] bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Fiches Originales
          </button>
        </div>
      </header>

      {/* Left Floating Lesson / Savants / Quiz Overlay */}
      <LessonCardOverlay
        chapter={chapter}
        isotope={selectedIsotope}
        ionState={ionState}
        electronCount={electronCount}
        decayMode={decayMode}
        decayCount={decayCount}
        tHalfNormalized={tHalfNormalized}
        curveKind={curveKind}
        onChangeCurveKind={setCurveKind}
        isPlayingDecay={isPlayingDecay}
        onTogglePlayDecay={() => setPlayingDecay(!isPlayingDecay)}
        showTangent={showTangent}
        pageReaderMode={pageReaderMode}
        onChangeTime={(t) => {
          setPlayingDecay(false);
          setTHalfNormalized(t);
        }}
        massDefectPresetId={massDefectPresetId}
        massDefectZ={massDefectZ}
        massDefectN={massDefectN}
        massDefectNucleusU={massDefectNucleusU}
        massDefectBindingRatio={massDefectBindingRatio}
        onSelectMassDefectPreset={selectMassDefectPreset}
        onChangeMassDefectCustom={setMassDefectCustom}
        onChangeMassDefectBindingRatio={setMassDefectBindingRatio}
        onTriggerMassDefectPulse={triggerMassDefectPulse}
        quizToggleSignal={quizToggleSignal}
        onQuizActiveChange={setQuizActive}
        comparatorMode={comparatorMode}
        comparatorLeftId={comparatorLeftId}
        comparatorRightId={comparatorRightId}
        comparatorExplode={comparatorExplode}
        onToggleComparatorMode={toggleComparatorMode}
        onSelectComparatorLeft={setComparatorLeftId}
        onSelectComparatorRight={setComparatorRightId}
        onSwapComparator={swapComparatorIsotopes}
        onChangeComparatorExplode={setComparatorExplode}
        decayHistory={decayHistory}
        onResetDecayHistory={() => resetDecayHistory(true)}
        onTriggerDecay={handleTriggerDecay}
      />

      {/* Unified Collapsible Bottom Control Dock */}
      <BottomControlDock
        chapters={NUCLEAR_CHAPTERS}
        activeChapterIndex={activeIndex}
        dockHidden={dockHidden}
        onToggleDock={toggleDock}
        onSelectChapter={goTo}
        selectedIsotope={selectedIsotope}
        onSelectIsotope={setIsotope}
        ionState={ionState}
        onChangeIonState={setIonState}
        explodeAmount={explodeAmount}
        onChangeExplode={setExplodeAmount}
        decayMode={decayMode}
        onChangeDecayMode={handleChangeDecayMode}
        onTriggerDecay={handleTriggerDecay}
        tHalfNormalized={tHalfNormalized}
        onChangeTime={(t) => {
          setPlayingDecay(false);
          setTHalfNormalized(t);
        }}
        curveKind={curveKind}
        onChangeCurveKind={setCurveKind}
        simSpeed={simSpeed}
        onChangeSimSpeed={setSimSpeed}
        showTangent={showTangent}
        onToggleTangent={toggleTangent}
        isPlayingDecay={isPlayingDecay}
        onTogglePlayDecay={() => setPlayingDecay(!isPlayingDecay)}
        videoPlaying={videoPlaying}
        onToggleVideo={toggleVideoPlaying}
        pageReaderMode={pageReaderMode}
        onTogglePageReader={togglePageReader}
        pageFlipped={pageFlipped}
        onTogglePageFlip={togglePageFlip}
        onResetCamera={handleResetCamera}
        massDefectPresetId={massDefectPresetId}
        massDefectZ={massDefectZ}
        massDefectN={massDefectN}
        massDefectNucleusU={massDefectNucleusU}
        massDefectBindingRatio={massDefectBindingRatio}
        onSelectMassDefectPreset={selectMassDefectPreset}
        onChangeMassDefectBindingRatio={setMassDefectBindingRatio}
        onTriggerMassDefectPulse={triggerMassDefectPulse}
        quizActive={quizActive}
        onToggleQuizHud={() => setQuizToggleSignal((n) => n + 1)}
        comparatorMode={comparatorMode}
        comparatorLeftId={comparatorLeftId}
        comparatorRightId={comparatorRightId}
        comparatorExplode={comparatorExplode}
        onToggleComparatorMode={toggleComparatorMode}
        onSelectComparatorPair={(leftId, rightId) => {
          setComparatorLeftId(leftId);
          setComparatorRightId(rightId);
        }}
        onSwapComparator={swapComparatorIsotopes}
        onChangeComparatorExplode={setComparatorExplode}
      />

      {/* Discreet Corner Attribution */}
      <div className="fixed bottom-3 right-5 z-10 hidden xl:block text-[11px] font-mono-tabular text-slate-500 pointer-events-none">
        Taha Winmers × Taha BK
      </div>

      {/* Handwritten Sheets Reference Modal */}
      <SheetsGalleryModal
        isOpen={sheetsOpen}
        onClose={() => setSheetsOpen(false)}
      />
    </div>
  );
}

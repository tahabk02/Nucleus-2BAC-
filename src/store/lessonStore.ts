import { create } from 'zustand';
import {
  CurveKind,
  DecayHistoryPoint,
  DecayMode,
  IonChargeState,
  IsotopePreset,
} from '../types/lesson';
import {
  ISOTOPE_PRESETS,
  NUCLEAR_CHAPTERS,
} from '../data/nuclearPhysicsCurriculum';

const INITIAL_SAMPLE_NUCLEI = 100;

function makeHistoryPoint(
  step: number,
  tHalf: number,
  elapsedSec: number,
  parentOverride?: number
): DecayHistoryPoint {
  const theoryParent = Number(
    (INITIAL_SAMPLE_NUCLEI * Math.exp(-tHalf * Math.LN2)).toFixed(2)
  );
  const theoryDaughter = Number((INITIAL_SAMPLE_NUCLEI - theoryParent).toFixed(2));
  const parentCount =
    parentOverride !== undefined
      ? Math.max(0, Math.min(INITIAL_SAMPLE_NUCLEI, parentOverride))
      : Math.round(theoryParent);
  const daughterCount = INITIAL_SAMPLE_NUCLEI - parentCount;
  return {
    step,
    tHalf: Number(tHalf.toFixed(3)),
    elapsedSec: Number(elapsedSec.toFixed(2)),
    parentCount,
    daughterCount,
    theoryParent,
    theoryDaughter,
  };
}

function buildSeededHistory(upToTHalf = 1.0): DecayHistoryPoint[] {
  const steps = Math.max(1, Math.round(upToTHalf / 0.125));
  const pts: DecayHistoryPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * upToTHalf;
    pts.push(makeHistoryPoint(i, t, t * 1.8));
  }
  return pts;
}

interface LessonStoreState {
  activeIndex: number;
  scrub: number;
  selectedIsotope: IsotopePreset;
  ionState: IonChargeState;
  explodeAmount: number;
  decayMode: DecayMode;
  decayCount: number;
  tHalfNormalized: number;
  curveKind: CurveKind;
  simSpeed: number;
  showTangent: boolean;
  isPlayingDecay: boolean;
  videoPlaying: boolean;
  dockHidden: boolean;
  sheetsOpen: boolean;
  pageReaderMode: boolean;
  pageFlipped: boolean;
  reducedMotion: boolean;
  massDefectPresetId: string;
  massDefectZ: number;
  massDefectN: number;
  massDefectNucleusU: number;
  massDefectBindingRatio: number;
  massDefectPulseCount: number;
  comparatorMode: boolean;
  comparatorLeftId: string;
  comparatorRightId: string;
  comparatorExplode: number;
  decayHistory: DecayHistoryPoint[];
  setScrub: (scrub: number) => void;
  goTo: (index: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setIsotope: (iso: IsotopePreset) => void;
  setIonState: (s: IonChargeState) => void;
  setExplodeAmount: (v: number) => void;
  setDecayMode: (m: DecayMode) => void;
  incrementDecayCount: () => void;
  setTHalfNormalized: (v: number) => void;
  setCurveKind: (c: CurveKind) => void;
  setSimSpeed: (s: number) => void;
  toggleTangent: () => void;
  setPlayingDecay: (playing: boolean) => void;
  toggleVideoPlaying: () => void;
  setVideoPlaying: (playing: boolean) => void;
  toggleDock: () => void;
  setSheetsOpen: (open: boolean) => void;
  togglePageReader: () => void;
  setPageReaderMode: (open: boolean) => void;
  togglePageFlip: () => void;
  setPageFlipped: (flipped: boolean) => void;
  setReducedMotion: (rm: boolean) => void;
  selectMassDefectPreset: (preset: {
    id: string;
    Z: number;
    N: number;
    nucleusMassU: number;
  }) => void;
  setMassDefectCustom: (Z: number, N: number, nucleusMassU: number) => void;
  setMassDefectBindingRatio: (v: number) => void;
  triggerMassDefectPulse: () => void;
  setComparatorMode: (active: boolean) => void;
  toggleComparatorMode: () => void;
  setComparatorLeftId: (id: string) => void;
  setComparatorRightId: (id: string) => void;
  swapComparatorIsotopes: () => void;
  setComparatorExplode: (v: number) => void;
  recordDecayHistoryStep: (tHalf: number, dtSec: number) => void;
  recordManualDecayBurst: () => void;
  resetDecayHistory: (startAtZero?: boolean) => void;
}

export const useLessonStore = create<LessonStoreState>((set) => ({
  activeIndex: 0,
  scrub: 0,
  selectedIsotope: ISOTOPE_PRESETS[0],
  ionState: 'neutral',
  explodeAmount: 0,
  decayMode: 'alpha',
  decayCount: 0,
  tHalfNormalized: 1.0,
  curveKind: 'aston',
  simSpeed: 1,
  showTangent: true,
  isPlayingDecay: false,
  videoPlaying: true,
  dockHidden: false,
  sheetsOpen: false,
  pageReaderMode: false,
  pageFlipped: false,
  reducedMotion: false,
  massDefectPresetId: 'c12',
  massDefectZ: 6,
  massDefectN: 6,
  massDefectNucleusU: 11.996709,
  massDefectBindingRatio: 1.0,
  massDefectPulseCount: 0,
  comparatorMode: false,
  comparatorLeftId: 'c12',
  comparatorRightId: 'c14',
  comparatorExplode: 0,
  decayHistory: buildSeededHistory(1.0),

  setScrub: (scrub) => {
    const clamped = Math.max(0, Math.min(1, scrub));
    const idx = Math.min(
      NUCLEAR_CHAPTERS.length - 1,
      Math.round(clamped * (NUCLEAR_CHAPTERS.length - 1))
    );
    set((s) => ({
      scrub: clamped,
      activeIndex: idx,
      pageFlipped: s.activeIndex !== idx ? false : s.pageFlipped,
    }));
  },

  goTo: (index) => {
    const clamped = Math.max(0, Math.min(NUCLEAR_CHAPTERS.length - 1, index));
    const targetChapter = NUCLEAR_CHAPTERS[clamped];
    const updates: Partial<LessonStoreState> = {
      activeIndex: clamped,
      scrub: clamped / (NUCLEAR_CHAPTERS.length - 1),
      isPlayingDecay: false,
      pageFlipped: false,
      comparatorMode: false,
    };

    if (targetChapter.id === 'intro-nucleus') {
      const c12 = ISOTOPE_PRESETS.find((i) => i.id === 'c12');
      if (c12) updates.selectedIsotope = c12;
      updates.curveKind = 'aston';
    } else if (targetChapter.id === 'decay-alpha') {
      const u238 = ISOTOPE_PRESETS.find((i) => i.id === 'u238');
      if (u238) updates.selectedIsotope = u238;
      updates.decayMode = 'alpha';
    } else if (targetChapter.id === 'decay-beta-minus') {
      const th234 = ISOTOPE_PRESETS.find((i) => i.id === 'th234');
      if (th234) updates.selectedIsotope = th234;
      updates.decayMode = 'beta-minus';
    } else if (targetChapter.id === 'decay-beta-plus') {
      const p30 = ISOTOPE_PRESETS.find((i) => i.id === 'p30');
      if (p30) updates.selectedIsotope = p30;
      updates.decayMode = 'beta-plus';
    } else if (targetChapter.id === 'decay-gamma') {
      updates.decayMode = 'gamma';
    } else if (targetChapter.id === 'decay-law' || targetChapter.id === 'half-life') {
      updates.curveKind = 'decay-nd';
    } else if (targetChapter.id === 'activity-dating') {
      updates.curveKind = 'activity';
    } else if (targetChapter.id === 'usual-curves') {
      updates.curveKind = 'ln-nt';
    }

    set(updates);
  },

  nextChapter: () =>
    set((state) => {
      const next = Math.min(NUCLEAR_CHAPTERS.length - 1, state.activeIndex + 1);
      const nextCh = NUCLEAR_CHAPTERS[next];
      const nextCurve: CurveKind =
        nextCh.id === 'activity-dating'
          ? 'activity'
          : nextCh.id === 'intro-nucleus'
          ? 'aston'
          : nextCh.id === 'usual-curves'
          ? 'ln-nt'
          : nextCh.id === 'decay-law' || nextCh.id === 'half-life'
          ? 'decay-nd'
          : state.curveKind;
      return {
        activeIndex: next,
        scrub: next / (NUCLEAR_CHAPTERS.length - 1),
        isPlayingDecay: false,
        curveKind: nextCurve,
        comparatorMode: false,
        pageFlipped: next !== state.activeIndex ? false : state.pageFlipped,
      };
    }),

  prevChapter: () =>
    set((state) => {
      const prev = Math.max(0, state.activeIndex - 1);
      const prevCh = NUCLEAR_CHAPTERS[prev];
      const prevCurve: CurveKind =
        prevCh.id === 'activity-dating'
          ? 'activity'
          : prevCh.id === 'intro-nucleus'
          ? 'aston'
          : prevCh.id === 'usual-curves'
          ? 'ln-nt'
          : prevCh.id === 'decay-law' || prevCh.id === 'half-life'
          ? 'decay-nd'
          : state.curveKind;
      return {
        activeIndex: prev,
        scrub: prev / (NUCLEAR_CHAPTERS.length - 1),
        isPlayingDecay: false,
        curveKind: prevCurve,
        comparatorMode: false,
        pageFlipped: prev !== state.activeIndex ? false : state.pageFlipped,
      };
    }),

  setIsotope: (selectedIsotope) =>
    set({
      selectedIsotope,
      tHalfNormalized: 1.0,
      decayHistory: buildSeededHistory(1.0),
    }),
  setIonState: (ionState) => set({ ionState }),
  setExplodeAmount: (explodeAmount) => set({ explodeAmount }),
  setDecayMode: (decayMode) =>
    set({
      decayMode,
      decayHistory: buildSeededHistory(1.0),
      tHalfNormalized: 1.0,
    }),
  incrementDecayCount: () => set((s) => ({ decayCount: s.decayCount + 1 })),
  setTHalfNormalized: (tHalfNormalized) => set({ tHalfNormalized }),
  setCurveKind: (curveKind) => set({ curveKind }),
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  toggleTangent: () => set((s) => ({ showTangent: !s.showTangent })),
  setPlayingDecay: (isPlayingDecay) => set({ isPlayingDecay }),
  toggleVideoPlaying: () => set((s) => ({ videoPlaying: !s.videoPlaying })),
  setVideoPlaying: (videoPlaying) => set({ videoPlaying }),
  toggleDock: () => set((s) => ({ dockHidden: !s.dockHidden })),
  setSheetsOpen: (sheetsOpen) => set({ sheetsOpen }),
  togglePageReader: () =>
    set((s) => ({
      pageReaderMode: !s.pageReaderMode,
      pageFlipped: s.pageReaderMode ? false : s.pageFlipped,
    })),
  setPageReaderMode: (pageReaderMode) =>
    set((s) => ({
      pageReaderMode,
      pageFlipped: pageReaderMode ? s.pageFlipped : false,
    })),
  togglePageFlip: () => set((s) => ({ pageFlipped: !s.pageFlipped })),
  setPageFlipped: (pageFlipped) => set({ pageFlipped }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  selectMassDefectPreset: (preset) =>
    set({
      massDefectPresetId: preset.id,
      massDefectZ: preset.Z,
      massDefectN: preset.N,
      massDefectNucleusU: preset.nucleusMassU,
    }),
  setMassDefectCustom: (Z, N, nucleusMassU) =>
    set({
      massDefectPresetId: 'custom',
      massDefectZ: Math.max(1, Math.min(118, Math.round(Z))),
      massDefectN: Math.max(0, Math.min(160, Math.round(N))),
      massDefectNucleusU: Math.max(0.5, nucleusMassU),
    }),
  setMassDefectBindingRatio: (v) =>
    set({ massDefectBindingRatio: Math.max(0, Math.min(1, v)) }),
  triggerMassDefectPulse: () =>
    set((s) => ({ massDefectPulseCount: s.massDefectPulseCount + 1 })),
  setComparatorMode: (comparatorMode) =>
    set((s) => ({
      comparatorMode,
      pageReaderMode: comparatorMode ? false : s.pageReaderMode,
    })),
  toggleComparatorMode: () =>
    set((s) => ({
      comparatorMode: !s.comparatorMode,
      pageReaderMode: !s.comparatorMode ? false : s.pageReaderMode,
    })),
  setComparatorLeftId: (comparatorLeftId) => set({ comparatorLeftId }),
  setComparatorRightId: (comparatorRightId) => set({ comparatorRightId }),
  swapComparatorIsotopes: () =>
    set((s) => ({
      comparatorLeftId: s.comparatorRightId,
      comparatorRightId: s.comparatorLeftId,
    })),
  setComparatorExplode: (v) =>
    set({ comparatorExplode: Math.max(0, Math.min(1, v)) }),
  recordDecayHistoryStep: (tHalf, dtSec) =>
    set((s) => {
      const prev = s.decayHistory;
      const last = prev[prev.length - 1];
      if (!last || tHalf < last.tHalf - 0.5) {
        return {
          decayHistory: [makeHistoryPoint(0, 0, 0, INITIAL_SAMPLE_NUCLEI)],
        };
      }
      const nextPt = makeHistoryPoint(
        last.step + 1,
        tHalf,
        last.elapsedSec + dtSec
      );
      const trimmed = prev.length >= 120 ? prev.slice(prev.length - 119) : prev;
      return {
        decayHistory: [...trimmed, nextPt],
      };
    }),
  recordManualDecayBurst: () =>
    set((s) => {
      const prev = s.decayHistory;
      const last = prev[prev.length - 1] ?? makeHistoryPoint(0, 0, 0, INITIAL_SAMPLE_NUCLEI);
      // If sample already depleted, restart cleanly at 100 and emit first burst
      const baseParent = last.parentCount <= 2 ? INITIAL_SAMPLE_NUCLEI : last.parentCount;
      const resetRun = last.parentCount <= 2;
      const decayedNow = Math.max(2, Math.round(baseParent * 0.14));
      const nextParent = Math.max(0, baseParent - decayedNow);
      const nextTHalf =
        nextParent > 0
          ? Math.min(4, -Math.log2(nextParent / INITIAL_SAMPLE_NUCLEI))
          : 4;
      const nextElapsed = resetRun ? 0.4 : last.elapsedSec + 0.4;
      const nextPt = makeHistoryPoint(
        resetRun ? 1 : last.step + 1,
        nextTHalf,
        nextElapsed,
        nextParent
      );
      const baseHistory = resetRun
        ? [makeHistoryPoint(0, 0, 0, INITIAL_SAMPLE_NUCLEI)]
        : prev.length >= 120
        ? prev.slice(prev.length - 119)
        : prev;
      return {
        tHalfNormalized: Number(nextTHalf.toFixed(3)),
        decayHistory: [...baseHistory, nextPt],
      };
    }),
  resetDecayHistory: (startAtZero = true) =>
    set({
      isPlayingDecay: false,
      tHalfNormalized: startAtZero ? 0 : 1.0,
      decayHistory: startAtZero
        ? [makeHistoryPoint(0, 0, 0, INITIAL_SAMPLE_NUCLEI)]
        : buildSeededHistory(1.0),
    }),
}));

export type ChapterId =
  | 'intro-nucleus'
  | 'decay-alpha'
  | 'decay-beta-minus'
  | 'decay-beta-plus'
  | 'decay-gamma'
  | 'decay-law'
  | 'half-life'
  | 'activity-dating'
  | 'segre-diagram'
  | 'usual-curves'
  | 'mass-defect';

export type DecayMode = 'alpha' | 'beta-minus' | 'beta-plus' | 'gamma';

export type ChapterVisualKind =
  | 'nucleus-intro'
  | 'emission-alpha'
  | 'emission-beta-minus'
  | 'emission-beta-plus'
  | 'emission-gamma'
  | 'curve-decay'
  | 'curve-halflife'
  | 'curve-activity'
  | 'curve-usual'
  | 'segre-scatter'
  | 'mass-defect';

export type IonChargeState = 'neutral' | 'anion' | 'cation';

export type CurveKind =
  | 'decay-nd'
  | 'activity'
  | 'log-linear'
  | 'ln-nt'
  | 'ln-neg'
  | 'aston';

export interface IsotopePreset {
  id: string;
  symbol: string;
  name: string;
  A: number;
  Z: number;
  N: number;
  group: string;
  stable: boolean;
  defaultDecay: DecayMode;
  daughterSymbol?: string;
  daughterA?: number;
  daughterZ?: number;
  halfLifeLabel: string;
  halfLifeSeconds: number;
}

export interface MassDefectPreset {
  id: string;
  symbol: string;
  name: string;
  A: number;
  Z: number;
  N: number;
  nucleusMassU: number;
  note: string;
}

export interface ComparatorIsotopePreset extends MassDefectPreset {
  stable: boolean;
  group: string;
}

export interface FormulaCard {
  id: string;
  title: string;
  latex: string;
  caption: string;
  accent: 'cyan' | 'amber' | 'rose' | 'emerald' | 'magenta' | 'white';
}

export interface LessonHighlight {
  label: string;
  detail: string;
  latex?: string;
}

export interface HologramSpec {
  title: string;
  subtitle: string;
  formulaLines: string[];
  accentHex: string;
  position: [number, number, number];
  rotationY: number;
}

export interface LessonChapter {
  id: ChapterId;
  index: number;
  navLabel: string;
  title: string;
  subtitle: string;
  sheetRefs: string;
  summary: string;
  keyDefinition: string;
  visualKind: ChapterVisualKind;
  fxColorHex: string;
  soddyDelta?: { dA: number; dZ: number; particle: string };
  videoTitle: string;
  videoCaption: string;
  formulas: FormulaCard[];
  highlights: LessonHighlight[];
  holograms: HologramSpec[];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  fov?: number;
}

export interface ReferenceSheet {
  sheetNumber: number;
  title: string;
  topics: string;
  imagePath: string;
  upright?: boolean;
}

export interface DecayHistoryPoint {
  step: number;
  tHalf: number;
  elapsedSec: number;
  parentCount: number;
  daughterCount: number;
  theoryParent: number;
  theoryDaughter: number;
}

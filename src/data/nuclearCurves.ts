import { CurveKind } from '../types/lesson';

export interface CurveDescriptor {
  id: CurveKind;
  label: string;
  shortLabel: string;
  formula: string;
  accentHex: string;
  description: string;
}

export const CURVE_DESCRIPTORS: CurveDescriptor[] = [
  {
    id: 'decay-nd',
    label: 'N(t) & Noyaux désintégrés N_D',
    shortLabel: 'N(t) & N_D',
    formula: 'N(t) = N₀·e⁻λᵗ  |  N_D(t) = N₀(1 − e⁻λᵗ)',
    accentHex: '#00e5ff',
    description:
      'Croisement exact à t = t₁/₂ où la moitié des noyaux initiaux se sont désintégrés.',
  },
  {
    id: 'activity',
    label: 'Activité a(t) & Masse m(t)',
    shortLabel: 'a(t) & m(t)',
    formula: 'a(t) = a₀·e⁻λᵗ  (Bq)  |  m(t) = m₀·e⁻λᵗ',
    accentHex: '#ff5a3c',
    description:
      'Nombre de désintégrations par seconde (Becquerels) utilisé pour la datation.',
  },
  {
    id: 'log-linear',
    label: 'Droite Logarithmique ln(N₀/N)',
    shortLabel: 'ln(N₀/N)',
    formula: 'ln(N₀ / N(t)) = λ · t   (pente λ = ln(2) / t₁/₂)',
    accentHex: '#10b981',
    description:
      'Linéarisation classique au Baccalauréat permettant de mesurer graphiquement λ.',
  },
  {
    id: 'ln-nt',
    label: 'Courbe Usuelle ln N(t) (Fiche 11)',
    shortLabel: 'ln N(t)',
    formula: 'ln N(t) = −λ·t + ln N₀  (coupe à t = ln(N₀)/λ)',
    accentHex: '#f59e0b',
    description:
      'Droite décroissante d’ordonnée à l’origine ln(N₀) et de coefficient directeur −λ.',
  },
  {
    id: 'ln-neg',
    label: 'Courbe Usuelle ln(N/N₀) (Fiche 11)',
    shortLabel: 'ln(N/N₀)',
    formula: 'ln(N(t) / N₀) = −λ · t   (passe par −ln2 à t₁/₂)',
    accentHex: '#c084fc',
    description:
      'Droite passant par l’origine dans le demi-plan négatif avec valeur −1 à t = τ.',
  },
  {
    id: 'aston',
    label: "Courbe d'Aston (Énergie E_l / A)",
    shortLabel: 'Aston E_l/A',
    formula: 'E_l / A  en MeV/nucléon  (Sommet : ⁵⁶Fe ≈ 8,79 MeV)',
    accentHex: '#ffb703',
    description:
      'Zones de fusion (noyaux légers A < 20), stabilité maximale (Fe) et fission (A > 190).',
  },
];

// Real experimental binding energy per nucleon (MeV/nucleon)
const ASTON_ANCHORS: Array<{ A: number; elPerA: number; label?: string }> = [
  { A: 2, elPerA: 1.11, label: '²H' },
  { A: 3, elPerA: 2.83 },
  { A: 4, elPerA: 7.07, label: '⁴He' },
  { A: 6, elPerA: 5.33 },
  { A: 12, elPerA: 7.68, label: '¹²C' },
  { A: 16, elPerA: 7.98, label: '¹⁶O' },
  { A: 28, elPerA: 8.45 },
  { A: 40, elPerA: 8.55 },
  { A: 56, elPerA: 8.79, label: '⁵⁶Fe' },
  { A: 84, elPerA: 8.72 },
  { A: 120, elPerA: 8.5 },
  { A: 160, elPerA: 8.19 },
  { A: 208, elPerA: 7.87, label: '²⁰⁸Pb' },
  { A: 238, elPerA: 7.57, label: '²³⁸U' },
];

export const ASTON_LANDMARKS = ASTON_ANCHORS.filter((a) => Boolean(a.label)) as Array<{
  A: number;
  elPerA: number;
  label: string;
}>;

/**
 * Smooth piecewise interpolation of binding energy per nucleon E_l / A (MeV/nucleon)
 * across mass numbers A ∈ [2, 238], faithfully reproducing the ⁴He peak and ⁵⁶Fe summit.
 */
export function evaluateAstonElPerA(massNumberA: number): number {
  const a = Math.max(2, Math.min(238, massNumberA));
  for (let i = 0; i < ASTON_ANCHORS.length - 1; i++) {
    const p0 = ASTON_ANCHORS[i];
    const p1 = ASTON_ANCHORS[i + 1];
    if (a >= p0.A && a <= p1.A) {
      const t = (a - p0.A) / (p1.A - p0.A);
      // Smoothstep blending preserves the sharp 4He peak without overshoot
      const smooth = t * t * (3 - 2 * t);
      return p0.elPerA + (p1.elPerA - p0.elPerA) * smooth;
    }
  }
  return 7.57;
}

export function getAstonZoneInfo(massNumberA: number): {
  zone: 'fusion' | 'stable' | 'fission';
  label: string;
  colorHex: string;
} {
  if (massNumberA < 24) {
    return {
      zone: 'fusion',
      label: 'Zone de Fusion (noyaux légers)',
      colorHex: '#ff4dff',
    };
  }
  if (massNumberA <= 185) {
    return {
      zone: 'stable',
      label: 'Vallée de Stabilité (pic ⁵⁶Fe)',
      colorHex: '#10b981',
    };
  }
  return {
    zone: 'fission',
    label: 'Zone de Fission (noyaux lourds)',
    colorHex: '#ffb703',
  };
}

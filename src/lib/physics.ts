// Fonctions pures de calcul en physique nucléaire (programme 2BAC)

/** Constante de désintégration λ = ln(2) / t₁/₂ */
export function lambdaFromHalfLife(halfLife: number): number {
  if (halfLife <= 0 || !Number.isFinite(halfLife)) return 0;
  return Math.LN2 / halfLife;
}

/** Constante de temps τ = 1 / λ = t₁/₂ / ln(2) */
export function tauFromLambda(lambda: number): number {
  if (lambda <= 0) return Infinity;
  return 1 / lambda;
}

/** Loi de décroissance radioactive : N(t) = N₀ · e^(−λt) */
export function remainingNuclei(n0: number, lambda: number, t: number): number {
  return n0 * Math.exp(-lambda * Math.max(0, t));
}

/** Nombre de noyaux désintégrés : N_D(t) = N₀ · (1 − e^(−λt)) */
export function decayedNuclei(n0: number, lambda: number, t: number): number {
  return n0 - remainingNuclei(n0, lambda, t);
}

/** Activité radioactive (en Bq) : a(t) = λ · N(t) = a₀ · e^(−λt) */
export function activityAtTime(a0: number, lambda: number, t: number): number {
  return a0 * Math.exp(-lambda * Math.max(0, t));
}

/** Datation par radioactivité : t = [ln(a₀ / a(t)) / ln(2)] · t₁/₂ */
export function ageFromActivityRatio(
  a0: number,
  at: number,
  halfLife: number
): number {
  if (at <= 0 || a0 <= 0 || at > a0 || halfLife <= 0) return 0;
  return (Math.log(a0 / at) / Math.LN2) * halfLife;
}

export const MASS_PROTON_U = 1.007276;
export const MASS_NEUTRON_U = 1.008665;
export const AMU_TO_KG = 1.660539e-27;
export const AMU_TO_MEV = 931.5;
export const MEV_TO_JOULE = 1.6021766e-13;

/** Défaut de masse Δm = [Z·m_p + (A−Z)·m_n] − m_noyau (en u) */
export function massDefectU(
  Z: number,
  A: number,
  nucleusMassU: number,
  mpU = MASS_PROTON_U,
  mnU = MASS_NEUTRON_U
): number {
  const N = Math.max(0, A - Z);
  return Z * mpU + N * mnU - nucleusMassU;
}

/** Énergie de liaison E_l = Δm · c² (en MeV, avec 1 u·c² = 931,5 MeV) */
export function bindingEnergyMeV(deltaMassU: number): number {
  return deltaMassU * AMU_TO_MEV;
}

export interface MassDefectBreakdown {
  Z: number;
  N: number;
  A: number;
  protonsMassU: number;
  neutronsMassU: number;
  nucleonsMassU: number;
  nucleusMassU: number;
  deltaMassU: number;
  deltaMassKg: number;
  bindingEnergyMeV: number;
  bindingEnergyJoules: number;
  energyPerNucleonMeV: number;
  isValid: boolean;
}

export function computeMassDefectBreakdown(
  Z: number,
  N: number,
  nucleusMassU: number
): MassDefectBreakdown {
  const safeZ = Math.max(1, Math.round(Z));
  const safeN = Math.max(0, Math.round(N));
  const A = safeZ + safeN;
  const protonsMassU = safeZ * MASS_PROTON_U;
  const neutronsMassU = safeN * MASS_NEUTRON_U;
  const nucleonsMassU = protonsMassU + neutronsMassU;
  const safeNucleusU = Math.max(0.1, nucleusMassU);
  const deltaMassU = nucleonsMassU - safeNucleusU;
  const deltaMassKg = deltaMassU * AMU_TO_KG;
  const elMeV = deltaMassU * AMU_TO_MEV;
  const bindingEnergyJoules = elMeV * MEV_TO_JOULE;
  const energyPerNucleonMeV = A > 0 ? elMeV / A : 0;

  return {
    Z: safeZ,
    N: safeN,
    A,
    protonsMassU,
    neutronsMassU,
    nucleonsMassU,
    nucleusMassU: safeNucleusU,
    deltaMassU,
    deltaMassKg,
    bindingEnergyMeV: elMeV,
    bindingEnergyJoules,
    energyPerNucleonMeV,
    isValid: deltaMassU > 0 && safeNucleusU > safeZ * 0.5,
  };
}


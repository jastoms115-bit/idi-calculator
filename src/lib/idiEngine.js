/**
 * IDI CALCULATION ENGINE
 * Implements the scoring methodology from the IDI Framework Spec.
 * Pure functions only — no UI, no Firestore calls. Import this from
 * wherever a score needs computing (assessment save, trend recompute,
 * an admin "what-if" tool, etc.) so the math only lives in one place.
 *
 * Bump ENGINE_VERSION whenever scoring logic changes — assessments store
 * the version that produced them, so historical scores are never silently
 * reinterpreted when the methodology is recalibrated later.
 */

export const ENGINE_VERSION = '1.0.0'

export const DEFAULT_WEIGHTS = {
  vibration: 35,
  current: 25,
  temperature: 15,
  pressure: 10,
  flow: 10,
  runHours: 5
}

export const CONDITION_THRESHOLDS = {
  healthy: 85, // score >= 85
  watch: 70, // 70 <= score < 85
  caution: 40 // 40 <= score < 70   |   below 40 = critical
}

// ---------------------------------------------------------------
// Basic statistics
// ---------------------------------------------------------------

export function mean(values) {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function stdDev(values) {
  if (values.length < 2) return null
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** Coefficient of variation — used to classify a pump as constant- vs variable-duty (Spec 3.1.1). */
export function coefficientOfVariation(values) {
  const m = mean(values)
  const sd = stdDev(values)
  if (m === null || sd === null || m === 0) return null
  return sd / m
}

// ---------------------------------------------------------------
// Shewhart control-chart scoring (Spec 3.1.1) — the shared engine
// reused by current drift, temperature, and pressure/flow.
// ---------------------------------------------------------------

/**
 * Bidirectional Shewhart score from an absolute Z value.
 * |Z|<=1 -> 100 | 1-2 -> linear 100->70 | 2-3 -> linear 70->40 | >3 -> below 40, floors near 0 by Z=5
 */
export function shewhartScore(absZ) {
  const z = Math.abs(absZ)
  if (z <= 1) return 100
  if (z <= 2) return lerp(z, 1, 2, 100, 70)
  if (z <= 3) return lerp(z, 2, 3, 70, 40)
  if (z <= 5) return lerp(z, 3, 5, 40, 0)
  return 0
}

/**
 * One-sided decline scoring for pressure/flow (Spec 3.4) — only a drop
 * below baseline reduces the score. A rise is never penalized here; the
 * caller should raise a separate "check valve position / downstream
 * blockage" flag when zAboveBaseline exceeds ~2.
 */
export function oneSidedDeclineScore(value, baselineMean, baselineStd) {
  if (baselineStd === null || baselineStd === 0) {
    return { score: null, flag: 'insufficient_baseline' }
  }
  const zDecline = (baselineMean - value) / baselineStd // positive = below baseline
  if (zDecline <= 0) {
    const zAbove = Math.abs(zDecline)
    return {
      score: 100,
      flag: zAbove > 2 ? 'above_baseline_check_system' : null
    }
  }
  return { score: shewhartScore(zDecline), flag: null }
}

function lerp(x, x0, x1, y0, y1) {
  const t = (x - x0) / (x1 - x0)
  return y0 + t * (y1 - y0)
}

// ---------------------------------------------------------------
// Current Health sub-index (Spec 3.1)
// ---------------------------------------------------------------

/**
 * Phase unbalance % per NEMA MG-1: max deviation of any phase from the
 * 3-phase average, divided by the average.
 */
export function phaseUnbalancePercent([r, y, b]) {
  const avg = (r + y + b) / 3
  if (avg === 0) return null
  const maxDeviation = Math.max(Math.abs(r - avg), Math.abs(y - avg), Math.abs(b - avg))
  return (maxDeviation / avg) * 100
}

/** 0-5% -> 100 | 5-10% -> linear 100->40 | >10% -> below 40, floors near 0 by ~20% */
export function phaseUnbalanceScore(percent) {
  if (percent === null) return null
  if (percent <= 5) return 100
  if (percent <= 10) return lerp(percent, 5, 10, 100, 40)
  if (percent <= 20) return lerp(percent, 10, 20, 40, 0)
  return 0
}

/**
 * Classifies baseline load behavior (Spec 3.1.1). CV < 10% -> constant-duty
 * (unconditioned baseline). CV >= 10% -> variable-duty; caller must have
 * load data to bin by, or the sub-index should be marked low-confidence.
 */
export function classifyLoadVariability(baselineCurrentReadings) {
  const cv = coefficientOfVariation(baselineCurrentReadings)
  if (cv === null) return 'unknown'
  return cv < 0.1 ? 'constant-duty' : 'variable-duty'
}

/**
 * Full current-health sub-index score. Combines phase unbalance with
 * baseline drift; returns the worse (lower) of the two, plus confidence
 * flag when load is variable but unbinned.
 */
export function currentHealthScore({
  phaseCurrents, // [R, Y, B] for this reading
  baselineMean, // pump's own healthy-baseline mean current at comparable load
  baselineStd,
  loadDataAvailable = true,
  loadVariability = 'constant-duty', // 'constant-duty' | 'variable-duty' | 'unknown'
  currentValue // scalar current reading used for drift comparison
}) {
  const unbalancePct = phaseCurrents ? phaseUnbalancePercent(phaseCurrents) : null
  const unbalanceScore = unbalancePct !== null ? phaseUnbalanceScore(unbalancePct) : null

  let driftScore = null
  if (currentValue != null && baselineMean != null && baselineStd != null) {
    const z = Math.abs((currentValue - baselineMean) / baselineStd)
    driftScore = shewhartScore(z)
  }

  const lowConfidence = loadVariability === 'variable-duty' && !loadDataAvailable

  const candidates = [unbalanceScore, driftScore].filter((s) => s !== null)
  if (!candidates.length) return { score: null, unbalancePct, lowConfidence }

  return {
    score: Math.min(...candidates), // worse-of-two-criteria, per improvement plan principle
    unbalancePct,
    unbalanceScore,
    driftScore,
    lowConfidence
  }
}

// ---------------------------------------------------------------
// Run-hours since overhaul (Spec 3.5) — provisional linear mapping,
// flagged as such until a better one is confirmed (open item in spec).
// ---------------------------------------------------------------

export function runHoursScore(hoursSinceOverhaul, overhaulIntervalHours = 8000) {
  if (hoursSinceOverhaul == null) return null
  const pctElapsed = hoursSinceOverhaul / overhaulIntervalHours
  const score = Math.max(0, 100 - pctElapsed * 100)
  return {
    score,
    pctElapsed: pctElapsed * 100,
    overdue: pctElapsed > 1,
    provisional: true // mapping not yet validated against ANRML failure data
  }
}

// ---------------------------------------------------------------
// Composite score (Spec 2) — renormalized weighted average over
// whichever sub-indices actually have data for this asset.
// ---------------------------------------------------------------

/**
 * @param subIndexScores - e.g. { vibration: 82, current: 90, temperature: null, pressure: 75, flow: undefined, runHours: 60 }
 *   Only numeric values count as "available"; null/undefined are excluded and their weight redistributed.
 * @param weights - defaults to DEFAULT_WEIGHTS
 */
export function computeCompositeIDI(subIndexScores, weights = DEFAULT_WEIGHTS) {
  const available = Object.entries(subIndexScores).filter(
    ([, score]) => typeof score === 'number' && !Number.isNaN(score)
  )

  if (!available.length) {
    return {
      score: null,
      category: 'unknown',
      completeness: { available: 0, total: Object.keys(weights).length },
      breakdown: []
    }
  }

  const totalAvailableWeight = available.reduce((sum, [key]) => sum + (weights[key] || 0), 0)

  const breakdown = available.map(([key, score]) => {
    const rawWeight = weights[key] || 0
    const normalizedWeight = totalAvailableWeight ? (rawWeight / totalAvailableWeight) * 100 : 0
    return { key, score, rawWeight, normalizedWeight }
  })

  const weightedSum = breakdown.reduce((sum, b) => sum + b.score * (b.normalizedWeight / 100), 0)
  const roundedScore = Math.round(weightedSum * 10) / 10

  return {
    score: roundedScore,
    category: conditionCategory(roundedScore),
    completeness: {
      available: available.length,
      total: Object.keys(weights).length
    },
    breakdown,
    engineVersion: ENGINE_VERSION
  }
}

export function conditionCategory(score) {
  if (score == null) return 'unknown'
  if (score >= CONDITION_THRESHOLDS.healthy) return 'healthy'
  if (score >= CONDITION_THRESHOLDS.watch) return 'watch'
  if (score >= CONDITION_THRESHOLDS.caution) return 'caution'
  return 'critical'
}

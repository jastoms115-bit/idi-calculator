/**
 * Bridges the assessment form's raw reading inputs and the asset's active
 * baseline into the sub-index scores idiEngine.computeCompositeIDI expects.
 * All the actual math stays in idiEngine.js — this only decides, per
 * parameter, whether there's enough data (a reading AND a baseline) to
 * score it at all, and leaves it out otherwise so renormalization can do
 * its job honestly.
 */
import {
  shewhartScore,
  oneSidedDeclineScore,
  currentHealthScore,
  runHoursScore,
  computeCompositeIDI,
  DEFAULT_WEIGHTS,
  mean
} from './idiEngine'

export function scoreAssessment({ readings, baseline, weights = DEFAULT_WEIGHTS }) {
  const subScores = {}
  const flags = []

  // Vibration — Shewhart drift against baseline mean/std.
  if (readings.vibration != null && baseline?.vibration?.mean != null && baseline?.vibration?.std) {
    const z = (readings.vibration - baseline.vibration.mean) / baseline.vibration.std
    subScores.vibration = shewhartScore(z)
  }

  // Current — phase unbalance + baseline drift, worse-of-two-criteria.
  const hasPhaseCurrents = readings.current_r != null && readings.current_y != null && readings.current_b != null
  if (hasPhaseCurrents || readings.current != null) {
    const phaseCurrents = hasPhaseCurrents ? [readings.current_r, readings.current_y, readings.current_b] : null
    const currentValue =
      readings.current ?? (hasPhaseCurrents ? mean([readings.current_r, readings.current_y, readings.current_b]) : null)
    const result = currentHealthScore({
      phaseCurrents,
      baselineMean: baseline?.current?.mean ?? null,
      baselineStd: baseline?.current?.std ?? null,
      currentValue
    })
    if (result.score != null) subScores.current = result.score
    if (result.lowConfidence) flags.push('current_low_confidence_variable_duty')
  }

  // Temperature — Shewhart drift.
  if (readings.temperature != null && baseline?.temperature?.mean != null && baseline?.temperature?.std) {
    const z = (readings.temperature - baseline.temperature.mean) / baseline.temperature.std
    subScores.temperature = shewhartScore(z)
  }

  // Pressure — one-sided decline only; a rise flags, never penalizes.
  if (readings.pressure != null && baseline?.pressure?.mean != null) {
    const { score, flag } = oneSidedDeclineScore(readings.pressure, baseline.pressure.mean, baseline.pressure.std)
    if (score != null) subScores.pressure = score
    if (flag) flags.push(`pressure_${flag}`)
  }

  // Flow — one-sided decline only.
  if (readings.flow != null && baseline?.flow?.mean != null) {
    const { score, flag } = oneSidedDeclineScore(readings.flow, baseline.flow.mean, baseline.flow.std)
    if (score != null) subScores.flow = score
    if (flag) flags.push(`flow_${flag}`)
  }

  // Run hours since overhaul — provisional linear mapping (Spec 3.5).
  let runHoursResult = null
  if (readings.hours_since_overhaul != null) {
    runHoursResult = runHoursScore(readings.hours_since_overhaul, readings.overhaul_interval_hours || 8000)
    if (runHoursResult?.score != null) subScores.runHours = runHoursResult.score
    if (runHoursResult?.overdue) flags.push('overhaul_overdue')
  }

  const composite = computeCompositeIDI(subScores, weights)

  return { subScores, composite, flags, runHoursResult }
}

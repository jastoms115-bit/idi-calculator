import { describe, it, expect } from 'vitest'
import {
  shewhartScore,
  phaseUnbalancePercent,
  phaseUnbalanceScore,
  oneSidedDeclineScore,
  computeCompositeIDI,
  conditionCategory,
  runHoursScore,
  coefficientOfVariation,
  classifyLoadVariability
} from '../idiEngine'

describe('shewhartScore', () => {
  it('scores 100 within 1 sigma', () => {
    expect(shewhartScore(0)).toBe(100)
    expect(shewhartScore(1)).toBe(100)
  })
  it('decays linearly 100->70 between 1 and 2 sigma', () => {
    expect(shewhartScore(1.5)).toBe(85)
  })
  it('decays linearly 70->40 between 2 and 3 sigma', () => {
    expect(shewhartScore(2.5)).toBe(55)
  })
  it('floors near 0 by 5 sigma', () => {
    expect(shewhartScore(5)).toBe(0)
    expect(shewhartScore(10)).toBe(0)
  })
})

describe('phase unbalance (NEMA MG-1)', () => {
  it('computes % deviation correctly', () => {
    // avg = 100, max deviation = 6 -> 6%
    expect(phaseUnbalancePercent([106, 100, 94])).toBeCloseTo(6, 5)
  })
  it('scores 100 under 5%', () => {
    expect(phaseUnbalanceScore(3)).toBe(100)
  })
  it('decays 100->40 between 5-10%', () => {
    expect(phaseUnbalanceScore(7.5)).toBe(70)
  })
  it('drops toward 0 above 10%', () => {
    expect(phaseUnbalanceScore(15)).toBe(20)
    expect(phaseUnbalanceScore(25)).toBe(0)
  })
})

describe('oneSidedDeclineScore (pressure/flow, Spec 3.4)', () => {
  it('does not penalize a reading above baseline', () => {
    const result = oneSidedDeclineScore(110, 100, 5) // above baseline
    expect(result.score).toBe(100)
  })
  it('flags a reading far above baseline instead of penalizing it', () => {
    const result = oneSidedDeclineScore(115, 100, 5) // Z = -3
    expect(result.score).toBe(100)
    expect(result.flag).toBe('above_baseline_check_system')
  })
  it('penalizes decline below baseline via Shewhart bands', () => {
    const result = oneSidedDeclineScore(90, 100, 5) // Z = 2 (decline)
    expect(result.score).toBe(70)
    expect(result.flag).toBeNull()
  })
})

describe('load variability classification (Spec 3.1.1)', () => {
  it('classifies low-variance readings as constant-duty', () => {
    expect(classifyLoadVariability([100, 101, 99, 100, 102])).toBe('constant-duty')
  })
  it('classifies high-variance readings as variable-duty', () => {
    expect(classifyLoadVariability([100, 60, 120, 50, 130])).toBe('variable-duty')
  })
})

describe('runHoursScore', () => {
  it('scores 100 at zero hours', () => {
    expect(runHoursScore(0, 8000).score).toBe(100)
  })
  it('scores 50 at half the interval', () => {
    expect(runHoursScore(4000, 8000).score).toBe(50)
  })
  it('floors at 0 and flags overdue past the interval', () => {
    const result = runHoursScore(9000, 8000)
    expect(result.score).toBe(0)
    expect(result.overdue).toBe(true)
  })
})

describe('computeCompositeIDI — renormalization (Spec 2.1 example)', () => {
  it('renormalizes weights when only vibration, current, temperature are available', () => {
    // Spec example: 35+25+15=75 of pool -> Vibration 46.7%, Current 33.3%, Temperature 20%
    const result = computeCompositeIDI({ vibration: 100, current: 100, temperature: 100 })
    const vib = result.breakdown.find((b) => b.key === 'vibration')
    const cur = result.breakdown.find((b) => b.key === 'current')
    const temp = result.breakdown.find((b) => b.key === 'temperature')
    expect(vib.normalizedWeight).toBeCloseTo(46.7, 1)
    expect(cur.normalizedWeight).toBeCloseTo(33.3, 1)
    expect(temp.normalizedWeight).toBeCloseTo(20, 1)
    expect(result.completeness).toEqual({ available: 3, total: 6 })
  })

  it('produces a full-confidence score with all six sub-indices', () => {
    const result = computeCompositeIDI({
      vibration: 90,
      current: 85,
      temperature: 95,
      pressure: 80,
      flow: 80,
      runHours: 100
    })
    expect(result.score).toBeGreaterThan(85)
    expect(result.category).toBe('healthy')
    expect(result.completeness).toEqual({ available: 6, total: 6 })
  })

  it('returns unknown category when no sub-indices are available', () => {
    const result = computeCompositeIDI({})
    expect(result.score).toBeNull()
    expect(result.category).toBe('unknown')
  })
})

describe('conditionCategory bands', () => {
  it('maps scores to the correct band', () => {
    expect(conditionCategory(95)).toBe('healthy')
    expect(conditionCategory(75)).toBe('watch')
    expect(conditionCategory(50)).toBe('caution')
    expect(conditionCategory(20)).toBe('critical')
  })
})

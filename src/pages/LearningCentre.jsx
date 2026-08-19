import { useState } from 'react'
import { CONDITION_THRESHOLDS, DEFAULT_WEIGHTS } from '../lib/idiEngine'
import Nav from '../components/Nav'

const WEIGHT_LABELS = {
  vibration: 'Vibration',
  current: 'Current (motor)',
  temperature: 'Temperature',
  pressure: 'Pressure',
  flow: 'Flow',
  runHours: 'Run hours since overhaul'
}

const SECTIONS = [
  {
    id: 'scoring',
    title: 'How the score is calculated',
    intro:
      "Each reading is scored per parameter against the asset's own baseline, then combined into one composite Ijimari Degradation Index (IDI) score from 0–100."
  },
  {
    id: 'readings',
    title: 'Taking a good reading',
    intro: 'Consistent technique matters more than precision instruments — take readings the same way, at the same points, every time.'
  },
  {
    id: 'baselines',
    title: 'Understanding baselines',
    intro: 'A baseline is the "known healthy" fingerprint every later reading is compared against.'
  },
  {
    id: 'roles',
    title: 'Roles & permissions',
    intro: 'Four roles control who can do what. Assigned by an administrator.'
  },
  {
    id: 'offline',
    title: 'Working offline',
    intro: 'The app is built to work in the field with no signal.'
  },
  {
    id: 'glossary',
    title: 'Glossary',
    intro: 'Terms used throughout the app.'
  }
]

export default function LearningCentre() {
  const [open, setOpen] = useState('scoring')

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Learning Centre
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Reference Guide</h1>

        {SECTIONS.map((section) => (
          <div className="panel accordion" key={section.id} style={{ marginBottom: 12 }}>
            <button type="button" className="accordion-header" onClick={() => setOpen(open === section.id ? null : section.id)}>
              <span>{section.title}</span>
              <span>{open === section.id ? '\u2212' : '+'}</span>
            </button>
            {open === section.id && (
              <div className="accordion-body">
                <p style={{ marginBottom: 12 }}>{section.intro}</p>
                {section.id === 'scoring' && <ScoringDetail />}
                {section.id === 'readings' && <ReadingsDetail />}
                {section.id === 'baselines' && <BaselinesDetail />}
                {section.id === 'roles' && <RolesDetail />}
                {section.id === 'offline' && <OfflineDetail />}
                {section.id === 'glossary' && <GlossaryDetail />}
              </div>
            )}
          </div>
        ))}
      </div>
      <Nav />
    </>
  )
}

function ScoringDetail() {
  return (
    <>
      <div className="breakdown-list" style={{ marginBottom: 12 }}>
        {Object.entries(DEFAULT_WEIGHTS).map(([key, weight]) => (
          <div className="breakdown-row" key={key}>
            <span>{WEIGHT_LABELS[key] || key}</span>
            <span className="readout">{weight}%</span>
          </div>
        ))}
      </div>
      <p style={{ marginBottom: 8 }}>
        If a sub-index has no data yet (no reading, no baseline), it's left out entirely and the remaining weights are scaled
        up to fill 100% — a reading with only vibration and current still produces a valid, honestly-labeled score.
      </p>
      <div className="breakdown-list">
        <div className="breakdown-row">
          <span>Healthy</span>
          <span className="readout">≥ {CONDITION_THRESHOLDS.healthy}</span>
        </div>
        <div className="breakdown-row">
          <span>Watch</span>
          <span className="readout">
            {CONDITION_THRESHOLDS.watch}–{CONDITION_THRESHOLDS.healthy - 1}
          </span>
        </div>
        <div className="breakdown-row">
          <span>Caution</span>
          <span className="readout">
            {CONDITION_THRESHOLDS.caution}–{CONDITION_THRESHOLDS.watch - 1}
          </span>
        </div>
        <div className="breakdown-row">
          <span>Critical</span>
          <span className="readout">&lt; {CONDITION_THRESHOLDS.caution}</span>
        </div>
      </div>
    </>
  )
}

function ReadingsDetail() {
  return (
    <ul className="ref-list">
      <li>
        <strong>Vibration:</strong> same measurement point and orientation every time — a magnetic mount or permanent marked
        point removes most operator variance.
      </li>
      <li>
        <strong>Current:</strong> record all three phases (R/Y/B) where possible — phase unbalance alone can flag a
        developing fault before drift does.
      </li>
      <li>
        <strong>Temperature:</strong> let the machine reach normal running temperature before reading; a cold-start reading
        will look like a false improvement.
      </li>
      <li>
        <strong>Pressure &amp; flow:</strong> only a drop below baseline counts against the score — a rise instead raises a
        "check system" flag for investigation, not a penalty.
      </li>
      <li>
        <strong>Run hours:</strong> hours since the last overhaul, not lifetime hours — reset this after any overhaul is
        logged.
      </li>
    </ul>
  )
}

function BaselinesDetail() {
  return (
    <>
      <p style={{ marginBottom: 8 }}>
        Set a baseline from a run of readings taken while the equipment is known to be healthy — right after commissioning
        or an overhaul is ideal. Every later reading is scored by how far it drifts from that baseline, not against a
        generic spec.
      </p>
      <p>
        Baselines are versioned and never edited in place. Re-baselining (after an overhaul, a duty-point change, etc.)
        creates a new version; the previous one stays in history so nothing is lost. Only engineers and above can set a
        baseline.
      </p>
    </>
  )
}

function RolesDetail() {
  return (
    <div className="breakdown-list">
      <div className="breakdown-row">
        <span>Technician</span>
        <span>Log readings, view everything</span>
      </div>
      <div className="breakdown-row">
        <span>Engineer</span>
        <span>+ manage assets, baselines, maintenance</span>
      </div>
      <div className="breakdown-row">
        <span>Supervisor</span>
        <span>+ view the audit trail</span>
      </div>
      <div className="breakdown-row">
        <span>Administrator</span>
        <span>+ archive/delete, manage roles, scoring config</span>
      </div>
    </div>
  )
}

function OfflineDetail() {
  return (
    <>
      <p style={{ marginBottom: 8 }}>
        Readings, asset edits, and maintenance records save to this device instantly and sync to the server automatically
        once you're back online — there is no manual upload step. Check the Sync Centre tab to see what's still pending.
        Photo uploads are the one exception: they need a live connection and will show an error to retry if taken offline.
      </p>
      <p>
        Signing in still needs a connection the very first time on a device — after that, you stay signed in and the
        app works fully offline, even with zero signal. Connect once before heading to a remote site, and you're covered
        for the rest of the visit.
      </p>
    </>
  )
}

function GlossaryDetail() {
  return (
    <ul className="ref-list">
      <li>
        <strong>IDI:</strong> Ijimari Degradation Index — the composite 0–100 condition score.
      </li>
      <li>
        <strong>Shewhart scoring:</strong> a control-chart method that scores a reading by how many standard deviations (σ)
        it sits from the baseline mean.
      </li>
      <li>
        <strong>Phase unbalance (NEMA MG-1):</strong> the largest deviation of any one motor phase current from the
        3-phase average, as a percentage.
      </li>
      <li>
        <strong>One-sided decline:</strong> pressure/flow scoring that only penalizes a drop below baseline, never a rise.
      </li>
      <li>
        <strong>Coefficient of variation (CV):</strong> used to tell a constant-duty pump from a variable-duty one, which
        changes how current drift should be judged.
      </li>
      <li>
        <strong>Engine version:</strong> the scoring methodology version stamped on every assessment, so recalibrating the
        math later never silently reinterprets old scores.
      </li>
    </ul>
  )
}

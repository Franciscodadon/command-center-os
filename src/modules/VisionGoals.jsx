// FILE: src/modules/VisionGoals.jsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, ChevronDown, Eye, Target, Plus, Trash2,
  X, Sliders, CheckCircle2, Calendar, MoreHorizontal,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const HORIZONS = [
  { key: 'lifetime', label: 'Lifetime', question: 'What does a life fully lived look like for you? What will you have built, experienced, and become?' },
  { key: '10year',   label: '10 Years',  question: 'Who are you in ten years? What does your world look like — work, family, body, finances, legacy?' },
  { key: '3year',    label: '3 Years',   question: "What is concretely true about your life in three years that isn't true today?" },
  { key: '1year',    label: '1 Year',    question: 'What must you accomplish in the next twelve months to stay on track for your 3-year picture?' },
  { key: 'quarterly', label: 'This Quarter', question: 'What are the 3\u20135 outcomes that will make this quarter a clear win?' },
  { key: 'monthly',  label: 'This Month', question: "What's the single most important thing to finish this month?" },
  { key: 'weekly',   label: 'This Week', question: 'What are the 3 things that would make this week a success?' },
]

const AREAS = [
  { value: 'business',      label: 'Business',      color: '#2563EB' },
  { value: 'health',        label: 'Health',        color: '#16A34A' },
  { value: 'finance',       label: 'Finance',       color: '#D97706' },
  { value: 'relationships', label: 'Relationships', color: '#DB2777' },
  { value: 'faith',         label: 'Faith',         color: '#C9A84C' },
  { value: 'learning',      label: 'Learning',      color: '#7C3AED' },
  { value: 'personal',      label: 'Personal',      color: '#0891B2' },
]

const TIME_HORIZONS = ['quarterly', 'monthly', 'weekly']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAreaColor(area) {
  return AREAS.find(a => a.value === area)?.color || '#6B7280'
}

function AreaChip({ area, size = 'sm' }) {
  const color = getAreaColor(area)
  const label = AREAS.find(a => a.value === area)?.label || area
  return (
    <span
      style={{
        background: color + '18', color,
        borderRadius: 20, padding: size === 'sm' ? '2px 8px' : '3px 10px',
        fontSize: size === 'sm' ? 11 : 12,
        fontFamily: 'IBM Plex Mono', fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        display: 'inline-block', whiteSpace: 'nowrap',
      }}
    >{label}</span>
  )
}

function ProgressRing({ pct = 0, size = 48, stroke = 3 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--gold)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{
          fontSize: 9, fill: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono',
          transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`,
        }}
      >{pct}%</text>
    </svg>
  )
}

function daysRemaining(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function computeStatus(goal) {
  if (goal.progress >= 100) return 'complete'
  if (!goal.due_date) return goal.status || 'on_track'
  const total = Math.ceil((new Date(goal.due_date) - new Date(goal.created_at || Date.now())) / 86400000) || 1
  const elapsed = Math.ceil((new Date() - new Date(goal.created_at || Date.now())) / 86400000)
  const expectedPct = Math.min(100, (elapsed / total) * 100)
  const diff = expectedPct - (goal.progress || 0)
  const days = daysRemaining(goal.due_date)
  if (diff >= 20 || (days !== null && days <= 14 && (goal.progress || 0) < 70)) return 'behind'
  if (diff >= 10) return 'at_risk'
  return 'on_track'
}

function StatusBadge({ status }) {
  const map = {
    complete: ['badge-complete', 'Complete'],
    on_track: ['badge-on-track', 'On Track'],
    at_risk:  ['badge-at-risk', 'At Risk'],
    behind:   ['badge-behind', 'Behind'],
  }
  const [cls, label] = map[status] || map['on_track']
  return <span className={`badge ${cls}`}>{label}</span>
}

// ─── Vision Tab ───────────────────────────────────────────────────────────────

function VisionTab({ visionLayers = [], onUpdateVision }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [contents, setContents] = useState(() => {
    const init = {}
    HORIZONS.forEach(h => {
      const found = visionLayers.find(v => v.horizon === h.key)
      init[h.key] = found?.content || ''
    })
    return init
  })
  const saveTimer = useRef({})

  const isSummary = step === HORIZONS.length

  const handleChange = (key, value) => {
    setContents(c => ({ ...c, [key]: value }))
    clearTimeout(saveTimer.current[key])
    saveTimer.current[key] = setTimeout(() => {
      onUpdateVision?.(key, value)
    }, 600)
  }

  const go = (dir) => {
    setDirection(dir)
    setStep(s => Math.max(0, Math.min(HORIZONS.length, s + dir)))
  }

  const variants = {
    enter: (d) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Progress Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {HORIZONS.map((h, i) => (
          <button
            key={h.key}
            onClick={() => { setDirection(i > step ? 1 : -1); setStep(i) }}
            style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i < step ? 'var(--gold)' : i === step ? 'var(--gold)' : 'var(--border-strong)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
        <button
          onClick={() => { setDirection(1); setStep(HORIZONS.length) }}
          style={{
            width: isSummary ? 24 : 8, height: 8, borderRadius: 4,
            background: isSummary ? 'var(--gold)' : 'var(--border-strong)',
            border: 'none', cursor: 'pointer', padding: 0,
            transition: 'all 0.3s ease',
          }}
        />
      </div>

      {/* Card */}
      <div style={{ position: 'relative', minHeight: 380 }}>
        <AnimatePresence custom={direction} mode="wait">
          {!isSummary ? (
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="card"
              style={{ padding: '36px 40px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <span
                  className="font-serif"
                  style={{ fontSize: 48, fontWeight: 300, color: 'var(--border-strong)', lineHeight: 1, flexShrink: 0 }}
                >
                  {String(step + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="label-gold" style={{ marginBottom: 4 }}>{HORIZONS[step].label}</div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                    {HORIZONS[step].question}
                  </p>
                </div>
              </div>
              <textarea
                className="input"
                value={contents[HORIZONS[step].key]}
                onChange={e => handleChange(HORIZONS[step].key, e.target.value)}
                placeholder="Write freely — this is your space to think big…"
                style={{ minHeight: 180, resize: 'vertical', lineHeight: 1.7, fontSize: 15 }}
              />
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>
                Auto-saving
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="summary"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="card" style={{ padding: '28px 32px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Eye size={18} color="var(--gold)" />
                  <span className="font-serif" style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>
                    Your Full Vision
                  </span>
                </div>
                {HORIZONS.map(h => (
                  <div key={h.key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                    <div className="label-gold" style={{ marginBottom: 6 }}>{h.label}</div>
                    {contents[h.key] ? (
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {contents[h.key]}
                      </p>
                    ) : (
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                        Not yet written.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <button
          className="btn-ghost"
          onClick={() => go(-1)}
          disabled={step === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
          {isSummary ? 'Summary' : `${step + 1} of ${HORIZONS.length}`}
        </span>
        <button
          className={isSummary ? 'btn-ghost' : 'btn-primary'}
          onClick={() => go(1)}
          disabled={isSummary}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isSummary ? 0.3 : 1 }}
        >
          {step === HORIZONS.length - 1 ? 'View Full Vision' : 'Next'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Lead Measure Row ─────────────────────────────────────────────────────────

function LmRow({ lm, actualValue, onUpdateActual, weekStart }) {
  const hit = actualValue !== '' && actualValue !== undefined && Number(actualValue) >= Number(lm.target)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: hit ? 'var(--status-green)' : 'var(--border-strong)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{lm.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
          Target: {lm.target} {lm.unit}
        </div>
      </div>
      <input
        type="number"
        className="input"
        value={actualValue ?? ''}
        onChange={e => onUpdateActual?.(lm.id, weekStart, e.target.value)}
        placeholder="0"
        style={{ width: 68, textAlign: 'center', padding: '5px 8px', fontSize: 13 }}
      />
      <span className={`badge ${hit ? 'badge-on-track' : 'badge-behind'}`} style={{ fontSize: 10 }}>
        {hit ? 'Hit' : 'Miss'}
      </span>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, leadMeasures = [], lmActuals = [], onUpdateLmActual, onDeleteGoal, weekStart }) {
  const [expanded, setExpanded] = useState(false)
  const status = computeStatus(goal)
  const days = daysRemaining(goal.due_date)
  const lms = leadMeasures.filter(lm => lm.goal_id === goal.id)

  const getActual = (lmId) => {
    const entry = lmActuals.find(a => a.lead_measure_id === lmId && a.week_start === weekStart)
    return entry?.actual
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ProgressRing pct={goal.progress || 0} size={48} stroke={3} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {goal.title}
              </h3>
              <button
                onClick={() => onDeleteGoal?.(goal.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <AreaChip area={goal.area_of_life || 'personal'} />
              <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 10 }}>
                {goal.time_horizon || 'quarterly'}
              </span>
              <StatusBadge status={status} />
              {days !== null && (
                <span style={{
                  fontSize: 11, fontFamily: 'IBM Plex Mono',
                  color: days <= 7 ? 'var(--status-red)' : days <= 14 ? 'var(--status-yellow)' : 'var(--text-muted)',
                }}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Measures Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          borderTop: '1px solid var(--border)',
          padding: '9px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'var(--text-muted)', fontSize: 12, fontFamily: 'IBM Plex Mono',
        }}
      >
        <span>Lead Measures ({lms.length})</span>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 14px' }}>
              {lms.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8 }}>
                  No lead measures yet.
                </p>
              ) : (
                lms.map(lm => (
                  <LmRow
                    key={lm.id}
                    lm={lm}
                    actualValue={getActual(lm.id)}
                    onUpdateActual={onUpdateLmActual}
                    weekStart={weekStart}
                  />
                ))
              )}
              <button
                style={{
                  marginTop: 10, background: 'none', border: '1px dashed var(--border-strong)',
                  borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
                  fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', justifyContent: 'center',
                }}
              >
                <Plus size={12} /> Add Lead Measure
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Goal Form Panel ──────────────────────────────────────────────────────────

const EMPTY_GOAL = {
  title: '', area_of_life: 'business', time_horizon: 'quarterly',
  due_date: '', notes: '', progress: 0,
  lead_measures: [{ name: '', unit: '', target: '' }],
}

function GoalPanel({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_GOAL)
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const setLm = (i, field, value) => {
    setForm(f => {
      const lms = [...f.lead_measures]
      lms[i] = { ...lms[i], [field]: value }
      return { ...f, lead_measures: lms }
    })
  }
  const addLm = () => {
    if (form.lead_measures.length >= 5) return
    setForm(f => ({ ...f, lead_measures: [...f.lead_measures, { name: '', unit: '', target: '' }] }))
  }
  const removeLm = (i) => {
    setForm(f => ({ ...f, lead_measures: f.lead_measures.filter((_, idx) => idx !== i) }))
  }

  return (
    <motion.div
      initial={{ x: 440 }}
      animate={{ x: 0 }}
      exit={{ x: 440 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        zIndex: 200, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      {/* Panel Header */}
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
      }}>
        <div>
          <div className="label-gold">New Goal</div>
          <div className="font-serif" style={{ fontSize: 17, fontWeight: 400, color: 'var(--text-primary)', marginTop: 2 }}>Define Your Target</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Form Body */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Title */}
        <div>
          <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>Goal Title</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What do you want to achieve?" />
        </div>

        {/* Area + Horizon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>Area of Life</label>
            <select className="input" value={form.area_of_life} onChange={e => set('area_of_life', e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}>
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>Time Horizon</label>
            <select className="input" value={form.time_horizon} onChange={e => set('time_horizon', e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}>
              {TIME_HORIZONS.map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>Due Date</label>
          <input className="input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>

        {/* Notes */}
        <div>
          <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
          <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Context, constraints, why this matters…" rows={3} />
        </div>

        {/* Progress Slider */}
        <div>
          <label className="label-mono" style={{ display: 'block', marginBottom: 6 }}>
            Current Progress — <span style={{ color: 'var(--gold-dark)' }}>{form.progress}%</span>
          </label>
          <input
            type="range" min={0} max={100} value={form.progress}
            onChange={e => set('progress', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
        </div>

        {/* Lead Measures */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label className="label-mono">Lead Measures</label>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>{form.lead_measures.length}/5</span>
          </div>
          {form.lead_measures.map((lm, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <input className="input" value={lm.name} onChange={e => setLm(i, 'name', e.target.value)}
                  placeholder="e.g. Workouts per week" style={{ marginBottom: 6 }} />
              </div>
              <div style={{ flex: 1 }}>
                <input className="input" value={lm.target} onChange={e => setLm(i, 'target', e.target.value)}
                  placeholder="Target" type="number" style={{ marginBottom: 6 }} />
              </div>
              <div style={{ flex: 1 }}>
                <input className="input" value={lm.unit} onChange={e => setLm(i, 'unit', e.target.value)} placeholder="Unit" style={{ marginBottom: 6 }} />
              </div>
              <button onClick={() => removeLm(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '10px 4px', flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          ))}
          {form.lead_measures.length < 5 && (
            <button onClick={addLm}
              style={{
                background: 'none', border: '1px dashed var(--border-strong)', borderRadius: 8,
                padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
              }}>
              <Plus size={13} /> Add Lead Measure
            </button>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '16px 24px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10, position: 'sticky', bottom: 0,
        background: 'var(--bg-card)',
      }}>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        <button
          className="btn-primary"
          onClick={() => { onSave?.(form); onClose() }}
          disabled={!form.title.trim()}
          style={{ flex: 2, opacity: form.title.trim() ? 1 : 0.5 }}
        >
          Save Goal
        </button>
      </div>
    </motion.div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goals = [], leadMeasures = [], lmActuals = [], onSaveGoal, onDeleteGoal, onUpdateLmActual }) {
  const [panelOpen, setPanelOpen] = useState(false)

  const weekStart = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().slice(0, 10)
  })()

  const columns = [
    { id: 'active',   label: 'This Quarter', statuses: ['on_track'], color: 'var(--status-green)' },
    { id: 'at_risk',  label: 'At Risk',       statuses: ['at_risk', 'behind'],  color: 'var(--status-yellow)' },
    { id: 'complete', label: 'Complete',      statuses: ['complete'], color: 'var(--status-blue)' },
  ]

  const classified = goals.map(g => ({ ...g, _status: computeStatus(g) }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          className="btn-primary"
          onClick={() => setPanelOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={14} /> Add Goal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
        {columns.map(col => {
          const colGoals = classified.filter(g => col.statuses.includes(g._status))
          return (
            <div key={col.id}>
              {/* Column Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '0 4px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span className="label-mono" style={{ color: 'var(--text-secondary)' }}>{col.label}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontFamily: 'IBM Plex Mono',
                  background: 'var(--bg-input)', color: 'var(--text-muted)',
                  borderRadius: 10, padding: '1px 7px',
                }}>{colGoals.length}</span>
              </div>

              {colGoals.length === 0 ? (
                <div style={{
                  border: '1px dashed var(--border)', borderRadius: 12, padding: '24px 16px',
                  textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic',
                }}>
                  No goals here.
                </div>
              ) : (
                colGoals.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    leadMeasures={leadMeasures}
                    lmActuals={lmActuals}
                    onUpdateLmActual={onUpdateLmActual}
                    onDeleteGoal={onDeleteGoal}
                    weekStart={weekStart}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPanelOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 199 }}
            />
            <GoalPanel onClose={() => setPanelOpen(false)} onSave={onSaveGoal} />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VisionGoals({
  user, visionLayers = [], goals = [], leadMeasures = [], lmActuals = [],
  onUpdateVision, onSaveGoal, onDeleteGoal, onUpdateLmActual,
}) {
  const [activeTab, setActiveTab] = useState('vision')

  return (
    <div style={{ padding: '0 0 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontWeight: 300, fontSize: 26, color: 'var(--text-primary)', marginBottom: 4 }}>
          Vision &amp; Goals
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          The architecture of your future, made visible.
        </p>
      </div>

      {/* Tab Toggle */}
      <div style={{
        display: 'inline-flex', background: 'var(--bg-input)',
        borderRadius: 10, padding: 4, marginBottom: 28,
        border: '1px solid var(--border)',
      }}>
        {['vision', 'goals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              border: activeTab === tab ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: 7, padding: '7px 20px', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.18s',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'vision' ? (
            <VisionTab visionLayers={visionLayers} onUpdateVision={onUpdateVision} />
          ) : (
            <GoalsTab
              goals={goals}
              leadMeasures={leadMeasures}
              lmActuals={lmActuals}
              onSaveGoal={onSaveGoal}
              onDeleteGoal={onDeleteGoal}
              onUpdateLmActual={onUpdateLmActual}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

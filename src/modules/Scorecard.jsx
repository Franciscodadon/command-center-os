// FILE: src/modules/Scorecard.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  Plus, Sparkles, Loader2, X, Copy, Check, Target
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { claudeChat, AGENT_SYSTEM_PROMPT } from '../lib/claude'

const AREAS = ['business','health','finance','relationships','faith','learning','personal']
const AREA_LABELS = {
  business: 'Business', health: 'Health', finance: 'Finance',
  relationships: 'Relationships', faith: 'Faith', learning: 'Learning', personal: 'Personal'
}
const AREA_COLORS = {
  business:      'var(--area-business)',
  health:        'var(--area-health)',
  finance:       'var(--area-finance)',
  relationships: 'var(--area-relationships)',
  faith:         'var(--area-faith)',
  learning:      'var(--area-learning)',
  personal:      'var(--area-personal)',
}
const AREA_HEX = {
  business:      '#2563EB',
  health:        '#16A34A',
  finance:       '#D97706',
  relationships: '#DB2777',
  faith:         '#C9A84C',
  learning:      '#7C3AED',
  personal:      '#0891B2',
}

function getWeekLabel(weeksAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekKey(weeksAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

// ─── Sparkline (inline SVG) ────────────────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 24 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const min = 0, max = 100
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / (max - min)) * height}
        r={2.5}
        fill={color}
      />
    </svg>
  )
}

// ─── Goal Health Chip ──────────────────────────────────────────────────────────
function GoalChip({ goal, active, onClick }) {
  const statusColor = goal.status === 'on_track'
    ? 'var(--status-green)'
    : goal.status === 'at_risk'
    ? 'var(--status-yellow)'
    : 'var(--status-red)'
  const statusBg = goal.status === 'on_track'
    ? 'rgba(22,163,74,0.1)'
    : goal.status === 'at_risk'
    ? 'rgba(217,119,6,0.1)'
    : 'rgba(220,38,38,0.1)'

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left"
      style={{
        background: active ? statusBg : 'var(--bg-input)',
        border: `1px solid ${active ? statusColor : 'var(--border)'}`,
        boxShadow: active ? `0 0 0 2px ${statusColor}33` : 'none',
      }}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {goal.title}
      </span>
    </motion.button>
  )
}

// ─── Custom Recharts Tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="card" style={{ padding: '12px 16px', minWidth: 160 }}>
      <p className="label-mono mb-2">Week of {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {AREA_LABELS[p.dataKey] || p.dataKey}
          </span>
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {typeof p.value === 'number' ? `${Math.round(p.value)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Add Metric Modal ──────────────────────────────────────────────────────────
function AddMetricModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', target: '', lower_better: false })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.target) return
    onAdd({ ...form, target: Number(form.target), actual: null })
    setForm({ name: '', target: '', lower_better: false })
    onClose()
  }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="card w-full max-w-sm flex flex-col gap-4"
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Add Metric</h3>
                <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 6px', border: 'none' }}>
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label-mono">Metric Name</label>
                  <input className="input" placeholder="e.g. Steps per day" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label-mono">Target</label>
                  <input type="number" className="input" placeholder="10000" value={form.target} onChange={e => set('target', e.target.value)} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.lower_better} onChange={e => set('lower_better', e.target.checked)} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Lower is better</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Add Metric</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function Scorecard({
  goals = [],
  leadMeasures = [],
  lmActuals = [],
  scorecardMetrics = [],
  scorecardValues = [],
  onUpdateActual,
  onAddMetric,
}) {
  const [activeGoalId, setActiveGoalId] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingActuals, setEditingActuals] = useState({})
  const [addMetricOpen, setAddMetricOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiModal, setAiModal] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [metricEdits, setMetricEdits] = useState({})

  // ── Build 12-week trend data for chart ──────────────────────────────────────
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const weekKey = getWeekKey(11 - i)
    const label = getWeekLabel(11 - i)
    const row = { week: label }
    AREAS.forEach(area => {
      const areaLMs = leadMeasures.filter(lm => lm.area === area)
      if (areaLMs.length === 0) return
      const areaActuals = lmActuals.filter(a => {
        const lm = leadMeasures.find(l => l.id === a.lead_measure_id)
        return lm && lm.area === area && a.week_start === weekKey
      })
      const hits = areaActuals.filter(a => {
        const lm = leadMeasures.find(l => l.id === a.lead_measure_id)
        return lm && a.actual >= lm.target
      }).length
      row[area] = areaLMs.length > 0 ? Math.round((hits / areaLMs.length) * 100) : undefined
    })
    return row
  })

  const activeAreas = AREAS.filter(a => leadMeasures.some(lm => lm.area === a))

  // ── Current week LMs ────────────────────────────────────────────────────────
  const currentWeekKey = getWeekKey(weekOffset)
  const currentWeekActuals = lmActuals.filter(a => a.week_start === currentWeekKey)
  const getActual = (lmId) => {
    const a = currentWeekActuals.find(a => a.lead_measure_id === lmId)
    return a ? a.actual : ''
  }
  const weekHitCount = leadMeasures.filter(lm => {
    const actual = getActual(lm.id)
    return actual !== '' && Number(actual) >= Number(lm.target)
  }).length
  const weekHitRate = leadMeasures.length > 0 ? Math.round((weekHitCount / leadMeasures.length) * 100) : 0

  // ── Week-over-week by area ───────────────────────────────────────────────────
  const getAreaRate = (area, weeksAgo) => {
    const wk = getWeekKey(weeksAgo)
    const areaLMs = leadMeasures.filter(lm => lm.area === area)
    if (!areaLMs.length) return null
    const actuals = lmActuals.filter(a => {
      const lm = leadMeasures.find(l => l.id === a.lead_measure_id)
      return lm && lm.area === area && a.week_start === wk
    })
    const hits = actuals.filter(a => {
      const lm = leadMeasures.find(l => l.id === a.lead_measure_id)
      return lm && a.actual >= lm.target
    }).length
    return Math.round((hits / areaLMs.length) * 100)
  }

  const get6WeekSpark = (area) =>
    Array.from({ length: 6 }, (_, i) => getAreaRate(area, 5 - i) ?? 0)

  // ── AI Analysis ─────────────────────────────────────────────────────────────
  const runAiAnalysis = async () => {
    setAiLoading(true)
    setAiModal(true)
    setAiOutput('')
    try {
      const goalSummary = goals.map(g => `  - "${g.title}" (${g.area}, ${g.status})`).join('\n')
      const lmSummary = leadMeasures.map(lm => {
        const actual = getActual(lm.id)
        const hit = actual !== '' && Number(actual) >= Number(lm.target)
        return `  - "${lm.title}" target ${lm.target} | actual ${actual || 'not logged'} | ${hit ? 'HIT' : 'MISS'}`
      }).join('\n')
      const areaSummary = activeAreas.map(a => {
        const thisWeek = getAreaRate(a, 0)
        const lastWeek = getAreaRate(a, 1)
        return `  ${AREA_LABELS[a]}: this week ${thisWeek}%, last week ${lastWeek}%`
      }).join('\n')

      const prompt = `Scorecard Analysis Request:

Goals:
${goalSummary || '  none'}

This Week's Lead Measures:
${lmSummary || '  none'}

Area Performance:
${areaSummary || '  none'}

Provide:
1. Which goals are truly at risk and why (be specific)
2. What pattern do the misses reveal (the underlying issue, not just the symptom)
3. One specific intervention for this week`

      const result = await claudeChat(
        [{ role: 'user', content: prompt }],
        AGENT_SYSTEM_PROMPT
      )
      setAiOutput(result)
    } catch (err) {
      setAiOutput('Error reaching advisor. Check your API key.')
    }
    setAiLoading(false)
  }

  // ── Metric actual update ─────────────────────────────────────────────────────
  const handleMetricActual = (metricId, value) => {
    setMetricEdits(e => ({ ...e, [metricId]: value }))
  }
  const commitMetricActual = (metricId) => {
    const value = metricEdits[metricId]
    if (value !== undefined && onAddMetric) {
      onAddMetric(metricId, Number(value))
    }
  }

  const getMetricActual = (metric) => {
    if (metricEdits[metric.id] !== undefined) return metricEdits[metric.id]
    const sv = scorecardValues.find(v => v.metric_id === metric.id)
    return sv ? sv.actual : ''
  }

  const isMetricHit = (metric) => {
    const actual = Number(getMetricActual(metric))
    if (!actual && actual !== 0) return null
    return metric.lower_better ? actual <= metric.target : actual >= metric.target
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>Scorecard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Weekly performance snapshot</p>
        </div>
        <button
          className="btn-ghost flex items-center gap-2"
          onClick={runAiAnalysis}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} style={{ color: 'var(--gold)' }} />}
          AI Analysis
        </button>
      </div>

      {/* ── Section 1: Goal Health Dashboard ──────────────────────────────── */}
      <div className="card flex flex-col gap-3">
        <span className="label-mono">Goal Health</span>
        {goals.filter(g => g.status !== 'complete').length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active goals.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {goals.filter(g => g.status !== 'complete').map(g => (
              <GoalChip
                key={g.id}
                goal={g}
                active={activeGoalId === g.id}
                onClick={() => setActiveGoalId(activeGoalId === g.id ? null : g.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Monthly Completion Trend ───────────────────────────── */}
      <div className="card flex flex-col gap-4">
        <span className="label-mono">12-Week Completion Trend</span>
        {activeAreas.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add lead measures with areas to see trend data.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {activeAreas.map(area => (
                  <Line
                    key={area}
                    type="monotone"
                    dataKey={area}
                    stroke={AREA_HEX[area]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-2">
              {activeAreas.map(area => (
                <span
                  key={area}
                  className="badge"
                  style={{ background: `${AREA_HEX[area]}15`, color: AREA_HEX[area] }}
                >
                  {AREA_LABELS[area]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Section 3: Week-over-Week by Area ─────────────────────────────── */}
      <div className="card flex flex-col gap-0">
        <span className="label-mono mb-4">Area Performance — Week Over Week</span>
        {activeAreas.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No lead measures with areas assigned.</p>
        ) : (
          <div className="flex flex-col">
            {/* Header row */}
            <div className="grid text-xs px-2 pb-2 mb-1" style={{ gridTemplateColumns: '1fr 80px 80px 70px 90px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
              <span>Area</span>
              <span className="text-right">This Week</span>
              <span className="text-right">Last Week</span>
              <span className="text-right">Delta</span>
              <span className="text-right">6-Week</span>
            </div>
            {activeAreas.map((area, idx) => {
              const thisWeek = getAreaRate(area, weekOffset)
              const lastWeek = getAreaRate(area, weekOffset + 1)
              const delta = thisWeek !== null && lastWeek !== null ? thisWeek - lastWeek : null
              const spark = get6WeekSpark(area)
              return (
                <div
                  key={area}
                  className="grid items-center px-2 py-3"
                  style={{
                    gridTemplateColumns: '1fr 80px 80px 70px 90px',
                    borderBottom: idx < activeAreas.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span className="badge" style={{ background: `${AREA_HEX[area]}15`, color: AREA_HEX[area], alignSelf: 'center', width: 'fit-content' }}>
                    {AREA_LABELS[area]}
                  </span>
                  <span className="text-right font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {thisWeek !== null ? `${thisWeek}%` : '—'}
                  </span>
                  <span className="text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {lastWeek !== null ? `${lastWeek}%` : '—'}
                  </span>
                  <span className="text-right text-sm flex items-center justify-end gap-0.5">
                    {delta === null ? (
                      <Minus size={13} style={{ color: 'var(--text-muted)' }} />
                    ) : delta > 0 ? (
                      <>
                        <TrendingUp size={13} style={{ color: 'var(--status-green)' }} />
                        <span style={{ color: 'var(--status-green)', fontSize: 12 }}>+{delta}%</span>
                      </>
                    ) : delta < 0 ? (
                      <>
                        <TrendingDown size={13} style={{ color: 'var(--status-red)' }} />
                        <span style={{ color: 'var(--status-red)', fontSize: 12 }}>{delta}%</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>0%</span>
                    )}
                  </span>
                  <div className="flex justify-end">
                    <Sparkline data={spark} color={AREA_HEX[area]} width={70} height={22} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Section 4: Weekly Lead Measure Tracker ────────────────────────── */}
      <div className="card flex flex-col gap-4">
        {/* Week picker */}
        <div className="flex items-center justify-between">
          <span className="label-mono">Lead Measures</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronLeft size={15} />
            </button>
            <span className="label-mono" style={{ minWidth: 120, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Week of {getWeekLabel(weekOffset)}
            </span>
            <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Hit rate summary */}
        {leadMeasures.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg"
            style={{ background: 'var(--bg-input)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Weekly Hit Rate</span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${weekHitRate}%`,
                    background: weekHitRate >= 80 ? 'var(--status-green)' : weekHitRate >= 50 ? 'var(--status-yellow)' : 'var(--status-red)',
                  }}
                />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', minWidth: 36, textAlign: 'right' }}>
                {weekHitRate}%
              </span>
            </div>
          </div>
        )}

        {/* LM rows */}
        {leadMeasures.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No lead measures yet.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid px-2 pb-2 mb-1 text-xs" style={{ gridTemplateColumns: '1fr 120px 90px 90px 70px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
              <span>Lead Measure</span>
              <span>Parent Goal</span>
              <span className="text-right">Target</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Result</span>
            </div>
            {leadMeasures.map((lm, idx) => {
              const actual = editingActuals[lm.id] !== undefined ? editingActuals[lm.id] : getActual(lm.id)
              const hit = actual !== '' && actual !== undefined && Number(actual) >= Number(lm.target)
              const parentGoal = goals.find(g => g.id === lm.goal_id)
              return (
                <div
                  key={lm.id}
                  className="grid items-center px-2 py-3"
                  style={{
                    gridTemplateColumns: '1fr 120px 90px 90px 70px',
                    borderBottom: idx < leadMeasures.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="flex flex-col gap-0.5 pr-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{lm.title}</span>
                    {lm.area && (
                      <span className="label-mono" style={{ color: AREA_HEX[lm.area] || 'var(--text-muted)' }}>{lm.area}</span>
                    )}
                  </div>
                  <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {parentGoal ? parentGoal.title : '—'}
                  </span>
                  <span className="text-right text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{lm.target}</span>
                  <div className="flex justify-end">
                    <input
                      type="number"
                      className="input text-right"
                      style={{ width: 72, padding: '5px 8px', fontSize: 13 }}
                      value={actual}
                      placeholder="—"
                      onChange={e => setEditingActuals(a => ({ ...a, [lm.id]: e.target.value }))}
                      onBlur={() => {
                        if (editingActuals[lm.id] !== undefined) {
                          onUpdateActual && onUpdateActual(lm.id, currentWeekKey, Number(editingActuals[lm.id]))
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    {actual !== '' && actual !== undefined ? (
                      <span className={`badge ${hit ? 'badge-on-track' : 'badge-behind'}`}>
                        {hit ? 'Hit' : 'Miss'}
                      </span>
                    ) : (
                      <span className="label-mono">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Section 5: Manual Metrics ─────────────────────────────────────── */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="label-mono">Manual Metrics</span>
          <button className="btn-ghost flex items-center gap-1.5" style={{ padding: '6px 12px' }} onClick={() => setAddMetricOpen(true)}>
            <Plus size={13} /> Add Metric
          </button>
        </div>
        {scorecardMetrics.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track custom metrics like revenue, weight, or any number that matters.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid px-2 pb-2 mb-1 text-xs" style={{ gridTemplateColumns: '1fr 100px 100px 80px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
              <span>Metric</span>
              <span className="text-right">Target</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Result</span>
            </div>
            {scorecardMetrics.map((metric, idx) => {
              const hit = isMetricHit(metric)
              return (
                <div
                  key={metric.id}
                  className="grid items-center px-2 py-3"
                  style={{
                    gridTemplateColumns: '1fr 100px 100px 80px',
                    borderBottom: idx < scorecardMetrics.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="flex flex-col gap-0.5 pr-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{metric.name}</span>
                    {metric.lower_better && <span className="label-mono">Lower = better</span>}
                  </div>
                  <span className="text-right text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{metric.target}</span>
                  <div className="flex justify-end">
                    <input
                      type="number"
                      className="input text-right"
                      style={{ width: 80, padding: '5px 8px', fontSize: 13 }}
                      value={getMetricActual(metric)}
                      placeholder="—"
                      onChange={e => handleMetricActual(metric.id, e.target.value)}
                      onBlur={() => commitMetricActual(metric.id)}
                    />
                  </div>
                  <div className="flex justify-end">
                    {hit !== null ? (
                      <span className={`badge ${hit ? 'badge-on-track' : 'badge-behind'}`}>
                        {hit ? 'Hit' : 'Miss'}
                      </span>
                    ) : (
                      <span className="label-mono">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add Metric Modal ─────────────────────────────────────────────── */}
      <AddMetricModal open={addMetricOpen} onClose={() => setAddMetricOpen(false)} onAdd={onAddMetric} />

      {/* ── AI Analysis Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {aiModal && (
          <>
            <motion.div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiModal(false)} />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="card w-full max-w-lg flex flex-col gap-4"
                style={{ borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.03)', maxHeight: '80vh' }}
                initial={{ scale: 0.95, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 16 }}
              >
                <div className="flex items-center justify-between">
                  <span className="label-gold flex items-center gap-1.5">
                    <Sparkles size={11} /> Scorecard Analysis
                  </span>
                  <div className="flex items-center gap-2">
                    {aiOutput && (
                      <button
                        className="btn-ghost flex items-center gap-1.5"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => { navigator.clipboard.writeText(aiOutput); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                    <button className="btn-ghost" style={{ padding: '4px 6px', border: 'none' }} onClick={() => setAiModal(false)}>
                      <X size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {aiLoading && !aiOutput ? (
                    <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 size={15} className="animate-spin" />
                      <span className="text-sm">Analyzing your scorecard...</span>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                      {aiOutput}
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

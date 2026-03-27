// FILE: src/modules/CommandCenter.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Mic, MicOff, Send, ArrowRight, Calendar, Mail,
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock,
  Zap, Target, LayoutGrid, Lightbulb
} from 'lucide-react'
import { claudeChat, AGENT_SYSTEM_PROMPT, classifyCapture } from '../lib/claude'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function daysRemaining(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

const AREA_COLORS = {
  business: '#2563EB', health: '#16A34A', finance: '#D97706',
  relationships: '#DB2777', faith: '#C9A84C', learning: '#7C3AED', personal: '#0891B2',
}

function AreaChip({ area }) {
  const color = AREA_COLORS[area] || 'var(--text-muted)'
  return (
    <span
      className="label-mono inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: color + '18', color }}
    >
      {area}
    </span>
  )
}

function ProgressRing({ pct = 0, size = 40, stroke = 3 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--gold)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 9, fill: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono', transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {pct}%
      </text>
    </svg>
  )
}

// Toast hook
function useToast() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return { toasts, addToast }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CommandCenter({
  user, goals = [], tasks = [], leadMeasures = [], lmActuals = [],
  onUpdateLmActual, onCreateTask, onNavigate,
}) {
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there'

  // AI Insight
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(true)

  const fetchInsight = useCallback(async () => {
    setInsightLoading(true)
    try {
      const context = `
User has ${goals.length} active goals and ${tasks.length} tasks.
Goals: ${goals.slice(0, 3).map(g => g.title).join(', ')}.
Most urgent tasks: ${tasks.filter(t => t.quadrant === 'Q1').slice(0, 2).map(t => t.title).join(', ') || 'none'}.
      `.trim()
      const result = await claudeChat(
        [{ role: 'user', content: `Give me one single sharp, actionable insight sentence (max 25 words) about today's focus based on this context: ${context}` }],
        AGENT_SYSTEM_PROMPT
      )
      setInsight(result.trim().replace(/^["']|["']$/g, ''))
    } catch {
      setInsight('Focus on your highest-leverage Q1 tasks before anything else today.')
    } finally {
      setInsightLoading(false)
    }
  }, [goals, tasks])

  useEffect(() => { fetchInsight() }, [])

  // Priority Matrix snapshot
  const quadrants = ['Q1', 'Q2', 'Q3', 'Q4']
  const qLabels = { Q1: 'Do First', Q2: 'Schedule', Q3: 'Delegate', Q4: 'Eliminate' }
  const qColors = { Q1: '#DC2626', Q2: '#2563EB', Q3: '#D97706', Q4: '#6B7280' }
  const qTasks = Object.fromEntries(quadrants.map(q => [q, tasks.filter(t => t.quadrant === q && !t.completed)]))

  // Goals grouped by area
  const goalsByArea = goals.reduce((acc, g) => {
    const a = g.area_of_life || 'personal'
    if (!acc[a]) acc[a] = []
    acc[a].push(g)
    return acc
  }, {})
  const [expandedAreas, setExpandedAreas] = useState(() => {
    const init = {}
    Object.keys(goalsByArea).forEach(a => {
      const allComplete = goalsByArea[a].every(g => g.status === 'complete')
      init[a] = !allComplete
    })
    return init
  })

  // Lead measures for this week
  const weekStart = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().slice(0, 10)
  })()
  const weekLMs = leadMeasures.filter(lm => {
    const goal = goals.find(g => g.id === lm.goal_id)
    return goal && goal.status !== 'complete'
  })

  const getActual = (lmId) => {
    const entry = lmActuals.find(a => a.lead_measure_id === lmId && a.week_start === weekStart)
    return entry?.actual ?? ''
  }

  // Quick capture
  const [captureText, setCaptureText] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const captureRef = useRef(null)
  const { toasts, addToast } = useToast()

  const handleCapture = useCallback(async () => {
    if (!captureText.trim()) return
    setCapturing(true)
    try {
      const result = await classifyCapture(captureText)
      if (result.type === 'task') {
        await onCreateTask?.({ title: result.title, quadrant: result.quadrant || 'Q1' })
        addToast(`Task captured → ${result.quadrant || 'Q1'}: "${result.title}"`)
      } else {
        addToast(`${result.type.charAt(0).toUpperCase() + result.type.slice(1)} captured: "${result.title}"`)
      }
      setCaptureText('')
    } catch {
      addToast('Captured as quick note.', 'info')
    } finally {
      setCapturing(false)
    }
  }, [captureText, onCreateTask, addToast])

  const toggleMic = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) { addToast('Speech recognition not supported in this browser.', 'error'); return }
    if (listening) {
      recognitionRef.current?.stop(); setListening(false); return
    }
    const rec = new SpeechRec()
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US'
    rec.onresult = (e) => { setCaptureText(t => t + ' ' + e.results[0][0].transcript) }
    rec.onend = () => setListening(false)
    rec.start(); recognitionRef.current = rec; setListening(true)
  }, [listening, addToast])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.activeElement === captureRef.current) {
        e.preventDefault(); handleCapture()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCapture])

  return (
    <div className="relative" style={{ maxWidth: 820, margin: '0 auto', padding: '0 0 64px' }}>

      {/* Toast Container */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              style={{
                background: t.type === 'error' ? '#FEF2F2' : 'var(--bg-card)',
                border: `1px solid ${t.type === 'error' ? '#FCA5A5' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 18px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                color: t.type === 'error' ? '#B91C1C' : 'var(--text-primary)',
                fontSize: 13, maxWidth: 320,
              }}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── 1. DATE & GREETING ── */}
      <section style={{ marginBottom: 32 }}>
        <h1 className="font-serif" style={{ fontWeight: 300, fontSize: 28, color: 'var(--text-primary)', marginBottom: 4 }}>
          {getGreeting()}, {firstName}.
        </h1>
        <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {formatDate()}
        </p>

        {/* AI Insight */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
            background: 'var(--gradient-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#1A1D23" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="label-gold" style={{ display: 'block', marginBottom: 4 }}>Today's Focus</span>
            {insightLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[80, 60].map(w => (
                  <div key={w} style={{
                    height: 14, width: `${w}%`, borderRadius: 4,
                    background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{insight}</p>
            )}
          </div>
          <button
            onClick={fetchInsight}
            disabled={insightLoading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}
          >
            <RefreshCw size={14} style={{ transition: 'transform 0.3s', transform: insightLoading ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>

      {/* ── 2. PRIORITY MATRIX SNAPSHOT ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="label-mono">Priority Matrix</span>
          <button
            onClick={() => onNavigate?.('matrix')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Open full matrix <ArrowRight size={12} />
          </button>
        </div>
        <div
          onClick={() => onNavigate?.('matrix')}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, cursor: 'pointer' }}
        >
          {quadrants.map(q => {
            const tList = qTasks[q] || []
            return (
              <div
                key={q}
                className="card"
                style={{ padding: '14px 16px', borderLeft: `3px solid ${qColors[q]}`, transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono', color: qColors[q] }}>{q}</span>
                  <span style={{
                    fontSize: 10, fontFamily: 'IBM Plex Mono', background: qColors[q] + '18',
                    color: qColors[q], borderRadius: 10, padding: '1px 7px',
                  }}>{tList.length}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>{qLabels[q]}</div>
                <div style={{
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {tList[0]?.title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>No tasks</span>}
                </div>
                {tList.length > 1 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>+{tList.length - 1} more</div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 3. QUARTERLY GOALS — AREA OVERVIEW ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="label-mono">Quarterly Goals</span>
        </div>

        {Object.keys(goalsByArea).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            No goals yet. Start by setting your quarterly targets.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(goalsByArea).map(([area, aGoals]) => {
              const onTrack = aGoals.filter(g => g.status === 'on_track' || g.status === 'complete').length
              const isExpanded = expandedAreas[area] ?? true

              return (
                <div key={area} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Area Group Header */}
                  <button
                    onClick={() => setExpandedAreas(s => ({ ...s, [area]: !s[area] }))}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <AreaChip area={area} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {onTrack} of {aGoals.length} on track
                    </span>
                    {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ borderTop: '1px solid var(--border)', padding: '0 18px 14px' }}>
                          {aGoals.map((g, i) => {
                            const days = daysRemaining(g.due_date)
                            const pct = g.progress || 0
                            const badgeClass = g.status === 'complete' ? 'badge-complete'
                              : g.status === 'on_track' ? 'badge-on-track'
                              : g.status === 'at_risk' ? 'badge-at-risk'
                              : 'badge-behind'

                            return (
                              <div
                                key={g.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 0',
                                  borderBottom: i < aGoals.length - 1 ? '1px solid var(--border)' : 'none',
                                }}
                              >
                                <ProgressRing pct={pct} size={40} stroke={3} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                  }}>{g.title}</div>
                                  {days !== null && (
                                    <div style={{ fontSize: 11, color: days <= 7 ? 'var(--status-red)' : 'var(--text-muted)', marginTop: 2, fontFamily: 'IBM Plex Mono' }}>
                                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                                    </div>
                                  )}
                                </div>
                                <span className={`badge ${badgeClass}`}>{(g.status || 'on_track').replace('_', ' ')}</span>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => onNavigate?.('vision')}
          style={{
            marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          Open Vision &amp; Goals <ArrowRight size={13} />
        </button>
      </section>

      {/* ── 4. TODAY'S LEAD MEASURES ── */}
      <section style={{ marginBottom: 32 }}>
        <span className="label-mono" style={{ display: 'block', marginBottom: 12 }}>This Week's Lead Measures</span>
        {weekLMs.length === 0 ? (
          <div className="card" style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 14 }}>
            No lead measures set. Add them inside your goals.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {weekLMs.map((lm, i) => {
              const actual = getActual(lm.id)
              const hit = actual !== '' && Number(actual) >= Number(lm.target)
              const parentGoal = goals.find(g => g.id === lm.goal_id)

              return (
                <div
                  key={lm.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
                    borderBottom: i < weekLMs.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: hit ? 'var(--status-green)' : 'var(--border-strong)',
                      transition: 'background 0.2s',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{lm.name}</div>
                    {parentGoal && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'IBM Plex Mono' }}>
                        {parentGoal.title}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
                      target: {lm.target} {lm.unit}
                    </span>
                    <input
                      type="number"
                      className="input"
                      value={actual}
                      onChange={e => onUpdateLmActual?.(lm.id, weekStart, e.target.value)}
                      placeholder="0"
                      style={{ width: 72, textAlign: 'center', padding: '6px 10px', fontSize: 13 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 5. QUICK CAPTURE ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="label-mono">Quick Capture</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>⌘ + Enter to submit</span>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <textarea
            ref={captureRef}
            className="input"
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            placeholder="What needs to exist that doesn't yet?"
            rows={3}
            style={{ marginBottom: 10, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={toggleMic}
              style={{
                background: listening ? 'rgba(220,38,38,0.1)' : 'var(--bg-input)',
                border: `1px solid ${listening ? 'var(--status-red)' : 'var(--border)'}`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                color: listening ? 'var(--status-red)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                transition: 'all 0.2s',
              }}
            >
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
              {listening ? 'Listening…' : 'Dictate'}
            </button>
            <button
              className="btn-primary"
              onClick={handleCapture}
              disabled={capturing || !captureText.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: capturing || !captureText.trim() ? 0.5 : 1 }}
            >
              <Send size={13} />
              {capturing ? 'Routing…' : 'Capture'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. CALENDAR PREVIEW ── */}
      <section style={{ marginBottom: 32 }}>
        <span className="label-mono" style={{ display: 'block', marginBottom: 12 }}>Calendar</span>
        {!user?.google_calendar_token ? (
          <div className="card" style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={20} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Connect Google Calendar</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>See your schedule alongside your priorities.</div>
              </div>
            </div>
            <button className="btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 16px' }}>Connect</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { time: '9:00 AM', title: 'Weekly Review', duration: '60 min', color: '#2563EB' },
              { time: '11:30 AM', title: 'Deep Work Block', duration: '90 min', color: '#16A34A' },
              { time: '2:00 PM', title: 'Team Sync', duration: '30 min', color: '#D97706' },
            ].map((ev, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ width: 3, height: 36, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
                    {ev.time} · {ev.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 7. INBOX PREVIEW ── */}
      <section style={{ marginBottom: 32 }}>
        <span className="label-mono" style={{ display: 'block', marginBottom: 12 }}>Inbox</span>
        {!user?.gmail_token ? (
          <div className="card" style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mail size={20} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Connect Gmail</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Triage your inbox without leaving Command Center.</div>
              </div>
            </div>
            <button className="btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 16px' }}>Connect</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { from: 'Sarah Chen', subject: 'Q2 Strategy Deck — Review Needed', preview: "Hey, I've uploaded the latest version...", time: '8:42 AM', unread: true },
              { from: 'Marcus R.', subject: 'Partnership proposal follow-up', preview: 'Following up on our conversation last week...', time: 'Yesterday', unread: true },
              { from: 'Notion', subject: 'Your weekly summary is ready', preview: "Here's what your team worked on this week...", time: 'Yesterday', unread: false },
            ].map((email, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  background: email.unread ? 'rgba(201,168,76,0.03)' : 'transparent',
                }}
              >
                {email.unread && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 6 }} />
                )}
                {!email.unread && <div style={{ width: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: email.unread ? 600 : 400, color: 'var(--text-primary)' }}>{email.from}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>{email.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 1 }}>{email.subject}</div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', marginTop: 1,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>{email.preview}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

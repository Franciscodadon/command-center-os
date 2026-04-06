// FILE: src/modules/Profile.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(weeksAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

function getWeekLabel(weeksAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── KPI Donut ────────────────────────────────────────────────────────────────

function KpiDonut({ name, actual, target, lowerBetter }) {
  const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0
  const isHit = lowerBetter ? actual <= target : actual >= target
  const color = actual > 0 ? (isHit ? '#16A34A' : '#D97706') : '#6B7280'
  const data = [{ value: pct }, { value: 100 - pct }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 120 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={data}
              cx={50} cy={50}
              innerRadius={34} outerRadius={46}
              startAngle={90} endAngle={-270}
              dataKey="value" strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="var(--border)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>
            {pct}%
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 110, lineHeight: 1.3 }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
          {actual} / {target}
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function Profile({
  user,
  session,
  scorecardMetrics = [],
  scorecardValues = [],
  leadMeasures = [],
  lmActuals = [],
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [role, setRole]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('profileData') || '{}')
    setFirstName(user?.first_name || stored.firstName || '')
    setLastName(stored.lastName || '')
    setRole(stored.role || '')
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('profileData', JSON.stringify({ firstName, lastName, role }))
    try {
      if (session?.user?.id) {
        await supabase.from('users').upsert(
          { user_id: session.user.id, first_name: firstName, onboarded: true },
          { onConflict: 'user_id' }
        )
      }
    } catch {}
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Avatar initials
  const initials = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'

  // ── Chart Data ──────────────────────────────────────────────────────────────

  const donutMetrics = scorecardMetrics.slice(0, 4).map(metric => {
    const sv = scorecardValues.find(v => v.metric_id === metric.id)
    return { id: metric.id, name: metric.name, actual: sv ? Number(sv.actual) : 0, target: Number(metric.target), lowerBetter: metric.lower_better }
  })

  const barData = scorecardMetrics.map(metric => {
    const sv = scorecardValues.find(v => v.metric_id === metric.id)
    return {
      name: metric.name.length > 14 ? metric.name.slice(0, 14) + '…' : metric.name,
      Actual: sv ? Number(sv.actual) : 0,
      Target: Number(metric.target),
    }
  })

  const trendData = Array.from({ length: 8 }, (_, i) => {
    const wk = getWeekKey(7 - i)
    const hits = leadMeasures.filter(lm => {
      const a = lmActuals.find(a => a.lead_measure_id === lm.id && a.week_start === wk)
      return a && Number(a.actual) >= Number(lm.weekly_target)
    }).length
    return {
      week: getWeekLabel(7 - i),
      'Hit Rate': leadMeasures.length > 0 ? Math.round((hits / leadMeasures.length) * 100) : 0,
    }
  })

  const hasKpiData = scorecardMetrics.length > 0 || leadMeasures.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 64 }}>

      {/* Header */}
      <div>
        <h1 className="font-serif" style={{ fontWeight: 300, fontSize: 26, color: 'var(--text-primary)', marginBottom: 4 }}>
          Profile
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Your identity and performance at a glance.
        </p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Avatar preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--gradient-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#1A1D23', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {role || 'Your Role'}
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="label-mono">First Name</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="label-mono">Last Name</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <label className="label-mono">Role / Title</label>
            <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Founder, CEO, Executive" />
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 13, color: 'var(--status-green)', fontFamily: 'IBM Plex Mono' }}>
                ✓ Profile saved
              </motion.span>
            )}
          </AnimatePresence>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Donut KPIs */}
      {donutMetrics.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span className="label-mono">KPI Progress</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', padding: '8px 0' }}>
            {donutMetrics.map(m => <KpiDonut key={m.id} {...m} />)}
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {barData.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="label-mono">Actual vs Target</span>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
              <RTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
              <Bar dataKey="Actual" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target" fill="var(--border-strong)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Line Chart */}
      {leadMeasures.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="label-mono">Weekly Hit Rate Trend</span>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <RTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}%`, 'Hit Rate']} />
              <Line type="monotone" dataKey="Hit Rate" stroke="#C9A84C" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#C9A84C' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!hasKpiData && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Your KPI charts will appear here once you add metrics in the{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Scorecard</strong> section.
          </p>
        </div>
      )}

    </div>
  )
}

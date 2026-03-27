// FILE: src/modules/CalendarModule.jsx
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize2, X, MapPin, Clock, Calendar } from 'lucide-react'

const MOCK_EVENTS = [
  { id: 1, title: 'Weekly Team Standup', start: new Date(2026, 2, 23, 9, 0), end: new Date(2026, 2, 23, 9, 30), color: '#2563EB', location: 'Google Meet' },
  { id: 2, title: 'Deep Work: Q1 Strategy Doc', start: new Date(2026, 2, 23, 10, 0), end: new Date(2026, 2, 23, 12, 0), color: '#C9A84C', location: '' },
  { id: 3, title: 'Lunch with Sarah', start: new Date(2026, 2, 24, 12, 0), end: new Date(2026, 2, 24, 13, 0), color: '#DB2777', location: 'The Capital Grille' },
  { id: 4, title: 'Investor Call — Series A', start: new Date(2026, 2, 24, 14, 0), end: new Date(2026, 2, 24, 15, 0), color: '#16A34A', location: 'Zoom' },
  { id: 5, title: 'Product Review', start: new Date(2026, 2, 25, 11, 0), end: new Date(2026, 2, 25, 12, 30), color: '#7C3AED', location: 'Conference Room B' },
  { id: 6, title: 'Gym — Strength', start: new Date(2026, 2, 25, 6, 0), end: new Date(2026, 2, 25, 7, 0), color: '#16A34A', location: 'Equinox' },
  { id: 7, title: 'Leadership Podcast Recording', start: new Date(2026, 2, 26, 15, 0), end: new Date(2026, 2, 26, 16, 30), color: '#0891B2', location: 'Studio A' },
  { id: 8, title: 'Date Night', start: new Date(2026, 2, 26, 19, 0), end: new Date(2026, 2, 26, 21, 0), color: '#DB2777', location: 'Maison Française' },
  { id: 9, title: 'Board Prep', start: new Date(2026, 2, 27, 9, 0), end: new Date(2026, 2, 27, 11, 0), color: '#C9A84C', location: '' },
  { id: 10, title: 'Weekly Review', start: new Date(2026, 2, 28, 17, 0), end: new Date(2026, 2, 28, 18, 0), color: '#1C1917', location: 'Home Office' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6am–10pm

function formatTime(date) {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`
}

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CalendarModule({ googleToken, onConnect }) {
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 26))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const navigate = (dir) => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date(2026, 2, 26))

  useEffect(() => {
    if (!expanded) return
    const handler = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  if (!googleToken) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>Connect Google Calendar</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            See your schedule, track commitments, and let your Advisor plan around your real calendar.
          </p>
          <button className="btn-primary" onClick={onConnect} style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}>
            Connect Google Calendar
          </button>
        </div>
      </div>
    )
  }

  const calendarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: expanded ? '100vh' : 'auto', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={goToday}>Today</button>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate(1)}>
            <ChevronRight size={16} />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {view === 'day'
              ? formatDate(currentDate)
              : view === 'week'
              ? `${MONTHS[getWeekStart(currentDate).getMonth()]} ${getWeekStart(currentDate).getFullYear()}`
              : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px', fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--gradient-btn)' : 'transparent',
                color: view === v ? '#1A1D23' : 'var(--text-secondary)',
                fontWeight: view === v ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
            title="Expand calendar"
          >
            {expanded ? <X size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Mock data notice */}
      <div style={{ background: 'var(--gold-glow)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-gold)', flexShrink: 0 }}>
        Showing sample events — Connect Google Calendar to see your real schedule.
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'day' && <DayView date={currentDate} onEventClick={setSelectedEvent} />}
        {view === 'week' && <WeekView weekStart={getWeekStart(currentDate)} onEventClick={setSelectedEvent} />}
        {view === 'month' && <MonthView date={currentDate} onEventClick={setSelectedEvent} />}
      </div>
    </div>
  )

  return (
    <>
      {/* Normal view */}
      {!expanded && (
        <div className="card" style={{ padding: 24 }}>
          {calendarContent}
        </div>
      )}

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="cal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'var(--bg-page)', padding: 32, overflow: 'auto',
            }}
          >
            {calendarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event detail panel */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

function DayView({ date, onEventClick }) {
  const dayEvents = MOCK_EVENTS.filter(e => isSameDay(e.start, date))

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr' }}>
        {HOURS.map(h => {
          const slotEvents = dayEvents.filter(e => e.start.getHours() === h)
          return (
            <div key={h} style={{ display: 'contents' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono', paddingRight: 12, textAlign: 'right', paddingTop: 2 }}>
                {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', minHeight: 56, position: 'relative', paddingTop: 2, paddingBottom: 2 }}>
                {slotEvents.map(ev => (
                  <EventBlock key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ weekStart, onEventClick }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const today = new Date(2026, 2, 26)

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', marginBottom: 4 }}>
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today)
          return (
            <div key={i} style={{ textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {DAYS[d.getDay()]}
              </div>
              <div style={{
                fontSize: 18, fontWeight: isToday ? 700 : 400, marginTop: 4,
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '4px auto 0',
                background: isToday ? 'var(--gradient-btn)' : 'transparent',
                color: isToday ? '#1A1D23' : 'var(--text-primary)',
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      {HOURS.map(h => (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono', paddingRight: 12, textAlign: 'right', paddingTop: 2 }}>
            {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
          </div>
          {days.map((d, i) => {
            const slotEvents = MOCK_EVENTS.filter(e => isSameDay(e.start, d) && e.start.getHours() === h)
            return (
              <div key={i} style={{ borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)', minHeight: 48, position: 'relative', padding: 2 }}>
                {slotEvents.map(ev => (
                  <EventBlock key={ev.id} event={ev} compact onClick={onEventClick} />
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MonthView({ date, onEventClick }) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date(2026, 2, 26)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} style={{ minHeight: 100, background: 'var(--bg-input)', borderRadius: 4, opacity: 0.3 }} />
          const cellDate = new Date(year, month, day)
          const dayEvents = MOCK_EVENTS.filter(e => isSameDay(e.start, cellDate))
          const isToday = isSameDay(cellDate, today)
          return (
            <div key={day} style={{ minHeight: 100, background: isToday ? 'rgba(201,168,76,0.04)' : 'var(--bg-card)', border: isToday ? '1px solid rgba(201,168,76,0.3)' : '1px solid var(--border)', borderRadius: 6, padding: 6 }}>
              <div style={{
                fontSize: 13, fontWeight: isToday ? 700 : 400,
                color: isToday ? 'var(--gold-dark)' : 'var(--text-secondary)',
                marginBottom: 4,
              }}>
                {day}
              </div>
              {dayEvents.slice(0, 3).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: ev.color + '22', borderRadius: 4, padding: '2px 6px',
                    marginBottom: 2, fontSize: 11, color: ev.color, border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontWeight: 500,
                  }}
                >
                  {ev.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventBlock({ event, compact, onClick }) {
  const durationMins = (event.end - event.start) / 60000
  return (
    <button
      onClick={() => onClick(event)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: event.color + '22',
        borderLeft: `3px solid ${event.color}`,
        borderRadius: compact ? 4 : 6,
        padding: compact ? '2px 4px' : '4px 8px',
        marginBottom: 2, fontSize: compact ? 11 : 12,
        color: event.color, border: 'none',
        borderLeft: `3px solid ${event.color}`,
        cursor: 'pointer', fontWeight: 500,
        overflow: 'hidden',
      }}
    >
      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
      {!compact && (
        <div style={{ fontSize: 10, color: event.color, opacity: 0.8, fontFamily: 'IBM Plex Mono', marginTop: 1 }}>
          {formatTime(event.start)} – {formatTime(event.end)}
        </div>
      )}
    </button>
  )
}

function EventDetailPanel({ event, onClose }) {
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 360,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: event.color }} />
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{event.title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(event.start)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Clock size={16} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {formatTime(event.start)} – {formatTime(event.end)}
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
              {Math.round((event.end - event.start) / 60000)} min
            </span>
          </div>
        </div>
        {event.location && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MapPin size={16} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{event.location}</div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

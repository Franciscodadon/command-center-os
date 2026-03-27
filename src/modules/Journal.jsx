// FILE: src/modules/Journal.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Mic, MicOff, Sparkles, Loader2,
  Search, X, Copy, Check, ChevronDown, ChevronUp, Tag, Send
} from 'lucide-react'
import { claudeChat, AGENT_SYSTEM_PROMPT } from '../lib/claude'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return formatDateKey(d)
}

const MOOD_COLORS = ['#DC2626', '#D97706', '#EAB308', '#65A30D', '#16A34A']
const MOOD_LABELS = ['Depleted', 'Low', 'Neutral', 'Good', 'Energized']

// ─── Mic Button ───────────────────────────────────────────────────────────────
function MicButton({ onTranscript, targetRef }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggle = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ')
      onTranscript(transcript)
    }
    rec.onerror = () => { setListening(false) }
    rec.onend = () => { setListening(false) }
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }, [listening, onTranscript])

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center rounded-lg transition-all"
      style={{
        width: 32,
        height: 32,
        background: listening ? 'rgba(220,38,38,0.1)' : 'var(--bg-input)',
        border: `1px solid ${listening ? 'var(--status-red)' : 'var(--border)'}`,
        color: listening ? 'var(--status-red)' : 'var(--text-muted)',
        flexShrink: 0,
      }}
      title={listening ? 'Stop recording' : 'Start voice input'}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  )
}

// ─── Journal Field ─────────────────────────────────────────────────────────────
function JournalField({ label, prompt, value, onChange }) {
  const ref = useRef(null)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="label-mono">{label}</label>
        <MicButton onTranscript={t => onChange(value ? value + ' ' + t : t)} />
      </div>
      {prompt && <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{prompt}</p>}
      <textarea
        ref={ref}
        className="input"
        rows={3}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={prompt || label}
      />
    </div>
  )
}

// ─── Mood Tracker ─────────────────────────────────────────────────────────────
function MoodTracker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-mono">Mood</span>
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-7 h-7 rounded-full transition-all duration-150"
              style={{
                background: MOOD_COLORS[n - 1],
                opacity: value === n ? 1 : 0.3,
                transform: value === n ? 'scale(1.25)' : 'scale(1)',
                boxShadow: value === n ? `0 0 10px ${MOOD_COLORS[n - 1]}66` : 'none',
              }}
            />
            <span
              className="text-xs transition-opacity"
              style={{
                color: value === n ? MOOD_COLORS[n - 1] : 'var(--text-muted)',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
                opacity: value === n ? 1 : 0.6,
              }}
            >
              {n}
            </span>
          </button>
        ))}
        {value && (
          <span className="text-sm ml-2" style={{ color: MOOD_COLORS[value - 1] }}>
            {MOOD_LABELS[value - 1]}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Daily Journal Tab ─────────────────────────────────────────────────────────
function DailyJournal({ journalEntries, onSaveEntry }) {
  const [currentDate, setCurrentDate] = useState(formatDateKey(new Date()))
  const [form, setForm] = useState({ gratitude: '', wins: '', reflections: '', notes: '', mood: null })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef(null)

  // Load entry for current date
  useEffect(() => {
    const entry = journalEntries.find(e => e.date === currentDate)
    if (entry) {
      setForm({
        gratitude: entry.gratitude || '',
        wins: entry.wins || '',
        reflections: entry.reflections || '',
        notes: entry.notes || '',
        mood: entry.mood || null,
      })
    } else {
      setForm({ gratitude: '', wins: '', reflections: '', notes: '', mood: null })
    }
    setAiOutput('')
  }, [currentDate, journalEntries])

  const setField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Debounced save
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSaveEntry({ date: currentDate, ...next })
        setSaved(true)
        setTimeout(() => setSaved(false), 1200)
      }, 500)
      return next
    })
  }

  const today = formatDateKey(new Date())
  const isToday = currentDate === today

  const runAiReflection = async () => {
    setAiLoading(true)
    setAiOutput('')
    try {
      const hasContent = form.gratitude || form.wins || form.reflections || form.notes
      if (!hasContent) {
        setAiOutput("Add some journal entries for the day first, then I can reflect with you.")
        setAiLoading(false)
        return
      }
      const prompt = `Today's journal entry (${currentDate}):

Gratitude: ${form.gratitude || '(not filled)'}
Wins: ${form.wins || '(not filled)'}
Reflections: ${form.reflections || '(not filled)'}
Open Notes: ${form.notes || '(not filled)'}
Mood: ${form.mood ? `${form.mood}/5 (${MOOD_LABELS[form.mood - 1]})` : 'not recorded'}

Give me one specific observation about what today's entry reveals, and one probing question that will help me go deeper.`

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

  return (
    <div className="flex flex-col gap-5">
      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" style={{ padding: '7px 10px' }} onClick={() => setCurrentDate(d => offsetDate(d, -1))}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {formatDisplayDate(currentDate)}
          </span>
          {isToday && <span className="label-gold">Today</span>}
        </div>
        <button className="btn-ghost" style={{ padding: '7px 10px' }} onClick={() => setCurrentDate(d => offsetDate(d, 1))} disabled={currentDate >= today}>
          <ChevronRight size={16} style={{ opacity: currentDate >= today ? 0.3 : 1 }} />
        </button>
      </div>

      {/* Mood */}
      <MoodTracker value={form.mood} onChange={v => setField('mood', v)} />

      {/* Journal fields */}
      <JournalField
        label="Gratitude"
        prompt="What am I grateful for today?"
        value={form.gratitude}
        onChange={v => setField('gratitude', v)}
      />
      <JournalField
        label="Wins"
        prompt="What moved forward, however small?"
        value={form.wins}
        onChange={v => setField('wins', v)}
      />
      <JournalField
        label="Reflections"
        prompt="What am I learning? What would I do differently?"
        value={form.reflections}
        onChange={v => setField('reflections', v)}
      />
      <JournalField
        label="Open Notes"
        prompt=""
        value={form.notes}
        onChange={v => setField('notes', v)}
      />

      {/* Auto-save indicator */}
      <AnimatePresence>
        {saved && (
          <motion.span
            className="label-mono self-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ color: 'var(--status-green)' }}
          >
            Saved
          </motion.span>
        )}
      </AnimatePresence>

      {/* AI Reflection */}
      <div className="flex flex-col gap-3">
        <button
          className="btn-ghost flex items-center gap-2 self-start"
          onClick={runAiReflection}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} style={{ color: 'var(--gold)' }} />}
          AI Reflection
        </button>

        <AnimatePresence>
          {(aiOutput || aiLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card flex flex-col gap-3"
              style={{ borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.03)' }}
            >
              <span className="label-gold flex items-center gap-1.5">
                <Sparkles size={11} /> Reflection
              </span>
              {aiLoading && !aiOutput ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={13} className="animate-spin" />
                  <span className="text-sm">Reflecting...</span>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {aiOutput}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Vault Entry Card ──────────────────────────────────────────────────────────
function VaultEntryCard({ entry, onDevelop }) {
  const [expanded, setExpanded] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [devOutput, setDevOutput] = useState('')
  const [devExpanded, setDevExpanded] = useState(false)

  const runDevelop = async () => {
    setDevLoading(true)
    setDevExpanded(true)
    setDevOutput('')
    try {
      const prompt = `Vault entry: "${entry.content}"

Evaluate this thought:
1. Signal strength (1-10 with one sentence rationale)
2. Real opportunity here (be concrete)
3. First step if I were to act on this`

      const result = await claudeChat(
        [{ role: 'user', content: prompt }],
        AGENT_SYSTEM_PROMPT
      )
      setDevOutput(result)
    } catch (err) {
      setDevOutput('Error reaching advisor.')
    }
    setDevLoading(false)
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="label-mono">{formatShortDate(entry.date)}</span>
          <p
            className="text-sm leading-relaxed"
            style={{
              color: 'var(--text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {entry.content}
          </p>
          {entry.content && entry.content.length > 180 && (
            <button
              className="text-xs self-start"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.tags.map(tag => (
                <span key={tag} className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn-ghost flex items-center gap-1.5 flex-shrink-0"
          style={{ padding: '6px 10px', fontSize: 12 }}
          onClick={runDevelop}
          disabled={devLoading}
        >
          {devLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} style={{ color: 'var(--gold)' }} />}
          Develop This
        </button>
      </div>

      <AnimatePresence>
        {devExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="flex flex-col gap-2 pt-3 mt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span className="label-gold flex items-center gap-1.5">
                <Sparkles size={11} /> Development
              </span>
              {devLoading && !devOutput ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={13} className="animate-spin" />
                  <span className="text-sm">Analyzing signal...</span>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {devOutput}
                </p>
              )}
              <button
                className="text-xs self-start mt-1"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setDevExpanded(false)}
              >
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Thought Vault Tab ─────────────────────────────────────────────────────────
function ThoughtVault({ vaultEntries, onSaveVaultEntry }) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!input.trim()) return
    setSubmitting(true)
    await onSaveVaultEntry({ content: input.trim(), date: formatDateKey(new Date()), tags: [] })
    setInput('')
    setSubmitting(false)
  }

  const filtered = vaultEntries.filter(e =>
    !search || e.content?.toLowerCase().includes(search.toLowerCase()) ||
    e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Capture */}
      <div className="card flex flex-col gap-3">
        <span className="label-mono">Capture a thought</span>
        <div className="flex gap-2 items-start">
          <textarea
            className="input flex-1"
            rows={3}
            placeholder="What are you noticing?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit() }}
          />
          <MicButton onTranscript={t => setInput(v => v ? v + ' ' + t : t)} />
        </div>
        <div className="flex justify-end">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={submit}
            disabled={submitting || !input.trim()}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Save to Vault
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          className="input"
          placeholder="Search vault..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12">
          <Tag size={24} style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No matching entries.' : 'Your vault is empty. Capture your first thought above.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {filtered.map(entry => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <VaultEntryCard entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Past Entries Tab ──────────────────────────────────────────────────────────
function PastEntries({ journalEntries }) {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [moodFilter, setMoodFilter] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const filtered = journalEntries
    .filter(e => {
      if (search) {
        const hay = [e.gratitude, e.wins, e.reflections, e.notes].join(' ').toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      if (moodFilter && e.mood !== moodFilter) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="card flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search entries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 130 }}>
            <label className="label-mono">From</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 130 }}>
            <label className="label-mono">To</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Mood</label>
            <div className="flex items-center gap-1.5 h-10">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setMoodFilter(moodFilter === n ? null : n)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: MOOD_COLORS[n - 1],
                    opacity: moodFilter === null || moodFilter === n ? 1 : 0.3,
                    transform: moodFilter === n ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={MOOD_LABELS[n - 1]}
                />
              ))}
              {moodFilter && (
                <button onClick={() => setMoodFilter(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <span className="label-mono">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</span>

      {/* Entry cards */}
      {filtered.length === 0 ? (
        <div className="card flex items-center justify-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(entry => {
            const isExpanded = expandedId === entry.id
            const preview = [entry.gratitude, entry.wins, entry.reflections, entry.notes].filter(Boolean).join(' — ')
            return (
              <motion.div
                key={entry.id}
                layout
                className="card flex flex-col gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {entry.mood && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: MOOD_COLORS[entry.mood - 1] }}
                        title={MOOD_LABELS[entry.mood - 1]}
                      />
                    )}
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatDisplayDate(entry.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.mood && (
                      <span className="label-mono" style={{ color: MOOD_COLORS[entry.mood - 1] }}>
                        {MOOD_LABELS[entry.mood - 1]}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {!isExpanded && preview && (
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {preview}
                  </p>
                )}

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        {entry.gratitude && (
                          <div>
                            <span className="label-mono block mb-1">Gratitude</span>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{entry.gratitude}</p>
                          </div>
                        )}
                        {entry.wins && (
                          <div>
                            <span className="label-mono block mb-1">Wins</span>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{entry.wins}</p>
                          </div>
                        )}
                        {entry.reflections && (
                          <div>
                            <span className="label-mono block mb-1">Reflections</span>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{entry.reflections}</p>
                          </div>
                        )}
                        {entry.notes && (
                          <div>
                            <span className="label-mono block mb-1">Open Notes</span>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function Journal({ journalEntries = [], vaultEntries = [], onSaveEntry, onSaveVaultEntry }) {
  const TABS = ['Daily Journal', 'Thought Vault', 'Past Entries']
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>Journal</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Reflect. Capture. Develop.</p>
      </div>

      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className="relative px-4 pb-3 pt-1 text-sm font-medium transition-colors"
            style={{
              color: activeTab === i ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {tab}
            {activeTab === i && (
              <motion.div
                layoutId="journal-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--gold)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 0 && (
            <DailyJournal journalEntries={journalEntries} onSaveEntry={onSaveEntry} />
          )}
          {activeTab === 1 && (
            <ThoughtVault vaultEntries={vaultEntries} onSaveVaultEntry={onSaveVaultEntry} />
          )}
          {activeTab === 2 && (
            <PastEntries journalEntries={journalEntries} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

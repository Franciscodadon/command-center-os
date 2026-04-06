// FILE: src/modules/PriorityMatrix.jsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, ChevronDown, ChevronRight, LayoutGrid, List,
  CheckCircle2, Circle, ChevronUp, Trash2, AlertTriangle,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUADRANTS = [
  {
    id: 'Q1', code: 'Q1', label: 'Do First',
    descriptor: 'Urgent & Important',
    color: '#DC2626', bg: 'rgba(220,38,38,0.06)',
    borderColor: '#DC2626',
  },
  {
    id: 'Q2', code: 'Q2', label: 'Schedule',
    descriptor: 'Not Urgent & Important',
    color: '#2563EB', bg: 'rgba(37,99,235,0.06)',
    borderColor: '#2563EB',
  },
  {
    id: 'Q3', code: 'Q3', label: 'Delegate',
    descriptor: 'Urgent & Not Important',
    color: '#D97706', bg: 'rgba(217,119,6,0.06)',
    borderColor: '#D97706',
  },
  {
    id: 'Q4', code: 'Q4', label: 'Eliminate',
    descriptor: 'Not Urgent & Not Important',
    color: '#6B7280', bg: 'rgba(107,114,128,0.06)',
    borderColor: '#6B7280',
  },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAreaColor(area) {
  return AREAS.find(a => a.value === area)?.color || '#6B7280'
}

function AreaChip({ area }) {
  if (!area) return null
  const color = getAreaColor(area)
  return (
    <span style={{
      background: color + '18', color, borderRadius: 20, padding: '1px 7px',
      fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {area}
    </span>
  )
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function subtaskProgress(task) {
  if (!task.subtasks?.length) return null
  const done = task.subtasks.filter(s => s.completed).length
  return `${done}/${task.subtasks.length}`
}

// ─── Task Expand Panel ────────────────────────────────────────────────────────

function TaskExpandPanel({ task, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [area, setArea]   = useState(task.area || '')
  const [dueDate, setDueDate] = useState(task.due_date || '')

  const save = () => {
    onUpdate?.(task.id, { title, notes, area_of_life: area, due_date: dueDate })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px', marginTop: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      <input
        className="input" value={title} onChange={e => setTitle(e.target.value)}
        style={{ marginBottom: 10, fontWeight: 500 }}
      />
      <textarea
        className="input" value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes…" rows={2} style={{ marginBottom: 10 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <select className="input" value={area} onChange={e => setArea(e.target.value)}
          style={{ appearance: 'none', cursor: 'pointer' }}>
          <option value="">No area</option>
          {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: '7px 12px', fontSize: 12 }}>Cancel</button>
        <button
          onClick={() => onDelete?.(task.id)}
          style={{
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
            color: 'var(--status-red)', borderRadius: 8, padding: '7px 12px',
            cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Trash2 size={12} />
        </button>
        <button className="btn-primary" onClick={save} style={{ flex: 2, padding: '7px 12px', fontSize: 12 }}>Save</button>
      </div>
    </motion.div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, quadrantColor, onUpdate, onDelete, dragHandlers, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const overdue = isOverdue(task.due_date)
  const sub = subtaskProgress(task)
  const showReorder = !isFirst || !isLast // only show if there are multiple tasks

  const handleComplete = (e) => {
    e.stopPropagation()
    onUpdate?.(task.id, { done: !task.done })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2 }}
      draggable
      {...dragHandlers}
      style={{ marginBottom: 8, cursor: 'grab' }}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '11px 13px',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          opacity: task.done ? 0.5 : 1,
        }}
        onMouseEnter={e => { setHovered(true); e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
        onMouseLeave={e => { setHovered(false); e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <button
            onClick={handleComplete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1, color: quadrantColor }}
          >
            {task.done
              ? <CheckCircle2 size={16} />
              : <Circle size={16} style={{ color: 'var(--border-strong)' }} />
            }
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4,
              textDecoration: task.done ? 'line-through' : 'none',
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
              {task.area && <AreaChip area={task.area} />}
              {task.due_date && (
                <span style={{
                  fontSize: 10, fontFamily: 'IBM Plex Mono',
                  color: overdue ? 'var(--status-red)' : 'var(--text-muted)',
                  fontWeight: overdue ? 600 : 400,
                }}>
                  {overdue ? '⚠ ' : ''}{formatDueDate(task.due_date)}
                </span>
              )}
              {sub && (
                <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)' }}>
                  ☐ {sub}
                </span>
              )}
            </div>
          </div>

          {/* Reorder buttons — visible on hover when multiple tasks exist */}
          {showReorder && hovered && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={e => { e.stopPropagation(); onMoveUp?.() }}
                disabled={isFirst}
                style={{
                  background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
                  padding: '1px 3px', borderRadius: 4, display: 'flex',
                  color: isFirst ? 'var(--border-strong)' : 'var(--text-muted)',
                }}
                onMouseEnter={e => { if (!isFirst) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = isFirst ? 'var(--border-strong)' : 'var(--text-muted)' }}
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onMoveDown?.() }}
                disabled={isLast}
                style={{
                  background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer',
                  padding: '1px 3px', borderRadius: 4, display: 'flex',
                  color: isLast ? 'var(--border-strong)' : 'var(--text-muted)',
                }}
                onMouseEnter={e => { if (!isLast) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = isLast ? 'var(--border-strong)' : 'var(--text-muted)' }}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}

          {(!showReorder || !hovered) && (
            <ChevronDown
              size={13}
              color="var(--text-muted)"
              style={{ flexShrink: 0, marginTop: 2, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <TaskExpandPanel
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Inline Add ───────────────────────────────────────────────────────────────

function InlineAdd({ quadrant, onAdd }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const submit = () => {
    if (!value.trim()) return
    onAdd({ title: value.trim(), quadrant, done: false })
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          width: '100%', background: 'none',
          border: '1px dashed var(--border)', borderRadius: 8,
          padding: '8px 12px', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold-dark)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Plus size={12} /> Add task
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        ref={inputRef}
        className="input"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setValue('') } }}
        placeholder="Task title…"
        style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
      />
      <button
        onClick={submit}
        style={{
          background: 'var(--gradient-btn)', border: 'none', borderRadius: 8,
          padding: '8px 12px', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <Plus size={14} color="#1A1D23" />
      </button>
      <button
        onClick={() => { setOpen(false); setValue('') }}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', flexShrink: 0 }}
      >
        <X size={13} color="var(--text-muted)" />
      </button>
    </div>
  )
}

// ─── Quadrant ─────────────────────────────────────────────────────────────────

function Quadrant({ quadrant, tasks, onCreateTask, onUpdateTask, onDeleteTask, dragState, onDragStart, onDragOver, onDrop, onMoveTask }) {
  const activeTasks = tasks.filter(t => !t.done)
  const completedTasks = tasks.filter(t => t.done)
  const [showCompleted, setShowCompleted] = useState(false)
  const isDragOver = dragState?.overQuadrant === quadrant.id

  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(quadrant.id) }}
      onDrop={e => { e.preventDefault(); onDrop(quadrant.id) }}
      style={{
        background: isDragOver ? quadrant.bg : 'var(--bg-page)',
        border: `1px solid ${isDragOver ? quadrant.color : 'var(--border)'}`,
        borderRadius: 14, padding: '16px 16px 14px',
        display: 'flex', flexDirection: 'column',
        transition: 'background 0.15s, border-color 0.15s',
        minHeight: 220,
      }}
    >
      {/* Quadrant Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono',
              color: quadrant.color,
              background: quadrant.color + '15',
              borderRadius: 6, padding: '2px 8px',
            }}>{quadrant.code}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{quadrant.label}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginTop: 3 }}>
            {quadrant.descriptor}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontFamily: 'IBM Plex Mono',
          background: quadrant.color + '18', color: quadrant.color,
          borderRadius: 10, padding: '2px 8px',
        }}>{activeTasks.length}</span>
      </div>

      {/* Task List */}
      <div style={{ flex: 1 }}>
        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 12px',
            color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6,
          }}>
            No tasks. Either you've won the day<br />or you haven't started yet.
          </div>
        ) : (
          <AnimatePresence>
            {activeTasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                quadrantColor={quadrant.color}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                dragHandlers={{
                  onDragStart: () => onDragStart(task.id, task.quadrant),
                  style: { cursor: 'grab' },
                }}
                onMoveUp={() => onMoveTask?.(task.id, quadrant.id, 'up')}
                onMoveDown={() => onMoveTask?.(task.id, quadrant.id, 'down')}
                isFirst={idx === 0}
                isLast={idx === activeTasks.length - 1}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Completed Tasks Toggle */}
      {completedTasks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowCompleted(s => !s)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0',
            }}
          >
            {showCompleted ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {completedTasks.length} completed
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                {completedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    quadrantColor={quadrant.color}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                    dragHandlers={{ onDragStart: () => onDragStart(task.id, task.quadrant) }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add Task */}
      <InlineAdd quadrant={quadrant.id} onAdd={onCreateTask} />
    </div>
  )
}

// ─── Unclassified Inbox ───────────────────────────────────────────────────────

function UnclassifiedInbox({ tasks, onUpdateTask, onDeleteTask }) {
  const [open, setOpen] = useState(true)
  if (tasks.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 10,
          background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)',
        }}
      >
        <AlertTriangle size={14} color="var(--status-red)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-red)' }}>
          Unclassified Inbox
        </span>
        <span style={{
          fontSize: 11, fontFamily: 'IBM Plex Mono',
          background: 'rgba(220,38,38,0.15)', color: 'var(--status-red)',
          borderRadius: 10, padding: '1px 7px',
        }}>{tasks.length}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>
          — drag to a quadrant to classify
        </span>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              border: '1px solid rgba(220,38,38,0.15)', borderTop: 'none',
              borderRadius: '0 0 10px 10px', padding: '12px 14px',
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '7px 12px',
                    fontSize: 13, color: 'var(--text-primary)', cursor: 'grab',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {task.title}
                  <button
                    onClick={() => onDeleteTask?.(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ tasks, onUpdateTask, onDeleteTask }) {
  const sorted = [...tasks].sort((a, b) => {
    const qOrder = { Q1: 0, Q2: 1, Q3: 2, Q4: 3, unclassified: 4 }
    if (qOrder[a.quadrant] !== qOrder[b.quadrant]) return qOrder[a.quadrant] - qOrder[b.quadrant]
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Table Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px',
        padding: '10px 18px', borderBottom: '1px solid var(--border)',
        gap: 12,
      }}>
        {['Quad', 'Task', 'Area', 'Due Date', 'Status'].map(h => (
          <span key={h} className="label-mono">{h}</span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
          No tasks yet.
        </div>
      ) : (
        <AnimatePresence>
          {sorted.map((task, i) => {
            const q = QUADRANTS.find(q => q.id === task.quadrant)
            const overdue = isOverdue(task.due_date)
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 80px',
                  padding: '11px 18px', gap: 12, alignItems: 'center',
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                  background: task.completed ? 'var(--bg-input)' : 'transparent',
                }}
              >
                {/* Quad */}
                <span style={{
                  fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700,
                  color: q?.color || 'var(--text-muted)',
                  background: (q?.color || '#999') + '15',
                  borderRadius: 6, padding: '2px 7px', display: 'inline-block',
                }}>
                  {task.quadrant || '—'}
                </span>

                {/* Task Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => onUpdateTask?.(task.id, { done: !task.done })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: q?.color || 'var(--text-muted)', flexShrink: 0 }}
                  >
                    {task.completed ? <CheckCircle2 size={15} /> : <Circle size={15} style={{ color: 'var(--border-strong)' }} />}
                  </button>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    textDecoration: task.done ? 'line-through' : 'none',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {task.title}
                  </span>
                </div>

                {/* Area */}
                <div>{task.area ? <AreaChip area={task.area} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</div>

                {/* Due Date */}
                <span style={{
                  fontSize: 12, fontFamily: 'IBM Plex Mono',
                  color: overdue ? 'var(--status-red)' : 'var(--text-muted)',
                  fontWeight: overdue ? 600 : 400,
                }}>
                  {task.due_date ? formatDueDate(task.due_date) : '—'}
                </span>

                {/* Delete */}
                <button
                  onClick={() => onDeleteTask?.(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}
    </div>
  )
}

// ─── Brain Dump ───────────────────────────────────────────────────────────────

function BrainDump({ items, onAdd, onRemove, onAssign, onDragStart }) {
  const [input, setInput] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const inputRef = useRef(null)

  const add = () => {
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  const QUAD_OPTIONS = [
    { id: 'Q1', label: 'Q1 — Do First',   color: '#DC2626' },
    { id: 'Q2', label: 'Q2 — Schedule',   color: '#2563EB' },
    { id: 'Q3', label: 'Q3 — Delegate',   color: '#D97706' },
    { id: 'Q4', label: 'Q4 — Eliminate',  color: '#6B7280' },
  ]

  return (
    <div style={{
      marginBottom: 20,
      background: 'var(--bg-page)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Brain Dump</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
          — capture anything, then assign to a quadrant
        </span>
        {items.length > 0 && (
          <span style={{
            fontSize: 11, fontFamily: 'IBM Plex Mono',
            background: 'rgba(201,168,76,0.15)', color: 'var(--gold-dark)',
            borderRadius: 10, padding: '2px 8px',
          }}>{items.length}</span>
        )}
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{ marginLeft: 'auto', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>

      {!collapsed && (
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Input row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add() }}
              placeholder="What's on your mind? Press Enter to add..."
              style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
            />
            <button
              onClick={add}
              style={{
                background: 'var(--gradient-btn)', border: 'none', borderRadius: 8,
                padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
            >
              <Plus size={14} color="#1A1D23" />
            </button>
          </div>

          {/* List */}
          {items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 14px',
                    cursor: 'grab',
                  }}
                >
                  {/* Index */}
                  <span style={{
                    fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)',
                    minWidth: 18, textAlign: 'right', flexShrink: 0,
                  }}>
                    {idx + 1}.
                  </span>

                  {/* Title */}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {item.title}
                  </span>

                  {/* Assign dropdown */}
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) onAssign(item.id, e.target.value)
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: 7, padding: '5px 10px', fontSize: 12,
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono', flexShrink: 0,
                      appearance: 'none', minWidth: 130,
                    }}
                  >
                    <option value="" disabled>Assign to...</option>
                    {QUAD_OPTIONS.map(q => (
                      <option key={q.id} value={q.id}>{q.label}</option>
                    ))}
                  </select>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(item.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              Nothing dumped yet. Type above and hit Enter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PriorityMatrix({ tasks = [], onCreateTask, onUpdateTask, onDeleteTask }) {
  const [viewMode, setViewMode] = useState('matrix')
  const [dragState, setDragState] = useState(null)
  const [brainDumpItems, setBrainDumpItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('brainDump') || '[]') } catch { return [] }
  })

  const [taskOrder, setTaskOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('taskOrder') || '{}') } catch { return {} }
  })

  // Persist brain dump to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('brainDump', JSON.stringify(brainDumpItems))
  }, [brainDumpItems])

  // Persist task order to localStorage
  useEffect(() => {
    localStorage.setItem('taskOrder', JSON.stringify(taskOrder))
  }, [taskOrder])

  // Sync taskOrder when tasks change (new tasks appended, deleted/moved tasks removed)
  useEffect(() => {
    setTaskOrder(prev => {
      const next = { Q1: [...(prev.Q1||[])], Q2: [...(prev.Q2||[])], Q3: [...(prev.Q3||[])], Q4: [...(prev.Q4||[])] }
      // Add new task IDs to the end of their quadrant's order
      tasks.forEach(task => {
        const q = task.quadrant
        if (!q || !['Q1','Q2','Q3','Q4'].includes(q)) return
        if (!next[q].includes(task.id)) next[q].push(task.id)
      })
      // Remove IDs that no longer exist or have moved to a different quadrant
      ;['Q1','Q2','Q3','Q4'].forEach(q => {
        next[q] = next[q].filter(id => tasks.some(t => t.id === id && t.quadrant === q))
      })
      return next
    })
  }, [tasks])

  // Sort tasks within a quadrant by stored order
  const getSortedTasks = useCallback((quadrantTasks, quadrantId) => {
    const order = taskOrder[quadrantId] || []
    return [...quadrantTasks].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [taskOrder])

  // Move a task up or down within its quadrant
  const moveTask = useCallback((taskId, quadrantId, direction) => {
    setTaskOrder(prev => {
      const order = [...(prev[quadrantId] || [])]
      const idx = order.indexOf(taskId)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= order.length) return prev
      const next = [...order]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return { ...prev, [quadrantId]: next }
    })
  }, [])

  const addBrainDumpItem = useCallback((title) => {
    setBrainDumpItems(prev => [...prev, { id: Date.now().toString(), title }])
  }, [])

  const removeBrainDumpItem = useCallback((id) => {
    setBrainDumpItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const assignBrainDumpItem = useCallback((id, quadrant) => {
    const item = brainDumpItems.find(i => i.id === id)
    if (item) {
      onCreateTask?.({ title: item.title, quadrant, done: false })
      setBrainDumpItems(prev => prev.filter(i => i.id !== id))
    }
  }, [brainDumpItems, onCreateTask])

  const unclassified = tasks.filter(t => !t.quadrant || !['Q1','Q2','Q3','Q4'].includes(t.quadrant))
  const classified = tasks.filter(t => t.quadrant && ['Q1','Q2','Q3','Q4'].includes(t.quadrant))

  const handleDragStart = useCallback((taskId, fromQuadrant) => {
    setDragState({ taskId, fromQuadrant, overQuadrant: null, fromBrainDump: false })
  }, [])

  const handleBrainDumpDragStart = useCallback((itemId) => {
    setDragState({ taskId: null, fromQuadrant: null, overQuadrant: null, fromBrainDump: true, brainDumpItemId: itemId })
  }, [])

  const handleDragOver = useCallback((quadrantId) => {
    setDragState(s => s ? { ...s, overQuadrant: quadrantId } : s)
  }, [])

  const handleDrop = useCallback((toQuadrant) => {
    if (dragState?.fromBrainDump && dragState?.brainDumpItemId) {
      const item = brainDumpItems.find(i => i.id === dragState.brainDumpItemId)
      if (item) {
        onCreateTask?.({ title: item.title, quadrant: toQuadrant, done: false })
        setBrainDumpItems(prev => prev.filter(i => i.id !== dragState.brainDumpItemId))
      }
    } else if (dragState?.taskId) {
      const task = tasks.find(t => t.id === dragState.taskId)
      if (task && task.quadrant !== toQuadrant) {
        onUpdateTask?.(task.id, { quadrant: toQuadrant })
      }
    }
    setDragState(null)
  }, [dragState, tasks, onUpdateTask, brainDumpItems, onCreateTask])

  return (
    <div style={{ padding: '0 0 64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-serif" style={{ fontWeight: 300, fontSize: 26, color: 'var(--text-primary)', marginBottom: 4 }}>
            Priority Matrix
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {classified.filter(t => !t.completed).length} active tasks across {QUADRANTS.length} quadrants.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'inline-flex', background: 'var(--bg-input)',
          borderRadius: 9, padding: 3, border: '1px solid var(--border)',
        }}>
          {[
            { id: 'matrix', Icon: LayoutGrid, label: 'Matrix' },
            { id: 'list',   Icon: List,       label: 'List'   },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                background: viewMode === id ? 'var(--bg-card)' : 'transparent',
                border: viewMode === id ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: viewMode === id ? 600 : 400,
                color: viewMode === id ? 'var(--text-primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s',
                boxShadow: viewMode === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Brain Dump */}
      <BrainDump
        items={brainDumpItems}
        onAdd={addBrainDumpItem}
        onRemove={removeBrainDumpItem}
        onAssign={assignBrainDumpItem}
        onDragStart={handleBrainDumpDragStart}
      />

      {/* Unclassified Inbox */}
      <UnclassifiedInbox tasks={unclassified} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {viewMode === 'matrix' ? (
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14 }}
              onDragEnd={() => setDragState(null)}
            >
              {QUADRANTS.map(q => (
                <Quadrant
                  key={q.id}
                  quadrant={q}
                  tasks={getSortedTasks(classified.filter(t => t.quadrant === q.id), q.id)}
                  onCreateTask={onCreateTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  dragState={dragState}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onMoveTask={moveTask}
                />
              ))}
            </div>
          ) : (
            <ListView tasks={tasks} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

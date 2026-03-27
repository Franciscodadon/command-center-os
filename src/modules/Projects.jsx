// FILE: src/modules/Projects.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, ChevronDown, Calendar, CheckSquare, Square,
  Trash2, Edit3, Sparkles, X, GripVertical, Loader2, Copy, Check
} from 'lucide-react'
import { claudeChat, AGENT_SYSTEM_PROMPT } from '../lib/claude'

const AREA_COLORS = {
  business:      '#2563EB',
  health:        '#16A34A',
  finance:       '#D97706',
  relationships: '#DB2777',
  faith:         '#C9A84C',
  learning:      '#7C3AED',
  personal:      '#0891B2',
}

const PRESET_COLORS = ['#2563EB','#16A34A','#D97706','#DB2777','#7C3AED','#0891B2','#C9A84C']

const AREAS = ['business','health','finance','relationships','faith','learning','personal']

function daysRemaining(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

function calcProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0
  const completed = tasks.filter(t => t.completed).length
  return Math.round((completed / tasks.length) * 100)
}

function StatusBadge({ status }) {
  const map = {
    active:   'badge badge-on-track',
    on_hold:  'badge badge-at-risk',
    complete: 'badge badge-complete',
  }
  const labels = { active: 'Active', on_hold: 'On Hold', complete: 'Complete' }
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>
}

function ProgressBar({ value, color }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color || 'var(--gold)' }}
      />
    </div>
  )
}

// ─── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, tasks, onClick }) {
  const projectTasks = tasks.filter(t => t.project_id === project.id && !t.parent_task_id)
  const allTasks = tasks.filter(t => t.project_id === project.id)
  const progress = calcProgress(allTasks)
  const completed = allTasks.filter(t => t.completed).length
  const days = daysRemaining(project.due_date)
  const color = project.color || AREA_COLORS[project.area] || 'var(--gold)'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="card cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col gap-3"
      style={{ padding: 0 }}
    >
      {/* Color strip */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {project.title}
          </h3>
          <StatusBadge status={project.status} />
        </div>

        {/* Description */}
        {project.description && (
          <p
            className="text-xs line-clamp-2 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {project.description}
          </p>
        )}

        {/* Progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="label-mono">{progress}% complete</span>
            <span className="label-mono">{completed} of {allTasks.length} tasks</span>
          </div>
          <ProgressBar value={progress} color={color} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {project.due_date ? (
            <div className="flex items-center gap-1.5">
              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
              <span className="label-mono">
                {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {days !== null && (
                <span
                  className="label-mono"
                  style={{ color: days < 0 ? 'var(--status-red)' : days < 7 ? 'var(--status-yellow)' : 'var(--text-muted)' }}
                >
                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}
          {project.area && (
            <span
              className="badge"
              style={{ background: `${AREA_COLORS[project.area]}18`, color: AREA_COLORS[project.area], textTransform: 'capitalize' }}
            >
              {project.area}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Add Project Panel ─────────────────────────────────────────────────────────
function AddProjectPanel({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', description: '', area: '', due_date: '', color: PRESET_COLORS[0], status: 'active' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit(form)
    setForm({ title: '', description: '', area: '', due_date: '', color: PRESET_COLORS[0], status: 'active' })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{ width: 420, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.1)' }}
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>New Project</h2>
              <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 8px', border: 'none' }}>
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1.5">
                <label className="label-mono">Title *</label>
                <input className="input" placeholder="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label-mono">Description</label>
                <textarea className="input" placeholder="What is this project about?" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="label-mono">Area of Life</label>
                  <select className="input" value={form.area} onChange={e => set('area', e.target.value)} style={{ background: 'var(--bg-input)' }}>
                    <option value="">— Select —</option>
                    {AREAS.map(a => <option key={a} value={a} style={{ textTransform: 'capitalize' }}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="label-mono">Due Date</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="label-mono">Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('color', c)}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{
                        background: c,
                        border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label-mono">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)} style={{ background: 'var(--bg-input)' }}>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Project</button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, subtasks, onToggle, onDelete, indent }) {
  return (
    <div style={{ marginLeft: indent ? 24 : 0 }}>
      <div
        className="flex items-center gap-3 py-2 px-3 rounded-lg group transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
        <button onClick={() => onToggle(task.id, !task.completed)} style={{ display: 'flex', flexShrink: 0 }}>
          {task.completed
            ? <CheckSquare size={16} style={{ color: 'var(--status-green)' }} />
            : <Square size={16} style={{ color: 'var(--text-muted)' }} />
          }
        </button>
        <span
          className="flex-1 text-sm"
          style={{
            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
        {task.due_date && (
          <span className="label-mono flex items-center gap-1" style={{ flexShrink: 0 }}>
            <Calendar size={11} />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ flexShrink: 0 }}
        >
          <Trash2 size={13} style={{ color: 'var(--status-red)' }} />
        </button>
      </div>
      {subtasks && subtasks.map(sub => (
        <TaskRow key={sub.id} task={sub} subtasks={[]} onToggle={onToggle} onDelete={onDelete} indent />
      ))}
    </div>
  )
}

// ─── Project Detail ────────────────────────────────────────────────────────────
function ProjectDetail({ project, tasks, onBack, onUpdateProject, onDeleteProject, onCreateTask, onUpdateTask }) {
  const projectTasks = tasks.filter(t => t.project_id === project.id && !t.parent_task_id)
  const allTasks = tasks.filter(t => t.project_id === project.id)
  const progress = calcProgress(allTasks)
  const color = project.color || AREA_COLORS[project.area] || 'var(--gold)'

  const [editing, setEditing] = useState({})
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const setEdit = (k, v) => setEditing(e => ({ ...e, [k]: v }))

  const saveField = (field, value) => {
    onUpdateProject(project.id, { [field]: value })
    setEditing(e => { const n = { ...e }; delete n[`editing_${field}`]; return n })
  }

  const addTask = () => {
    if (!newTaskTitle.trim()) return
    onCreateTask({ project_id: project.id, title: newTaskTitle.trim(), completed: false })
    setNewTaskTitle('')
  }

  const runAiAdvisor = async () => {
    setAiLoading(true)
    setAiOutput('')
    try {
      const completedCount = allTasks.filter(t => t.completed).length
      const prompt = `Project: "${project.title}"
Description: ${project.description || 'none'}
Area: ${project.area || 'unspecified'}
Due: ${project.due_date || 'not set'}
Status: ${project.status}
Progress: ${progress}% (${completedCount}/${allTasks.length} tasks)
Open tasks: ${projectTasks.filter(t => !t.completed).map(t => t.title).join(', ') || 'none'}

Give me:
1. Risk assessment (2-3 sentences)
2. Top 3 priorities right now
3. One question about this project I haven't asked myself yet`

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

  const completedTasks = projectTasks.filter(t => t.completed)
  const openTasks = projectTasks.filter(t => !t.completed)

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-6"
    >
      {/* Back */}
      <button
        className="flex items-center gap-2 btn-ghost self-start"
        style={{ padding: '7px 14px' }}
        onClick={onBack}
      >
        <ArrowLeft size={15} />
        <span>Projects</span>
      </button>

      {/* Header card */}
      <div className="card flex flex-col gap-4" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="h-2" style={{ background: color }} />
        <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
          {/* Title */}
          {editing.editing_title ? (
            <input
              className="input text-xl font-semibold"
              defaultValue={project.title}
              autoFocus
              onBlur={e => saveField('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveField('title', e.target.value)}
              style={{ fontSize: 20 }}
            />
          ) : (
            <h1
              className="font-semibold text-xl cursor-pointer flex items-center gap-2 group"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => setEdit('editing_title', true)}
            >
              {project.title}
              <Edit3 size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            </h1>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            {project.area && (
              <span className="badge" style={{ background: `${color}18`, color }}>
                {project.area}
              </span>
            )}
            {project.due_date && (
              <span className="label-mono flex items-center gap-1">
                <Calendar size={11} /> Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="label-mono">{progress}% complete</span>
              <span className="label-mono">{allTasks.filter(t=>t.completed).length} of {allTasks.length} tasks</span>
            </div>
            <ProgressBar value={progress} color={color} />
          </div>

          {/* Description */}
          {editing.editing_description ? (
            <textarea
              className="input"
              defaultValue={project.description}
              autoFocus
              rows={3}
              onBlur={e => saveField('description', e.target.value)}
            />
          ) : (
            <p
              className="text-sm cursor-pointer group flex gap-2"
              style={{ color: project.description ? 'var(--text-secondary)' : 'var(--text-muted)' }}
              onClick={() => setEdit('editing_description', true)}
            >
              {project.description || 'Add a description...'}
              <Edit3 size={13} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0 mt-0.5" />
            </p>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="card flex flex-col gap-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Tasks</h2>

        {/* Open tasks */}
        {openTasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            subtasks={tasks.filter(t => t.parent_task_id === task.id)}
            onToggle={(id, val) => onUpdateTask(id, { completed: val })}
            onDelete={id => onUpdateTask(id, { _delete: true })}
          />
        ))}

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="label-mono">Completed ({completedTasks.length})</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            {completedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                subtasks={[]}
                onToggle={(id, val) => onUpdateTask(id, { completed: val })}
                onDelete={id => onUpdateTask(id, { _delete: true })}
              />
            ))}
          </>
        )}

        {/* Add task */}
        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <input
            className="input flex-1"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{ minHeight: 'unset', padding: '8px 12px' }}
          />
          <button className="btn-primary flex items-center gap-1.5" style={{ padding: '8px 14px' }} onClick={addTask}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* AI Advisor */}
      <div className="flex flex-col gap-3">
        <button
          className="btn-ghost flex items-center gap-2 self-start"
          onClick={runAiAdvisor}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} style={{ color: 'var(--gold)' }} />}
          AI Project Advisor
        </button>

        <AnimatePresence>
          {(aiOutput || aiLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card flex flex-col gap-3"
              style={{ borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.04)' }}
            >
              <div className="flex items-center justify-between">
                <span className="label-gold flex items-center gap-1.5">
                  <Sparkles size={11} /> Advisor Analysis
                </span>
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
              </div>
              {aiLoading && !aiOutput ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Analyzing...</span>
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
    </motion.div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function Projects({ projects = [], projectTasks = [], onCreateProject, onUpdateProject, onDeleteProject, onCreateTask, onUpdateTask }) {
  const [selectedProject, setSelectedProject] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  // Update selected project when projects prop changes
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id)
      if (updated) setSelectedProject(updated)
    }
  }, [projects])

  const activeProject = selectedProject ? projects.find(p => p.id === selectedProject.id) : null

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {activeProject ? (
          <ProjectDetail
            key="detail"
            project={activeProject}
            tasks={projectTasks}
            onBack={() => setSelectedProject(null)}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onCreateTask={onCreateTask}
            onUpdateTask={onUpdateTask}
          />
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>Projects</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> New Project
              </button>
            </div>

            {/* Grid or Empty state */}
            {projects.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-5 py-20">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-glow)' }}>
                  <CheckSquare size={24} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="text-center flex flex-col gap-2">
                  <p className="font-serif text-lg" style={{ color: 'var(--text-primary)' }}>
                    Every outcome you want is a project you haven't started.
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Begin here.</p>
                </div>
                <button className="btn-primary" onClick={() => setAddOpen(true)}>
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                <AnimatePresence>
                  {projects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      tasks={projectTasks}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AddProjectPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={onCreateProject}
      />
    </div>
  )
}

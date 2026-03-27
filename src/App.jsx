// FILE: src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

import Sidebar from './components/Sidebar'
import AIAgent from './components/AIAgent'
import Onboarding from './modules/Onboarding'

// Lazy module imports — swap for real modules as they are built
let CommandCenter, VisionGoals, PriorityMatrix, Projects, Scorecard, Journal, CalendarModule, Inbox

try { CommandCenter  = (await import('./modules/CommandCenter')).default  } catch { CommandCenter  = Placeholder('Command Center')  }
try { VisionGoals   = (await import('./modules/VisionGoals')).default     } catch { VisionGoals   = Placeholder('Vision & Goals')   }
try { PriorityMatrix= (await import('./modules/PriorityMatrix')).default  } catch { PriorityMatrix= Placeholder('Priority Matrix')  }
try { Projects      = (await import('./modules/Projects')).default        } catch { Projects      = Placeholder('Projects')         }
try { Scorecard     = (await import('./modules/Scorecard')).default       } catch { Scorecard     = Placeholder('Scorecard')        }
try { Journal       = (await import('./modules/Journal')).default         } catch { Journal       = Placeholder('Journal')          }
try { CalendarModule= (await import('./modules/CalendarModule')).default  } catch { CalendarModule= Placeholder('Calendar')         }
try { Inbox         = (await import('./modules/Inbox')).default           } catch { Inbox         = Placeholder('Inbox')            }

function Placeholder(name) {
  return function PlaceholderModule() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This module is coming soon.</p>
        </div>
      </div>
    )
  }
}

// ── Supabase CRUD helpers ────────────────────────────────────────────────────

async function fetchTable(table, userId) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function createRow(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select().single()
  if (error) throw error
  return data
}

async function updateRow(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// ── Local storage fallback ───────────────────────────────────────────────────

const LS = {
  get: (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
  },
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession]               = useState(null)
  const [user, setUser]                     = useState(null)
  const [onboarded, setOnboarded]           = useState(false)
  const [loading, setLoading]               = useState(true)
  const [activeModule, setActiveModule]     = useState('command')
  const [syncStatus, setSyncStatus]         = useState('synced')
  const [agentOpen, setAgentOpen]           = useState(false)
  const [googleToken, setGoogleToken]       = useState(null)

  // Data state
  const [goals, setGoals]                   = useState([])
  const [tasks, setTasks]                   = useState([])
  const [projects, setProjects]             = useState([])
  const [leadMeasures, setLeadMeasures]     = useState([])
  const [lmActuals, setLmActuals]           = useState([])
  const [visionLayers, setVisionLayers]     = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [vaultEntries, setVaultEntries]     = useState([])
  const [projectTasks, setProjectTasks]     = useState([])
  const [scorecardMetrics, setScorecardMetrics] = useState([])
  const [scorecardValues, setScorecardValues]   = useState([])

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadAll(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadAll(session.user.id)
      else {
        resetState()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Online / offline listener ──────────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => { setSyncStatus('syncing'); if (session) loadAll(session.user.id) }
    const handleOffline = () => setSyncStatus('offline')
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [session])

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async (userId) => {
    if (!navigator.onLine) {
      loadFromLocalStorage()
      setSyncStatus('offline')
      setLoading(false)
      return
    }
    setSyncStatus('syncing')
    try {
      const [
        userRow, goalsData, tasksData, projectsData, lmData, lmActualsData,
        visionData, journalData, vaultData, ptData, smData, svData,
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single().then(r => r.data),
        fetchTable('goals', userId),
        fetchTable('tasks', userId),
        fetchTable('projects', userId),
        fetchTable('lead_measures', userId),
        fetchTable('lm_actuals', userId),
        fetchTable('vision_layers', userId),
        fetchTable('journal_entries', userId),
        fetchTable('vault_entries', userId),
        fetchTable('project_tasks', userId),
        fetchTable('scorecard_metrics', userId),
        fetchTable('scorecard_values', userId),
      ])

      if (userRow) {
        setUser(userRow)
        setOnboarded(!!userRow.onboarded)
      } else {
        setOnboarded(false)
      }

      setGoals(goalsData)
      setTasks(tasksData)
      setProjects(projectsData)
      setLeadMeasures(lmData)
      setLmActuals(lmActualsData)
      setVisionLayers(visionData)
      setJournalEntries(journalData)
      setVaultEntries(vaultData)
      setProjectTasks(ptData)
      setScorecardMetrics(smData)
      setScorecardValues(svData)

      // Persist to localStorage for offline fallback
      const cache = { goalsData, tasksData, projectsData, lmData, lmActualsData, visionData, journalData, vaultData, ptData, smData, svData }
      Object.entries(cache).forEach(([k, v]) => LS.set(k, v))

      setSyncStatus('synced')
    } catch (err) {
      console.error('Load error:', err)
      loadFromLocalStorage()
      setSyncStatus('offline')
    }
    setLoading(false)
  }, [])

  const loadFromLocalStorage = () => {
    setGoals(LS.get('goalsData'))
    setTasks(LS.get('tasksData'))
    setProjects(LS.get('projectsData'))
    setLeadMeasures(LS.get('lmData'))
    setLmActuals(LS.get('lmActualsData'))
    setVisionLayers(LS.get('visionData'))
    setJournalEntries(LS.get('journalData'))
    setVaultEntries(LS.get('vaultData'))
    setProjectTasks(LS.get('ptData'))
    setScorecardMetrics(LS.get('smData'))
    setScorecardValues(LS.get('svData'))
  }

  const resetState = () => {
    setUser(null); setOnboarded(false)
    setGoals([]); setTasks([]); setProjects([])
    setLeadMeasures([]); setLmActuals([])
    setVisionLayers([]); setJournalEntries([])
    setVaultEntries([]); setProjectTasks([])
    setScorecardMetrics([]); setScorecardValues([])
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    resetState()
  }

  // ── Onboarding complete ────────────────────────────────────────────────────
  const handleOnboardingComplete = () => {
    setOnboarded(true)
    if (session) loadAll(session.user.id)
  }

  // ── CRUD helpers ───────────────────────────────────────────────────────────

  // Goals
  const createGoal = async (payload) => {
    const row = await createRow('goals', { ...payload, user_id: session.user.id })
    setGoals(prev => [row, ...prev])
    return row
  }
  const updateGoal = async (id, payload) => {
    const row = await updateRow('goals', id, payload)
    setGoals(prev => prev.map(g => g.id === id ? row : g))
    return row
  }
  const deleteGoal = async (id) => {
    await deleteRow('goals', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  // Tasks
  const createTask = async (payload) => {
    const row = await createRow('tasks', { ...payload, user_id: session.user.id })
    setTasks(prev => [row, ...prev])
    return row
  }
  const updateTask = async (id, payload) => {
    const row = await updateRow('tasks', id, payload)
    setTasks(prev => prev.map(t => t.id === id ? row : t))
    return row
  }
  const deleteTask = async (id) => {
    await deleteRow('tasks', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Projects
  const createProject = async (payload) => {
    const row = await createRow('projects', { ...payload, user_id: session.user.id })
    setProjects(prev => [row, ...prev])
    return row
  }
  const updateProject = async (id, payload) => {
    const row = await updateRow('projects', id, payload)
    setProjects(prev => prev.map(p => p.id === id ? row : p))
    return row
  }
  const deleteProject = async (id) => {
    await deleteRow('projects', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  // Lead Measures
  const createLeadMeasure = async (payload) => {
    const row = await createRow('lead_measures', { ...payload, user_id: session.user.id })
    setLeadMeasures(prev => [row, ...prev])
    return row
  }
  const updateLeadMeasure = async (id, payload) => {
    const row = await updateRow('lead_measures', id, payload)
    setLeadMeasures(prev => prev.map(l => l.id === id ? row : l))
    return row
  }
  const deleteLeadMeasure = async (id) => {
    await deleteRow('lead_measures', id)
    setLeadMeasures(prev => prev.filter(l => l.id !== id))
  }

  // LM Actuals
  const createLmActual = async (payload) => {
    const row = await createRow('lm_actuals', { ...payload, user_id: session.user.id })
    setLmActuals(prev => [row, ...prev])
    return row
  }
  const updateLmActual = async (id, payload) => {
    const row = await updateRow('lm_actuals', id, payload)
    setLmActuals(prev => prev.map(a => a.id === id ? row : a))
    return row
  }

  // Vision Layers
  const createVisionLayer = async (payload) => {
    const row = await createRow('vision_layers', { ...payload, user_id: session.user.id })
    setVisionLayers(prev => [row, ...prev])
    return row
  }
  const updateVisionLayer = async (id, payload) => {
    const row = await updateRow('vision_layers', id, payload)
    setVisionLayers(prev => prev.map(v => v.id === id ? row : v))
    return row
  }
  const deleteVisionLayer = async (id) => {
    await deleteRow('vision_layers', id)
    setVisionLayers(prev => prev.filter(v => v.id !== id))
  }

  // Journal
  const createJournalEntry = async (payload) => {
    const row = await createRow('journal_entries', { ...payload, user_id: session.user.id })
    setJournalEntries(prev => [row, ...prev])
    return row
  }
  const updateJournalEntry = async (id, payload) => {
    const row = await updateRow('journal_entries', id, payload)
    setJournalEntries(prev => prev.map(j => j.id === id ? row : j))
    return row
  }
  const deleteJournalEntry = async (id) => {
    await deleteRow('journal_entries', id)
    setJournalEntries(prev => prev.filter(j => j.id !== id))
  }

  // Vault
  const createVaultEntry = async (payload) => {
    const row = await createRow('vault_entries', { ...payload, user_id: session.user.id })
    setVaultEntries(prev => [row, ...prev])
    return row
  }
  const updateVaultEntry = async (id, payload) => {
    const row = await updateRow('vault_entries', id, payload)
    setVaultEntries(prev => prev.map(v => v.id === id ? row : v))
    return row
  }
  const deleteVaultEntry = async (id) => {
    await deleteRow('vault_entries', id)
    setVaultEntries(prev => prev.filter(v => v.id !== id))
  }

  // Project Tasks
  const createProjectTask = async (payload) => {
    const row = await createRow('project_tasks', { ...payload, user_id: session.user.id })
    setProjectTasks(prev => [row, ...prev])
    return row
  }
  const updateProjectTask = async (id, payload) => {
    const row = await updateRow('project_tasks', id, payload)
    setProjectTasks(prev => prev.map(t => t.id === id ? row : t))
    return row
  }
  const deleteProjectTask = async (id) => {
    await deleteRow('project_tasks', id)
    setProjectTasks(prev => prev.filter(t => t.id !== id))
  }

  // Scorecard Metrics
  const createScorecardMetric = async (payload) => {
    const row = await createRow('scorecard_metrics', { ...payload, user_id: session.user.id })
    setScorecardMetrics(prev => [row, ...prev])
    return row
  }
  const updateScorecardMetric = async (id, payload) => {
    const row = await updateRow('scorecard_metrics', id, payload)
    setScorecardMetrics(prev => prev.map(m => m.id === id ? row : m))
    return row
  }
  const deleteScorecardMetric = async (id) => {
    await deleteRow('scorecard_metrics', id)
    setScorecardMetrics(prev => prev.filter(m => m.id !== id))
  }

  // Scorecard Values
  const createScorecardValue = async (payload) => {
    const row = await createRow('scorecard_values', { ...payload, user_id: session.user.id })
    setScorecardValues(prev => [row, ...prev])
    return row
  }
  const updateScorecardValue = async (id, payload) => {
    const row = await updateRow('scorecard_values', id, payload)
    setScorecardValues(prev => prev.map(v => v.id === id ? row : v))
    return row
  }

  // ── Agent execute handler ──────────────────────────────────────────────────
  const handleAgentExecute = useCallback(async ({ action, params }) => {
    switch (action) {
      case 'createTask':
        if (params?.title && session) {
          await createTask({ title: params.title, status: 'active', quadrant: 'Q2' })
        }
        break
      case 'navigateTo':
        if (params?.module) setActiveModule(params.module)
        break
      case 'logJournalEntry':
        if (params?.content && session) {
          await createJournalEntry({ content: params.content, type: 'reflection' })
        }
        break
      default:
        console.warn('Unknown agent action:', action)
    }
  }, [session])

  // ── Agent context ──────────────────────────────────────────────────────────
  const agentContext = {
    goals,
    tasks,
    hasInsight: goals.length > 0 && tasks.filter(t => t.status === 'active').length > 5,
    insight: goals.length > 0
      ? `You have ${goals.length} active goal${goals.length > 1 ? 's' : ''} and ${tasks.filter(t => t.status === 'active').length} open tasks. Want me to help you prioritize today's focus?`
      : null,
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-grid', gridTemplateColumns: '1fr 1fr', gap: 4,
            width: 40, height: 40, marginBottom: 20,
          }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                borderRadius: 4,
                background: i % 2 === 0 ? 'var(--gold)' : 'var(--gold-dark)',
                animation: `fill-square 0.6s ease-out ${i * 0.15}s both`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>
            LOADING...
          </div>
        </div>
      </div>
    )
  }

  // ── No session → Onboarding ───────────────────────────────────────────────
  if (!session) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  // ── Authenticated but not onboarded ───────────────────────────────────────
  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  // ── Module props map ───────────────────────────────────────────────────────
  const commonProps = { user, session }

  const moduleProps = {
    command: {
      ...commonProps,
      goals, tasks, projects, leadMeasures, lmActuals, scorecardMetrics, scorecardValues, journalEntries, visionLayers,
      onCreateTask: createTask, onUpdateTask: updateTask, onDeleteTask: deleteTask,
      onCreateGoal: createGoal, onUpdateGoal: updateGoal, onDeleteGoal: deleteGoal,
      onNavigate: setActiveModule,
    },
    vision: {
      ...commonProps,
      goals, visionLayers,
      onCreateGoal: createGoal, onUpdateGoal: updateGoal, onDeleteGoal: deleteGoal,
      onCreateVisionLayer: createVisionLayer, onUpdateVisionLayer: updateVisionLayer, onDeleteVisionLayer: deleteVisionLayer,
    },
    matrix: {
      ...commonProps,
      tasks,
      onCreateTask: createTask, onUpdateTask: updateTask, onDeleteTask: deleteTask,
    },
    projects: {
      ...commonProps,
      projects, projectTasks, goals,
      onCreateProject: createProject, onUpdateProject: updateProject, onDeleteProject: deleteProject,
      onCreateProjectTask: createProjectTask, onUpdateProjectTask: updateProjectTask, onDeleteProjectTask: deleteProjectTask,
    },
    scorecard: {
      ...commonProps,
      goals, leadMeasures, lmActuals, scorecardMetrics, scorecardValues,
      onCreateLeadMeasure: createLeadMeasure, onUpdateLeadMeasure: updateLeadMeasure, onDeleteLeadMeasure: deleteLeadMeasure,
      onCreateLmActual: createLmActual, onUpdateLmActual: updateLmActual,
      onCreateScorecardMetric: createScorecardMetric, onUpdateScorecardMetric: updateScorecardMetric, onDeleteScorecardMetric: deleteScorecardMetric,
      onCreateScorecardValue: createScorecardValue, onUpdateScorecardValue: updateScorecardValue,
    },
    journal: {
      ...commonProps,
      journalEntries, vaultEntries, goals,
      onCreateJournalEntry: createJournalEntry, onUpdateJournalEntry: updateJournalEntry, onDeleteJournalEntry: deleteJournalEntry,
      onCreateVaultEntry: createVaultEntry, onUpdateVaultEntry: updateVaultEntry, onDeleteVaultEntry: deleteVaultEntry,
    },
    calendar: {
      googleToken,
      onConnect: () => console.log('Connect Google Calendar OAuth'),
    },
    inbox: {
      googleToken,
      onConnect: () => console.log('Connect Gmail OAuth'),
    },
  }

  const MODULE_MAP = {
    command:   CommandCenter,
    vision:    VisionGoals,
    matrix:    PriorityMatrix,
    projects:  Projects,
    scorecard: Scorecard,
    journal:   Journal,
    calendar:  CalendarModule,
    inbox:     Inbox,
  }

  const ActiveModule = MODULE_MAP[activeModule] || MODULE_MAP['command']
  const activeProps  = moduleProps[activeModule] || moduleProps['command']

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <Sidebar
        active={activeModule}
        onChange={setActiveModule}
        user={user}
        syncStatus={syncStatus}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <main
        style={{
          marginLeft: 220,
          flex: 1,
          padding: '32px 36px',
          minHeight: '100vh',
          background: 'var(--bg-page)',
          // Shift left when agent panel is open on desktop
          transition: 'padding-right 0.3s',
        }}
      >
        <ActiveModule {...activeProps} />
      </main>

      {/* AI Agent */}
      <AIAgent
        isOpen={agentOpen}
        onToggle={() => setAgentOpen(o => !o)}
        context={agentContext}
        onExecute={handleAgentExecute}
      />
    </div>
  )
}

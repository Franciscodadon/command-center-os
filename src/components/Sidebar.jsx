import { Home, Target, Grid2X2, FolderKanban, BarChart3, BookOpen, Calendar, Mail, Settings, LogOut } from 'lucide-react'
import Logo from './Logo'

const NAV = [
  { id: 'command',   label: 'Command Center', icon: Home },
  { id: 'vision',    label: 'Vision & Goals',  icon: Target },
  { id: 'matrix',    label: 'Priority Matrix', icon: Grid2X2 },
  { id: 'projects',  label: 'Projects',        icon: FolderKanban },
  { id: 'scorecard', label: 'Scorecard',       icon: BarChart3 },
  { id: 'journal',   label: 'Journal',         icon: BookOpen },
  { id: 'calendar',  label: 'Calendar',        icon: Calendar },
  { id: 'inbox',     label: 'Inbox',           icon: Mail },
]

export default function Sidebar({ active, onChange, user, syncStatus, onSignOut }) {
  const syncDot = {
    synced:   'bg-green-500',
    syncing:  'bg-yellow-400',
    offline:  'bg-red-500',
  }[syncStatus] || 'bg-green-500'

  const syncLabel = {
    synced:  'Synced',
    syncing: 'Syncing...',
    offline: 'Offline',
  }[syncStatus] || 'Synced'

  return (
    <aside
      style={{ width: 220, background: 'var(--bg-nav)', borderRight: '1px solid #23262A' }}
      className="fixed left-0 top-0 h-screen flex flex-col z-20"
    >
      {/* Logo & Wordmark */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <Logo size={28} />
          <div>
            <div style={{ color: 'var(--text-inverse)', fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Command Center
            </div>
            <div style={{ color: 'var(--gold)', fontSize: 9, fontFamily: 'IBM Plex Mono', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              OS
            </div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            style={{ background: 'var(--gradient-gold)', color: '#1A1D23' }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          >
            {user?.first_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ color: 'var(--text-inverse)', fontSize: 13, fontWeight: 500 }} className="truncate">
              {user?.first_name || 'You'}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${syncDot}`} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>{syncLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                color: isActive ? 'var(--gold)' : 'rgba(247,244,239,0.55)',
                fontSize: 14,
                fontFamily: 'IBM Plex Sans',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                border: 'none',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(247,244,239,0.85)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(247,244,239,0.55)' }}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-5 border-t border-white/5 pt-4 flex gap-2">
        <button
          onClick={() => onChange('settings')}
          style={{ color: 'rgba(247,244,239,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={onSignOut}
          style={{ color: 'rgba(247,244,239,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}

// FILE: src/modules/Onboarding.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const AREAS = ['Business', 'Health', 'Finance', 'Relationships', 'Faith', 'Learning', 'Personal']

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0)
  const [direction, setDirection] = useState(1)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [firstName, setFirstName] = useState('')

  // Detect existing session on mount (e.g. after Google OAuth redirect)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const name = session.user.user_metadata?.full_name?.split(' ')[0]
          || session.user.email?.split('@')[0]
          || ''
        setFirstName(name)
        setUser(session.user)
        setDirection(1)
        setScreen(1)
      }
    })
  }, [])
  const [visionText, setVisionText] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalArea, setGoalArea] = useState('')
  const [goalDue, setGoalDue] = useState('')
  const [calConnected, setCalConnected] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)

  const go = (to) => {
    setDirection(to > screen ? 1 : -1)
    setScreen(to)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      let result
      if (authMode === 'signin') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }
      if (result.error) throw result.error
      const { data: { session } } = await supabase.auth.getSession()
      const name = email.split('@')[0]
      setFirstName(name)
      setUser(session?.user || null)
      go(1)
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please try again.')
    }
    setAuthLoading(false)
  }

  const handleGoogleAuth = async () => {
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed.')
    }
  }

  const handleComplete = async () => {
    try {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession()
      console.log('Session:', session, 'Error:', sessErr)
      if (!session?.user) {
        console.error('No session found — cannot complete onboarding')
        onComplete()
        return
      }
      const { error: upsertErr } = await supabase.from('users').upsert({
        user_id: session.user.id,
        first_name: firstName || session.user.email.split('@')[0],
        onboarded: true,
      }, { onConflict: 'user_id' })
      console.log('Upsert error:', upsertErr)
    } catch (err) {
      console.error('Onboarding save error:', err)
    }
    onComplete()
  }

  const screens = [
    // Screen 0: Auth
    <Screen0
      authMode={authMode}
      setAuthMode={setAuthMode}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      authError={authError}
      authLoading={authLoading}
      onSubmit={handleAuth}
      onGoogle={handleGoogleAuth}
    />,
    // Screen 1: Welcome
    <Screen1 firstName={firstName} onNext={() => go(2)} />,
    // Screen 2: Vision
    <Screen2
      value={visionText}
      onChange={setVisionText}
      onNext={() => go(3)}
      onSkip={() => go(3)}
    />,
    // Screen 3: First Goal
    <Screen3
      title={goalTitle}
      setTitle={setGoalTitle}
      area={goalArea}
      setArea={setGoalArea}
      due={goalDue}
      setDue={setGoalDue}
      onNext={() => go(4)}
      onSkip={() => go(4)}
    />,
    // Screen 4: Connect
    <Screen4
      calConnected={calConnected}
      gmailConnected={gmailConnected}
      onConnectCal={() => setCalConnected(true)}
      onConnectGmail={() => setGmailConnected(true)}
      onNext={() => go(5)}
    />,
    // Screen 5: Enter
    <Screen5 onComplete={handleComplete} />,
  ]

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Progress dots */}
      {screen > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                width: i === screen ? 24 : 8, height: 8, borderRadius: 4,
                background: i === screen ? 'var(--gold)' : i < screen ? 'var(--gold-dark)' : 'var(--border-strong)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={screen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {screens[screen]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Screen0({ authMode, setAuthMode, email, setEmail, password, setPassword, authError, authLoading, onSubmit, onGoogle }) {
  return (
    <div className="card" style={{ padding: 36 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <LogoMark size={40} />
        <h1 className="font-serif" style={{ fontSize: 24, marginTop: 16, marginBottom: 6, color: 'var(--text-primary)' }}>
          Command Center OS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Your personal operating system.</p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 8, padding: 3, marginBottom: 24 }}>
        {['signin', 'signup'].map(mode => (
          <button
            key={mode}
            onClick={() => setAuthMode(mode)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              background: authMode === mode ? 'var(--bg-card)' : 'transparent',
              color: authMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: authMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
        />
        {authError && (
          <div style={{ fontSize: 12, color: 'var(--status-red)', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6 }}>
            {authError}
          </div>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={authLoading}
          style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 4 }}
        >
          {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In →' : 'Create Account →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button
        className="btn-ghost"
        onClick={onGoogle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px', fontSize: 13 }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
        Your data is encrypted and yours alone.
      </p>
    </div>
  )
}

function Screen1({ firstName, onNext }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <AnimatedLogoMark />
      <h1 className="font-serif" style={{ fontSize: 28, color: 'var(--text-primary)', marginTop: 32, marginBottom: 10, lineHeight: 1.3 }}>
        Welcome to your Command Center,<br />
        <span style={{ color: 'var(--gold-dark)' }}>{firstName || 'there'}.</span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 40, fontStyle: 'italic' }}>
        This is where clarity lives.
      </p>
      <button className="btn-primary" onClick={onNext} style={{ padding: '14px 32px', fontSize: 15 }}>
        Build Your Command Center →
      </button>
    </div>
  )
}

function Screen2({ value, onChange, onNext, onSkip }) {
  return (
    <div className="card" style={{ padding: 36 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="label-gold" style={{ marginBottom: 8 }}>Quarterly Horizon</div>
        <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
          What are the 3–5 rocks that move everything else forward this quarter?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
          These are your non-negotiables. The outcomes that, if achieved, make everything else feel secondary.
        </p>
      </div>
      <textarea
        className="input"
        placeholder="1. Close Series A&#10;2. Launch product v2&#10;3. Hire VP of Engineering..."
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ minHeight: 160, marginBottom: 20 }}
      />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
          Skip for now
        </button>
        <button className="btn-primary" onClick={onNext} style={{ padding: '11px 28px', fontSize: 14 }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

function Screen3({ title, setTitle, area, setArea, due, setDue, onNext, onSkip }) {
  return (
    <div className="card" style={{ padding: 36 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="label-gold" style={{ marginBottom: 8 }}>First Goal</div>
        <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
          What is the most important thing you need to accomplish this quarter?
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <input
          className="input"
          placeholder="Goal title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <select
          className="input"
          value={area}
          onChange={e => setArea(e.target.value)}
          style={{ appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">Select area of life...</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          className="input"
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          placeholder="Due date"
        />
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
          Skip
        </button>
        <button className="btn-primary" onClick={onNext} style={{ padding: '11px 28px', fontSize: 14 }}>
          Add This Goal →
        </button>
      </div>
    </div>
  )
}

function Screen4({ calConnected, gmailConnected, onConnectCal, onConnectGmail, onNext }) {
  return (
    <div className="card" style={{ padding: 36 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="label-gold" style={{ marginBottom: 8 }}>Integrations</div>
        <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
          Connect your calendar and inbox
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
          Your Advisor can plan around your real schedule and help you manage communication.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <ConnectionCard
          icon="📅"
          title="Google Calendar"
          description="See your schedule inside Command Center"
          connected={calConnected}
          onConnect={onConnectCal}
        />
        <ConnectionCard
          icon="✉️"
          title="Gmail"
          description="AI-powered inbox management"
          connected={gmailConnected}
          onConnect={onConnectGmail}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onNext} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
          Skip for now
        </button>
        <button className="btn-primary" onClick={onNext} style={{ padding: '11px 28px', fontSize: 14 }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

function Screen5({ onComplete }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--gradient-gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 28px',
        boxShadow: '0 8px 32px rgba(201,168,76,0.35)',
      }}>
        <span style={{ fontSize: 28 }}>✦</span>
      </div>
      <h2 className="font-serif" style={{ fontSize: 26, color: 'var(--text-primary)', marginBottom: 12 }}>
        Your Command Center is ready.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.7, maxWidth: 340, margin: '0 auto 40px' }}>
        Everything you need to operate at your highest level — in one focused place.
      </p>
      <button
        className="btn-primary"
        onClick={onComplete}
        style={{ padding: '14px 40px', fontSize: 16, fontWeight: 700 }}
      >
        Enter →
      </button>
    </div>
  )
}

function ConnectionCard({ icon, title, description, connected, onConnect }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 18px', borderRadius: 10,
      border: connected ? '1px solid rgba(22,163,74,0.4)' : '1px solid var(--border)',
      background: connected ? 'rgba(22,163,74,0.04)' : 'var(--bg-input)',
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>
      </div>
      {connected ? (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-green)', fontFamily: 'IBM Plex Mono' }}>Connected ✓</span>
      ) : (
        <button className="btn-ghost" onClick={onConnect} style={{ padding: '6px 14px', fontSize: 12, flexShrink: 0 }}>
          Connect
        </button>
      )}
    </div>
  )
}

function LogoMark({ size = 32 }) {
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: size, height: size }}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            borderRadius: 3,
            background: i % 2 === 0 ? 'var(--gold)' : 'var(--gold-dark)',
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedLogoMark() {
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', gap: 5, width: 56, height: 56 }}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            borderRadius: 6,
            background: i % 2 === 0 ? 'var(--gold)' : 'var(--gold-dark)',
            animation: `fill-square 0.4s ease-out ${i * 0.15}s both`,
          }}
        />
      ))}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

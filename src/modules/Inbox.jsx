// FILE: src/modules/Inbox.jsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Archive, Trash2, Reply, Send, X, Pencil, Loader2, Inbox as InboxIcon, Mail } from 'lucide-react'
import { claudeChat } from '../lib/claude'

const MOCK_EMAILS = [
  {
    id: 1, folder: 'inbox', unread: true, starred: false,
    from: 'David Chen', email: 'david@ventures.co',
    subject: 'Re: Series A — Term Sheet Timeline',
    preview: "Marcus, following up on our call. The partners are aligned on the valuation and we'd like to move...",
    body: `Marcus,\n\nFollowing up on our call last Thursday. The partners are aligned on the valuation and we'd like to move to final term sheet review by end of next week.\n\nWe'll need your updated cap table and the three-year financial model we discussed. Our legal team will be in touch about the data room access.\n\nLet's schedule a 30-minute sync to walk through any outstanding questions.\n\nBest,\nDavid`,
    timestamp: '9:41 AM', date: 'Today',
  },
  {
    id: 2, folder: 'inbox', unread: true, starred: true,
    from: 'Sarah Mitchell', email: 'sarah@smitchell.com',
    subject: 'Q1 Board Deck — Final Review',
    preview: "I've gone through the deck. Slides 7\u201311 need tightening before Thursday. The revenue narrative is...",
    body: `Marcus,\n\nI've gone through the deck. Slides 7–11 need tightening before Thursday.\n\nThe revenue narrative in slide 9 contradicts the cohort data on slide 11 — you'll want to reconcile that before the board sees it. Also, the market size slide still uses the 2023 TAM figures.\n\nOtherwise it's strong. The product roadmap section is the best I've seen from this team.\n\nCall me if you need to talk it through.\n\nSarah`,
    timestamp: '8:15 AM', date: 'Today',
  },
  {
    id: 3, folder: 'inbox', unread: false, starred: false,
    from: 'James Okafor', email: 'james@teamcc.io',
    subject: 'Sprint 12 retrospective notes',
    preview: 'Key themes from this sprint: (1) Backend latency issues resolved — p99 is now under 200ms...',
    body: `Marcus,\n\nKey themes from Sprint 12:\n\n1. Backend latency issues resolved — p99 is now under 200ms across all endpoints.\n2. The new onboarding flow increased activation by 14% in the first 48 hours.\n3. Three open issues from the design system migration — assigned to Priya and Tyler.\n\nSprint 13 planning is Tuesday at 10am. I'll send the Jira board link before then.\n\nJames`,
    timestamp: 'Yesterday', date: 'Yesterday',
  },
  {
    id: 4, folder: 'inbox', unread: false, starred: false,
    from: 'Priya Nair', email: 'priya@teamcc.io',
    subject: 'Design System — Tokens v2 ready for review',
    preview: 'The new token structure is in Figma. All color, spacing, and typography variables are...',
    body: `Marcus,\n\nThe new token structure is in Figma. All color, spacing, and typography variables are documented and linked to the component library.\n\nI need 20 minutes of your time before Friday to confirm the gold palette decisions — there are two options and the final call needs to come from you.\n\nFigma link: [attached]\n\nPriya`,
    timestamp: 'Yesterday', date: 'Yesterday',
  },
  {
    id: 5, folder: 'inbox', unread: true, starred: false,
    from: 'Stripe Billing', email: 'billing@stripe.com',
    subject: 'Your invoice for March 2026 is ready',
    preview: 'Invoice #INV-2026-0341 for $2,847.00 is now available in your dashboard...',
    body: `Your invoice #INV-2026-0341 for $2,847.00 is now available.\n\nBilling period: March 1–31, 2026\nAmount due: $2,847.00\nDue date: April 15, 2026\n\nView or download your invoice in the Stripe Dashboard.\n\nStripe Billing`,
    timestamp: 'Mar 24', date: 'Mar 24',
  },
  {
    id: 6, folder: 'inbox', unread: false, starred: true,
    from: 'Coach Marcus (you)', email: 'me@commandcenter.io',
    subject: 'Weekly Review — saved draft',
    preview: 'What went well: Closed the Acme deal, hit the gym 4/5 days. What needs attention:...',
    body: `WEEKLY REVIEW — Week of March 18\n\nWhat went well:\n- Closed the Acme Enterprise deal ($48K ARR)\n- Gym 4/5 days\n- Published the leadership post — 2K+ shares\n\nWhat needs attention:\n- Board deck still not finalized\n- Haven't called Dad in 3 weeks\n- Morning routine has slipped since the travel week\n\nThe big move this week: Get the board deck done by Tuesday. Nothing else matters until it's done.`,
    timestamp: 'Mar 22', date: 'Mar 22',
  },
  {
    id: 7, folder: 'sent', unread: false, starred: false,
    from: 'You', email: 'me@commandcenter.io',
    subject: 'Re: Partnership Proposal — Initial Thoughts',
    preview: 'Thanks for sending this over. I have read through the proposal and while the core idea is compelling...',
    body: `Thanks for sending this over.\n\nI've read through the proposal and while the core idea is compelling, the rev-share structure doesn't work for us at our current stage. We need to own the channel.\n\nLet's talk about a co-marketing structure instead. That gives you the visibility you're looking for without the dependency.\n\nAvailable Tuesday or Wednesday afternoon.\n\nMarcus`,
    timestamp: 'Mar 21', date: 'Mar 21',
  },
  {
    id: 8, folder: 'drafts', unread: false, starred: false,
    from: 'You (Draft)', email: 'me@commandcenter.io',
    subject: 'Note to team — Q2 Priorities',
    preview: 'As we close out Q1, I want to share the three priorities that will define our Q2...',
    body: `Team,\n\nAs we close out Q1, I want to share the three priorities that will define our Q2:\n\n1. Launch v2.0 — ship by May 1, no exceptions\n2. Hit $2M ARR — every deal matters\n3. Build the team — three senior hires by June\n\n[DRAFT — finish this]`,
    timestamp: 'Mar 20', date: 'Mar 20',
  },
  {
    id: 9, folder: 'inbox', unread: false, starred: false,
    from: 'LinkedIn', email: 'notifications@linkedin.com',
    subject: '3 people viewed your profile this week',
    preview: 'Your profile had 3 views this week, including people from Sequoia Capital and...',
    body: `Your LinkedIn profile had 3 views this week.\n\nNotable viewers include people from Sequoia Capital and Andreessen Horowitz.\n\nView your full analytics in LinkedIn.`,
    timestamp: 'Mar 19', date: 'Mar 19',
  },
  {
    id: 10, folder: 'inbox', unread: false, starred: false,
    from: 'Tyler Brooks', email: 'tyler@teamcc.io',
    subject: 'Office lease renewal — need decision by April 1',
    preview: 'The landlord needs a decision on the lease renewal by April 1. Current rate is $12,400/mo...',
    body: `Marcus,\n\nThe landlord needs a decision on the lease renewal by April 1.\n\nCurrent rate: $12,400/mo\nProposed renewal rate: $13,800/mo (+11%)\nLease term: 24 months\n\nWe have two options: renew, or move to the WeWork on 5th which would be $9,200/mo for the equivalent space.\n\nI'd recommend a call this week to decide.\n\nTyler`,
    timestamp: 'Mar 18', date: 'Mar 18',
  },
]

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: Pencil },
  { id: 'starred', label: 'Starred', icon: Star },
]

const EMAIL_SYSTEM = `You are a professional executive assistant drafting email replies. Write concise, direct, professional replies. Match the tone of the original email — formal for formal, direct for direct. No fluff. No filler phrases. Maximum 150 words unless the content genuinely requires more. Return only the email body text, no subject line, no salutation setup — start directly with the reply content.`

export default function Inbox({ googleToken, onConnect }) {
  const [emails, setEmails] = useState(MOCK_EMAILS)
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [selectedId, setSelectedId] = useState(null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeAiLoading, setComposeAiLoading] = useState(false)

  const selectedEmail = emails.find(e => e.id === selectedId) || null

  const folderEmails = activeFolder === 'starred'
    ? emails.filter(e => e.starred && e.folder !== 'trash')
    : emails.filter(e => e.folder === activeFolder && e.folder !== 'trash')

  const folderCount = (fid) => {
    if (fid === 'starred') return emails.filter(e => e.starred).length
    return emails.filter(e => e.folder === fid && e.unread).length
  }

  const openEmail = (email) => {
    setSelectedId(email.id)
    setReplyOpen(false)
    setReplyBody('')
    if (email.unread) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e))
    }
  }

  const archiveEmail = (id) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'archived' } : e))
    if (selectedId === id) setSelectedId(null)
  }

  const deleteEmail = (id) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'trash' } : e))
    if (selectedId === id) setSelectedId(null)
  }

  const toggleStar = (id) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !e.starred } : e))
  }

  const handleAiDraft = async () => {
    if (!selectedEmail) return
    setAiLoading(true)
    try {
      const draft = await claudeChat(
        [{ role: 'user', content: `Draft a reply to this email:\n\nFrom: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}` }],
        EMAIL_SYSTEM
      )
      setReplyBody(draft)
      setReplyOpen(true)
    } catch (e) {
      setReplyBody('Unable to generate draft. Check your API key and try again.')
    }
    setAiLoading(false)
  }

  const handleComposeAiAssist = async () => {
    if (!composeBody && !composeSubject) return
    setComposeAiLoading(true)
    try {
      const improved = await claudeChat(
        [{ role: 'user', content: `Improve this email draft. Subject: ${composeSubject}\n\n${composeBody || '(empty — write a professional email based on the subject)'}` }],
        EMAIL_SYSTEM
      )
      setComposeBody(improved)
    } catch (e) {
      // silent fail
    }
    setComposeAiLoading(false)
  }

  if (!googleToken) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>Connect Gmail</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Manage your inbox, draft AI-powered replies, and keep communication inside your command center.
          </p>
          <button className="btn-primary" onClick={onConnect} style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}>
            Connect Gmail
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Folder sidebar */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={18} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Inbox</span>
          </div>
        </div>
        <nav style={{ padding: '8px 8px', flex: 1 }}>
          {FOLDERS.map(({ id, label, icon: Icon }) => {
            const count = folderCount(id)
            const isActive = activeFolder === id
            return (
              <button
                key={id}
                onClick={() => { setActiveFolder(id); setSelectedId(null) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--gold-glow)' : 'transparent',
                  color: isActive ? 'var(--gold-dark)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400, marginBottom: 2,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={15} />
                  <span>{label}</span>
                </div>
                {count > 0 && (
                  <span style={{
                    background: isActive ? 'var(--gold)' : 'var(--border-strong)',
                    color: isActive ? '#1A1D23' : 'var(--text-secondary)',
                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                    fontFamily: 'IBM Plex Mono',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--gold-glow)', fontSize: 11, color: 'var(--text-gold)', fontFamily: 'IBM Plex Mono' }}>
            Sample emails shown — connect Gmail for real inbox
          </div>
        </div>
      </div>

      {/* Email list */}
      <div style={{ width: 320, borderRight: '1px solid var(--border)', flexShrink: 0, overflow: 'auto', background: 'var(--bg-page)' }}>
        {folderEmails.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No emails here.</div>
        )}
        {folderEmails.map(email => (
          <button
            key={email.id}
            onClick={() => openEmail(email)}
            style={{
              width: '100%', textAlign: 'left', display: 'block',
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              background: selectedId === email.id ? 'var(--gold-glow)' : 'transparent',
              border: 'none', cursor: 'pointer',
              borderLeft: selectedId === email.id ? '3px solid var(--gold)' : '3px solid transparent',
              transition: 'all 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: email.unread ? 700 : 500, color: 'var(--text-primary)', flex: 1, marginRight: 8 }} className="truncate">
                {email.from}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>{email.timestamp}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: email.unread ? 600 : 400, color: email.unread ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email.subject}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email.preview}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              {email.unread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-blue)' }} />}
              {email.starred && <Star size={11} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />}
            </div>
          </button>
        ))}
      </div>

      {/* Reading pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedEmail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Select an email to read
          </div>
        ) : (
          <>
            {/* Email header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1, marginRight: 16 }}>
                  {selectedEmail.subject}
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleStar(selectedEmail.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="Star">
                    <Star size={16} style={{ color: selectedEmail.starred ? 'var(--gold)' : 'var(--text-muted)', fill: selectedEmail.starred ? 'var(--gold)' : 'none' }} />
                  </button>
                  <button onClick={() => archiveEmail(selectedEmail.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="Archive">
                    <Archive size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="Delete">
                    <Trash2 size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 500 }}>{selectedEmail.from}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>&lt;{selectedEmail.email}&gt;</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 16, fontFamily: 'IBM Plex Mono', fontSize: 11 }}>{selectedEmail.date}</span>
              </div>
            </div>

            {/* Email body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selectedEmail.body}
            </div>

            {/* Actions + reply */}
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!replyOpen && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-ghost" onClick={() => setReplyOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}>
                    <Reply size={14} /> Reply
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleAiDraft}
                    disabled={aiLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
                  >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : '✦'}
                    AI Draft Reply
                  </button>
                </div>
              )}

              <AnimatePresence>
                {replyOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Replying to <strong>{selectedEmail.from}</strong>
                      </div>
                      <textarea
                        className="input"
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder="Write your reply..."
                        style={{ minHeight: 120, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          className="btn-primary"
                          onClick={handleAiDraft}
                          disabled={aiLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '7px 14px' }}
                        >
                          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : '✦'}
                          {aiLoading ? 'Generating...' : 'AI Draft'}
                        </button>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-ghost" onClick={() => setReplyOpen(false)} style={{ fontSize: 12, padding: '7px 14px' }}>
                            Cancel
                          </button>
                          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '7px 14px' }}>
                            <Send size={12} /> Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Compose button */}
      <button
        onClick={() => setComposeOpen(true)}
        className="btn-primary"
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(201,168,76,0.4)', zIndex: 50, fontSize: 22, lineHeight: 1,
        }}
        title="Compose"
      >
        +
      </button>

      {/* Compose modal */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setComposeOpen(false) }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: 540, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>New Message</span>
                <button onClick={() => setComposeOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="To" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
                <input className="input" placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                <textarea
                  className="input"
                  placeholder="Message..."
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  style={{ minHeight: 180 }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                  <button
                    className="btn-ghost"
                    onClick={handleComposeAiAssist}
                    disabled={composeAiLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}
                  >
                    {composeAiLoading ? <Loader2 size={13} className="animate-spin" /> : '✦'}
                    {composeAiLoading ? 'Improving...' : 'AI Assist'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => setComposeOpen(false)} style={{ fontSize: 13, padding: '8px 16px' }}>Discard</button>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}>
                      <Send size={13} /> Send
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

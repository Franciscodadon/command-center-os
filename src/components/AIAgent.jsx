// FILE: src/components/AIAgent.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Mic, Loader2 } from 'lucide-react'
import { claudeChat, AGENT_SYSTEM_PROMPT } from '../lib/claude'

function buildSystemPrompt(context) {
  const sections = []

  if (context?.goals?.length) {
    sections.push(`ACTIVE GOALS:\n${context.goals.map(g => `- ${g.title} (${g.area || 'General'})`).join('\n')}`)
  }
  if (context?.tasks?.length) {
    const recent = context.tasks.slice(0, 10)
    sections.push(`RECENT TASKS:\n${recent.map(t => `- [${t.status || 'active'}] ${t.title}`).join('\n')}`)
  }
  if (context?.calendarEvents?.length) {
    sections.push(`UPCOMING EVENTS:\n${context.calendarEvents.slice(0, 5).map(e => `- ${e.title}`).join('\n')}`)
  }
  if (context?.insight) {
    sections.push(`PROACTIVE INSIGHT: ${context.insight}`)
  }

  const contextBlock = sections.length > 0
    ? `\n\n--- USER CONTEXT ---\n${sections.join('\n\n')}\n--- END CONTEXT ---`
    : ''

  return AGENT_SYSTEM_PROMPT + contextBlock
}

export default function AIAgent({ isOpen, onToggle, context, onExecute }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const insightShown = useRef(false)

  // Show proactive insight as first message
  useEffect(() => {
    if (isOpen && context?.hasInsight && context?.insight && !insightShown.current) {
      insightShown.current = true
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: context.insight,
      }])
    }
  }, [isOpen, context?.hasInsight, context?.insight])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamingContent('')

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    const systemPrompt = buildSystemPrompt(context)

    let fullResponse = ''

    try {
      await claudeChat(history, systemPrompt, (chunk, full) => {
        fullResponse = full
        setStreamingContent(full)

        // Detect tool call patterns in stream
        if (full.includes('[CREATE_TASK:') || full.includes('[NAVIGATE:') || full.includes('[LOG_JOURNAL:')) {
          parseAndExecuteToolCalls(full, onExecute)
        }
      })

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: fullResponse }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I ran into an issue: ${err.message}. Check your API key configuration.`,
      }])
    } finally {
      setStreaming(false)
      setStreamingContent('')
    }
  }, [input, streaming, messages, context, onExecute])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onToggle() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onToggle])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      {/* Collapsed button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="agent-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={onToggle}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 90,
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--gradient-gold)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'glow 3s ease-in-out infinite',
              boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1D23', fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}>CC</span>
            {context?.hasInsight && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 12, height: 12, borderRadius: '50%',
                background: 'var(--status-red)',
                border: '2px solid var(--bg-page)',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onToggle}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 95 }}
              />
            )}

            <motion.div
              key="agent-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: isMobile ? '100vw' : 380,
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--border)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
                background: 'var(--bg-card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--gradient-gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1D23', fontFamily: 'IBM Plex Mono' }}>CC</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Command Center Advisor</div>
                    <div style={{ fontSize: 11, color: 'var(--status-green)', fontFamily: 'IBM Plex Mono', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-green)', display: 'inline-block' }} />
                      Online
                    </div>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 6 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat history */}
              <div
                ref={scrollRef}
                style={{ flex: 1, overflow: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {messages.length === 0 && !streaming && (
                  <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                    <p className="font-serif" style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>How can I help you today?</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      Ask me to create tasks, analyze your goals, draft content, or think through any problem.
                    </p>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {streaming && streamingContent && (
                  <MessageBubble
                    message={{ role: 'assistant', content: streamingContent }}
                    isStreaming
                  />
                )}

                {streaming && !streamingContent && (
                  <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out infinite' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out 0.2s infinite' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out 0.4s infinite' }} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{
                  display: 'flex', gap: 10, alignItems: 'flex-end',
                  background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)',
                  padding: '8px 12px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your Advisor..."
                    disabled={streaming}
                    rows={1}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      resize: 'none', fontFamily: 'IBM Plex Sans', fontSize: 14,
                      color: 'var(--text-primary)', lineHeight: 1.5,
                      maxHeight: 120, overflow: 'auto',
                    }}
                    onInput={e => {
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingBottom: 2 }}>
                    <button
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6 }}
                      title="Voice input (coming soon)"
                    >
                      <Mic size={16} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || streaming}
                      style={{
                        background: input.trim() && !streaming ? 'var(--gradient-btn)' : 'var(--border)',
                        border: 'none', cursor: input.trim() && !streaming ? 'pointer' : 'default',
                        color: input.trim() && !streaming ? '#1A1D23' : 'var(--text-muted)',
                        width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
                  Enter to send · Shift+Enter for new line
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      {!isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: 'var(--gradient-gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2,
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#1A1D23', fontFamily: 'IBM Plex Mono' }}>CC</span>
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'var(--gradient-gold)' : 'var(--bg-card)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#1A1D23' : 'var(--text-primary)',
        fontSize: 13,
        lineHeight: 1.65,
        boxShadow: isUser ? '0 2px 8px rgba(201,168,76,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
        {isStreaming && (
          <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--gold)', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse-dot 0.8s ease-in-out infinite' }} />
        )}
      </div>
    </div>
  )
}

function parseAndExecuteToolCalls(text, onExecute) {
  if (!onExecute) return
  const createTaskMatch = text.match(/\[CREATE_TASK:\s*(.+?)\]/)
  if (createTaskMatch) {
    onExecute({ action: 'createTask', params: { title: createTaskMatch[1].trim() } })
  }
  const navigateMatch = text.match(/\[NAVIGATE:\s*(.+?)\]/)
  if (navigateMatch) {
    onExecute({ action: 'navigateTo', params: { module: navigateMatch[1].trim() } })
  }
  const journalMatch = text.match(/\[LOG_JOURNAL:\s*(.+?)\]/)
  if (journalMatch) {
    onExecute({ action: 'logJournalEntry', params: { content: journalMatch[1].trim() } })
  }
}

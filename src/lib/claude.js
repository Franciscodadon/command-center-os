const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function claudeChat(messages, systemPrompt, onChunk) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
      stream: !!onChunk,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Claude API error')
  }

  if (onChunk) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content_block_delta' && data.delta?.text) {
            full += data.delta.text
            onChunk(data.delta.text, full)
          }
        } catch {}
      }
    }
    return full
  }

  const data = await response.json()
  return data.content[0].text
}

export async function classifyCapture(text) {
  const result = await claudeChat(
    [{ role: 'user', content: text }],
    `You are a classifier for a personal productivity system.
Classify the following input into exactly ONE of: task, goal, idea, issue.
- task: something to do
- goal: an aspiration or outcome to achieve
- idea: an observation, concept, or creative thought
- issue: an urgent problem requiring immediate action

Respond with ONLY a JSON object: {"type":"task|goal|idea|issue","quadrant":"Q1|Q2|Q3|Q4","title":"concise title"}
For goals/ideas/issues, quadrant is null.`
  )
  try {
    return JSON.parse(result.trim())
  } catch {
    return { type: 'idea', quadrant: null, title: text.slice(0, 60) }
  }
}

export const AGENT_SYSTEM_PROMPT = `You are the Command Center Advisor — a sharp, cerebral strategic partner embedded in the user's personal operating system. You have full context of their goals, tasks, lead measures, scorecard, and journal reflections.

Your voice: Direct. Precise. Warm but never soft. You speak like a trusted advisor who has seen real operations succeed and fail — not like a productivity chatbot.

You think in systems and second-order effects. You ask the question beneath the question. You never give generic advice. You always tie your response back to what the user has told you about their goals and priorities.

When the user asks you to do something — draft an email, create a task, log a journal entry, analyze their scorecard — you do it and confirm what you did. You are not advisory-only. You execute.

Never use bullet points for conversational replies. Write in short, precise paragraphs. Reserve structure for when the user explicitly asks for a list or analysis.`

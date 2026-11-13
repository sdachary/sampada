import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Input, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Conversations() {
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.request('/api/v1/conversations').then(d => setConvs(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openConv = async (id) => {
    const c = convs.find(x => x.id === id)
    if (!c) return
    setSelected(c)
    api.request(`/api/v1/conversations/${id}`).then(d => setMessages(d?.messages || [])).catch(() => {})
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      await api.request(`/api/v1/conversations/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ role: 'user', content: draft.trim() }),
        headers: { 'Content-Type': 'application/json' },
      })
      setDraft('')
      const poll = async () => {
        const msgs = await api.request(`/api/v1/conversations/${selected.id}/messages`).catch(() => null)
        if (!msgs) return
        setMessages(msgs)
        const replyPending = msgs.some(m => m?.metadata?.pending)
        if (replyPending) setTimeout(poll, 1200)
      }
      poll()
    } catch {}
    setSending(false)
  }

  const createConv = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await api.request('/api/v1/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle }),
        headers: { 'Content-Type': 'application/json' },
      })
      setConvs(prev => [res, ...prev])
      setNewTitle('')
      setSelected(res)
      setMessages([])
    } catch {}
  }

  if (selected) return (
    <div className="space-y-4">
      <Reveal delay={0}>
        <PageHeader
          title={selected.title}
          num="014 / 016"
          action={
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setMessages([]) }}>
              ← Back
            </Button>
          }
        >
          {selected.summary && <p className="text-sm text-ink-soft">{selected.summary}</p>}
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {messages.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            title="No messages — ask a question below"
          />
        ) : (
          <div className="space-y-2">
            {messages.map((m, index) => (
              <Reveal key={m.id || index} delay={index * 20}>
                {m.metadata?.pending ? (
                  <Card className="card-shell card-core--pad-base border-l-3 border-l-success">
                    <p className="text-xs text-ink-soft mb-1 capitalize">assistant</p>
                    <p className="text-sm leading-relaxed text-ink-soft">…</p>
                  </Card>
                ) : (
                  <Card className={`card-shell card-core--pad-base border-l-3 ${m.role === 'user' ? 'border-l-accent' : 'border-l-success'}`}>
                    <p className="text-xs text-ink-soft mb-1 capitalize">{m.role}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <p className="text-xs text-faint mt-2">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
                  </Card>
                )}
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>

      <Reveal delay={100}>
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask Sampada about your finances…" className="flex-1" />
          <Button type="submit" loading={sending} disabled={!draft.trim() || sending}>Send</Button>
        </form>
      </Reveal>
    </div>
  )

  if (loading) return (
    <Reveal delay={0}>
      <Skeleton className="skeleton-card h-48" />
    </Reveal>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Conversations"
          num="014 / 016"
        >
          <p className="text-sm text-muted">Chat with household members.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <div className="flex gap-2 mb-4">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New conversation title…" className="flex-1" />
          <Button onClick={createConv} disabled={!newTitle.trim()}>Create</Button>
        </div>
      </Reveal>

      <Reveal delay={100}>
        {convs.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            title="No conversations yet"
            action="+ Create"
            onAction={createConv}
          />
        ) : (
          <div className="space-y-2">
            {convs.map((c, index) => (
              <Reveal key={c.id} delay={index * 30}>
                <Card className="card-shell card-shell--interactive card-core--pad-base" onClick={() => openConv(c.id)}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink truncate">{c.title}</p>
                      {c.summary && <p className="text-sm text-muted">{c.summary}</p>}
                    </div>
                    <span className="text-faint">→</span>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>
    </div>
  )
}
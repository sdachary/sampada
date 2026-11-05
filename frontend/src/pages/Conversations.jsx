import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Input, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'

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
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title={selected.title}
        num="014 / 016"
        action={
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setMessages([]) }}>
            ← Back
          </Button>
        }
      >
        {selected.summary && <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selected.summary}</p>}
      </PageHeader>

      {messages.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◉</span>}
          title="No messages — ask a question below"
        />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {messages.map(m => m.metadata?.pending ? (
            <Card key="pending" style={{ padding: '12px 16px', borderLeft: '3px solid var(--success)' }}>
              <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4, textTransform: 'capitalize' }}>assistant</p>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>…</p>
            </Card>
          ) : (
            <Card key={m.id} style={{ padding: '12px 16px', borderLeft: `3px solid ${m.role === 'user' ? 'var(--accent)' : 'var(--success)'}` }}>
              <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4, textTransform: 'capitalize' }}>{m.role}</p>
              <p style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</p>
              <p style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask Sampada about your finances…" style={{ flex: 1 }} />
        <Button type="submit" loading={sending} disabled={!draft.trim() || sending}>Send</Button>
      </form>
    </div>
  )

  if (loading) return <Skeleton style={{ height: 200, borderRadius: 'var(--radius-md)' }} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Conversations"
        num="014 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Chat with household members.</p>
      </PageHeader>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New conversation title…" style={{ flex: 1 }} />
        <Button onClick={createConv} disabled={!newTitle.trim()}>Create</Button>
      </div>

      {convs.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◉</span>}
          title="No conversations yet"
          action="+ Create"
          onAction={createConv}
        />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {convs.map(c => (
            <Card key={c.id} interactive onClick={() => openConv(c.id)} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{c.title}</p>
                  {c.summary && <p style={{ fontSize: 12, color: 'var(--muted)' }}>{c.summary}</p>}
                </div>
                <span style={{ fontSize: 16, color: 'var(--faint)' }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
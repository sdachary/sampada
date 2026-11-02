import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Card, Button, Input, InputField, Select, Skeleton, EmptyState, PageHeader, Badge, fmtINR, Progress } from '../components/ui'

function AddExpenseForm({ tripId, members, categories, onDone }) {
  const [form, setForm] = useState({ trip_member_id: '', trip_category_id: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], split_type: 'equal' })
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await api.request(`/api/v1/trips/${tripId}/trip_expenses`, { method: 'POST', body: JSON.stringify({ ...form, amount: +form.amount }) }); onDone() } catch {} finally { setSaving(false) } }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Add expense</p>
      <Input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
      <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
      <Input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} />
      <Select value={form.trip_member_id} onChange={e => setForm({...form, trip_member_id: e.target.value})} placeholder="Paid by" options={members.map(m => ({ value: m.id, label: m.name }))} required />
      <Select value={form.trip_category_id} onChange={e => setForm({...form, trip_category_id: e.target.value})} placeholder="Category (optional)" options={categories.map(c => ({ value: c.id, label: c.name }))} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" size="sm" loading={saving}>{saving ? 'Saving...' : 'Add'}</Button>
        <Button variant="ghost" size="sm" type="button" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

function TripDetail({ tripId, onBack }) {
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newMember, setNewMember] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.request(`/api/v1/trips/${tripId}`).then(setTrip).catch(() => {}).finally(() => setLoading(false))
  }, [tripId])

  useEffect(() => { load() }, [load])

  const addMember = async () => {
    if (!newMember.trim()) return
    await api.request(`/api/v1/trips/${tripId}/trip_members`, { method: 'POST', body: JSON.stringify({ name: newMember.trim(), email: newMemberEmail || undefined }) })
    setNewMember(''); setNewMemberEmail(''); load()
  }

  const settle = async (fromId, toId, amount) => {
    await api.request(`/api/v1/trips/${tripId}/trip_settlements`, { method: 'POST', body: JSON.stringify({ from_trip_member_id: fromId, to_trip_member_id: toId, amount }) })
    load()
  }

  if (loading) return <Skeleton style={{ height: 200 }} />
  if (!trip) return <EmptyState title="Trip not found" action="Back to trips" onAction={onBack} />

  const toRupees = (cents) => (cents / 100)
  const owes = Object.entries(trip.balances || {}).filter(([_, v]) => v < 0)
  const owed = Object.entries(trip.balances || {}).filter(([_, v]) => v > 0)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ justifySelf: 'start' }}>← Back to trips</Button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2 }}>{trip.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {trip.destination && <>{trip.destination} · </>}
            {trip.start_date && <>{trip.start_date}{trip.end_date ? ` - ${trip.end_date}` : ''} · </>}
            {trip.members?.length || 0} members
            <Badge variant="neutral" style={{ marginLeft: 8 }}>{trip.status}</Badge>
          </p>
        </div>
        <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{fmtINR(+trip.total_spent || 0)}</p>
      </div>

      {/* members */}
      <Card style={{ padding: 16 }}>
        <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Members</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {trip.members?.map(m => (
            <Badge key={m.id} variant="neutral" style={{ padding: '4px 12px', fontSize: 12.5 }}>
              {m.name}
              {trip.balances?.[m.id] > 0 && <span style={{ color: 'var(--success)' }}> (+₹{toRupees(trip.balances[m.id]).toFixed(0)})</span>}
              {trip.balances?.[m.id] < 0 && <span style={{ color: 'var(--accent)' }}> (-₹{Math.abs(toRupees(trip.balances[m.id])).toFixed(0)})</span>}
            </Badge>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input placeholder="Name" value={newMember} onChange={e => setNewMember(e.target.value)} style={{ flex: 1 }} />
          <Input placeholder="Email (opt)" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={addMember}>Add</Button>
        </div>
      </Card>

      {/* add expense */}
      <Button variant="ghost" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add expense'}</Button>
      {showForm && <AddExpenseForm tripId={tripId} members={trip.members || []} categories={trip.budget_vs_actual || []} onDone={() => { setShowForm(false); load() }} />}

      {/* settlements */}
      {owed.length > 0 && (
        <Card style={{ padding: 16 }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Settlements needed</p>
          {owed.map(([id]) => {
            const from = owes.find(([fid]) => fid !== id)
            if (!from) return null
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                <span>{trip.members?.find(m => m.id === from[0])?.name} owes <strong>{trip.members?.find(m => m.id === id)?.name}</strong></span>
                <span className="fin" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹{Math.abs(toRupees(from[1])).toFixed(0)}</span>
              </div>
            )
          })}
        </Card>
      )}

      {/* suggested settlements (simplify debts) */}
      {(trip.suggested_settlements?.length || 0) > 0 && (
        <Card style={{ padding: 16 }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Suggested settlements · fewest transfers</p>
          {trip.suggested_settlements.map((s, i) => {
            const fromName = trip.members?.find(m => m.id === s.from)?.name || '?'
            const toName = trip.members?.find(m => m.id === s.to)?.name || '?'
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                <span><strong>{fromName}</strong> pays <strong>{toName}</strong></span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="fin" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹{toRupees(s.amount_cents).toFixed(0)}</span>
                  <Button variant="ghost" size="sm" onClick={() => settle(s.from, s.to, toRupees(s.amount_cents))}>Settle</Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* expenses */}
      <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Expenses</p>
      {trip.expenses?.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', padding: 12 }}>No expenses yet. Add your first one!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {trip.expenses?.map(e => (
            <Card key={e.id} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{e.description}</p>
                <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.payer} · {e.category_name || 'Uncategorized'} · {e.expense_date}</p>
              </div>
              <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{fmtINR(+e.amount)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', destination: '', start_date: '', end_date: '', group_type: 'friends', total_budget: '', notes: '' })

  const load = () => {
    setLoading(true)
    api.request('/api/v1/trips').then(t => setTrips(Array.isArray(t) ? t : [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const createTrip = async (e) => {
    e.preventDefault()
    await api.request('/api/v1/trips', { method: 'POST', body: JSON.stringify({ ...form, total_budget: form.total_budget ? +form.total_budget : undefined }) })
    setShowCreate(false); setForm({ name: '', destination: '', start_date: '', end_date: '', group_type: 'friends', total_budget: '', notes: '' }); load()
  }

  if (selectedId) return <TripDetail tripId={selectedId} onBack={() => setSelectedId(null)} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Trip Mode"
        num="005 / 016"
        action={<Button onClick={() => setShowCreate(!showCreate)}>+ New trip</Button>}
      />

      {showCreate && (
        <Card style={{ padding: 16 }}>
          <form onSubmit={createTrip} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input placeholder="Trip name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <Input placeholder="Destination" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Input type="date" placeholder="Start" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
              <Input type="date" placeholder="End" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
            <Select value={form.group_type} onChange={e => setForm({...form, group_type: e.target.value})} options={[
              { value: 'friends', label: 'Friends' },
              { value: 'family', label: 'Family' },
              { value: 'colleagues', label: 'Colleagues' },
              { value: 'custom', label: 'Custom' },
            ]} />
            <Input type="number" placeholder="Budget (optional)" value={form.total_budget} onChange={e => setForm({...form, total_budget: e.target.value})} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" size="sm">Create</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2].map(i => <Skeleton key={i} style={{ height: 80 }} />)}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◈</span>}
          title="No trips yet"
        >
          Create a trip to track shared expenses with friends and family — like Splitwise, built in.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {trips.map(t => (
            <Card key={t.id} interactive onClick={() => setSelectedId(t.id)} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {t.destination}{t.destination && t.start_date ? ' · ' : ''}{t.start_date ? `${t.start_date}${t.end_date ? ` - ${t.end_date}` : ''}` : ''}
                    <Badge variant="neutral" style={{ marginLeft: 6 }}>{t.group_type}</Badge>
                  </p>
                </div>
                <span style={{ color: 'var(--faint)' }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
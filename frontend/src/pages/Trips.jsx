import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Card, Button, Input, InputField, Select, Skeleton, EmptyState, PageHeader, Badge, fmtINR, Progress } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

function AddExpenseForm({ tripId, members, categories, onDone }) {
  const [form, setForm] = useState({ trip_member_id: '', trip_category_id: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], split_type: 'equal' })
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await api.request(`/api/v1/trips/${tripId}/trip_expenses`, { method: 'POST', body: JSON.stringify({ ...form, amount: +form.amount }) }); onDone() } catch {} finally { setSaving(false) } }
  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-surface rounded-xl border border-border">
      <p className="text-sm font-semibold text-ink">Add expense</p>
      <Input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
      <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
      <Input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} />
      <Select value={form.trip_member_id} onChange={e => setForm({...form, trip_member_id: e.target.value})} placeholder="Paid by" options={members.map(m => ({ value: m.id, label: m.name }))} required />
      <Select value={form.trip_category_id} onChange={e => setForm({...form, trip_category_id: e.target.value})} placeholder="Category (optional)" options={categories.map(c => ({ value: c.id, label: c.name }))} />
      <div className="flex gap-2">
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

  if (loading) return (
    <Reveal delay={0}>
      <Skeleton className="skeleton-card h-48" />
    </Reveal>
  )
  if (!trip) return (
    <Reveal delay={0}>
      <EmptyState title="Trip not found" action="Back to trips" onAction={onBack} />
    </Reveal>
  )

  const toRupees = (cents) => (cents / 100)
  const owes = Object.entries(trip.balances || {}).filter(([_, v]) => v < 0)
  const owed = Object.entries(trip.balances || {}).filter(([_, v]) => v > 0)

  return (
    <div className="space-y-4">
      <Reveal delay={0}>
        <Button variant="ghost" size="sm" onClick={onBack} className="justify-self-start">← Back to trips</Button>
      </Reveal>

      <Reveal delay={50}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight mb-1">{trip.name}</h1>
            <p className="text-sm text-muted flex items-center gap-1 flex-wrap">
              {trip.destination && <> {trip.destination} · </>}
              {trip.start_date && <> {trip.start_date}{trip.end_date ? ` - ${trip.end_date}` : ''} · </>}
              {trip.members?.length || 0} members
              <Badge variant="neutral" className="ml-1">{trip.status}</Badge>
            </p>
          </div>
          <p className="fin font-display text-2xl font-semibold">{fmtINR(+trip.total_spent || 0)}</p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        {/* members */}
        <Card className="card-shell card-core--pad-lg">
          <p className="label-caps mb-2">Members</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {trip.members?.map(m => (
              <Badge key={m.id} variant="neutral" className="px-3 py-1 text-sm">
                {m.name}
                {trip.balances?.[m.id] > 0 && <span className="text-success ml-1"> (+₹{toRupees(trip.balances[m.id]).toFixed(0)})</span>}
                {trip.balances?.[m.id] < 0 && <span className="text-accent ml-1"> (-₹{Math.abs(toRupees(trip.balances[m.id])).toFixed(0)})</span>}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Name" value={newMember} onChange={e => setNewMember(e.target.value)} className="flex-1" />
            <Input placeholder="Email (opt)" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} className="flex-1" />
            <Button variant="ghost" size="sm" onClick={addMember}>Add</Button>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={150}>
        {/* add expense */}
        <Button variant="ghost" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add expense'}</Button>
        {showForm && <AddExpenseForm tripId={tripId} members={trip.members || []} categories={trip.budget_vs_actual || []} onDone={() => { setShowForm(false); load() }} />}
      </Reveal>

      <Reveal delay={200}>
        {/* settlements */}
        {owed.length > 0 && (
          <Card className="card-shell card-core--pad-lg">
            <p className="label-caps mb-2">Settlements needed</p>
            {owed.map(([id]) => {
              const from = owes.find(([fid]) => fid !== id)
              if (!from) return null
              return (
                <div key={id} className="flex justify-between items-center py-2 text-sm">
                  <span>{trip.members?.find(m => m.id === from[0])?.name} owes <strong>{trip.members?.find(m => m.id === id)?.name}</strong></span>
                  <span className="fin font-display font-semibold">₹{Math.abs(toRupees(from[1])).toFixed(0)}</span>
                </div>
              )
            })}
          </Card>
        )}
      </Reveal>

      <Reveal delay={250}>
        {/* suggested settlements (simplify debts) */}
        {(trip.suggested_settlements?.length || 0) > 0 && (
          <Card className="card-shell card-core--pad-lg">
            <p className="label-caps mb-2">Suggested settlements · fewest transfers</p>
            {trip.suggested_settlements.map((s, i) => {
              const fromName = trip.members?.find(m => m.id === s.from)?.name || '?'
              const toName = trip.members?.find(m => m.id === s.to)?.name || '?'
              return (
                <div key={i} className="flex justify-between items-center py-2 text-sm">
                  <span><strong>{fromName}</strong> pays <strong>{toName}</strong></span>
                  <div className="flex gap-2 items-center">
                    <span className="fin font-display font-semibold">₹{toRupees(s.amount_cents).toFixed(0)}</span>
                    <Button variant="ghost" size="sm" onClick={() => settle(s.from, s.to, toRupees(s.amount_cents))}>Settle</Button>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </Reveal>

      <Reveal delay={300}>
        {/* expenses */}
        <p className="label-caps mb-2">Expenses</p>
        {trip.expenses?.length === 0 ? (
          <p className="text-muted text-sm py-3">No expenses yet. Add your first one!</p>
        ) : (
          <div className="space-y-2">
            {trip.expenses?.map(e => (
              <Reveal key={e.id} delay={0}>
                <Card className="card-shell card-shell--interactive card-core--pad-base flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{e.description}</p>
                    <p className="text-xs text-muted">{e.payer} · {e.category_name || 'Uncategorized'} · {e.expense_date}</p>
                  </div>
                  <p className="fin font-display text-base font-semibold ml-3">{fmtINR(+e.amount)}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>
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
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Trip Mode"
          num="005 / 016"
          action={<Button onClick={() => setShowCreate(!showCreate)}>+ New trip</Button>}
        />
      </Reveal>

      <Reveal delay={50}>
        {showCreate && (
          <Card className="card-shell card-core--pad-lg">
            <form onSubmit={createTrip} className="space-y-3">
              <Input placeholder="Trip name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input placeholder="Destination" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
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
              <div className="flex gap-2">
                <Button type="submit" size="sm">Create</Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
      </Reveal>

      <Reveal delay={100}>
        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <Skeleton key={i} className="skeleton-card h-20" />)}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v20"/><path d="M22 10H2"/><circle cx="12" cy="18" r="4"/></svg>}
            title="No trips yet"
          >
            Create a trip to track shared expenses with friends and family — like Splitwise, built in.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {trips.map((t, index) => (
              <Reveal key={t.id} delay={index * 20}>
                <Card className="card-shell card-shell--interactive card-core--pad-base" onClick={() => setSelectedId(t.id)}>
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink truncate">{t.name}</p>
                      <p className="text-sm text-muted flex items-center gap-1 flex-wrap">
                        {t.destination}{t.destination && t.start_date ? ' · ' : ''}{t.start_date ? `${t.start_date}${t.end_date ? ` - ${t.end_date}` : ''}` : ''}
                        <Badge variant="neutral" className="ml-1">{t.group_type}</Badge>
                      </p>
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
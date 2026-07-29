import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function AddExpenseForm({ tripId, members, categories, onDone }) {
  const [form, setForm] = useState({ trip_member_id: '', trip_category_id: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], split_type: 'equal' })
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await api.request(`/api/v1/trips/${tripId}/trip_expenses`, { method: 'POST', body: JSON.stringify({ ...form, amount: +form.amount }) }); onDone() } catch {} finally { setSaving(false) } }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--paper-card)', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600 }}>Add expense</p>
      <input className="input" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
      <input className="input" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
      <input className="input" type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} />
      <select className="input" value={form.trip_member_id} onChange={e => setForm({...form, trip_member_id: e.target.value})} required>
        <option value="">Paid by</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select className="input" value={form.trip_category_id} onChange={e => setForm({...form, trip_category_id: e.target.value})}>
        <option value="">Category (optional)</option>
        {categories.map(c => <option key={c.id} value={c.id} style={{ color: c.color }}>{c.name}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 12.5, padding: '7px 16px' }}>{saving ? 'Saving...' : 'Add'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone} style={{ fontSize: 12.5, padding: '7px 16px' }}>Cancel</button>
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

  const load = () => {
    setLoading(true)
    api.request(`/api/v1/trips/${tripId}`).then(setTrip).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tripId])

  const addMember = async () => {
    if (!newMember.trim()) return
    await api.request(`/api/v1/trips/${tripId}/trip_members`, { method: 'POST', body: JSON.stringify({ name: newMember.trim(), email: newMemberEmail || undefined }) })
    setNewMember(''); setNewMemberEmail(''); load()
  }

  const settle = async (fromId, toId, amount) => {
    await api.request(`/api/v1/trips/${tripId}/trip_settlements`, { method: 'POST', body: JSON.stringify({ from_trip_member_id: fromId, to_trip_member_id: toId, amount }) })
    load()
  }

  if (loading) return <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 200 }} /></div>
  if (!trip) return <div className="empty-state"><p>Trip not found</p></div>

  const myId = trip.members[0]?.id // current user is first member
  const owes = Object.entries(trip.balances || {}).filter(([_, v]) => v < 0)
  const owed = Object.entries(trip.balances || {}).filter(([_, v]) => v > 0)

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-mute)', padding: 0, marginBottom: 12 }}>← Back to trips</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2 }}>{trip.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
            {trip.destination && <>{trip.destination} · </>}
            {trip.start_date && <>{trip.start_date}{trip.end_date ? ` - ${trip.end_date}` : ''} · </>}
            {trip.members?.length || 0} members
            <span className="tag" style={{ marginLeft: 8 }}>{trip.status}</span>
          </p>
        </div>
        <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 600 }}>₹{(+trip.total_spent || 0).toLocaleString('en-IN')}</p>
      </div>

      {/* members */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Members</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {trip.members?.map(m => (
            <span key={m.id} className="tag" style={{ padding: '4px 12px', fontSize: 12.5 }}>{m.name} {trip.balances?.[m.id] > 0 ? <span style={{ color: '#2d7d6a' }}>(+₹{trip.balances[m.id].toFixed(0)})</span> : trip.balances?.[m.id] < 0 ? <span style={{ color: 'var(--coral)' }}>(-₹{Math.abs(trip.balances[m.id]).toFixed(0)})</span> : ''}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" placeholder="Name" value={newMember} onChange={e => setNewMember(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12.5 }} />
          <input className="input" placeholder="Email (opt)" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12.5 }} />
          <button onClick={addMember} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Add</button>
        </div>
      </div>

      {/* add expense */}
      <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px', marginBottom: 12 }}>{showForm ? 'Cancel' : '+ Add expense'}</button>
      {showForm && <AddExpenseForm tripId={tripId} members={trip.members || []} categories={trip.budget_vs_actual || []} onDone={() => { setShowForm(false); load() }} />}

      {/* settlements */}
      {owed.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Settlements needed</p>
          {owed.map(([id, amount]) => {
            const from = owes.find(([fid]) => fid !== id)
            if (!from) return null
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                <span>{trip.members?.find(m => m.id === from[0])?.name} owes <strong>{trip.members?.find(m => m.id === id)?.name}</strong></span>
                <span className="fin" style={{ fontFamily: 'var(--sans)', fontWeight: 600 }}>₹{Math.abs(from[1]).toFixed(0)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* expenses */}
      <p style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Expenses</p>
      {trip.expenses?.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-mute)', padding: 12 }}>No expenses yet. Add your first one!</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {trip.expenses?.map(e => (
          <div key={e.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{e.description}</p>
              <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>{e.payer} · {e.category_name || 'Uncategorized'} · {e.expense_date}</p>
            </div>
            <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600 }}>₹{(+e.amount).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p className="page-num" style={{ marginBottom: 4 }}>00<em>5</em> / 016</p>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Trip Mode</h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ New trip</button>
      </div>

      {showCreate && (
        <form onSubmit={createTrip} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--paper-card)', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 16 }}>
          <input className="input" placeholder="Trip name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input className="input" placeholder="Destination" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="input" type="date" placeholder="Start" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            <input className="input" type="date" placeholder="End" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
          </div>
          <select className="input" value={form.group_type} onChange={e => setForm({...form, group_type: e.target.value})}>
            <option value="friends">Friends</option>
            <option value="family">Family</option>
            <option value="colleagues">Colleagues</option>
            <option value="custom">Custom</option>
          </select>
          <input className="input" type="number" placeholder="Budget (optional)" value={form.total_budget} onChange={e => setForm({...form, total_budget: e.target.value})} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>Create</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ fontSize: 12.5, padding: '7px 16px' }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◈</span>
          <p>No trips yet</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Create a trip to track shared expenses with friends and family — like Splitwise, built in.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trips.map(t => (
            <div key={t.id} className="card" style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setSelectedId(t.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                    {t.destination}{t.destination && t.start_date ? ' · ' : ''}{t.start_date ? `${t.start_date}${t.end_date ? ` - ${t.end_date}` : ''}` : ''}
                    <span className="tag" style={{ marginLeft: 6 }}>{t.group_type}</span>
                  </p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

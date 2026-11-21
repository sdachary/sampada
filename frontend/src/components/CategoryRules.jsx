// "Contains text -> category" rules, applied when logging a transaction.
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button, Input, Select, Card, toast } from './ui'

export default function CategoryRules() {
  const [rules, setRules] = useState([])
  const [categories, setCategories] = useState([])
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const load = () => {
    api.request('/api/v1/categorization_rules').then(d => setRules(Array.isArray(d) ? d : [])).catch(() => {})
    api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }
  useEffect(load, [])

  const add = async () => {
    if (!text.trim() || !categoryId) return
    try {
      await api.request('/api/v1/categorization_rules', {
        method: 'POST', body: JSON.stringify({ match_text: text.trim(), category_id: categoryId }),
      })
      setText(''); setCategoryId(''); load(); toast('Rule added')
    } catch (e) { toast(e.message) }
  }

  const remove = async (id) => {
    try {
      await api.request(`/api/v1/categorization_rules/${id}`, { method: 'DELETE' })
      load(); toast('Rule removed')
    } catch (e) { toast(e.message) }
  }

  return (
    <Card className="card-shell card-shell--interactive card-core--pad-lg">
      <p className="text-sm font-semibold text-ink mb-1">Categorisation rules</p>
      <p className="text-sm text-muted mb-3">Descriptions containing the text are auto-assigned to the category when you log by typing.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="e.g. swiggy" value={text} onChange={e => setText(e.target.value)} className="flex-1 min-w-40" />
        <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} options={categories.map(c => ({ value: c.id, label: c.name }))} />
        <Button size="sm" onClick={add} disabled={!text.trim() || !categoryId}>Add rule</Button>
      </div>
      {rules.length > 0 && (
        <div className="mt-3 space-y-1">
          {rules.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1 border-t border-border-soft">
              <span className="text-muted truncate">“{r.match_text}” → <span className="text-ink">{r.category_name || 'category'}</span></span>
              <button type="button" onClick={() => remove(r.id)} className="text-accent text-sm py-2" aria-label={`Remove rule ${r.match_text}`}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

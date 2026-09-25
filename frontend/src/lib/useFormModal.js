import { useState } from 'react'
import { api } from '../lib/api'

// Shared create/edit modal state machine — the ~40 lines of boilerplate every
// form modal repeats. Pass the record (null = create), the base path without
// id (e.g. '/api/v1/transactions'), an `initial` shape, and an optional
// `toBody(form)` that builds the JSON payload.
export default function useFormModal({ record, base, initial, toBody = (f) => f, onSave }) {
  const isEdit = !!record
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = JSON.stringify(toBody(form))
      if (isEdit) {
        await api.request(`${base}/${record.id}`, { method: 'PATCH', body })
      } else {
        await api.request(base, { method: 'POST', body })
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.request(`${base}/${record.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return { isEdit, form, set, setForm, saving, error, confirming, setConfirming, handleSubmit, handleDelete }
}
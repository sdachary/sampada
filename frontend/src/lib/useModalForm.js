import { useState, useCallback } from 'react'
import { api } from './api'

// ponytail: shared form-modal skeleton for all *FormModal components —
// form state + field setter + saving/error + PATCH-if-edit/POST-else submit.
export function useModalForm(initial, { basePath, id, toBody = (b) => b, onSave, submit }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // set(key) -> handler that works for both text inputs (e.target.value)
  // and checkboxes (e.target.checked). Handles both event and direct value.
  const set = useCallback(
    (key) => (e) => {
      const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
      setForm((f) => ({ ...f, [key]: val }))
    },
    []
  )

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = toBody({ ...form })
      if (submit) {
        await submit(body)
      } else if (id) {
        await api.request(`${basePath}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request(basePath, { method: 'POST', body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [form, id, basePath, toBody, onSave, submit])

  const handleDelete = useCallback(async () => {
    if (!id) return
    setSaving(true)
    try {
      await api.request(`${basePath}/${id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }, [id, basePath, onSave])

  return { form, setForm, set, saving, error, handleSubmit, handleDelete }
}

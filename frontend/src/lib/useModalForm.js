import { useState, useCallback } from 'react'
import { api } from './api'

// ponytail: shared form-modal skeleton for all *FormModal components —
// form state + field setter + saving/error + PATCH-if-edit/POST-else submit.
export function useModalForm(initial, { basePath, id, toBody = (b) => b, onSave }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = useCallback(
    (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    []
  )

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = toBody({ ...form })
      if (id) {
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
  }, [form, id, basePath, toBody, onSave])

  return { form, set, saving, error, setError, handleSubmit }
}

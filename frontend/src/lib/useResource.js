import { useState, useEffect, useCallback } from 'react'
import { api } from './api'

// ponytail: shared list + modal + delete shape for all CRUD pages
// (Debts, Portfolios, Investments, Transactions, PayoffPlans).
// listPath e.g. '/api/v1/debts'; deletes go to `${deletePath || listPath}/{id}`.
export function useResource(listPath, { deletePath, idField = 'id', nameField = 'name' } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const d = await api.request(listPath)
      setItems(Array.isArray(d) ? d : [])
    } catch {} finally { setLoading(false) }
  }, [listPath])

  useEffect(() => { fetch() }, [fetch])

  const closeModal = useCallback(() => setModal(null), [])
  const saved = useCallback(() => { setModal(null); fetch() }, [fetch])

  const remove = useCallback(async (item) => {
    const label = item?.[nameField] ?? 'this item'
    if (!confirm(`Delete "${label}"?`)) return false
    try {
      await api.request(`${deletePath || listPath}/${item[idField]}`, { method: 'DELETE' })
      await fetch()
      return true
    } catch (e) { alert(e.message); return false }
  }, [deletePath, listPath, fetch, idField, nameField])

  return { items, setItems, loading, modal, setModal, fetch, closeModal, saved, remove }
}

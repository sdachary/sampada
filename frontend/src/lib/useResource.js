import { useState, useEffect, useCallback } from 'react'
import { api } from './api'

// ponytail: shared list + modal + delete shape for all CRUD pages
// (Debts, Portfolios, Investments, Transactions, PayoffPlans).
// listPath e.g. '/api/v1/debts'; deletes go to `${deletePath || listPath}/{id}`.
// Last successful list is kept per path so a remount renders instantly, then
// refreshes in the background (stale-while-revalidate).
const listCache = new Map()

export function useResource(listPath, { deletePath, idField = 'id', nameField = 'name' } = {}) {
  const [items, setItems] = useState(() => listCache.get(listPath) ?? [])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const commit = useCallback((updater) => {
    setItems(prev => {
      const next = updater(prev)
      listCache.set(listPath, next)
      return next
    })
  }, [listPath])

  const fetch = useCallback(async () => {
    const ctrl = new AbortController()
    try {
      const d = await api.request(listPath, { signal: ctrl.signal })
      commit(() => Array.isArray(d) ? d : [])
    } catch {} finally { setLoading(false) }
    return () => ctrl.abort()
  }, [listPath, commit])

  useEffect(() => fetch(), [fetch])

  const closeModal = useCallback(() => setModal(null), [])

  // Modal forms pass back the record the API returned. Merge just that row —
  // no full-list refetch. A bare onSave() (e.g. modal-internal delete) falls
  // back to a refresh since there is no record to merge.
  const saved = useCallback((record) => {
    setModal(null)
    if (!record?.[idField]) { fetch(); return }
    commit(prev => {
      const i = prev.findIndex(x => x[idField] === record[idField])
      return i < 0 ? [...prev, record] : prev.map((x, j) => j === i ? { ...x, ...record } : x)
    })
  }, [fetch, commit, idField])

  const remove = useCallback(async (item) => {
    const label = item?.[nameField] ?? 'this item'
    if (!confirm(`Delete "${label}"?`)) return false
    try {
      await api.request(`${deletePath || listPath}/${item[idField]}`, { method: 'DELETE' })
      commit(prev => prev.filter(x => x[idField] !== item[idField]))
      return true
    } catch (e) { alert(e.message); return false }
  }, [deletePath, listPath, commit, idField, nameField])

  return { items, setItems, loading, modal, setModal, fetch, closeModal, saved, remove }
}

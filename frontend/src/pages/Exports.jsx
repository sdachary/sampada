import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Exports() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    api.request('/api/v1/exports').then(setInfo).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const doExport = async (type, format) => {
    setStatus(`Exporting ${type} as ${format}...`)
    try {
      const res = await api.raw(`/api/v1/exports/${type}?format=${format}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sampada-${type}-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(a.href)
      setStatus(`${type}.${format} downloaded`)
    } catch (e) {
      setStatus(`Error: ${e.message}`)
    }
    setTimeout(() => setStatus(''), 3000)
  }

  if (loading) return <div><div className="skeleton" style={{ height: 120 }} /></div>

  const types = info?.types || ['debts', 'portfolios', 'transactions', 'net_worth']
  const formats = info?.formats || ['csv', 'json']

  return (
    <div>
      <p className="page-num mb-4" >00<em>16</em> / 016</p>
      <h1 className="page-title" >Exports</h1>
      <p className="text-13-5-muted-sm" >Download your data as CSV or JSON.</p>

      {status && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, fontSize: 13, color: status.startsWith('Error') ? 'var(--coral)' : 'var(--emerald)' }}>
          {status}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {types.map(type => (
          <div key={type} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex-g6" >
              {formats.map(f => (
                <button key={f} onClick={() => doExport(type, f)}
                  className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px', textTransform: 'uppercase' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

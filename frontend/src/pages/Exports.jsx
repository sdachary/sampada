import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Skeleton, PageHeader, fmtINR, toast } from '../components/ui'

export default function Exports() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/exports').then(setInfo).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const doExport = async (type, format) => {
    try {
      const res = await api.raw(`/api/v1/exports/${type}?format=${format}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sampada-${type}-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(a.href)
      toast(`${type}.${format} downloaded`)
    } catch (e) {
      toast(`Error: ${e.message}`)
    }
  }

  if (loading) return <Skeleton style={{ height: 120 }} />

  const types = info?.types || ['debts', 'portfolios', 'transactions', 'net_worth']
  const formats = info?.formats || ['csv', 'json']

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Exports"
        num="016 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Download your data as CSV or JSON.</p>
      </PageHeader>

      <div style={{ display: 'grid', gap: 8 }}>
        {types.map(type => (
          <Card key={type} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 500, fontSize: 14, textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {formats.map(f => (
                <Button key={f} variant="ghost" size="sm" onClick={() => doExport(type, f)} style={{ textTransform: 'uppercase' }}>
                  {f}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
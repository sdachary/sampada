import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Skeleton, PageHeader, fmtINR, toast } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

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

  if (loading) return (
    <Reveal delay={0}>
      <Skeleton className="skeleton-card h-28" />
    </Reveal>
  )

  const types = info?.types || ['debts', 'portfolios', 'transactions', 'net_worth']
  const formats = info?.formats || ['csv', 'json']

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Exports"
          num="016 / 016"
        >
          <p className="text-sm text-muted">Download your data as CSV or JSON.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <div className="space-y-2">
          {types.map((type, index) => (
            <Reveal key={type} delay={index * 30}>
              <Card className="card-shell card-shell--interactive card-core--pad-base flex justify-between items-center">
                <div>
                  <p className="text-base font-medium capitalize">{type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-2">
                  {formats.map(f => (
                    <Button key={f} variant="ghost" size="sm" onClick={() => doExport(type, f)} className="uppercase text-xs">
                      {f}
                    </Button>
                  ))}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
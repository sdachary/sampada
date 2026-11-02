// Dev-only primitives styleguide (Step 4). Routed behind import.meta.env.DEV in App.jsx.
import { useState } from 'react'
import { Compass } from 'lucide-react'
import {
  Button, Card, Stat, Progress, Badge, Dialog, Tabs, Tooltip, Skeleton, EmptyState,
  Input, Select, Textarea, InputField, Table, toast, ToastHost,
} from '../components/ui'

export default function Styleguide() {
  const [dialog, setDialog] = useState(false)
  const [tab, setTab] = useState('plan')

  return (
    <div style={{ padding: 32, display: 'grid', gap: 32 }}>
      <h1 className="page-title">UI primitives styleguide</h1>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Buttons</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button>Start free</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Saving…</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Cards · Stat · Progress</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
          <Stat label="Net worth" value="₹4,20,000" countUp delta={15200} footnote="since last month" />
          <Stat label="Debt remaining" value="₹1,84,000" />
        </div>
        <Card interactive style={{ padding: 16 }}>Interactive card (hover lift)</Card>
        <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <Progress value={62} label="Debt payoff progress" />
          <Progress value={30} variant="success" label="Savings progress" />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Badges</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge>Neutral</Badge><Badge variant="success">Paid off</Badge>
          <Badge variant="warning">Due soon</Badge><Badge variant="danger">Missed</Badge>
          <Badge variant="accent">SIP active</Badge>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Inputs</h2>
        <InputField label="Monthly EMI" placeholder="12,000" hint="Advanced for the current month." />
        <InputField label="Rate" error="Enter a % between 0 and 24." defaultValue="12" />
        <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <Input placeholder="plain input" />
          <Select><option>Option A</option></Select>
          <Textarea placeholder="Textarea" />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Table</h2>
        <Table ariaLabel="Demo table" columns={[
          { key: 'n', label: 'Item' }, { key: 'v', label: 'Amount', align: 'right' },
        ]} rows={[
          { id: 1, cells: { n: 'Home loan EMI', v: '₹32,500' } },
          { id: 2, cells: { n: 'SIP', v: '₹10,000' } },
        ]} />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Dialog · Tabs · Tooltip · Toast</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast('SIP plan saved.')}>Fire toast</Button>
          <Tooltip label="Counted on the first day of the next month"><Badge variant="accent">Hover me</Badge></Tooltip>
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'plan', label: 'Plan' },
          { key: 'sim', label: 'Simulate' },
        ]} />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 className="h-600-16">Skeleton · EmptyState</h2>
        <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <Skeleton style={{ width: 220, height: 22 }} />
          <Skeleton style={{ width: '100%', height: 14 }} />
        </div>
        <EmptyState icon={<Compass size={32} />}
          title="No payoff plans yet."
          action="Create a plan"
          onAction={() => toast('Plan editor would open here.')}>
          Add your first loan and Sampada will plan the fastest path to zero.
        </EmptyState>
      </section>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Confirm payoff">
        <p className="text-13-muted" style={{ marginBottom: 16 }}>Dialog with focus trap. Tab cycles inside, Esc closes.</p>
        <Button onClick={() => { setDialog(false); toast('Payoff applied.'); }}>Confirm</Button>
      </Dialog>
      <ToastHost />
    </div>
  )
}

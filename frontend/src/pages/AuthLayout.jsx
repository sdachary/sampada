import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Card, Button, PageHeader, Badge, fmtINR } from '../components/ui'

const shellStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 24px',
}

const brandStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
}

export default function AuthLayout({ variant = 'form', icon, title, subtitle, error, children, after, foot }) {
  const success = variant === 'success'
  return (
    <div style={shellStyle}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div style={{ width: '100%', maxWidth: 360, textAlign: success ? 'center' : undefined }}>
        {!success && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link to="/" style={brandStyle}>Sampada</Link>
          </div>
        )}
        <Card style={{ padding: 32 }}>
          {success ? (
            <>
              <p style={{ fontSize: 28, marginBottom: 12 }}>{icon}</p>
              <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{subtitle}</p>
              {children}
            </>
          ) : (
            <>
              <PageHeader title={title} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{subtitle}</p>
              </PageHeader>
              {error && <Badge variant="danger" style={{ marginBottom: 16, fontSize: 13 }}>{error}</Badge>}
              {children}
            </>
          )}
        </Card>
        {after}
        {foot && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>{foot}</p>}
      </div>
    </div>
  )
}
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Card, PageHeader, Badge } from '../components/ui'

const shellStyle = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 24px',
  background: 'var(--color-bg)',
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
      <div className="fixed top-4 right-4 z-sticky">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[360px] text-center" style={{ textAlign: success ? 'center' : undefined }}>
        {!success && (
          <div className="mb-8">
            <Link to="/" style={brandStyle} className="no-underline">Sampada</Link>
          </div>
        )}
        <Card variant="shell" padding="xl">
          {success ? (
            <>
              <p className="text-5xl mb-3">{icon}</p>
              <h1 className="text-lg font-semibold mb-2">{title}</h1>
              <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
              {children}
            </>
          ) : (
            <>
              <PageHeader title={title} className="border-none pb-0 mb-4">
                <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
              </PageHeader>
              {error && <Badge variant="danger" className="mb-4 text-sm w-full">{error}</Badge>}
              {children}
            </>
          )}
        </Card>
        {after}
        {foot && (
          <p className="text-center text-sm text-muted mt-5">{foot}</p>
        )}
      </div>
    </div>
  )
}
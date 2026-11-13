import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Card, PageHeader, Badge } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function AuthLayout({ variant = 'form', icon, title, subtitle, error, children, after, foot }) {
  const success = variant === 'success'
  return (
    <Reveal delay={0} y={16}>
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-bg">
        <div className="fixed top-4 right-4 z-sticky">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[360px] text-center" style={{ textAlign: success ? 'center' : 'left' }}>
          {!success && (
            <div className="mb-8">
              <Link to="/" className="font-display font-bold text-xl tracking-tight text-ink no-underline">Sampada</Link>
            </div>
          )}
          <Card variant="shell" padding="xl">
            {success ? (
              <>
                <p className="text-5xl mb-3" aria-hidden="true">{icon}</p>
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
    </Reveal>
  )
}
import { Link } from 'react-router-dom'

const shellStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 24px',
}

const brandStyle = {
  fontFamily: 'var(--sans)',
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
}

// Shared shell for the unauthenticated pages (login/register/reset/forgot).
// `variant="success"` drops the brand row and centers the card for the
// "we sent you a link / password updated" confirmation screens.
export default function AuthLayout({ variant = 'form', icon, title, subtitle, error, children, after, foot }) {
  const success = variant === 'success'
  return (
    <div style={shellStyle}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: success ? 'center' : undefined }}>
        {!success && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link to="/" style={brandStyle}>Sampada</Link>
          </div>
        )}
        <div className="card" style={{ padding: 32 }}>
          {success ? (
            <>
              <p style={{ fontSize: 28, marginBottom: 12 }}>{icon}</p>
              <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', lineHeight: 1.6 }}>{subtitle}</p>
              {children}
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>{title}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 24 }}>{subtitle}</p>
              {error && <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 16 }}>{error}</p>}
              {children}
            </>
          )}
        </div>
        {after}
        {foot && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-mute)', marginTop: 20 }}>{foot}</p>}
      </div>
    </div>
  )
}
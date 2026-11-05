// Badge primitive: neutral | success | warning | danger | accent. No left stripes.
const VARIANTS = { neutral: '', success: 'badge--success', warning: 'badge--warning', danger: 'badge--danger', accent: 'badge--accent' }
export default function Badge({ variant = 'neutral', children, ...props } = {}) {
  return <span className={`badge ${VARIANTS[variant] || ''}`.trim()} {...props}>{children}</span>
}

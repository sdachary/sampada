// Badge primitive: neutral | success | warning | danger | accent. No left stripes.
const VARIANTS = { neutral: '', success: 'p-badge--success', warning: 'p-badge--warning', danger: 'p-badge--danger', accent: 'p-badge--accent' }
export default function Badge({ variant = 'neutral', children, ...props } = {}) {
  return <span className={`p-badge ${VARIANTS[variant] || ''}`.trim()} {...props}>{children}</span>
}

// Button primitive (Step 4). Variants: primary | secondary | ghost. Tokens only.
// Note: primary label is ink on coral (6.17:1 AA) — white was 2.99:1; recorded in DESIGN.md.
export default function Button({
  variant = 'primary', size, loading, children, className = '', disabled, as: Tag = 'button', ...props
} = {}) {
  const cls = `p-btn p-btn--${variant}${size === 'sm' ? ' p-btn--sm' : ''} ${className}`.trim()
  return (
    <Tag className={cls} disabled={Tag === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined} {...props}>
      {loading ? <span className="p-skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} aria-hidden="true" /> : null}
      {children}
    </Tag>
  )
}

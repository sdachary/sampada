export default function PageHeader({ title, action, children, className = '' } = {}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div>
        <h1 className="page-header__title">{title}</h1>
        {children && <div style={{ marginTop: 4 }}>{children}</div>}
      </div>
      {action && <div className="page-header__actions">{action}</div>}
    </header>
  )
}

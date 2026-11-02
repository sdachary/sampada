export default function PageHeader({ title, num, action, children, className = '' } = {}) {
  return (
    <header className={`p-page-header ${className}`.trim()}>
      <div>
        <h1 className="p-page-header__title">{title}</h1>
        {num && <p className="p-page-header__num">{num}</p>}
        {children && <div style={{ marginTop: 4 }}>{children}</div>}
      </div>
      {action && <div className="p-page-header__actions">{action}</div>}
    </header>
  )
}

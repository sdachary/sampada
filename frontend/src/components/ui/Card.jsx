// Card primitive (Step 4). `interactive` gets the single hover lift from DESIGN.md.
export default function Card({ interactive, className = '', style, children, ...props } = {}) {
  return (
    <div className={`p-card${interactive ? ' p-card--interactive' : ''} ${className}`.trim()}
      style={style} {...props}>
      {children}
    </div>
  )
}

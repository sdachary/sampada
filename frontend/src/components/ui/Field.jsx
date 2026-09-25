import { useId, cloneElement, Children } from 'react'
import Label from './Label'

export default function Field({ label, error, children, labelStyle, style }) {
  const id = useId()
  const child = typeof children === 'function' ? children(id) : children
  const wrapped = Children.count(child) === 1 && child?.type !== 'div'
    ? cloneElement(child, { id: child.props.id || id })
    : child

  return (
    <div style={style}>
      <Label htmlFor={id} style={labelStyle}>{label}</Label>
      <div className="pos-rel" >
        {wrapped}
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--coral)', marginTop: 2 }}>{error}</p>}
    </div>
  )
}

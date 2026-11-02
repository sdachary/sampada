import { useId } from 'react'
import Label from './Label'

// Input / Select / Textarea — 16px font (iOS-zoom guard), ink focus border, tokens only.
export function Input(props) { return <input className={`p-input ${props.className || ''}`} {...props} /> }
export function Select(props) { return <select className={`p-select ${props.className || ''}`} {...props} /> }
export function Textarea(props) { return <textarea className={`p-textarea ${props.className || ''}`} {...props} /> }

// InputField: label + hint + error around a control it creates itself.
export function InputField({ label, hint, error, ...control } = {}) {
  const id = useId()
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input id={id} className={`p-input ${control.className || ''}`} {...control} />
      {hint && !error && <p className="p-field__hint">{hint}</p>}
      {error && <p className="p-field__error">{error}</p>}
    </div>
  )
}

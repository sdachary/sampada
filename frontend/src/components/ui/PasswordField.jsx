import { useState } from 'react'

// Password input with inline show/hide toggle. `show` is internal but can be
// controlled via the optional `showPw`/`setShowPw` props if a page needs it.
export default function PasswordField({ showPw: controlledShow, setShowPw: controlledSet, ...props }) {
  const [internal, setInternal] = useState(false)
  const show = controlledShow ?? internal
  const setShow = controlledSet ?? setInternal

  return (
    <div className="pos-rel">
      <input type={show ? 'text' : 'password'} {...props} className={`input ${props.className || ''}`} style={{ width: '100%', ...props.style }} />
      <button type="button" onClick={() => setShow(!show)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-mute)', padding: 4 }}
        aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? '◔' : '◑'}
      </button>
    </div>
  )
}
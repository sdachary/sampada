import { Sun, Moon } from 'lucide-react'
import useTheme from '../lib/useTheme'

// ponytail: one shared toggle (landing, auth shell) — dashboard keeps its own.
export default function ThemeToggle({ size = 34 }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{
        width: size, height: size, borderRadius: 10, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-mute)',
      }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

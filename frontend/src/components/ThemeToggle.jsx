import { Sun, Moon } from 'lucide-react'
import useTheme from '../lib/useTheme'
import { Button } from '../components/ui'

// ponytail: one shared toggle (landing, auth shell) — dashboard keeps its own.
export default function ThemeToggle({ size = 40 }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <Button
      variant="glass"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="btn--icon"
      style={{ width: size, height: size }}
    >
      {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </Button>
  )
}

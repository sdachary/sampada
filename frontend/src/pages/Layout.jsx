import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import useTheme from '../lib/useTheme'
import CommandPalette from '../components/CommandPalette'
import {
  LayoutDashboard, ArrowRightLeft, Wallet, RefreshCw,
  CircleDollarSign, Target, Calculator, Briefcase, TrendingUp,
  Clock, Map, Plane, Users, MessageSquare, BarChart3,
  Download, Settings, Shield, LogOut, ChevronUp, X, Sun, Moon,
} from 'lucide-react'

const iconMap = {
  'dashboard': LayoutDashboard,
  'transactions': ArrowRightLeft,
  'budgets': Wallet,
  'recurring': RefreshCw,
  'debt': CircleDollarSign,
  'payoff': Target,
  'simulator': Calculator,
  'portfolio': Briefcase,
  'investments': TrendingUp,
  'sip': Clock,
  'journey': Map,
  'trip': Plane,
  'household': Users,
  'conversations': MessageSquare,
  'reports': BarChart3,
  'exports': Download,
  'settings': Settings,
  'privacy': Shield,
  'logout': LogOut,
}

function NavIcon({ name, size }) {
  const Icon = iconMap[name]
  return Icon ? <Icon size={size || 14} aria-hidden="true" /> : null
}

const groups = [
  { name: 'Overview', children: [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Journey', path: '/dashboard/journey', icon: 'journey' },
  ]},
  { name: 'Money', children: [
    { name: 'Transactions', path: '/dashboard/transactions', icon: 'transactions' },
    { name: 'Budgets', path: '/dashboard/budgets', icon: 'budgets' },
    { name: 'Recurring', path: '/dashboard/recurring', icon: 'recurring' },
  ]},
  { name: 'Debt', children: [
    { name: 'Debts', path: '/dashboard/debts', icon: 'debt' },
    { name: 'Payoff Plans', path: '/dashboard/payoff-plans', icon: 'payoff' },
    { name: 'Simulator', path: '/dashboard/debt-payoffs', icon: 'simulator' },
  ]},
  { name: 'Invest', children: [
    { name: 'Portfolios', path: '/dashboard/portfolios', icon: 'portfolio' },
    { name: 'Investments', path: '/dashboard/investments', icon: 'investments' },
    { name: 'SIPs', path: '/dashboard/sips', icon: 'sip' },
  ]},
  { name: 'More', children: [
    { name: 'Trip Mode', path: '/dashboard/trips', icon: 'trip' },
    { name: 'Households', path: '/dashboard/households', icon: 'household' },
    { name: 'Conversations', path: '/dashboard/conversations', icon: 'conversations' },
    { name: 'Reports', path: '/dashboard/reports', icon: 'reports' },
    { name: 'Exports', path: '/dashboard/exports', icon: 'exports' },
    { name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
    { name: 'Privacy', path: '/dashboard/privacy', icon: 'privacy' },
  ]},
]

const moreItems = [
  { name: 'Trip Mode', path: '/dashboard/trips', icon: 'trip' },
  { name: 'Households', path: '/dashboard/households', icon: 'household' },
  { name: 'Conversations', path: '/dashboard/conversations', icon: 'conversations' },
  { name: 'Reports', path: '/dashboard/reports', icon: 'reports' },
  { name: 'Exports', path: '/dashboard/exports', icon: 'exports' },
  { name: 'Privacy', path: '/dashboard/privacy', icon: 'privacy' },
  { name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
]

function NavLink({ item, current, depth, onNav }) {
  const active = item.path === current || (item.path && current.startsWith(item.path))
  return (
    <Link to={item.path} onClick={onNav}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', marginLeft: depth ? 16 : 0,
        borderRadius: 6, fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? 'var(--coral)' : 'var(--ink)',
        background: active ? 'rgba(237,111,92,0.08)' : 'transparent',
        transition: 'all 0.15s ease',
      }}>
      <NavIcon name={item.icon} />
      <span>{item.name}</span>
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => { await logout(); navigate('/') }
  const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '?'
  const isActive = (path) => location.pathname === path

  const closeMore = () => setMoreOpen(false)

  return (
    <div className="app-layout">
      {/* sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
          <Link to="/dashboard" style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Kubera</Link>
        </div>
        <nav style={{ padding: '0 8px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map((g) => (
            <div key={g.name}>
              {g.children ? (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{g.name}</div>
                  {g.children.map(c => <NavLink key={c.path} item={c} current={location.pathname} depth={1} />)}
                </>
              ) : (
                <NavLink item={g} current={location.pathname} />
              )}
            </div>
          ))}
        </nav>

        {/* theme toggle + palette hint */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)',
              borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
            }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
          </button>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>⌘K</span>
        </div>

        {/* user menu */}
        <div style={{ position: 'relative', borderTop: '1px solid var(--line)' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 12,
            }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--coral)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>{initials}</span>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.first_name || user?.email}
            </span>
            <ChevronUp size={12} aria-hidden="true"
              style={{ color: 'var(--ink-faint)', transform: menuOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}
            />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 8, right: 8,
              background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 10,
              boxShadow: '0 -8px 30px rgba(21,20,15,0.1)', padding: 6, marginBottom: 4,
            }}>
              {[
                { name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
                { name: 'Privacy', path: '/dashboard/privacy', icon: 'privacy' },
                { name: 'Logout', action: handleLogout, icon: 'logout' },
              ].map(item => (
                item.action ? (
                  <button key={item.name} onClick={() => { setMenuOpen(false); item.action() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%',
                      borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, color: item.name === 'Logout' ? 'var(--coral)' : 'var(--ink)', textAlign: 'left',
                    }}>
                    <NavIcon name={item.icon} />
                    <span>{item.name}</span>
                  </button>
                ) : (
                  <Link key={item.name} to={item.path} onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      borderRadius: 6, fontSize: 13, color: isActive(item.path) ? 'var(--coral)' : 'var(--ink)', textDecoration: 'none',
                      background: isActive(item.path) ? 'rgba(237,111,92,0.08)' : 'transparent',
                    }}>
                    <NavIcon name={item.icon} />
                    <span>{item.name}</span>
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* mobile bottom nav */}
      <nav className="bottom-nav">
        {[
          { name: 'Home', path: '/dashboard', icon: 'dashboard' },
          { name: 'Money', path: '/dashboard/transactions', icon: 'transactions' },
          { name: 'Debt', path: '/dashboard/debts', icon: 'debt' },
          { name: 'Invest', path: '/dashboard/portfolios', icon: 'portfolio' },
          { name: 'More', action: () => setMoreOpen(true), icon: 'settings' },
        ].map(item => {
          const active = item.path ? location.pathname === item.path : false
          if (item.action) {
            return (
              <button key={item.name} onClick={item.action}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0',
                  fontSize: 10, color: moreOpen ? 'var(--coral)' : 'var(--ink-mute)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <NavIcon name={item.icon} size={18} />
                <span>{item.name}</span>
              </button>
            )
          }
          return (
            <Link key={item.path} to={item.path}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0', fontSize: 10, color: active ? 'var(--coral)' : 'var(--ink-mute)', textDecoration: 'none' }}>
              <NavIcon name={item.icon} size={18} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* mobile More sheet */}
      {moreOpen && (
        <div onClick={closeMore}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column',
            background: 'var(--bg)', padding: '24px 16px', overflow: 'auto',
          }}>
          <div onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>More</span>
              <button onClick={closeMore}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: 4 }}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {moreItems.map(item => {
                const active = location.pathname === item.path
                return (
                  <Link key={item.path} to={item.path} onClick={closeMore}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                      borderRadius: 8, fontSize: 14, fontWeight: active ? 500 : 400,
                      color: active ? 'var(--coral)' : 'var(--ink)',
                      background: active ? 'var(--coral-active-bg)' : 'transparent',
                      textDecoration: 'none',
                    }}>
                    <NavIcon name={item.icon} size={20} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* main */}
      <main className="main-area"><Outlet /></main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}

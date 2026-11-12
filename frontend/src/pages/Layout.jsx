import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { PageTransition } from '../lib/motion-primitives'
import { useAuth } from '../lib/useAuth'
import useTheme from '../lib/useTheme'
import useOnline from '../lib/useOnline'
import CommandPalette from '../components/CommandPalette'
import {
  LayoutDashboard, ArrowRightLeft, Wallet, RefreshCw,
  CircleDollarSign, Target, Calculator, Briefcase, TrendingUp,
  Clock, Map, Plane, Users, MessageSquare, BarChart3,
  Download, Settings, Shield, LogOut, X, Sun, Moon, WifiOff,
  Menu, ChevronUp,
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
  'goal': Target,
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

function NavIcon({ name, size = 14 }) {
  const Icon = iconMap[name]
  return Icon ? <Icon size={size} aria-hidden="true" /> : null
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
    { name: 'Goals', path: '/dashboard/goals', icon: 'goal' },
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

function NavLink({ item, current, depth = 0, onNav, index = 0, isMobile = false }) {
  const active = item.path === current
  const baseDelay = isMobile ? 50 : 100
  const staggerDelay = baseDelay + (index * 50)

  return (
    <Link
      to={item.path}
      onClick={onNav}
      className={`nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-fast ${active ? 'text-accent font-semibold' : 'text-ink'}`}
      style={{
        marginLeft: depth ? '16px' : 0,
        transitionDelay: `${staggerDelay}ms`,
      }}
    >
      {active && !isMobile && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-md bg-accent" aria-hidden="true" />
      )}
      <NavIcon name={item.icon} size={isMobile ? 20 : 14} />
      <span>{item.name}</span>
      {active && isMobile && (
        <span className="ml-auto w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
      )}
    </Link>
  )
}

function MobileNavLink({ item, current, onNav, index = 0 }) {
  const active = item.path === current
  const staggerDelay = 100 + (index * 50)

  return (
    <Link
      key={item.path}
      to={item.path}
      onClick={onNav}
      className={`nav-link-mobile flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium transition-colors duration-fast ${active ? 'text-accent font-semibold bg-accent-bg' : 'text-ink'}`}
      style={{ transitionDelay: `${staggerDelay}ms` }}
    >
      <NavIcon name={item.icon} size={22} />
      <span>{item.name}</span>
      {active && <span className="ml-auto w-2 h-2 rounded-full bg-accent" aria-hidden="true" />}
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { isOnline } = useOnline()
  const [queued, setQueued] = useState(0)

  useEffect(() => {
    const update = (e) => setQueued(e.detail?.pending ?? 0)
    window.addEventListener('sampada:queue', update)
    return () => window.removeEventListener('sampada:queue', update)
  }, [])

  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem('onboarding-dismissed') === '1')
  const [hamburgerAnim, setHamburgerAnim] = useState(false)

  const showBanner = !user?.onboarded && !bannerDismissed

  const dismissBanner = () => {
    sessionStorage.setItem('onboarding-dismissed', '1')
    setBannerDismissed(true)
  }

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

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    setHamburgerAnim(next)
    if (next) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setHamburgerAnim(false)
    document.body.style.overflow = ''
  }

  const closeMore = () => setMoreOpen(false)

  // Close sidebar on route change
  useEffect(() => {
    if (sidebarOpen) closeSidebar()
  }, [location.pathname])

  // Sidebar width: 256px (w-64) + 24px margin = 280px, main margin = 288px (ml-72)
  const SIDEBAR_WIDTH = 288

  return (
    <div className="app-layout relative min-h-dvh bg-bg">
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-overlay bg-overlay backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ===== DESKTOP SIDEBAR — FLUID ISLAND ===== */}
      <aside className="hidden lg:flex lg:flex-col fixed lg:sticky top-6 left-6 right-auto z-sticky max-h-[calc(100vh-3rem)] w-64 bg-surface/80 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-xl overflow-hidden">
        {/* Brand */}
        <div className="p-4 border-b border-border-soft">
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-ink no-underline">
            <img src="/brand-mark.png" alt="" width={22} height={22} className="rounded-md" />
            Sampada
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1" role="navigation" aria-label="Main navigation">
          {groups.map((g, groupIndex) => (
            <div key={g.name} className="nav-group">
              {g.children ? (
                <>
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                    {g.name}
                  </div>
                  {g.children.map((c, itemIndex) => (
                    <NavLink
                      key={c.path}
                      item={c}
                      current={location.pathname}
                      depth={1}
                      onNav={closeSidebar}
                      index={groupIndex * 10 + itemIndex}
                    />
                  ))}
                </>
              ) : (
                <NavLink item={g} current={location.pathname} onNav={closeSidebar} index={groupIndex} />
              )}
            </div>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="p-4 border-t border-border-soft flex items-center justify-between">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-mute hover:text-ink hover:bg-surface-hover transition-colors duration-fast w-full"
            aria-label={`${theme === 'dark' ? 'Switch to light' : 'Switch to dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
          </button>
          <kbd className="text-[10px] text-ink-faint font-mono px-1.5 py-0.5 rounded bg-surface border border-border-soft">⌘K</kbd>
        </div>

        {/* User menu */}
        <div className="p-4 border-t border-border-soft relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-ink hover:bg-surface-hover transition-colors duration-fast"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <span className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {initials}
            </span>
            <span className="flex-1 text-left truncate">{user?.first_name || user?.email}</span>
            <ChevronUp size={14} className="text-ink-faint transition-transform duration-fast" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)' }} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-3 z-popover card-shell card-shell--elevated p-2 animate-slide-up" role="menu">
              {[
                { name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
                { name: 'Privacy', path: '/dashboard/privacy', icon: 'privacy' },
                { name: 'Logout', action: handleLogout, icon: 'logout' },
              ].map((item, index) => (
                item.action ? (
                  <button
                    key={item.name}
                    onClick={() => { setMenuOpen(false); item.action() }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-fast ${item.name === 'Logout' ? 'text-accent hover:bg-accent-bg' : 'text-ink hover:bg-surface-hover'}`}
                    role="menuitem"
                    style={{ transitionDelay: `${100 + index * 50}ms` }}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.name}</span>
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-fast ${isActive(item.path) ? 'text-accent bg-accent-bg font-medium' : 'text-ink hover:bg-surface-hover'}`}
                    role="menuitem"
                    style={{ transitionDelay: `${100 + index * 50}ms` }}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.name}</span>
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ===== MOBILE: HAMBURGER BUTTON (top-left) ===== */}
      <button
        className="lg:hidden fixed top-4 left-4 z-sticky p-2 rounded-xl bg-surface/80 backdrop-blur-2xl border border-border/50 shadow-lg"
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-controls="mobile-sidebar"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        <div className="relative w-6 h-5 flex flex-col justify-between">
          {/* Top line */}
          <span
            className="block w-full h-0.5 bg-ink rounded transition-all duration-300 ease-spring"
            style={{
              transform: hamburgerAnim ? 'translateY(2px) rotate(45deg)' : 'translateY(0) rotate(0)',
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          />
          {/* Middle line */}
          <span
            className="block w-full h-0.5 bg-ink rounded transition-all duration-300 ease-spring"
            style={{
              opacity: hamburgerAnim ? 0 : 1,
              transform: hamburgerAnim ? 'scaleX(0)' : 'scaleX(1)',
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          />
          {/* Bottom line */}
          <span
            className="block w-full h-0.5 bg-ink rounded transition-all duration-300 ease-spring"
            style={{
              transform: hamburgerAnim ? 'translateY(-2px) rotate(-45deg)' : 'translateY(0) rotate(0)',
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* ===== MOBILE SIDEBAR PANEL (FLUID ISLAND) ===== */}
      {sidebarOpen && (
        <div
          id="mobile-sidebar"
          className="lg:hidden fixed inset-y-0 left-0 z-modal w-full max-w-sm mt-4 ml-4 mr-4 mb-4 bg-surface/95 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-slide-in-right"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border-soft flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-ink no-underline">
                <img src="/brand-mark.png" alt="" width={22} height={22} className="rounded-md" />
                Sampada
              </Link>
              <button
                onClick={closeSidebar}
                className="p-2 rounded-lg text-ink-mute hover:text-ink hover:bg-surface-hover transition-colors duration-fast"
                aria-label="Close menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2" role="navigation" aria-label="Main navigation">
              {groups.map((g, groupIndex) => (
                <div key={g.name} className="nav-group">
                  {g.children ? (
                    <>
                      <div className="px-2 py-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">
                        {g.name}
                      </div>
                      {g.children.map((c, itemIndex) => (
                        <MobileNavLink
                          key={c.path}
                          item={c}
                          current={location.pathname}
                          onNav={closeSidebar}
                          index={groupIndex * 10 + itemIndex}
                        />
                      ))}
                    </>
                  ) : (
                    <MobileNavLink item={g} current={location.pathname} onNav={closeSidebar} index={groupIndex} />
                  )}
                </div>
              ))}

              {/* Theme toggle in mobile */}
              <div className="pt-4 border-t border-border-soft">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base text-ink-mute hover:text-ink hover:bg-surface-hover transition-colors duration-fast"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
                </button>
              </div>
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-border-soft space-y-3">
              <div className="flex items-center gap-3 px-2 py-2">
                <span className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-base font-semibold flex-shrink-0">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{user?.first_name || user?.email}</p>
                  <p className="text-sm text-ink-mute truncate">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/dashboard/settings" onClick={closeSidebar} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-hover transition-colors duration-fast">
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
                <Link to="/dashboard/privacy" onClick={closeSidebar} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-hover transition-colors duration-fast">
                  <Shield size={18} />
                  <span>Privacy</span>
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-accent hover:bg-accent-bg transition-colors duration-fast"
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM NAV — FLOATING PILL ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky mx-4 mb-4 px-2 pb-2 safe-area-bottom" aria-label="Bottom navigation">
        <div className="card-shell card-shell--glass flex items-center justify-around px-2 py-1.5">
          {[
            { name: 'Home', path: '/dashboard', icon: 'dashboard' },
            { name: 'Money', path: '/dashboard/transactions', icon: 'transactions' },
            { name: 'Debt', path: '/dashboard/debts', icon: 'debt' },
            { name: 'Invest', path: '/dashboard/portfolios', icon: 'portfolio' },
            { name: 'More', action: () => setMoreOpen(true), icon: 'settings' },
          ].map((item, index) => {
            const active = item.path ? location.pathname === item.path : false
            if (item.action) {
              return (
                <button
                  key={item.name}
                  onClick={item.action}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all duration-fast min-w-[64px] ${moreOpen ? 'text-accent' : 'text-ink-mute'}`}
                  style={{ minHeight: '44px' }}
                >
                  <NavIcon name={item.icon} size={20} />
                  <span>{item.name}</span>
                </button>
              )
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all duration-fast min-w-[64px] relative ${active ? 'text-accent' : 'text-ink-mute'}`}
                style={{ minHeight: '44px' }}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-accent rounded-full" aria-hidden="true" />
                )}
                <NavIcon name={item.icon} size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ===== MOBILE MORE SHEET ===== */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-modal flex flex-col bg-bg"
          onClick={closeMore}
          role="dialog"
          aria-modal="true"
          aria-label="More options"
        >
          <div onClick={e => e.stopPropagation()} className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-xl font-bold text-ink">More</h2>
              <button
                onClick={closeMore}
                className="p-2 rounded-xl text-ink-mute hover:text-ink hover:bg-surface-hover transition-colors duration-fast"
                aria-label="Close"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-2">
              {moreItems.map((item, index) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMore}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-medium transition-colors duration-fast ${isActive(item.path) ? 'text-accent bg-accent-bg font-semibold' : 'text-ink hover:bg-surface-hover'}`}
                  style={{ transitionDelay: `${100 + index * 50}ms` }}
                >
                  <NavIcon name={item.icon} size={24} />
                  <span>{item.name}</span>
                  {isActive(item.path) && <span className="ml-auto w-2 h-2 rounded-full bg-accent" aria-hidden="true" />}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ONBOARDING NUDGE ===== */}
      {showBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-toast flex items-center gap-3 px-4 py-3 rounded-2xl bg-ink text-paper shadow-xl max-w-[calc(100vw-2rem)] animate-slide-up" role="status" aria-live="polite">
          <span className="text-sm font-medium">Set up Sampada to see your full money picture.</span>
          <Link to="/dashboard/onboarding" className="px-4 py-2 rounded-full bg-accent text-white text-sm font-semibold no-underline whitespace-nowrap">
            Finish setting up
          </Link>
          <button onClick={dismissBanner} aria-label="Dismiss" className="p-1 text-ink-faint hover:text-paper transition-colors duration-fast">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="main-area lg:ml-[288px] pt-6 lg:pt-0 px-4 lg:px-8 pb-24 lg:pb-12 min-h-dvh">
        {/* Offline banner */}
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-ink text-paper text-sm shadow-lg animate-slide-down" role="status" aria-live="polite">
            <WifiOff size={16} aria-hidden="true" />
            <span>{queued > 0 ? `Offline — ${queued} ${queued === 1 ? 'change' : 'changes'} queued, will sync` : 'Offline — viewing cached data, edits disabled'}</span>
          </div>
        )}

        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
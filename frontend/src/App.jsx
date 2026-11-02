import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from './lib/useAuth'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Debts = lazy(() => import('./pages/Debts'))
const DebtDetail = lazy(() => import('./pages/DebtDetail'))
const PayoffPlans = lazy(() => import('./pages/PayoffPlans'))
const PayoffSimulator = lazy(() => import('./pages/PayoffSimulator'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Recurring = lazy(() => import('./pages/Recurring'))
const Portfolios = lazy(() => import('./pages/Portfolios'))
const Investments = lazy(() => import('./pages/Investments'))
const Sips = lazy(() => import('./pages/Sips'))
const Journey = lazy(() => import('./pages/Journey'))
const Trips = lazy(() => import('./pages/Trips'))
const Households = lazy(() => import('./pages/Households'))
const Conversations = lazy(() => import('./pages/Conversations'))
const Reports = lazy(() => import('./pages/Reports'))
const Exports = lazy(() => import('./pages/Exports'))
const Goals = lazy(() => import('./pages/Goals'))
const Settings = lazy(() => import('./pages/Settings'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Layout = lazy(() => import('./pages/Layout'))

// Dev-only styleguide: lazy so the production chunk never renders it.
const Styleguide = import.meta.env.DEV ? lazy(() => import('./pages/Styleguide.jsx')) : null

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="debts" element={<Debts />} />
          <Route path="debts/:id" element={<DebtDetail />} />
          <Route path="payoff-plans" element={<PayoffPlans />} />
          <Route path="debt-payoffs" element={<PayoffSimulator />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="recurring" element={<Recurring />} />
          <Route path="portfolios" element={<Portfolios />} />
          <Route path="investments" element={<Investments />} />
          <Route path="sips" element={<Sips />} />
          <Route path="goals" element={<Goals />} />
          <Route path="journey" element={<Journey />} />
          <Route path="trips" element={<Trips />} />
          <Route path="households" element={<Households />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="exports" element={<Exports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        {Styleguide && <Route path="/styleguide" element={<Styleguide />} />}
      </Routes>
    </Suspense>
  )
}

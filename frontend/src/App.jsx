import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Debts from './pages/Debts'
import DebtDetail from './pages/DebtDetail'
import PayoffPlans from './pages/PayoffPlans'
import PayoffSimulator from './pages/PayoffSimulator'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Recurring from './pages/Recurring'
import Portfolios from './pages/Portfolios'
import Investments from './pages/Investments'
import Sips from './pages/Sips'
import Journey from './pages/Journey'
import Trips from './pages/Trips'
import Households from './pages/Households'
import Conversations from './pages/Conversations'
import Reports from './pages/Reports'
import Exports from './pages/Exports'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Onboarding from './pages/Onboarding'
import Layout from './pages/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
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
    </Routes>
  )
}

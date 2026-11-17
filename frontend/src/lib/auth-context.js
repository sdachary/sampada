import { createContext } from 'react'

export const AuthContext = createContext(null)

// Map a Worker SafeUser (camelCase) onto the SPA's internal user shape.
// Better-Auth stays preferred when both sessions exist (it drives data calls pre-cutover).
export function mapWorkerUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.firstName || '',
    last_name: u.lastName || '',
    currency: u.currency || 'INR',
    onboarded: u.onboarded ?? false,
  }
}

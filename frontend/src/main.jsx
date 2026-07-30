import * as Sentry from '@sentry/react'
Sentry.init({
  dsn: 'https://08391ef15d8c528c36923f5df04a5dab@o4511755199774720.ingest.us.sentry.io/4511755227889664',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

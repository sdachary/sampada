// Copyright 2026 S Deepak Achary
// Licensed under the Apache License, Version 2.0
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { registerServiceWorker } from './lib/push'
import { initServiceWorkerUpdates } from './lib/swUpdate'
import { MotionProvider } from './lib/motion'
import App from './App.jsx'
import { reportError } from './lib/telemetry'
import './styles/app.css'

// ponytail: after load, so SW install never competes with first paint.
const startServiceWorker = () =>
  registerServiceWorker()
    .then((registration) => initServiceWorkerUpdates(registration))
    .catch(() => {}) // a failed SW registration must never break the app

if (document.readyState === 'complete') startServiceWorker()
else window.addEventListener('load', startServiceWorker, { once: true })

window.addEventListener('error', (e) => reportError(e.error || e.message))
window.addEventListener('unhandledrejection', (e) => reportError(e.reason))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
)

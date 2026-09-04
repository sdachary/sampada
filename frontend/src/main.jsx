// Copyright 2026 S Deepak Achary
// Licensed under the Apache License, Version 2.0
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { registerServiceWorker } from './lib/push'
import App from './App.jsx'
import './index.css'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

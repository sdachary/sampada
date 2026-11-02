// Copyright 2026 S Deepak Achary
// Licensed under the Apache License, Version 2.0
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { registerServiceWorker } from './lib/push'
import { MotionProvider } from './lib/motion'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/base.css'
import './styles/primitives.css'
import './index.css'

registerServiceWorker()

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

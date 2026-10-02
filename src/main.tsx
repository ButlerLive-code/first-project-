import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { clearLegacyStorage } from './auth/legacy'
import { initialRedirect } from './i18n/locales'
import { readStoredLocale } from './i18n/storage'
import './index.css'
import App from './App.tsx'

// The localStorage demo accounts are gone for good (see src/auth/legacy.ts).
clearLegacyStorage(() => window.localStorage)

// Runs once before the first render, so in-app navigation to "/" is never redirected.
const redirect = initialRedirect(window.location, readStoredLocale())
if (redirect) window.history.replaceState(null, '', redirect)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

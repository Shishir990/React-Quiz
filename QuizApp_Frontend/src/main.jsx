// Error reporting first, so it can catch errors from everything below
import './sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Light-mode values for the theme variables; the dark sheets below replace them
import './styles/LightMode.css'
// Sidebar contents, both modes
import './styles/Sidebar.css'
// Dark theme (Theme.css + SoftLime.css): installed last so it wins over every
// page stylesheet, and switched off in light mode. See src/theme.js.
import { installTheme } from './theme'
import { ContextProvider } from './context/QuizContext.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queries'
import { ErrorBoundary } from './components/layout/ErrorBoundary.jsx'

installTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Last line of defence: catches crashes outside the routes (e.g. in the context) */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ContextProvider>
          <App />
        </ContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

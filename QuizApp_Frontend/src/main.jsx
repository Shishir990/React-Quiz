import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// After App so it loads after every page stylesheet and wins on colours
import './styles/Theme.css'
import { ContextProvider } from './context/QuizContext.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queries'
import { ErrorBoundary } from './components/layout/ErrorBoundary.jsx'

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

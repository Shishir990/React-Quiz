import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// After App so it loads after every page stylesheet and wins on colours
import './Styles/Theme.css'
import { ContextProvider } from './Context/Context.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queries'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ContextProvider>
        <App />
      </ContextProvider>
    </QueryClientProvider>
  </StrictMode>,
)

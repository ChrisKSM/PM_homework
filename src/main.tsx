import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

async function bootstrap() {
  const embedded = process.env.APP_BUILD_ID ?? 'dev'
  try {
    const res = await fetch(`/build-version.txt?_=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const server = (await res.text()).trim()
      if (server && server !== embedded) {
        window.location.reload()
        return
      }
    }
  } catch {
    // ignore — offline or first load
  }
  renderApp()
}

bootstrap()

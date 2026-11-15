import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
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
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

const BUILD_RELOAD_KEY = 'pm-homework-build-reload-for'

/** Avoid blank screen when build-version.txt is newer than cached main.*.js (partial deploy). */
async function maybeReloadForNewBuild(embedded: string, server: string): Promise<boolean> {
  if (!server || server === embedded || embedded === 'dev') return false
  const triedFor = sessionStorage.getItem(BUILD_RELOAD_KEY)
  if (triedFor === server) {
    console.warn('[bootstrap] build id still mismatched after reload; rendering anyway', {
      embedded,
      server,
    })
    return false
  }
  sessionStorage.setItem(BUILD_RELOAD_KEY, server)
  window.location.reload()
  return true
}

async function bootstrap() {
  const embedded = process.env.APP_BUILD_ID ?? 'dev'
  try {
    const res = await fetch(`/build-version.txt?_=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const server = (await res.text()).trim()
      if (await maybeReloadForNewBuild(embedded, server)) return
    }
  } catch {
    // ignore — offline or first load
  }
  renderApp()
}

bootstrap()

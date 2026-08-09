import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthProvider } from './core/AuthContext'
import { loadAppConfig } from './core/appConfig'
import { AuthSheetProvider } from './components/AuthSheet'
import './styles/web-global.css'

export function WebApp() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadAppConfig().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="web-app web-loading">
        <i className="ri-loader-4-line spin" aria-hidden />
        <span>Loading SwapPro…</span>
      </div>
    )
  }

  return (
    <AuthProvider>
      <AuthSheetProvider>
        <Outlet />
      </AuthSheetProvider>
    </AuthProvider>
  )
}

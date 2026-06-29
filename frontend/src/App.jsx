import React, { useEffect, useState } from 'react'
import LandingPage from './components/LandingPage'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import SourcePanel from './components/SourcePanel'
import AuthWindow from './components/AuthWindow'
import useStore from './store/useStore'
import { HiOutlineBookOpen, HiOutlineExclamationTriangle } from 'react-icons/hi2'

/* ── Global Error Boundary ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('DocuMIND Error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-dvh flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <HiOutlineExclamationTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-500">An unexpected error occurred.</p>
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ── App State Machine ── */
function AppContent() {
  const { token, user, checkAuth, isAuthenticating, backendReady, isSourcePanelOpen, toggleSourcePanel, closeSourcePanel, sources } = useStore()
  const [showLanding, setShowLanding] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  // If user is already logged in, skip landing
  useEffect(() => {
    if (token && user) {
      setShowLanding(false)
    }
  }, [token, user])

  // Server waking up state — backend not ready yet but we have a stored token
  if (token && backendReady === null) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-black">D</span>
          </div>
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-bold text-slate-700">Waking up server…</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Free-tier servers sleep after inactivity. This may take up to 60 seconds.</p>
          </div>
        </div>
      </div>
    )
  }

  // Backend unreachable but has token — keep trying
  if (token && backendReady === false && !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="text-amber-600 text-lg font-black">!</span>
          </div>
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-bold text-slate-700">Connecting to server…</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">The server appears to be starting up. Retrying automatically…</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state — token exists, backend ready, authenticating
  if (token && !user && isAuthenticating) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Verifying session…</p>
        </div>
      </div>
    )
  }

  // 1. Landing page (first thing user sees)
  if (showLanding && !token) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  // 2. Auth page
  if (!token || !user) {
    return <AuthWindow onBack={() => setShowLanding(true)} />
  }

  // 3. Main app
  const sourcesCount = Array.isArray(sources) ? sources.length : 0

  return (
    <div className="h-dvh flex flex-col bg-slate-50/50 overflow-hidden text-slate-900 font-sans">
      <Header />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">
          <ChatWindow />
        </main>
        {!isSourcePanelOpen && sourcesCount > 0 && (
          <button
            onClick={toggleSourcePanel}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2.5 py-4 rounded-l-lg bg-white border border-slate-200 border-r-0 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
          >
            <HiOutlineBookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-bold">{sourcesCount}</span>
          </button>
        )}
        {isSourcePanelOpen && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={closeSourcePanel}
            />
            <SourcePanel />
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

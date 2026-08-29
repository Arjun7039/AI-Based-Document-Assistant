import React, { useState, useEffect } from 'react'
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2'
import useStore from '../store/useStore'
import { checkBackend } from '../api/client'
import UploadZone from './UploadZone'
import DocumentList from './DocumentList'

export default function Sidebar() {
  const [isLive, setIsLive] = useState(false)
  const {
    sessions, activeSessionId, createSession, switchSession, deleteSession,
    isSidebarOpen, toggleSidebar, documents
  } = useStore()

  useEffect(() => {
    let cancelled = false
    let retryTimer
    const tryConnect = async () => {
      const result = await checkBackend(true)
      if (!cancelled) {
        setIsLive(result)
        if (!result) {
          // Retry every 10 seconds until connected
          retryTimer = setTimeout(tryConnect, 10000)
        }
      }
    }
    tryConnect()
    return () => { cancelled = true; clearTimeout(retryTimer) }
  }, [])

  const closeOnMobile = () => { if (window.innerWidth < 1024) toggleSidebar() }

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in" onClick={toggleSidebar} />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 max-w-[85vw] flex flex-col shrink-0
        bg-white lg:bg-white/70 lg:backdrop-blur-xl
        border-r border-slate-200/80
        shadow-lift lg:shadow-none
        rounded-r-3xl lg:rounded-none
        transition-all duration-300 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-0'}
      `}>
        {/* Compact header — visible only on mobile where the main header hides the toggle */}
        <div className="px-4 h-16 flex items-center border-b border-slate-200/80 gap-2 shrink-0 lg:hidden justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
              <span className="text-white text-xs font-black">D</span>
            </div>
            <span className="font-bold tracking-tight text-slate-900 text-base">DocuMIND</span>
          </div>
          <button onClick={toggleSidebar} aria-label="Close menu" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2.5 shrink-0">
          <UploadZone />
          <button
            onClick={() => { createSession(); closeOnMobile() }}
            className="w-full border border-slate-200 bg-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all shadow-sm active:scale-[0.99]"
          >
            <span className="w-5 h-5 rounded-md bg-slate-900 text-white grid place-items-center">
              <HiOutlinePlus className="w-3 h-3" />
            </span>
            New conversation
          </button>
        </div>

        {/* Scrollable lists */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 no-scrollbar">
          {/* Documents */}
          <section>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.14em] mb-2 px-1 sticky top-0 bg-gradient-to-b from-white via-white/95 to-transparent pt-1 pb-1.5 -mt-1 backdrop-blur-[2px]">
              Documents · {documents.length}
            </div>
            <DocumentList />
          </section>

          {/* Conversations */}
          <section>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.14em] mb-2 px-1">
              Conversations · {sessions.length}
            </div>
            <div className="space-y-0.5">
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">No conversations yet.</div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.id === activeSessionId
                  return (
                    <div
                      key={session.id}
                      onClick={() => { switchSession(session.id); closeOnMobile() }}
                      className={`group flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-lift'
                          : 'hover:bg-slate-100 text-slate-600 font-medium'
                      }`}
                    >
                      <HiOutlineChatBubbleLeftRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                      <span className={`truncate flex-1 text-[13px] ${isActive ? 'font-semibold' : ''}`}>{session.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                        aria-label={`Delete ${session.title}`}
                        className={`p-1.5 rounded-lg transition-all ${
                          isActive
                            ? 'opacity-60 hover:opacity-100 hover:bg-white/10'
                            : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200/80 bg-white/60 shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className={`relative flex w-2 h-2 ${isLive ? '' : ''}`}>
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
                <span className={`relative inline-flex rounded-full w-2 h-2 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isLive ? 'Connected' : 'Connecting…'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-300">v2.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}

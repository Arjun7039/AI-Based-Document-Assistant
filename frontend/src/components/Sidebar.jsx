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
    const tryConnect = async () => {
      const result = await checkBackend(true)
      if (!cancelled) {
        setIsLive(result)
        if (!result) {
          // Retry every 10 seconds until connected
          setTimeout(tryConnect, 10000)
        }
      }
    }
    tryConnect()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 flex flex-col shrink-0
        bg-white border-r border-slate-200
        transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}
      `}>
        {/* Top Header Logo (Compact mobile only as header handles desktop) */}
        <div className="px-6 h-16 flex items-center border-b border-slate-200 gap-2 shrink-0 lg:hidden justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-black">D</span>
            </div>
            <span className="font-bold tracking-tight text-slate-900 text-lg">DocuMIND</span>
          </div>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-b border-slate-200 space-y-3 shrink-0">
          <UploadZone />
          <button
            onClick={() => { createSession(); if (window.innerWidth < 1024) toggleSidebar() }}
            className="w-full border border-slate-200 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-slate-50 text-slate-800 transition-all shadow-sm"
          >
            <HiOutlinePlus className="w-4 h-4 text-slate-600" />
            New conversation
          </button>
        </div>

        {/* Scrollable list area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7 no-scrollbar">
          {/* Documents Section */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Documents ({documents.length})
            </div>
            <DocumentList />
          </div>

          {/* Conversations Section */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Conversations ({sessions.length})
            </div>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="text-xs text-slate-400 p-2">No conversations yet.</div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.id === activeSessionId
                  return (
                    <div
                      key={session.id}
                      onClick={() => { switchSession(session.id); if (window.innerWidth < 1024) toggleSidebar() }}
                      className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? 'bg-slate-100 font-bold text-slate-950 shadow-sm'
                          : 'hover:bg-slate-50 text-slate-600 font-medium'
                      }`}
                    >
                      <HiOutlineChatBubbleLeftRight className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate flex-1 text-sm">{session.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isLive ? 'Connected' : 'Connecting'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">v2.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}

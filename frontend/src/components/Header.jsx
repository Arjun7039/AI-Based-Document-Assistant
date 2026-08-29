import React from 'react'
import { HiOutlineBars3, HiOutlineArrowRightOnRectangle, HiOutlineXMark } from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function Header() {
  const { toggleSidebar, isSidebarOpen, documents, user, logoutAction } = useStore()
  const readyDocs = documents.filter((d) => d.status === 'ready').length
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <header className="flex items-center justify-between px-3 sm:px-5 h-14 sm:h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl z-50 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
        >
          {isSidebarOpen ? <HiOutlineXMark className="w-5 h-5 lg:hidden" /> : null}
          <HiOutlineBars3 className={`w-5 h-5 ${isSidebarOpen ? 'hidden lg:block' : 'block'}`} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            Docu<span className="gradient-text">MIND</span>
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        {readyDocs > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-700 font-bold">{readyDocs} indexed</span>
          </div>
        )}
        <div
          title={user?.email || 'User'}
          className="size-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-600 uppercase"
        >
          {userInitial}
        </div>
        <button
          onClick={logoutAction}
          aria-label="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
          title="Sign Out"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

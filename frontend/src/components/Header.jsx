import React from 'react'
import { HiOutlineBars3, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2'
import useStore from '../store/useStore'

export default function Header() {
  const { toggleSidebar, documents, user, logoutAction } = useStore()
  const readyDocs = documents.filter((d) => d.status === 'ready').length
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b border-slate-200 bg-white z-50 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all lg:hidden"
        >
          <HiOutlineBars3 className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">DocuMIND</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-4">
        {readyDocs > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-700 font-bold">{readyDocs} indexed</span>
          </div>
        )}
        <div
          title={user?.email || 'User'}
          className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700"
        >
          {userInitial}
        </div>
        <button
          onClick={logoutAction}
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
          title="Sign Out"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

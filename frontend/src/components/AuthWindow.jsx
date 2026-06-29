import React, { useState } from 'react'
import useStore from '../store/useStore'
import { HiOutlineDocumentText, HiOutlineArrowRight, HiOutlineArrowLeft } from 'react-icons/hi2'

export default function AuthWindow({ onBack }) {
  const { loginAction, registerAction, authError, isAuthenticating } = useStore()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Please fill in all fields')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters')
        return
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match')
        return
      }
      await registerAction(email, password)
    } else {
      await loginAction(email, password)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setLocalError('')
    setPassword('')
    setConfirmPassword('')
  }

  const error = localError || authError

  return (
    <div className="min-h-dvh bg-slate-50/50 flex flex-col font-sans">
      {/* Header */}
      <header className="px-4 sm:px-8 h-14 sm:h-16 flex items-center border-b border-slate-200 bg-white shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 sm:gap-2.5 font-bold text-lg sm:text-xl tracking-tight text-slate-900 hover:opacity-95">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span>DocuMIND</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 grid place-items-center px-4 sm:px-6 py-8 sm:py-16">
        <div className="w-full max-w-md">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4 sm:mb-6 uppercase tracking-wider"
            >
              <HiOutlineArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </button>
          )}

          <div className="w-full border border-slate-200 p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm bg-white">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'signin' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {mode === 'signin' ? 'Sign in to your workspace.' : 'Start researching with DocuMIND today.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 sm:mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="work@email.com"
                className="w-full border border-slate-200 bg-white px-4 py-3 sm:py-2.5 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-slate-200 bg-white px-4 py-3 sm:py-2.5 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
              />
              {mode === 'signup' && (
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full border border-slate-200 bg-white px-4 py-3 sm:py-2.5 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
                />
              )}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-slate-900 text-white py-3 sm:py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                    <HiOutlineArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5 sm:mt-6">
              {mode === 'signin' ? 'No account? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 font-medium hover:underline"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

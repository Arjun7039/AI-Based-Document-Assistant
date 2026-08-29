import React, { useState } from 'react'
import useStore from '../store/useStore'
import { HiOutlineArrowRight, HiOutlineArrowLeft, HiOutlineEye, HiOutlineEyeSlash, HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2'

export default function AuthWindow({ onBack }) {
  const { loginAction, registerAction, authError, isAuthenticating } = useStore()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-indigo-50/40 flex flex-col font-sans">
      {/* Header */}
      <header className="px-4 sm:px-8 h-14 sm:h-16 flex items-center border-b border-slate-200/80 bg-white/80 backdrop-blur-md shrink-0">
        <button onClick={onBack} className="flex items-center gap-2.5 font-bold text-lg sm:text-xl tracking-tight text-slate-900 hover:opacity-90">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span>Docu<span className="gradient-text">MIND</span></span>
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 grid place-items-center px-4 sm:px-6 py-8 sm:py-16 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4 uppercase tracking-wider"
            >
              <HiOutlineArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </button>
          )}

          <div className="rounded-3xl border border-slate-200/80 p-6 sm:p-9 bg-white shadow-lift animate-pop">
            <div className="text-center mb-7">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {mode === 'signin' ? 'Welcome back' : 'Create your workspace'}
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">
                {mode === 'signin' ? 'Sign in to continue researching.' : 'Start asking your documents anything.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center animate-pop">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <div className="relative">
                <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="work@email.com"
                  className="input-field pl-10 py-3"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="input-field pl-10 pr-11 py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-[18px] h-[18px]" /> : <HiOutlineEye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              {mode === 'signup' && (
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="input-field pl-10 py-3"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="btn-primary w-full py-3 mt-1 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                    <HiOutlineArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === 'signin' ? 'No account? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-indigo-600 font-semibold hover:text-indigo-500 hover:underline"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed px-4">
            Your documents are encrypted, scoped to your account, and never used to train public models.
          </p>
        </div>
      </main>
    </div>
  )
}

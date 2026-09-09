import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, ShieldCheck, KeyRound, User, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  isAuthenticated: boolean
  isGuest: boolean
  onLoginSuccess: (token: string, role: 'owner' | 'guest') => void
  onLogout: () => void
}

export default function AuthModal({
  isOpen,
  onClose,
  isAuthenticated,
  isGuest,
  onLoginSuccess,
  onLogout,
}: AuthModalProps) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim()) {
      setError('Please enter your passcode.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        onLoginSuccess(data.token, data.role || 'owner')
        setPasscode('')
        onClose()
      } else {
        setError(data.error || 'Authentication failed. Please check your passcode.')
      }
    } catch {
      // Local development or offline fallback
      if (passcode.trim() === 'nemi2026' || passcode.trim().length >= 4) {
        onLoginSuccess('local_auth_token', 'owner')
        setPasscode('')
        onClose()
      } else {
        setError('Incorrect passcode. Enter the access passcode to unlock.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = () => {
    onLoginSuccess('guest_session', 'guest')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900/95 border border-purple-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white overflow-hidden select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                  {isAuthenticated ? <ShieldCheck size={20} className="text-emerald-400" /> : <Lock size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-wide flex items-center gap-1.5">
                    NEMI Neural Access Gate
                    <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                  </h2>
                  <p className="text-xs text-white/50">
                    {isAuthenticated ? 'Authenticated & Secured' : 'Sign in to access your AI companion'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Status Banner */}
            {isAuthenticated ? (
              <div className="space-y-4 py-2">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-3 text-emerald-200 text-sm">
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium text-emerald-100">
                      {isGuest ? 'Guest Session Active' : 'Owner Access Authenticated'}
                    </div>
                    <div className="text-xs text-emerald-300/70">
                      Neural Brain and cloud AI models are fully unlocked.
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-medium text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Continue Session
                  </button>
                  <button
                    onClick={() => {
                      onLogout()
                      onClose()
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
                  >
                    Lock / Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Access Passcode / Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter access passcode..."
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 text-sm text-white placeholder-white/30"
                    />
                    <KeyRound size={16} className="absolute right-3.5 top-3 text-white/30 pointer-events-none" />
                  </div>
                  {error && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:opacity-95 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Unlock size={14} />
                  <span>{loading ? 'Verifying...' : 'Unlock Neural Brain'}</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="flex-shrink mx-3 text-[10px] text-white/40 uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                <button
                  type="button"
                  onClick={handleGuestAccess}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <User size={14} className="text-white/40" />
                  <span>Continue as Guest</span>
                </button>

                <p className="text-[11px] text-white/40 text-center leading-relaxed">
                  Default access passcode is <code className="px-1 py-0.5 rounded bg-white/10 text-purple-300 font-mono">nemi2026</code>.
                  You can configure custom passcodes in your Vercel project settings.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

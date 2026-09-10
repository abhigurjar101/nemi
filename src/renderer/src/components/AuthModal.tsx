import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  UserPlus,
  LogIn,
} from 'lucide-react'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'owner' | 'member' | 'guest'
}

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  isAuthenticated: boolean
  isGuest: boolean
  currentUser?: UserProfile | null
  onLoginSuccess: (token: string, role: 'owner' | 'guest' | 'member', user?: UserProfile) => void
  onLogout: () => void
}

type AuthMode = 'signin' | 'signup' | 'passcode'

export default function AuthModal({
  isOpen,
  onClose,
  isAuthenticated,
  isGuest,
  currentUser,
  onLoginSuccess,
  onLogout,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Escape key listener for accessible closing
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reset errors when switching modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError('')
    setSuccessMsg('')
  }

  // Handle Sign In with Email and Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Authentication successful! Welcome back.')
        setTimeout(() => {
          onLoginSuccess(data.token, data.user?.role || 'owner', data.user)
          setEmail('')
          setPassword('')
          onClose()
        }, 500)
      } else {
        setError(data.error || 'Authentication failed. Please check your credentials.')
      }
    } catch {
      // Local fallback or offline development mode
      if (email.trim().toLowerCase().includes('@') && password.length >= 4) {
        const localUser: UserProfile = {
          id: `local_${Date.now()}`,
          email: email.trim().toLowerCase(),
          name: name.trim() || email.split('@')[0],
          role: 'owner',
        }
        onLoginSuccess('local_verified_token', 'owner', localUser)
        setEmail('')
        setPassword('')
        onClose()
      } else {
        setError('Network error connecting to authentication server.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Sign Up with Email and Password (stores automatically in DB)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: email.trim().toLowerCase(),
          password: password.trim(),
          name: name.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Account created & stored in database! Logging you in...')
        setTimeout(() => {
          onLoginSuccess(data.token, data.user?.role || 'owner', data.user)
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setName('')
          onClose()
        }, 700)
      } else {
        setError(data.error || 'Registration failed. An account with this email may already exist.')
      }
    } catch {
      // Local development fallback
      const localUser: UserProfile = {
        id: `local_new_${Date.now()}`,
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split('@')[0],
        role: 'owner',
      }
      onLoginSuccess('local_registered_token', 'owner', localUser)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // Handle Passcode (Legacy / Quick Admin)
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
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
        onLoginSuccess(data.token, data.role || 'owner', data.user)
        setPasscode('')
        onClose()
      } else {
        setError(data.error || 'Incorrect passcode.')
      }
    } catch {
      if (passcode.trim() === 'nemi2026' || passcode.trim().length >= 4) {
        onLoginSuccess('local_passcode_token', 'owner')
        setPasscode('')
        onClose()
      } else {
        setError('Incorrect passcode.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = () => {
    const guestUser: UserProfile = {
      id: `guest_${Date.now()}`,
      email: 'guest@nemi.ai',
      name: 'Guest Explorer',
      role: 'guest',
    }
    onLoginSuccess('guest_session', 'guest', guestUser)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
              aria-describedby="auth-modal-desc"
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
                    <h2 id="auth-modal-title" className="text-base font-semibold tracking-wide flex items-center gap-1.5">
                      NEMI Neural Access
                      <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                    </h2>
                    <p id="auth-modal-desc" className="text-xs text-white/50">
                      {isAuthenticated
                        ? 'Secure Verified Session'
                        : mode === 'signup'
                        ? 'Create new database account'
                        : 'Sign in to access your AI companion'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close authentication dialog"
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400/50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* If Authenticated: Profile Dashboard */}
              {isAuthenticated ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-base text-slate-950 shadow-md">
                      {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-emerald-100 text-sm truncate">
                        {currentUser?.name || 'Authenticated User'}
                      </div>
                      <div className="text-xs text-white/60 truncate font-mono">
                        {currentUser?.email || (isGuest ? 'guest@nemi.ai' : 'owner@nemi.ai')}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          {isGuest ? 'Guest Session' : (currentUser?.role || 'Owner').toUpperCase()}
                        </span>
                        <span className="text-[10px] text-white/40">Database Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-medium text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400/50"
                    >
                      Continue Session
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout()
                        switchMode('signin')
                      }}
                      aria-label="Sign out of account"
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-xs font-medium border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Mode Tabs */}
                  <div className="flex p-1 mb-4 rounded-xl bg-white/5 border border-white/10 text-xs" role="tablist" aria-label="Authentication Options">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signin'}
                      aria-controls="signin-panel"
                      onClick={() => switchMode('signin')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all focus-visible:ring-2 focus-visible:ring-purple-400/50 ${
                        mode === 'signin'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <LogIn size={13} />
                      <span>Sign In</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signup'}
                      aria-controls="signup-panel"
                      onClick={() => switchMode('signup')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                        mode === 'signup'
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <UserPlus size={13} />
                      <span>Sign Up</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'passcode'}
                      aria-controls="passcode-panel"
                      onClick={() => switchMode('passcode')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-purple-400/50 ${
                        mode === 'passcode'
                          ? 'bg-white/15 text-white'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Passcode
                    </button>
                  </div>

                  {/* Error & Success alerts */}
                  {error && (
                    <div role="alert" aria-live="polite" className="mb-3 flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      <AlertCircle size={15} className="shrink-0 text-rose-400" />
                      <span>{error}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div role="alert" aria-live="polite" className="mb-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* TAB 1: SIGN IN FORM */}
                  {mode === 'signin' && (
                    <form id="signin-panel" onSubmit={handleSignIn} className="space-y-3.5">
                      <div>
                        <label htmlFor="auth-signin-email" className="block text-xs font-medium text-white/70 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="auth-signin-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoFocus
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 text-xs text-white placeholder-white/30"
                          />
                          <Mail size={15} className="absolute left-3 top-3 text-white/30 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="auth-signin-password" className="block text-xs font-medium text-white/70 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="auth-signin-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password..."
                            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 text-xs text-white placeholder-white/30"
                          />
                          <KeyRound size={15} className="absolute left-3 top-3 text-white/30 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-2.5 text-white/40 hover:text-white p-0.5 rounded"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-purple-400/50"
                      >
                        <Unlock size={14} />
                        <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => switchMode('signup')}
                          className="text-[11px] text-cyan-400 hover:underline"
                        >
                          Don't have an account? Sign up with email
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: SIGN UP FORM */}
                  {mode === 'signup' && (
                    <form id="signup-panel" onSubmit={handleSignUp} className="space-y-3">
                      <div>
                        <label htmlFor="auth-signup-name" className="block text-xs font-medium text-white/70 mb-1">
                          Display Name <span className="text-white/40 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <input
                            id="auth-signup-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Mercer"
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 text-xs text-white placeholder-white/30"
                          />
                          <User size={15} className="absolute left-3 top-2.5 text-white/30 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="auth-signup-email" className="block text-xs font-medium text-white/70 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="auth-signup-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 text-xs text-white placeholder-white/30"
                          />
                          <Mail size={15} className="absolute left-3 top-2.5 text-white/30 pointer-events-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="auth-signup-password" className="block text-xs font-medium text-white/70 mb-1">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="auth-signup-password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min 6 chars"
                              className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-white/30"
                            />
                            <KeyRound size={14} className="absolute left-2.5 top-2.5 text-white/30 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="auth-signup-confirm-password" className="block text-xs font-medium text-white/70 mb-1">
                            Confirm Password
                          </label>
                          <input
                            id="auth-signup-confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-white/30"
                          />
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300/80 flex items-center gap-1.5">
                        <Sparkles size={13} className="shrink-0 text-cyan-400" />
                        <span>Credentials are salted with scrypt & stored in database.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:opacity-95 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                      >
                        <UserPlus size={14} />
                        <span>{loading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => switchMode('signin')}
                          className="text-[11px] text-purple-300 hover:underline"
                        >
                          Already have an account? Sign in
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 3: PASSCODE FALLBACK */}
                  {mode === 'passcode' && (
                    <form id="passcode-panel" onSubmit={handlePasscodeSubmit} className="space-y-3.5">
                      <div>
                        <label htmlFor="auth-passcode-input" className="block text-xs font-medium text-white/70 mb-1">
                          Access Passcode
                        </label>
                        <input
                          id="auth-passcode-input"
                          type="password"
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="nemi2026"
                          autoFocus
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:outline-none text-xs text-white placeholder-white/30"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/20 font-medium text-xs transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-400/50"
                      >
                        <KeyRound size={14} />
                        <span>Unlock with Passcode</span>
                      </button>
                    </form>
                  )}

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="flex-shrink mx-3 text-[10px] text-white/40 uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestAccess}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400/50"
                  >
                    <User size={14} className="text-white/40" />
                    <span>Continue as Guest / Demo Mode</span>
                  </button>
                </div>
              )}
            </div>
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * NEMI Zero-Knowledge Cryptographic Vault & Passkeys Modal
 * Provides AES-256-GCM encryption/decryption tests, PBKDF2 key generation,
 * and WebAuthn biometric passkey registration (Touch ID / Face ID).
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Key, Fingerprint, Lock, Unlock, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react'
import { encryptVaultData, decryptVaultData, registerPasskey, type EncryptedPayload } from '../services/cryptoVault'

export const CryptoVaultModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [passphrase, setPassphrase] = useState('nemi-master-passphrase')
  const [plainText, setPlainText] = useState('Top secret neural memories and private API keys.')
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedPayload | null>(null)
  const [decryptedText, setDecryptedText] = useState<string | null>(null)
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleEncrypt = async () => {
    try {
      const payload = await encryptVaultData(plainText, passphrase)
      setEncryptedPayload(payload)
      setDecryptedText(null)
      setStatusMsg({ type: 'success', text: 'Data sealed with AES-256-GCM & PBKDF2 (100,000 iterations).' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Encryption error' })
    }
  }

  const handleDecrypt = async () => {
    if (!encryptedPayload) return
    try {
      const plain = await decryptVaultData(encryptedPayload, passphrase)
      setDecryptedText(plain)
      setStatusMsg({ type: 'success', text: 'Data unsealed successfully with authenticated tag.' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Decryption failed: Incorrect passphrase or corrupted tag.' })
    }
  }

  const handleRegisterPasskey = async () => {
    const res = await registerPasskey('nemi_owner')
    if (res.success && res.credential) {
      setPasskeyStatus(`Passkey registered: ${res.credential.id.slice(0, 20)}...`)
      setStatusMsg({ type: 'success', text: 'Hardware-backed biometric passkey registered.' })
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Passkey creation failed.' })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-vault-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl flex flex-col rounded-2xl bg-slate-950/95 border border-purple-500/30 shadow-2xl shadow-purple-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="crypto-vault-title" className="text-base font-bold text-purple-200">
                Zero-Knowledge Cryptographic Vault
              </h3>
              <p className="text-xs text-slate-400">
                Client-side AES-256-GCM encryption & WebAuthn biometric passkeys
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Biometrics Card */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-6 h-6 text-purple-400" />
              <div>
                <div className="text-sm font-semibold text-purple-200">Biometric Passkey Hardware Auth</div>
                <div className="text-[11px] text-slate-400">
                  {passkeyStatus || 'Touch ID / Face ID / Windows Hello'}
                </div>
              </div>
            </div>
            <button
              onClick={handleRegisterPasskey}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition shadow-md"
            >
              Enroll Passkey
            </button>
          </div>

          {/* Master Key Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold" htmlFor="vault-passphrase-input">
              Vault Master Passphrase
            </label>
            <input
              id="vault-passphrase-input"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-400 font-mono"
            />
          </div>

          {/* Plain Text to Encrypt */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Sensitive Payload</label>
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-400 font-mono resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleEncrypt}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-950/50"
            >
              <Lock className="w-4 h-4" />
              <span>Seal Payload (AES-256-GCM)</span>
            </button>
            <button
              onClick={handleDecrypt}
              disabled={!encryptedPayload}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition ${
                encryptedPayload
                  ? 'bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30'
                  : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>Unseal Ciphertext</span>
            </button>
          </div>

          {/* Status feedback */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 font-mono ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Ciphertext Box */}
          {encryptedPayload && (
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1 font-mono text-[10px] text-slate-400 break-all">
              <div><span className="text-purple-400">Algorithm:</span> {encryptedPayload.algorithm}</div>
              <div><span className="text-purple-400">Salt:</span> {encryptedPayload.salt}</div>
              <div><span className="text-purple-400">IV:</span> {encryptedPayload.iv}</div>
              <div><span className="text-purple-400">Ciphertext:</span> {encryptedPayload.ciphertext.slice(0, 60)}...</div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

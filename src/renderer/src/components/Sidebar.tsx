import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Pin,
  FolderOpen,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
} from 'lucide-react'

export interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  pinned: boolean
  messageCount: number
}

interface SidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onPinConversation: (id: string) => void
  onOpenSettings: () => void
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onPin,
}: {
  conv: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onPin: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        relative rounded-xl px-3 py-2.5 cursor-pointer
        transition-all duration-150 group
        ${isActive
          ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/10 border border-cyan-400/20'
          : 'hover:bg-white/5 border border-transparent'
        }
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <MessageSquare
          className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
            isActive ? 'text-cyan-400' : 'text-white/30'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className={`text-xs font-medium truncate ${
              isActive ? 'text-white' : 'text-white/70'
            }`}>
              {conv.title}
            </p>
            <span className="text-[10px] text-white/25 flex-shrink-0">
              {timeAgo(conv.timestamp)}
            </span>
          </div>
          <p className="text-[11px] text-white/35 truncate mt-0.5">
            {conv.preview}
          </p>
        </div>
      </div>

      {/* Quick actions on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onPin}
              className={`p-1 rounded-md transition-colors ${
                conv.pinned ? 'text-cyan-400' : 'text-white/25 hover:text-white/60'
              }`}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded-md text-white/25 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Sidebar({
  conversations,
  activeConversationId,
  isOpen,
  onToggle,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onPinConversation,
  onOpenSettings,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const pinned = conversations.filter((c) => c.pinned)
  const recent = conversations.filter(
    (c) =>
      !c.pinned &&
      (searchQuery === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.preview.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <>
      {/* ── TOGGLE BUTTON (always visible as thin strip) ── */}
      <motion.button
        onClick={onToggle}
        className={`
          fixed left-0 top-1/2 -translate-y-1/2 z-50
          w-5 h-20 flex items-center justify-center
          bg-white/5 border-r border-white/8
          rounded-r-xl text-white/30 hover:text-white/60
          hover:bg-white/10 transition-all duration-200
        `}
        whileHover={{ width: '24px' }}
      >
        {isOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </motion.button>

      {/* ── SIDEBAR PANEL ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-5 top-8 bottom-8 w-64 z-40 flex flex-col glass-panel overflow-hidden"
            onMouseEnter={() => window.nemi?.enterInteractiveMode()}
          >

            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* NEMI wordmark */}
                  <div className="text-base font-bold tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    NEMI
                  </div>
                </div>
                <button
                  onClick={onNewConversation}
                  className="icon-btn text-cyan-400 hover:text-cyan-300"
                  title="New conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    w-full pl-8 pr-3 py-2 text-xs
                    bg-white/5 rounded-lg border border-white/8
                    text-white/80 placeholder-white/25
                    focus:outline-none focus:border-cyan-400/30
                    transition-colors duration-200
                  "
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 nemi-scroll space-y-0.5">

              {/* Pinned */}
              {pinned.length > 0 && (
                <>
                  <div className="px-3 py-1.5 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                      Pinned
                    </span>
                  </div>
                  {pinned.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => onSelectConversation(conv.id)}
                      onDelete={() => onDeleteConversation(conv.id)}
                      onPin={() => onPinConversation(conv.id)}
                    />
                  ))}
                  <div className="my-2 border-t border-white/5" />
                </>
              )}

              {/* Recent */}
              <div className="px-3 py-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-white/25" />
                <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                  Recent
                </span>
              </div>

              {recent.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-white/20">
                  No conversations yet.<br />Start talking or typing!
                </div>
              )}

              {recent.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => onSelectConversation(conv.id)}
                  onDelete={() => onDeleteConversation(conv.id)}
                  onPin={() => onPinConversation(conv.id)}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 p-3">
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  shell,
  systemPreferences,
  session,
} from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import * as http from 'http'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createManagedService, type ManagedService, type ServiceStatus } from './serviceRuntime'
import {
  proxyChat,
  validateNvidiaNimKey,
  type ChatRequest,
} from './providerRouting'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let voiceServerProcess: ChildProcess | null = null
let ragServerProcess: ChildProcess | null = null
let ragWindow: BrowserWindow | null = null
const managedServices = new Map<string, ManagedService>()
let savedNvidiaNimKey = ''
let servicesStopping = false


// Prevent EPIPE crashes when process stdout/stderr pipe is closed
if (process.stdout) {
  process.stdout.on('error', (err: any) => {
    if (err?.code === 'EPIPE') return
  })
}
if (process.stderr) {
  process.stderr.on('error', (err: any) => {
    if (err?.code === 'EPIPE') return
  })
}
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE') return
  console.error('[NEMI Uncaught Exception]:', err)
})

function safeLog(...args: unknown[]): void {
  try {
    if (process.stdout && !process.stdout.destroyed) {
      console.log(...args)
    }
  } catch {}
}

function safeWarn(...args: unknown[]): void {
  try {
    if (process.stderr && !process.stderr.destroyed) {
      console.warn(...args)
    }
  } catch {}
}

app.setName('NEMI')

// ──────────────────────────────────────────────────────────
// CREATE MAIN WINDOW
// ──────────────────────────────────────────────────────────
function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const windowWidth = Math.min(1280, Math.floor(screenWidth * 0.88))
  const windowHeight = Math.min(860, Math.floor(screenHeight * 0.88))

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 900,
    minHeight: 600,
    center: true,
    show: false,
    title: 'NEMI — AI Assistant',
    titleBarStyle: 'hiddenInset', // Modern macOS traffic light buttons
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000', // Must be transparent when vibrancy is active — opaque color causes black screen on hide/show
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (is.dev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  const localIndexPath = join(__dirname, '../renderer/index.html')

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[NEMI] Failed to load ${validatedURL} (${errorCode}: ${errorDescription})`)
    if (validatedURL !== `file://${localIndexPath}` && existsSync(localIndexPath)) {
      console.log('[NEMI] Falling back to local index.html')
      mainWindow?.loadFile(localIndexPath)
    }
  })

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(localIndexPath)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Failsafe: Ensure window shows even if ready-to-show event is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }
  }, 1000)

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Hide first so macOS never exposes the native background during close.
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function openRagWindow(): void {
  if (ragWindow && !ragWindow.isDestroyed()) {
    ragWindow.show()
    ragWindow.focus()
    return
  }

  ragWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: 'NEMI Advanced RAG',
    backgroundColor: '#030712',
    parent: mainWindow || undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  const ragUrl = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}?view=rag`
    : undefined
  if (ragUrl) {
    void ragWindow.loadURL(ragUrl)
  } else {
    void ragWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { view: 'rag' } })
  }
  ragWindow.on('closed', () => {
    ragWindow = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function closeRagWindow(): void {
  if (ragWindow && !ragWindow.isDestroyed()) {
    const windowToClose = ragWindow
    ragWindow = null
    // Reveal the already-loaded main window before closing the child so macOS
    // never exposes the child window's black background during the handoff.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
    // Let Electron unload the renderer cleanly so in-flight RAG IPC requests
    // and the renderer's polling timers can finish their teardown sequence.
    windowToClose.close()
    return
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  }
}

// ──────────────────────────────────────────────────────────
// TRAY MENU
// ──────────────────────────────────────────────────────────
function createTray(): void {
  const trayIcon = nativeImage.createEmpty()
  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'NEMI — AI Brain', enabled: false },
    { type: 'separator' },
    {
      label: 'Open NEMI',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Toggle Voice (⌘⇧Space)',
      click: () => mainWindow?.webContents.send('toggle-voice'),
    },
    {
      label: 'Open Chat (⌘⇧C)',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('open-chat')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit NEMI',
      accelerator: 'CmdOrCtrl+Q',
      click: () => app.quit(),
    },
  ])

  tray.setToolTip('NEMI — AI Brain')
  tray.setContextMenu(contextMenu)
}

// ──────────────────────────────────────────────────────────
// SHORTCUTS
// ──────────────────────────────────────────────────────────
function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('toggle-voice')
    }
  })

  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-chat')
    }
  })

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('toggle-sidebar')
    }
  })
}

function getConversationsStorePath(): string {
  try {
    return join(app.getPath('userData'), 'nemi_conversations.json')
  } catch {
    return join(process.cwd(), 'nemi_conversations.json')
  }
}

function getMemoriesStorePath(): string {
  try {
    return join(app.getPath('userData'), 'nemi_memories.json')
  } catch {
    return join(process.cwd(), 'nemi_memories.json')
  }
}

function getNvidiaNimKeyPath(): string {
  try {
    return join(app.getPath('userData'), 'nemi_nvidia_nim_key.txt')
  } catch {
    return join(process.cwd(), '.nemi_nvidia_nim_key.txt')
  }
}

function normalizeNvidiaNimKey(key: string): string {
  let cleanKey = String(key || '').replace(/[\x00-\x1F\x7F\r\n\t]/g, '').trim()
  if (cleanKey.toLowerCase().startsWith('bearer ')) cleanKey = cleanKey.slice(7).trim()
  if (
    (cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
    (cleanKey.startsWith("'") && cleanKey.endsWith("'")) ||
    (cleanKey.startsWith('`') && cleanKey.endsWith('`'))
  ) {
    cleanKey = cleanKey.slice(1, -1).trim()
  }
  return cleanKey
}

function loadNvidiaNimKey(): string {
  if (savedNvidiaNimKey) return savedNvidiaNimKey
  try {
    const path = getNvidiaNimKeyPath()
    if (existsSync(path)) savedNvidiaNimKey = normalizeNvidiaNimKey(readFileSync(path, 'utf-8'))
  } catch {}
  return savedNvidiaNimKey
}

function saveNvidiaNimKey(key: string): boolean {
  savedNvidiaNimKey = normalizeNvidiaNimKey(key)
  try {
    writeFileSync(getNvidiaNimKeyPath(), savedNvidiaNimKey, 'utf-8')
    return true
  } catch (error) {
    console.warn('Failed to save NVIDIA NIM key:', error)
    return false
  }
}

// ──────────────────────────────────────────────────────────
// IPC HANDLERS
// ──────────────────────────────────────────────────────────
function setupIPC(): void {
  ipcMain.on('focus-window', () => {
    mainWindow?.focus()
  })

  ipcMain.on('open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('get-display-info', () => {
    return screen.getPrimaryDisplay().bounds
  })

  ipcMain.handle('get-service-status', () => {
    return Array.from(managedServices.values()).map((service) => service.getStatus())
  })

  ipcMain.handle('chat', async (_event, request: ChatRequest) => {
    if (request.provider === 'nvidia-nim' && !request.apiKey) {
      request.apiKey = loadNvidiaNimKey()
    } else if (request.provider === 'nvidia-nim' && request.apiKey) {
      request.apiKey = normalizeNvidiaNimKey(request.apiKey)
    }
    return proxyChat(request)
  })

  ipcMain.handle('save-nvidia-nim-key', async (_event, key: string) => saveNvidiaNimKey(key))
  ipcMain.handle('get-nvidia-nim-key', async () => loadNvidiaNimKey())
  ipcMain.handle('validate-nvidia-nim-key', async (_event, key: string) => {
    const cleanKey = normalizeNvidiaNimKey(key)
    if (!cleanKey) return { valid: false, error: 'Enter an NVIDIA NIM API key first.' }
    return validateNvidiaNimKey(cleanKey)
  })

  // ── Persistent Chat Conversations & Long-Term Memories ────
  ipcMain.handle('get-stored-conversations', async () => {
    try {
      const p = getConversationsStorePath()
      if (existsSync(p)) {
        const data = readFileSync(p, 'utf-8')
        return JSON.parse(data)
      }
    } catch (e) {
      console.warn('Failed to read conversations from disk:', e)
    }
    return []
  })

  ipcMain.handle('save-stored-conversations', async (_event, conversations: any) => {
    try {
      const p = getConversationsStorePath()
      writeFileSync(p, JSON.stringify(conversations, null, 2), 'utf-8')
      return true
    } catch (e) {
      console.warn('Failed to write conversations to disk:', e)
      return false
    }
  })

  ipcMain.handle('get-stored-memories', async () => {
    try {
      const p = getMemoriesStorePath()
      if (existsSync(p)) {
        const data = readFileSync(p, 'utf-8')
        return JSON.parse(data)
      }
    } catch (e) {
      console.warn('Failed to read memories from disk:', e)
    }
    return []
  })

  ipcMain.handle('save-stored-memories', async (_event, memories: any) => {
    try {
      const p = getMemoriesStorePath()
      writeFileSync(p, JSON.stringify(memories, null, 2), 'utf-8')
      return true
    } catch (e) {
      console.warn('Failed to write memories to disk:', e)
      return false
    }
  })

  ipcMain.handle('request-mic-permission', async () => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('microphone')
      if (status !== 'granted') {
        return await systemPreferences.askForMediaAccess('microphone')
      }
      return true
    }
    return true
  })

  ipcMain.handle('open-rag-window', () => {
    openRagWindow()
    return true
  })

  ipcMain.handle('close-rag-window', () => {
    closeRagWindow()
    return true
  })

  ipcMain.on('toggle-wallpaper-mode', (_event, isWallpaper: boolean) => {
    if (!mainWindow) return
    if (isWallpaper) {
      const { width, height } = screen.getPrimaryDisplay().bounds
      mainWindow.setBounds({ x: 0, y: 0, width, height })
      mainWindow.setAlwaysOnTop(false)
      mainWindow.setVisibleOnAllWorkspaces(true)
    } else {
      mainWindow.setSize(1200, 800)
      mainWindow.center()
      mainWindow.setVisibleOnAllWorkspaces(false)
    }
  })

  // ── Ollama: check if running ──────────────────────────────
  ipcMain.handle('check-ollama', async () => {
    return new Promise<{ running: boolean; models: string[] }>((resolve) => {
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            const models = (parsed.models || []).map((m: { name: string }) => m.name)
            resolve({ running: true, models })
          } catch {
            resolve({ running: true, models: [] })
          }
        })
      })
      req.on('error', () => resolve({ running: false, models: [] }))
      req.setTimeout(3000, () => { req.destroy(); resolve({ running: false, models: [] }) })
    })
  })

  // ── Ollama: streaming chat ────────────────────────────────
  ipcMain.handle('ollama-chat', async (event, { messages, model }: { messages: Array<{role: string; content: string}>; model: string }) => {
    return new Promise<string>((resolve, reject) => {
      const body = JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature: 0.7, num_ctx: 4096 }
      })

      const options = {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }

      let fullText = ''
      const req = http.request(options, (res) => {
        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              const content = parsed?.message?.content || ''
              if (content) {
                fullText += content
                // Send streaming chunk to renderer
                event.sender.send('ollama-stream-chunk', content)
              }
              if (parsed?.done) {
                event.sender.send('ollama-stream-done')
              }
            } catch {
              // ignore parse errors
            }
          }
        })
        res.on('end', () => resolve(fullText))
        res.on('error', reject)
      })

      req.on('error', reject)
      req.setTimeout(120000, () => { req.destroy(); reject(new Error('Ollama timeout')) })
      req.write(body)
      req.end()
    })
  })

  // ── Voice Server: check health ────────────────────────────
  ipcMain.handle('check-voice-server', async () => {
    return new Promise<{ running: boolean; kokoro: boolean; voice: string; stt: string }>((resolve) => {
      const req = http.get('http://localhost:5002/health', (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve({
              running: true,
              kokoro: parsed.kokoro || false,
              voice: parsed.voice || 'af_heart',
              stt: parsed.stt || 'none'
            })
          } catch {
            resolve({ running: true, kokoro: false, voice: 'af_heart', stt: 'none' })
          }
        })
      })
      req.on('error', () => resolve({ running: false, kokoro: false, voice: 'af_heart', stt: 'none' }))
      req.setTimeout(2000, () => { req.destroy(); resolve({ running: false, kokoro: false, voice: 'af_heart', stt: 'none' }) })
    })
  })

  // ── TTS: speak via the local voice server ──
  ipcMain.handle('tts-speak', async (_event, { text, voice, speed }: { text: string; voice?: string; speed?: number }) => {
    return new Promise<boolean>((resolve) => {
      const voiceSpeed = typeof speed === 'number' && speed > 0.4 && speed < 3.0 ? speed : 1.0
      const body = JSON.stringify({ text, voice: voice || 'af_heart', speed: voiceSpeed })
      const options = {
        hostname: 'localhost',
        port: 5002,
        path: '/tts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', async () => {
          if (res.statusCode === 200 && chunks.length > 0) {
            const wavBuffer = Buffer.concat(chunks)
            mainWindow?.webContents.send('play-audio', wavBuffer.toString('base64'))
            resolve(true)
          } else resolve(false)
        })
      })
      req.on('error', () => resolve(false))
      req.setTimeout(8000, () => {
        req.destroy()
        resolve(false)
      })
      req.write(body)
      req.end()
    })
  })

  // ── Voice: set active voice ───────────────────────────────
  ipcMain.handle('set-voice', async (_event, { voice }: { voice: string }) => {
    return new Promise<boolean>((resolve) => {
      const body = JSON.stringify({ voice })
      const options = {
        hostname: 'localhost', port: 5002, path: '/set-voice',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }
      const req = http.request(options, (res) => {
        res.on('data', () => {})
        res.on('end', () => resolve(res.statusCode === 200))
      })
      req.on('error', () => resolve(false))
      req.write(body); req.end()
    })
  })

  // ── Voice: transcribe audio via local Whisper ─────────────
  ipcMain.handle('voice-transcribe', async (_event, payload: string | { wavBase64: string; mimeType?: string }) => {
    const wavBase64 = typeof payload === 'string' ? payload : payload.wavBase64
    const mimeType = typeof payload === 'string' ? 'audio/wav' : (payload.mimeType || 'audio/webm')
    return new Promise<{ text: string; mode: string }>((resolve) => {
      const wavBuf = Buffer.from(wavBase64, 'base64')
      const options = {
        hostname: 'localhost', port: 5002, path: '/transcribe',
        method: 'POST',
        headers: { 'Content-Type': mimeType, 'Content-Length': wavBuf.length }
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString())
            resolve({ text: data.text || '', mode: data.mode || 'none' })
          } catch {
            resolve({ text: '', mode: 'none' })
          }
        })
      })
      req.on('error', () => resolve({ text: '', mode: 'none' }))
      req.setTimeout(30000, () => { req.destroy(); resolve({ text: '', mode: 'none' }) })
      req.write(wavBuf); req.end()
    })
  })

  // ── RAG: check server health ──────────────────────────────
  ipcMain.handle('check-rag-server', async () => {
    return new Promise<{ running: boolean; embedding_mode: string; doc_count: number; chunk_count: number; model_loading: boolean }>((resolve) => {
      const req = http.get('http://localhost:5003/health', (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString())
            resolve({ running: true, embedding_mode: data.embedding_mode || 'none', doc_count: data.doc_count || 0, chunk_count: data.chunk_count || 0, model_loading: data.model_loading || false })
          } catch {
            resolve({ running: true, embedding_mode: 'unknown', doc_count: 0, chunk_count: 0, model_loading: false })
          }
        })
      })
      req.on('error', () => resolve({ running: false, embedding_mode: 'none', doc_count: 0, chunk_count: 0, model_loading: false }))
      req.setTimeout(2000, () => { req.destroy(); resolve({ running: false, embedding_mode: 'none', doc_count: 0, chunk_count: 0, model_loading: false }) })
    })
  })

  // ── RAG: get docs list ────────────────────────────────────
  ipcMain.handle('rag-docs', async () => {
    return new Promise<{ docs: unknown[]; total_chunks: number }>((resolve) => {
      const req = http.get('http://localhost:5003/docs', (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString())
            resolve(data)
          } catch {
            resolve({ docs: [], total_chunks: 0 })
          }
        })
      })
      req.on('error', () => resolve({ docs: [], total_chunks: 0 }))
      req.setTimeout(3000, () => { req.destroy(); resolve({ docs: [], total_chunks: 0 }) })
    })
  })

  ipcMain.handle('rag-graph', async (_event, { query, limit }: { query?: string; limit?: number }) => {
    return new Promise<unknown>((resolve) => {
      const body = JSON.stringify({ query: query || '', limit: limit || 40 })
      const options = {
        hostname: '127.0.0.1', port: 5003, path: '/graph/query',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
          catch { resolve({ error: 'Graph response parse error', nodes: [], edges: [] }) }
        })
      })
      req.on('error', (error) => resolve({ error: error.message, nodes: [], edges: [] }))
      req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'Graph request timed out', nodes: [], edges: [] }) })
      req.write(body)
      req.end()
    })
  })

  // ── RAG: upload/index a document ─────────────────────────
  ipcMain.handle('rag-upload', async (_event, { name, text, doc_id }: { name: string; text: string; doc_id?: string }) => {
    return new Promise<unknown>((resolve) => {
      const body = JSON.stringify({ name, text, doc_id })
      const options = {
        hostname: 'localhost', port: 5003, path: '/upload',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
          catch { resolve({ error: 'Parse error' }) }
        })
      })
      req.on('error', (e) => resolve({ error: e.message }))
      req.setTimeout(120000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
      req.write(body); req.end()
    })
  })

  // ── RAG: query / retrieve ─────────────────────────────────
  ipcMain.handle('rag-query', async (_event, { query, top_k }: { query: string; top_k?: number }) => {
    return new Promise<unknown>((resolve) => {
      const body = JSON.stringify({ query, top_k: top_k || 5 })
      const options = {
        hostname: 'localhost', port: 5003, path: '/query',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
          catch { resolve({ error: 'Parse error' }) }
        })
      })
      req.on('error', (e) => resolve({ error: e.message }))
      req.setTimeout(60000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
      req.write(body); req.end()
    })
  })

  // ── RAG: delete a single doc ─────────────────────────────
  ipcMain.handle('rag-delete', async (_event, docId: string) => {
    return new Promise<{ status: string; doc_id: string }>((resolve) => {
      const body = JSON.stringify({ doc_id: docId })
      const options = {
        hostname: 'localhost', port: 5003, path: '/delete',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }
      const req = http.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()))
          } catch {
            resolve({ status: 'error', doc_id: docId })
          }
        })
      })
      req.on('error', () => resolve({ status: 'error', doc_id: docId }))
      req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'timeout', doc_id: docId }) })
      req.write(body); req.end()
    })
  })

  // ── RAG: clear all docs ───────────────────────────────────
  ipcMain.handle('rag-clear', async () => {
    return new Promise<boolean>((resolve) => {
      const options = {
        hostname: 'localhost', port: 5003, path: '/clear',
        method: 'POST',
        headers: { 'Content-Length': 0 }
      }
      const req = http.request(options, (res) => {
        res.on('data', () => {}); res.on('end', () => resolve(res.statusCode === 200))
      })
      req.on('error', () => resolve(false))
      req.end()
    })
  })
}


// ──────────────────────────────────────────────────────────
// APP LIFECYCLE
// ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Configure media/microphone permissions in Electron session
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const permissionName = String(permission)
    if (
      permissionName === 'media' ||
      permissionName === 'microphone' ||
      permissionName === 'camera' ||
      permissionName === 'audioCapture' ||
      permissionName === 'speechRecognition'
    ) {
      callback(true)
    } else {
      callback(true)
    }
  })

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const permissionName = String(permission)
    if (
      permissionName === 'media' ||
      permissionName === 'microphone' ||
      permissionName === 'audioCapture' ||
      permissionName === 'speechRecognition'
    ) {
      return true
    }
    return true
  })

  // Show in dock so user can see and click NEMI!
  if (app.dock) {
    app.dock.show()
  }

  createWindow()
  createTray()
  registerShortcuts()
  setupIPC()

  // Request macOS system microphone permission asynchronously (never block window creation)
  if (process.platform === 'darwin') {
    try {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone')
      if (micStatus !== 'granted') {
        void systemPreferences.askForMediaAccess('microphone').catch((err) => {
          console.warn('Microphone permission check error:', err)
        })
      }
    } catch (err) {
      console.warn('Microphone permission check error:', err)
    }
  }

  void startManagedServices().catch((err) => {
    console.error('Failed to start managed services:', err)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function stopAllServices(): void {
  if (servicesStopping) return
  servicesStopping = true
  globalShortcut.unregisterAll()
  const services = Array.from(managedServices.values())
  managedServices.clear()
  for (const service of services) service.stopOwned()
}

app.on('will-quit', stopAllServices)
app.on('before-quit', () => {
  ;(app as any).isQuitting = true
  mainWindow?.hide()
  ragWindow?.hide()
})
process.on('SIGINT', () => {
  stopAllServices()
  process.exit(0)
})
process.on('SIGTERM', () => {
  stopAllServices()
  process.exit(0)
})

function healthCheck(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1500, () => { req.destroy(); resolve(false) })
  })
}

function appResource(name: string): string {
  const developmentPath = join(__dirname, '../..', name)
  return is.dev || existsSync(developmentPath) ? developmentPath : join(process.resourcesPath, name)
}

function spawnServer(label: string, command: string, args: string[], onChild: (child: ChildProcess | null) => void): ChildProcess {
  safeLog(`[${label}] starting ${command} ${args.join(' ')}`)
  const child = spawn(command, args, { detached: false, stdio: ['ignore', 'pipe', 'pipe'] })
  onChild(child)
  child.stdout?.on('data', (data: Buffer) => safeLog(`[${label}] ${data.toString().trim()}`))
  child.stderr?.on('data', (data: Buffer) => safeWarn(`[${label} error] ${data.toString().trim()}`))
  child.on('error', (err) => {
    safeWarn(`[${label} error] spawn failure:`, err)
    onChild(null)
  })
  child.on('exit', (code) => {
    safeLog(`[${label}] exited with code ${code}`)
    onChild(null)
  })
  return child
}

async function startManagedServices(): Promise<ServiceStatus[]> {
  if (servicesStopping) return []
  const pythonCandidates = [
    join(__dirname, '../../venv/bin/python3'),
    join(process.cwd(), 'venv/bin/python3'),
    join(app.getAppPath(), 'venv/bin/python3'),
    join(__dirname, '../../venv/Scripts/python.exe'),
    join(process.cwd(), 'venv/Scripts/python.exe'),
  ]
  const devVenvPython = pythonCandidates.find((p) => existsSync(p))
  const python = devVenvPython || (process.platform === 'win32' ? 'python' : 'python3')
  const ollamaCandidates = process.platform === 'darwin'
    ? ['/opt/homebrew/bin/ollama', '/usr/local/bin/ollama', '/Applications/Ollama.app/Contents/Resources/ollama']
    : []
  const ollamaCommand = ollamaCandidates.find((candidate) => existsSync(candidate)) || 'ollama'
  const ragDataDir = join(app.getPath('userData'), 'rag')
  const definitions: Array<[string, ManagedService]> = [
    ['Ollama', createManagedService({
      name: 'Ollama',
      healthCheck: () => healthCheck('http://127.0.0.1:11434/api/tags'),
      spawn: () => spawnServer('Ollama', ollamaCommand, ['serve'], () => {}),
      readinessAttempts: 12,
      retryDelayMs: 500,
    })],
    ['Voice', createManagedService({
      name: 'Voice',
      healthCheck: () => healthCheck('http://127.0.0.1:5002/health'),
      spawn: () => spawnServer('Voice', python, [appResource('voice_server.py')], (child) => { voiceServerProcess = child }),
      readinessAttempts: 40,
    })],
    ['RAG', createManagedService({
      name: 'RAG',
      healthCheck: () => healthCheck('http://127.0.0.1:5003/health'),
      spawn: () => spawnServer('RAG', python, [appResource('rag_server.py'), '5003', ragDataDir], (child) => { ragServerProcess = child }),
      readinessAttempts: 80,
    })],
  ]

  for (const [name, service] of definitions) {
    if (servicesStopping) {
      service.stopOwned()
      continue
    }
    managedServices.set(name, service)
  }
  return Promise.all(Array.from(managedServices.values()).map((service) => service.startOrReuse()))
}

#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  NEMI Voice Setup Script
#  Installs: Ollama + Kokoro TTS + Whisper + dependencies
# ══════════════════════════════════════════════════════════════

set -e

CYAN='\033[96m'
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
BOLD='\033[1m'
RESET='\033[0m'
PINK='\033[38;5;213m'

echo ""
echo -e "${CYAN}${BOLD}"
echo "  ███╗   ██╗███████╗███╗   ███╗██╗"
echo "  ████╗  ██║██╔════╝████╗ ████║██║"
echo "  ██╔██╗ ██║█████╗  ██╔████╔██║██║"
echo "  ██║╚██╗██║██╔══╝  ██║╚██╔╝██║██║"
echo "  ██║ ╚████║███████╗██║ ╚═╝ ██║██║"
echo "  ╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝╚═╝"
echo -e "${RESET}${PINK}  Voice Setup Script${RESET}"
echo ""

log_step() { echo -e "\n${CYAN}▸  $1${RESET}"; }
log_ok()   { echo -e "   ${GREEN}✅ $1${RESET}"; }
log_warn() { echo -e "   ${YELLOW}⚠️  $1${RESET}"; }
log_err()  { echo -e "   ${RED}❌ $1${RESET}"; }

# ── 1. Check Python ────────────────────────────────────────────
log_step "Checking Python 3.10+..."
PYTHON=$(command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
    log_err "Python not found. Install from https://python.org"
    exit 1
fi
PYVER=$($PYTHON --version 2>&1 | awk '{print $2}')
log_ok "Python $PYVER found at $PYTHON"

# ── 2. Install Python dependencies ────────────────────────────
log_step "Installing Python voice dependencies..."
$PYTHON -m pip install --quiet --upgrade pip

# Kokoro TTS (best local female voice)
echo -e "   Installing ${BOLD}Kokoro TTS${RESET}..."
$PYTHON -m pip install --quiet kokoro>=0.9.4 || {
    log_warn "Kokoro failed to install. Trying alternate..."
    $PYTHON -m pip install --quiet kokoro
}

# Audio processing
echo -e "   Installing ${BOLD}soundfile, sounddevice, numpy${RESET}..."
$PYTHON -m pip install --quiet soundfile sounddevice numpy

# Neo4j client for the optional production knowledge graph
echo -e "   Installing ${BOLD}Neo4j Python driver${RESET}..."
$PYTHON -m pip install --quiet neo4j

# Whisper for local STT (optional but recommended)
echo -e "   Installing ${BOLD}OpenAI Whisper${RESET} (local STT)..."
$PYTHON -m pip install --quiet openai-whisper || log_warn "Whisper install failed — will use browser STT"

log_ok "Python dependencies installed!"

# ── 3. Install Ollama ─────────────────────────────────────────
log_step "Checking Ollama..."
if command -v ollama &>/dev/null; then
    OLLAMA_VER=$(ollama --version 2>/dev/null || echo "unknown")
    log_ok "Ollama already installed: $OLLAMA_VER"
else
    echo -e "   Installing ${BOLD}Ollama${RESET}..."
    curl -fsSL https://ollama.com/install.sh | sh
    log_ok "Ollama installed!"
fi

# ── 4. Start Ollama ───────────────────────────────────────────
log_step "Starting Ollama service..."
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    ollama serve &>/dev/null &
    sleep 3
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        log_ok "Ollama running!"
    else
        log_warn "Ollama may need to be started manually: ollama serve"
    fi
else
    log_ok "Ollama already running!"
fi

# ── 5. Pull default model ─────────────────────────────────────
log_step "Pulling default model (llama3.2 — 2GB)..."
echo -e "   ${YELLOW}This may take a few minutes on first run...${RESET}"

MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null | $PYTHON -c "import sys,json; d=json.load(sys.stdin); print(' '.join(m['name'] for m in d.get('models',[])))" 2>/dev/null || echo "")

if echo "$MODELS" | grep -q "llama3"; then
    log_ok "llama3.2 already downloaded!"
else
    ollama pull llama3.2 && log_ok "llama3.2 downloaded!" || {
        log_warn "Failed to pull llama3.2. Try: ollama pull llama3.2"
    }
fi

# ── 6. Test Kokoro ────────────────────────────────────────────
log_step "Testing Kokoro TTS..."
$PYTHON -c "
try:
    from kokoro import KPipeline
    print('   ✅ Kokoro import successful!')
except ImportError as e:
    print(f'   ⚠️  Kokoro not available: {e}')
    print('   Will use macOS Samantha voice as fallback.')
"

# ── 7. Test Whisper ───────────────────────────────────────────
log_step "Testing Whisper STT..."
$PYTHON -c "
try:
    import whisper
    print('   ✅ Whisper import successful!')
    print('   Note: First use will download the tiny model (~75MB)')
except ImportError:
    print('   ⚠️  Whisper not available. Install: pip install openai-whisper')
    print('   Will use browser Web Speech API as fallback.')
"

# ── 8. Create launch scripts ──────────────────────────────────
log_step "Creating launch shortcuts..."

NEMI_DIR="$(cd "$(dirname "$0")" && pwd)"

# Voice server launcher
cat > "$NEMI_DIR/start_voice_server.sh" << 'VOICESCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
echo "🎙️ Starting NEMI Voice Server (Kokoro TTS)..."
python3 voice_server.py &
VOICE_PID=$!
echo "✅ Voice server started (PID: $VOICE_PID)"
echo "   Running at http://localhost:5002"
VOICESCRIPT
chmod +x "$NEMI_DIR/start_voice_server.sh"

# CLI launcher
cat > "$NEMI_DIR/start_cli.sh" << 'CLISCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
# Start voice server in background
python3 voice_server.py &
VOICE_PID=$!
sleep 2
# Start CLI
python3 nemi_cli.py "$@"
# Cleanup voice server on exit
kill $VOICE_PID 2>/dev/null
CLISCRIPT
chmod +x "$NEMI_DIR/start_cli.sh"

log_ok "Launch scripts created!"

# ── 9. Summary ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ NEMI Voice Setup Complete!${RESET}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}To use NEMI:${RESET}"
echo ""
echo -e "  ${CYAN}CLI Mode (Terminal):${RESET}"
echo -e "  ${BOLD}  bash start_cli.sh${RESET}          ← Full voice conversation"
echo -e "  ${BOLD}  python3 nemi_cli.py -t${RESET}     ← Text-only mode"
echo ""
echo -e "  ${CYAN}Voice Server only:${RESET}"
echo -e "  ${BOLD}  bash start_voice_server.sh${RESET} ← Start Kokoro TTS server"
echo ""
echo -e "  ${CYAN}NEMI App (Electron):${RESET}"
echo -e "  ${BOLD}  npm run dev${RESET}                ← Start NEMI app"
echo ""
echo -e "  ${PINK}Voice: af_heart — Warm, Sexy American Female ❤️${RESET}"
echo ""

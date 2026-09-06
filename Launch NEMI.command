#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Load local Neo4j settings for the RAG process without exposing them to the renderer.
if [[ -f "$DIR/.env" ]]; then
  set -a
  source "$DIR/.env"
  set +a
fi

# Ensure common macOS tool locations are in PATH (Finder launch isolation fix)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin:$HOME/.volta/bin:$HOME/.fnm/current/bin:$HOME/.asdf/shims:$HOME/.local/bin:$PATH"

if ! command -v npm &> /dev/null; then
  [ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile" 2>/dev/null
  [ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null
  [ -f "$HOME/.bash_profile" ] && source "$HOME/.bash_profile" 2>/dev/null
fi

unset ELECTRON_EXEC_PATH
unset ELECTRON_OVERRIDE_DIST_PATH

echo "🧠 Starting NEMI AI Assistant..."
echo "   Hotkeys: ⌘⇧Space (voice) · ⌘⇧C (chat) · ⌘⇧S (sidebar)"
echo ""

if ! command -v npm &> /dev/null; then
  echo "❌ Error: Node.js / npm not found in PATH."
  echo "   Please install Node.js (via Homebrew: 'brew install node') or ensure it is in your PATH."
  read -p "Press Enter to close..."
  exit 1
fi

npm run dev


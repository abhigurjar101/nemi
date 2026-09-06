#!/usr/bin/env python3
"""
NEMI CLI — Full Voice AI Conversation in Terminal
Uses: Ollama (local LLM) + Kokoro TTS (local sexy female voice) + Whisper (local STT)

Usage:
    python3 nemi_cli.py                  # Interactive voice + text mode
    python3 nemi_cli.py --text-only      # Text only mode (no mic needed)
    python3 nemi_cli.py --model mistral  # Use a specific Ollama model
"""

import sys
import os
import json
import time
import struct
import wave
import io
import re
import argparse
import threading
import subprocess
import tempfile
import urllib.request
import urllib.error
from urllib.request import Request
from typing import Optional, Iterator

# ─────────────────────────────────────────────────────────────
# ANSI Colors & Formatting
# ─────────────────────────────────────────────────────────────
RESET   = "\033[0m"
BOLD    = "\033[1m"
DIM     = "\033[2m"
CYAN    = "\033[96m"
PURPLE  = "\033[95m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
WHITE   = "\033[97m"
BLUE    = "\033[94m"
PINK    = "\033[38;5;213m"

def banner():
    print(f"""
{CYAN}{BOLD}
  ███╗   ██╗███████╗███╗   ███╗██╗
  ████╗  ██║██╔════╝████╗ ████║██║
  ██╔██╗ ██║█████╗  ██╔████╔██║██║
  ██║╚██╗██║██╔══╝  ██║╚██╔╝██║██║
  ██║ ╚████║███████╗██║ ╚═╝ ██║██║
  ╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝╚═╝
{RESET}{PURPLE}  AI Assistant — CLI Voice Mode{RESET}
{DIM}  Local LLM • Kokoro TTS • Whisper STT{RESET}
""")

def print_status(icon, text, color=CYAN):
    print(f"  {color}{icon}  {RESET}{text}")

def print_nemi(text):
    """Print NEMI's response with formatting."""
    print(f"\n  {PINK}◆ NEMI{RESET}  ", end="", flush=True)

def print_user(text):
    print(f"\n  {CYAN}▸ You{RESET}   {WHITE}{text}{RESET}")

def spinner(message: str, done_event: threading.Event):
    """Animated spinner while thinking."""
    frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]
    i = 0
    while not done_event.is_set():
        print(f"\r  {PURPLE}{frames[i % len(frames)]}  {RESET}{message}  ", end="", flush=True)
        i += 1
        time.sleep(0.08)
    print(f"\r  {' ' * (len(message) + 10)}\r", end="", flush=True)


# ─────────────────────────────────────────────────────────────
# OLLAMA CLIENT
# ─────────────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434"

def check_ollama() -> bool:
    try:
        req = Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.status == 200
    except Exception:
        return False

def list_ollama_models() -> list[str]:
    try:
        req = Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read())
            return [m['name'] for m in data.get('models', [])]
    except Exception:
        return []

def ollama_chat_stream(messages: list, model: str) -> Iterator[str]:
    """Stream response from Ollama."""
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.7,
            "num_ctx": 4096,
        }
    }).encode()

    req = Request(
        f"{OLLAMA_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        for line in response:
            line = line.strip()
            if not line:
                continue
            try:
                chunk = json.loads(line)
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
                if chunk.get("done"):
                    break
            except json.JSONDecodeError:
                continue


# ─────────────────────────────────────────────────────────────
# TTS — Voice Server or macOS fallback
# ─────────────────────────────────────────────────────────────
VOICE_SERVER = "http://localhost:5002"
VOICE_SERVER_AVAILABLE = False

def check_voice_server() -> bool:
    try:
        req = Request(f"{VOICE_SERVER}/health")
        with urllib.request.urlopen(req, timeout=2) as r:
            return r.status == 200
    except Exception:
        return False

def speak_via_server(text: str):
    """Use voice_server.py (Kokoro) for TTS."""
    payload = json.dumps({"text": text, "speed": 1.1}).encode()
    req = Request(
        f"{VOICE_SERVER}/tts",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        wav_bytes = r.read()

    if wav_bytes:
        # Play WAV via afplay (macOS)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(wav_bytes)
            tmp = f.name
        try:
            subprocess.run(['afplay', tmp], check=True, timeout=60)
        finally:
            os.unlink(tmp)

def speak_macos(text: str, voice: str = "Samantha", rate: int = 185):
    """Fallback: macOS 'say' command."""
    clean = re.sub(r'[`*#_~>]', '', text)[:400]
    subprocess.run(['say', '-v', voice, '-r', str(rate), clean], timeout=60)

def speak(text: str, silent: bool = False):
    """Speak text — uses voice server if available, else macOS say."""
    if silent:
        return
    # Clean markdown
    clean = re.sub(r'```[\s\S]*?```', ' code block ', text)
    clean = re.sub(r'[`*#_~>]', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    if not clean:
        return

    try:
        if VOICE_SERVER_AVAILABLE:
            speak_via_server(clean)
        else:
            speak_macos(clean)
    except Exception as e:
        print(f"\n  {YELLOW}⚠ TTS error: {e}{RESET}", flush=True)


# ─────────────────────────────────────────────────────────────
# STT — Microphone recording + transcription
# ─────────────────────────────────────────────────────────────
def record_audio(duration: float = 5.0, sample_rate: int = 16000) -> Optional[bytes]:
    """Record audio from microphone. Returns WAV bytes."""
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError:
        print(f"\n  {YELLOW}⚠ sounddevice not installed. Install with: pip install sounddevice{RESET}")
        return None

    print(f"  {RED}🎤  Recording for {duration:.0f}s... Speak now!{RESET}", end="", flush=True)
    try:
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype='int16'
        )
        sd.wait()
        print(f"\r  {GREEN}✓   Recording complete!{RESET}                    ")

        # Convert to WAV bytes
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio.tobytes())
        buf.seek(0)
        return buf.read()
    except Exception as e:
        print(f"\n  {RED}❌ Recording error: {e}{RESET}")
        return None


def transcribe_audio(wav_bytes: bytes) -> Optional[str]:
    """Transcribe audio using local Whisper (if available) or return None."""
    # Try local whisper Python package
    try:
        import whisper
        import numpy as np

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(wav_bytes)
            tmp_wav = f.name

        try:
            model = whisper.load_model("tiny.en")
            result = model.transcribe(tmp_wav, language="en", fp16=False)
            text = result.get("text", "").strip()
            return text if text else None
        finally:
            os.unlink(tmp_wav)

    except ImportError:
        pass
    except Exception as e:
        print(f"\n  {YELLOW}⚠ Whisper error: {e}{RESET}")

    # Try openai-whisper via CLI
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(wav_bytes)
            tmp_wav = f.name
        result = subprocess.run(
            ['whisper', tmp_wav, '--model', 'tiny.en', '--output_format', 'txt', '--output_dir', '/tmp'],
            capture_output=True, text=True, timeout=30
        )
        txt_file = '/tmp/' + os.path.basename(tmp_wav).replace('.wav', '.txt')
        if os.path.exists(txt_file):
            with open(txt_file) as f:
                text = f.read().strip()
            os.unlink(txt_file)
            os.unlink(tmp_wav)
            return text if text else None
    except Exception:
        pass

    return None


# ─────────────────────────────────────────────────────────────
# CONVERSATION ENGINE
# ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are NEMI, a brilliant, warm, and slightly playful AI assistant.
You are running locally on the user's machine. You are knowledgeable, concise, and helpful.
Keep responses clear and conversational — not too long unless asked for detail.
You speak in a natural, friendly tone — like a brilliant friend who happens to know everything."""

class NEMIConversation:
    def __init__(self, model: str, silent: bool = False, text_only: bool = False):
        self.model = model
        self.silent = silent
        self.text_only = text_only
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        self.history_file = os.path.expanduser("~/.nemi_cli_history.json")
        self.load_history()

    def load_history(self):
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file) as f:
                    saved = json.load(f)
                    # Keep last 20 messages
                    self.messages = [{"role": "system", "content": SYSTEM_PROMPT}] + saved[-20:]
            except Exception:
                pass

    def save_history(self):
        try:
            non_system = [m for m in self.messages if m["role"] != "system"]
            with open(self.history_file, 'w') as f:
                json.dump(non_system[-40:], f)
        except Exception:
            pass

    def chat(self, user_text: str) -> str:
        self.messages.append({"role": "user", "content": user_text})

        # Stream response
        full_response = ""
        print_nemi("")

        done_event = threading.Event()
        spin_thread = threading.Thread(
            target=spinner,
            args=(f"Thinking with {self.model}...", done_event),
            daemon=True
        )
        spin_thread.start()

        try:
            first_chunk = True
            for chunk in ollama_chat_stream(self.messages, self.model):
                if first_chunk:
                    done_event.set()
                    time.sleep(0.05)
                    print(f"  {PINK}◆ NEMI{RESET}  ", end="", flush=True)
                    first_chunk = False
                print(f"{WHITE}{chunk}{RESET}", end="", flush=True)
                full_response += chunk
        except Exception as e:
            done_event.set()
            full_response = f"Error: {e}"
            print(f"{RED}{full_response}{RESET}", end="", flush=True)
        finally:
            done_event.set()

        print("\n", flush=True)

        self.messages.append({"role": "assistant", "content": full_response})
        self.save_history()

        # Speak the response in background
        if not self.silent and full_response:
            speak_thread = threading.Thread(
                target=speak,
                args=(full_response, self.silent),
                daemon=True
            )
            speak_thread.start()

        return full_response

    def voice_turn(self, duration: float = 6.0) -> Optional[str]:
        """Record voice, transcribe, and return text."""
        wav = record_audio(duration=duration)
        if not wav:
            return None
        print(f"  {DIM}Transcribing...{RESET}", end="", flush=True)
        text = transcribe_audio(wav)
        if text:
            print(f"\r{' '*25}\r", end="")
            print_user(text)
        else:
            print(f"\r  {YELLOW}⚠ Could not transcribe audio. Try typing instead.{RESET}")
        return text


# ─────────────────────────────────────────────────────────────
# MAIN CLI LOOP
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="NEMI CLI — Local AI Voice Assistant")
    parser.add_argument('--model', '-m', default=None, help='Ollama model to use (e.g. llama3.2, mistral)')
    parser.add_argument('--text-only', '-t', action='store_true', help='Text-only mode (no voice)')
    parser.add_argument('--silent', '-s', action='store_true', help='No TTS output')
    parser.add_argument('--voice-duration', '-d', type=float, default=6.0, help='Recording duration in seconds')
    args = parser.parse_args()

    os.system('clear')
    banner()

    # ── Check Ollama ──
    print_status("🤖", "Checking Ollama...", CYAN)
    if not check_ollama():
        print(f"\n  {RED}❌ Ollama is not running!{RESET}")
        print(f"  {YELLOW}   Start it with: {BOLD}ollama serve{RESET}")
        print(f"  {YELLOW}   Install from:  {BOLD}https://ollama.com{RESET}\n")
        sys.exit(1)

    models = list_ollama_models()
    if not models:
        print(f"\n  {RED}❌ No Ollama models installed!{RESET}")
        print(f"  {YELLOW}   Pull a model: {BOLD}ollama pull llama3.2{RESET}\n")
        sys.exit(1)

    # Select model
    preferred = ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'phi4', 'phi3', 'gemma2', 'deepseek-r1']
    model = args.model
    if not model:
        for p in preferred:
            if any(p in m for m in models):
                model = next(m for m in models if p in m)
                break
        if not model:
            model = models[0]

    if model not in models and not any(model in m for m in models):
        print(f"\n  {RED}❌ Model '{model}' not found.{RESET}")
        print(f"  {YELLOW}   Available: {', '.join(models)}{RESET}\n")
        sys.exit(1)

    # Find exact model name
    if model not in models:
        model = next((m for m in models if model in m), models[0])

    print_status("✅", f"Ollama ready — using model: {BOLD}{model}{RESET}", GREEN)

    # ── Check Voice Server ──
    global VOICE_SERVER_AVAILABLE
    if not args.silent and not args.text_only:
        print_status("🔊", "Checking Kokoro voice server...", CYAN)
        VOICE_SERVER_AVAILABLE = check_voice_server()
        if VOICE_SERVER_AVAILABLE:
            print_status("✅", f"Kokoro TTS ready — voice: af_heart (Sexy Female ❤️)", GREEN)
        else:
            print_status("⚠️", "Voice server not running — using macOS Samantha voice", YELLOW)
            print(f"  {DIM}   Start it: python3 voice_server.py{RESET}")

    # ── Mode info ──
    mode = "🎤 Voice + Text" if not args.text_only else "⌨️  Text Only"
    print_status("🚀", f"Mode: {mode} | Model: {model}", CYAN)

    print(f"\n{DIM}  {'─'*54}{RESET}")
    print(f"  {WHITE}Commands:{RESET}")
    print(f"  {DIM}  v  {RESET}→ Voice input  |  {DIM}q{RESET} → Quit  |  {DIM}c{RESET} → Clear history")
    print(f"  {DIM}  Or just type your message and press Enter{RESET}")
    print(f"{DIM}  {'─'*54}{RESET}\n")

    # ── Create conversation ──
    nemi = NEMIConversation(model=model, silent=args.silent, text_only=args.text_only)

    # Welcome message
    welcome = "Hey! I'm NEMI, your local AI assistant. I'm running entirely on your machine. What's on your mind?"
    print(f"  {PINK}◆ NEMI{RESET}  {WHITE}{welcome}{RESET}\n")
    if not args.silent and not args.text_only:
        threading.Thread(target=speak, args=(welcome, args.silent), daemon=True).start()

    # ── Main loop ──
    while True:
        try:
            print(f"  {CYAN}▸{RESET} ", end="", flush=True)
            user_input = input().strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n\n  {DIM}👋 Goodbye! NEMI signing off.{RESET}\n")
            break

        if not user_input:
            continue

        # Commands
        if user_input.lower() in ('q', 'quit', 'exit', 'bye'):
            print(f"\n  {PINK}◆ NEMI{RESET}  {WHITE}Goodbye! Come back anytime. 👋{RESET}\n")
            if not args.silent:
                speak("Goodbye! Come back anytime.", args.silent)
            break

        elif user_input.lower() == 'c':
            nemi.messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            os.system('clear')
            banner()
            print_status("✅", "Conversation cleared!", GREEN)
            print()
            continue

        elif user_input.lower() in ('v', 'voice', 'speak') and not args.text_only:
            # Voice input mode
            print(f"\n  {YELLOW}⚡ Press Enter when done recording (auto-stops after {args.voice_duration:.0f}s){RESET}")
            text = nemi.voice_turn(duration=args.voice_duration)
            if text:
                nemi.chat(text)
            continue

        elif user_input.lower() == 'models':
            print(f"\n  {CYAN}Available Ollama models:{RESET}")
            for m in list_ollama_models():
                marker = " ← active" if m == model else ""
                print(f"    {DIM}•{RESET} {m}{GREEN}{marker}{RESET}")
            print()
            continue

        elif user_input.lower().startswith('use '):
            new_model = user_input[4:].strip()
            available = list_ollama_models()
            match = next((m for m in available if new_model in m), None)
            if match:
                model = match
                nemi.model = match
                print_status("✅", f"Switched to model: {BOLD}{match}{RESET}", GREEN)
            else:
                print_status("❌", f"Model '{new_model}' not found. Available: {', '.join(available)}", RED)
            print()
            continue

        elif user_input.lower() == 'help':
            print(f"""
  {CYAN}Commands:{RESET}
    {WHITE}v{RESET}           → Voice input (record mic)
    {WHITE}c{RESET}           → Clear conversation history
    {WHITE}models{RESET}      → List available Ollama models
    {WHITE}use <model>{RESET} → Switch model (e.g. use mistral)
    {WHITE}q{RESET}           → Quit
    {WHITE}help{RESET}        → Show this help

  {CYAN}Just type anything to chat!{RESET}
""")
            continue

        # Regular text input → send to Ollama
        print_user(user_input)
        nemi.chat(user_input)


if __name__ == '__main__':
    main()

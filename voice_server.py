#!/usr/bin/env python3
"""
NEMI Voice Server — Kokoro TTS + Local Whisper STT
Runs on http://localhost:5002

TTS: Kokoro (local, offline) → macOS 'say' fallback
STT: faster-whisper → openai-whisper → empty (browser handles it)
"""

import sys
import os
import io
import json
import struct
import wave
import time
import threading
import subprocess
import tempfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ── Try to import Kokoro TTS ──────────────────────────────────
try:
    from kokoro import KPipeline
    import numpy as np
    import soundfile as sf
    KOKORO_AVAILABLE = True
    print("✅ Kokoro TTS loaded successfully", flush=True)
except ImportError:
    KOKORO_AVAILABLE = False
    print("⚠️  Kokoro not installed. Falling back to macOS 'say' command.", flush=True)

# ── Try to import local Whisper STT ──────────────────────────
try:
    from faster_whisper import WhisperModel
    whisper_model = None
    WHISPER_MODE = "faster-whisper"
    print("✅ faster-whisper available for local STT", flush=True)
except ImportError:
    try:
        import whisper as openai_whisper
        whisper_model = None
        WHISPER_MODE = "openai-whisper"
        print("✅ openai-whisper available for local STT", flush=True)
    except ImportError:
        whisper_model = None
        WHISPER_MODE = "none"
        print("⚠️  No local Whisper found. Browser STT will be used.", flush=True)
        print("   Install for local STT: pip install faster-whisper", flush=True)

whisper_lock = threading.Lock()
transcribe_lock = threading.Lock()
tts_lock = threading.Lock()
MAX_TTS_BODY_BYTES = 256 * 1024
MAX_AUDIO_BODY_BYTES = 25 * 1024 * 1024


class NemiVoiceServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128

def load_whisper_model():
    """Load Whisper model (lazy, first call)."""
    global whisper_model
    if whisper_model is not None:
        return whisper_model
    with whisper_lock:
        if whisper_model is not None:
            return whisper_model
        try:
            if WHISPER_MODE == "faster-whisper":
                print("🎤 Loading faster-whisper tiny.en...", flush=True)
                whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
                print("✅ faster-whisper ready (tiny.en, int8, CPU)", flush=True)
            elif WHISPER_MODE == "openai-whisper":
                print("🎤 Loading openai-whisper tiny.en...", flush=True)
                whisper_model = openai_whisper.load_model("tiny.en")
                print("✅ openai-whisper ready (tiny.en)", flush=True)
        except Exception as e:
            print(f"⚠️  Whisper load error: {e}", flush=True)
    return whisper_model

def transcribe_audio(audio_bytes: bytes, content_type: str = 'audio/wav') -> str:
    """Transcribe audio bytes using local Whisper model."""
    if WHISPER_MODE == "none":
        return ""
    model = load_whisper_model()
    if model is None:
        return ""
    suffix = '.wav'
    if 'webm' in content_type:
        suffix = '.webm'
    elif 'ogg' in content_type:
        suffix = '.ogg'
    elif 'mp4' in content_type or 'm4a' in content_type:
        suffix = '.mp4'

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_audio = f.name
    try:
        if WHISPER_MODE == "faster-whisper":
            segments, _ = model.transcribe(tmp_audio, language="en", beam_size=5)
            return " ".join(seg.text for seg in segments).strip()
        elif WHISPER_MODE == "openai-whisper":
            result = model.transcribe(tmp_audio, language="en", fp16=False)
            return result.get("text", "").strip()
    except Exception as e:
        print(f"⚠️  Transcription error: {e}", flush=True)
        return ""
    finally:
        try:
            os.unlink(tmp_audio)
        except Exception:
            pass


def transcribe_wav(wav_bytes: bytes) -> str:
    """Backward-compatible alias for transcribe_audio."""
    return transcribe_audio(wav_bytes, 'audio/wav')


pipeline_a = None  # American English pipeline ('a')
pipeline_b = None  # British English pipeline ('b')
pipeline = None    # Backward-compatible alias to primary pipeline

VOICE = "af_heart"   # Warm, intimate American female voice ❤️
VOICES = {
    "af_heart":    "Heart (Warm & Intimate Female) ❤️",
    "af_bella":    "Bella (Smooth & Articulate Female) ✨",
    "af_sarah":    "Sarah (Soft & Friendly Female) 🌸",
    "af_sky":      "Sky (Bright & Youthful Female) ☀️",
    "af_nicole":   "Nicole (Calm & Whispery Female) 🌙",
    "am_adam":     "Adam (Clear & Confident Male) 🎙️",
    "am_michael":  "Michael (Warm & Conversational Male) ☕",
    "bf_emma":     "Emma (Elegant British Female) 🎩",
    "bf_isabella": "Isabella (Gentle British Female) 🌿",
    "bm_george":   "George (Classic British Male) 🇬🇧",
}

def load_pipeline():
    global pipeline_a, pipeline_b, pipeline
    if not KOKORO_AVAILABLE:
        return
    try:
        print(f"🔊 Loading Kokoro neural TTS pipelines...", flush=True)
        # Load primary American English pipeline
        pipeline_a = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
        # Pipeline B reuses the underlying neural KModel with 0 additional memory overhead
        pipeline_b = KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M', model=pipeline_a.model)
        pipeline = pipeline_a
        print("✅ Kokoro dual American & British pipelines ready!", flush=True)
    except Exception as e:
        print(f"❌ Failed to load Kokoro: {e}", flush=True)
        pipeline_a = None
        pipeline_b = None
        pipeline = None


def text_to_wav_bytes(text: str, voice: str = VOICE, speed: float = 1.0) -> bytes:
    """Convert text to WAV bytes using Kokoro TTS with human-like cadence and micro-pauses."""
    import re
    # Clean text: remove code blocks, markdown tags, formatting
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'[#*`_~>]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Intelligent sentence-boundary cap if text is excessively long (>2000 chars)
    if len(text) > 2000:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        capped = []
        cur_len = 0
        for s in sentences:
            if cur_len + len(s) > 2000:
                break
            capped.append(s)
            cur_len += len(s)
        text = ' '.join(capped) if capped else text[:2000]

    if not text:
        return b''

    # Pre-validate voice to avoid network download retries on unrecognized voice names
    if voice not in VOICES:
        print(f"⚠️ Voice '{voice}' not in VOICES catalog; defaulting to af_heart", flush=True)
        voice = 'af_heart'

    # Select pipeline based on voice language prefix
    active_pipe = pipeline_b if (voice.startswith(('bf_', 'bm_')) and pipeline_b is not None) else pipeline_a
    if active_pipe is None:
        active_pipe = pipeline

    # Direct callers (including the HTTP integration tests) do not run the
    # server bootstrap below, so initialize Kokoro on first synthesis instead
    # of silently falling through to a zero-length macOS fallback WAV.
    if active_pipe is None and KOKORO_AVAILABLE:
        load_pipeline()
        active_pipe = pipeline_b if (voice.startswith(('bf_', 'bm_')) and pipeline_b is not None) else pipeline_a
        if active_pipe is None:
            active_pipe = pipeline

    if active_pipe is not None:
        try:
            audio_segments = []
            sample_rate = 24000
            # 60ms natural breathing comfort pause between major chunks
            comfort_silence = np.zeros(int(sample_rate * 0.06), dtype=np.float32)

            for _, _, audio in active_pipe(text, voice=voice, speed=speed):
                if audio is not None and len(audio) > 0:
                    audio_segments.append(audio)
                    audio_segments.append(comfort_silence)

            if audio_segments:
                # Remove trailing silence
                if len(audio_segments) > 1:
                    audio_segments.pop()
                full_audio = np.concatenate(audio_segments)
                buf = io.BytesIO()
                sf.write(buf, full_audio, sample_rate, format='WAV', subtype='PCM_16')
                buf.seek(0)
                return buf.read()
        except Exception as e:
            print(f"⚠️ Kokoro synthesis with {voice} failed: {e}. Trying fallback to af_heart...", flush=True)
            # Safe internal fallback to af_heart on pipeline_a before external fallback
            if voice != "af_heart" and pipeline_a is not None:
                try:
                    audio_segments = []
                    for _, _, audio in pipeline_a(text, voice="af_heart", speed=speed):
                        if audio is not None and len(audio) > 0:
                            audio_segments.append(audio)
                    if audio_segments:
                        full_audio = np.concatenate(audio_segments)
                        buf = io.BytesIO()
                        sf.write(buf, full_audio, 24000, format='WAV', subtype='PCM_16')
                        buf.seek(0)
                        return buf.read()
                except Exception as fallback_err:
                    print(f"❌ Fallback synthesis error: {fallback_err}", flush=True)

    # Fallback: macOS 'say' command → AIFF → WAV
    return macos_say_fallback(text)


def macos_say_fallback(text: str) -> bytes:
    """Fallback TTS using macOS 'say' command with best female voice."""
    clean = text.replace('"', '').replace("'", "")[:400]
    with tempfile.NamedTemporaryFile(suffix='.aiff', delete=False) as f:
        tmp_aiff = f.name
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp_wav = f.name

    try:
        # Use Samantha (best macOS female voice)
        subprocess.run(
            ['say', '-v', 'Samantha', '-r', '185', '-o', tmp_aiff, clean],
            capture_output=True, timeout=30
        )
        # Convert AIFF → WAV with ffmpeg or afconvert
        try:
            subprocess.run(
                ['ffmpeg', '-y', '-i', tmp_aiff, tmp_wav],
                capture_output=True, timeout=30
            )
        except FileNotFoundError:
            subprocess.run(
                ['afconvert', '-f', 'WAVE', '-d', 'LEI16', tmp_aiff, tmp_wav],
                capture_output=True, timeout=30
            )
        with open(tmp_wav, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"❌ Fallback TTS error: {e}", flush=True)
        return b''
    finally:
        for f in [tmp_aiff, tmp_wav]:
            try:
                os.unlink(f)
            except Exception:
                pass


# ── HTTP Request Handler ──────────────────────────────────────
class VoiceHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Only log errors
        if args and str(args[1]) != '200':
            print(f"[{self.path}] {args[1]}", flush=True)

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # GET /health
        if parsed.path == '/health':
            body = json.dumps({
                'status': 'ok',
                'kokoro': KOKORO_AVAILABLE and pipeline is not None,
                'voice': VOICE,
                'fallback': 'macOS say (Samantha)',
                'stt': WHISPER_MODE,
                'stt_ready': whisper_model is not None,
            }).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)

        # GET /voices
        elif parsed.path == '/voices':
            body = json.dumps(VOICES).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)

        # GET /stt-status
        elif parsed.path == '/stt-status':
            body = json.dumps({
                'mode': WHISPER_MODE,
                'ready': whisper_model is not None,
            }).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global VOICE
        parsed = urlparse(self.path)

        # POST /tts   body: {"text": "...", "voice": "af_heart", "speed": 1.1}
        if parsed.path == '/tts':
            length = int(self.headers.get('Content-Length', 0))
            if length < 0 or length > MAX_TTS_BODY_BYTES:
                self.send_response(413)
                self.end_headers()
                return
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                text = data.get('text', '').strip()
                voice = data.get('voice', VOICE)
                speed = float(data.get('speed', 1.0))
            except Exception:
                text = body.decode(errors='ignore')
                voice = VOICE
                speed = 1.0

            if not text:
                self.send_response(400)
                self.end_headers()
                return

            t0 = time.time()
            with tts_lock:
                wav_bytes = text_to_wav_bytes(text, voice=voice, speed=speed)
            elapsed = time.time() - t0
            print(f"🔊 TTS: {len(text)} chars → {len(wav_bytes)} bytes in {elapsed:.2f}s", flush=True)

            if wav_bytes:
                self.send_response(200)
                self.send_header('Content-Type', 'audio/wav')
                self.send_header('Content-Length', str(len(wav_bytes)))
                self.send_cors()
                self.end_headers()
                self.wfile.write(wav_bytes)
            else:
                self.send_response(500)
                self.end_headers()

        # POST /set-voice   body: {"voice": "af_bella"}
        elif parsed.path == '/set-voice':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                new_voice = data.get('voice', VOICE)
                if new_voice in VOICES:
                    VOICE = new_voice
                    print(f"🎤 Voice changed to: {new_voice}", flush=True)
            except Exception:
                pass
            body = json.dumps({'voice': VOICE, 'name': VOICES.get(VOICE, VOICE)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)

        # POST /transcribe  body: audio bytes (WAV/WebM/OGG) → {text, mode}
        elif parsed.path == '/transcribe':
            length = int(self.headers.get('Content-Length', 0))
            if length < 0 or length > MAX_AUDIO_BODY_BYTES:
                self.send_response(413)
                self.end_headers()
                return
            content_type = self.headers.get('Content-Type', 'audio/wav').lower()
            audio_bytes = self.rfile.read(length) if length else b''
            if not audio_bytes:
                self.send_response(400)
                self.end_headers()
                return
            t0 = time.time()
            with transcribe_lock:
                text = transcribe_audio(audio_bytes, content_type=content_type)
            elapsed = time.time() - t0
            print(f"🎤 STT ({content_type}): {len(audio_bytes)} bytes → '{text[:60]}' in {elapsed:.2f}s", flush=True)
            body = json.dumps({'text': text, 'mode': WHISPER_MODE, 'elapsed_s': round(elapsed, 2)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)

        else:
            self.send_response(404)
            self.end_headers()


def run_server(port: int = 5002):
    print(f"\n{'='*50}", flush=True)
    print(f"  🎙️  NEMI Voice Server", flush=True)
    print(f"  🔊  Running on http://localhost:{port}", flush=True)
    print(f"  🎤  Voice: {VOICE} — {VOICES.get(VOICE, 'Unknown')}", flush=True)
    print(f"  🤖  Kokoro TTS: {'✅ Available' if KOKORO_AVAILABLE else '❌ Using macOS fallback'}", flush=True)
    print(f"  🗣️  STT: {WHISPER_MODE} {'✅' if WHISPER_MODE != 'none' else '⚠️ browser fallback'}", flush=True)
    print(f"{'='*50}\n", flush=True)

    server = NemiVoiceServer(('127.0.0.1', port), VoiceHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Voice server stopped.", flush=True)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5002
    # Pre-load pipeline in background so server starts instantly
    load_thread = threading.Thread(target=load_pipeline, daemon=True)
    load_thread.start()
    run_server(port)

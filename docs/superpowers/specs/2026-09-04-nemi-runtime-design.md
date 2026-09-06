# NEMI local runtime integration design

## Goal

Make NEMI a self-contained desktop application that starts and coordinates its
local Voice, RAG, and OmniRoute capabilities whenever NEMI launches. NEMI will
use local OmniRoute combos as its primary AI route, retain Ollama as an
offline fallback, preserve RAG knowledge across launches, and support the
in-app voice activation phrase: “Hey NEMI, I am Abhi.”

## Runtime architecture

The Electron main process owns local-service lifecycle management. On startup,
it checks the health endpoint for each service. If a healthy compatible
service already occupies the expected port, NEMI reuses it. Otherwise, it
starts only the missing service and records ownership. On quit, NEMI stops
only children it started.

Services:

| Service | Command / implementation | Port | Readiness |
| --- | --- | --- | --- |
| OmniRoute | `omniroute serve --port 20128 --no-open` | 20128 | OpenAI-compatible health/API check |
| Voice | bundled `voice_server.py` | 5002 | `/health` |
| RAG | bundled `rag_server.py` | 5003 | `/health` |

The launcher continues to start Electron only; Electron starts the managed
services. Development and packaged builds resolve bundled Python scripts
reliably, expose useful diagnostics, and never report a feature as ready until
the corresponding endpoint accepts requests.

## AI routing

OmniRoute is the default provider. NEMI sends typed chat, accepted voice
requests, and RAG answer generation through the selected local combo using the
OpenAI-compatible endpoint at `http://127.0.0.1:20128/v1/chat/completions`.
The combo selector is populated from OmniRoute rather than relying on a
hard-coded model name. The user can select Ollama as a local/offline fallback;
direct OpenAI remains explicitly optional rather than the default.

The main process proxies provider requests so API credentials never need to be
sent from the renderer. It returns a uniform, user-readable failure when a
combo has no available provider or OmniRoute is still starting.

## Voice flow

The user opens NEMI and presses the Voice button. NEMI requests microphone
access if needed and begins a listening session. The phrase “Hey NEMI, I am
Abhi” activates the session; it is not an always-on system-wide listener.
After activation, NEMI speaks a short readiness briefing that identifies the
active OmniRoute combo, voice engine, and RAG availability. Subsequent speech
is treated as a request until the user stops voice mode.

NEMI prefers its local speech-to-text server, then browser speech recognition,
and communicates which path is active. It uses the local TTS service when
healthy and browser/system TTS when not. Audio MIME type and payload handling
must match the server contract so recorded audio can actually be transcribed.

## Persistent RAG

RAG writes document metadata, chunks, and vectors to an app-data directory
owned by NEMI, not the project directory or transient process memory. On
startup it reloads this store before declaring the RAG service ready. Upload,
listing, retrieval, and clear operations update the durable store atomically.
RAG answers include retrieved context and use the active provider route.

## User experience and errors

The UI exposes independent status for OmniRoute, voice, and RAG. While a
service is starting, the interface describes that state. If a feature cannot
run, it explains the specific local prerequisite and offers the available
fallback rather than failing silently. Starting NEMI twice must not cause port
collisions or terminate services owned by another application session.

## Verification

Automated tests cover service ownership/readiness decisions, OmniRoute request
routing, RAG persistence and retrieval after restart, and wake-phrase parsing.
The final verification includes a production build, a development launch,
health checks for each managed service, an OmniRoute combo request, RAG
upload/restart/query, and an end-to-end voice-path smoke test where local
dependencies are present.

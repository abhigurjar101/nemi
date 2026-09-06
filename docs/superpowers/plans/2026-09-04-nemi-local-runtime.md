# NEMI Local Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch NEMI with working local OmniRoute combo routing, voice, and persistent RAG services.

**Architecture:** Electron owns service discovery, readiness, process ownership, and provider proxying. The renderer only calls the preload API, uses OmniRoute as its default route, activates voice after the Abhi phrase, and surfaces live service status. The RAG Python service stores its index under the Electron-provided app-data path.

**Tech Stack:** Electron, TypeScript, React, Node HTTP, Python standard library, OmniRoute CLI, Kokoro/Whisper optional dependencies.

**Spec:** `docs/superpowers/specs/2026-09-04-nemi-runtime-design.md`

## Global Constraints

- Start OmniRoute with `omniroute serve --port 20128 --no-open` only when port 20128 is not already healthy.
- Reuse externally started services and terminate only child processes NEMI owns.
- Use `127.0.0.1`, not externally exposed bindings, for local services.
- Persist RAG documents, chunks, and vectors under NEMI app data.
- The activation phrase is “Hey NEMI, I am Abhi” and is only listened for after the user presses Voice.
- Never place provider credentials in renderer code.

---

### Task 1: Add testable service lifecycle helpers

**Files:**
- Create: `src/main/serviceRuntime.ts`
- Create: `tests/serviceRuntime.test.ts`
- Modify: `src/main/index.ts`

**Interfaces:**
- Produces `waitForHealthy(url, timeoutMs): Promise<boolean>` and `ManagedService.startOrReuse(): Promise<ServiceStatus>`.
- Consumes `spawn` and a port health URL injected by `index.ts`.

- [ ] **Step 1: Write the failing lifecycle tests**

```ts
test('reuses a healthy service without spawning', async () => {
  const service = createManagedService({ healthCheck: async () => true, spawn: failSpawn })
  expect(await service.startOrReuse()).toMatchObject({ state: 'ready', owned: false })
})

test('starts a missing service and waits for readiness', async () => {
  const service = createManagedService({ healthCheck: onceFalseThenTrue, spawn: fakeChild })
  expect(await service.startOrReuse()).toMatchObject({ state: 'ready', owned: true })
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- tests/serviceRuntime.test.ts`

Expected: FAIL because the test command and runtime helper do not exist.

- [ ] **Step 3: Implement the minimal service runtime**

```ts
export interface ServiceStatus { name: string; state: 'ready' | 'starting' | 'error'; owned: boolean; detail?: string }
export interface ManagedService { startOrReuse(): Promise<ServiceStatus>; stopOwned(): void }
```

Use a bounded retry loop after spawn, record child ownership, and return an error status instead of throwing from app startup.

- [ ] **Step 4: Use one runtime for Voice, RAG, and OmniRoute**

Replace the separate unguarded auto-start functions in `index.ts` with services configured as Voice `python3 voice_server.py`, RAG `python3 rag_server.py <appDataPath>`, and OmniRoute `omniroute serve --port 20128 --no-open`.

- [ ] **Step 5: Run the lifecycle tests and TypeScript build**

Run: `npm test -- tests/serviceRuntime.test.ts && npm run build`

Expected: PASS with Electron output generated.

### Task 2: Add main-process local provider APIs

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Create: `tests/providerRouting.test.ts`

**Interfaces:**
- Produces `window.nemi.getServiceStatus()`, `window.nemi.getOmniRouteCombos()`, and `window.nemi.chat(request)`.
- `chat` accepts `{ provider: 'omniroute' | 'ollama' | 'openai', model: string, messages: ChatMessage[] }` and returns a complete response or a structured local error.

- [ ] **Step 1: Write failing provider routing tests**

```ts
test('routes default chat to the local OmniRoute endpoint', async () => {
  await proxyChat({ provider: 'omniroute', model: 'combo-1', messages: [] }, requestSpy)
  expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({ hostname: '127.0.0.1', port: 20128 }))
})

test('does not send an OmniRoute credential from the renderer contract', () => {
  expect(rendererChatRequest).not.toHaveProperty('authorization')
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- tests/providerRouting.test.ts`

Expected: FAIL because `proxyChat` and the preload API do not exist.

- [ ] **Step 3: Implement the proxy and combo discovery**

Add HTTP helpers in the main process for OpenAI-compatible non-streaming/streaming response forwarding and a combo-list request. Return actionable messages for unavailable OmniRoute and provider-less combos.

- [ ] **Step 4: Expose only typed preload methods**

Add the matching context-bridge methods and global declarations. Do not expose generic IPC channels or provider API keys.

- [ ] **Step 5: Verify provider tests and build**

Run: `npm test -- tests/providerRouting.test.ts && npm run build`

Expected: PASS.

### Task 3: Make the RAG store durable and correct

**Files:**
- Modify: `rag_server.py`
- Create: `tests/test_rag_persistence.py`
- Modify: `src/main/index.ts`

**Interfaces:**
- `rag_server.py <port> <data_dir>` loads and writes `rag-store.json` in `data_dir`.
- `index_document`, `retrieve`, and `/clear` persist mutations before returning success.

- [ ] **Step 1: Write the failing persistence test**

```python
def test_document_is_retrievable_after_store_reload(tmp_path):
    rag.configure_store(tmp_path)
    rag.index_document('abhi', 'profile.txt', 'Abhi uses NEMI for local AI.')
    rag.reset_memory_for_test()
    rag.load_store()
    assert rag.retrieve('Who uses NEMI?')[0]['doc_id'] == 'abhi'
```

- [ ] **Step 2: Run the test and verify failure**

Run: `python3 -m unittest tests/test_rag_persistence.py -v`

Expected: FAIL because the store configuration and persistence functions do not exist.

- [ ] **Step 3: Implement atomic JSON persistence**

Serialize document metadata and chunk records to a temporary file then replace `rag-store.json`. Reload records during server startup. Preserve stored vectors only when their dimensions are compatible; otherwise rebuild embeddings before reporting ready.

- [ ] **Step 4: Add per-document deletion**

Add `POST /delete` accepting `doc_id`, persist the removal, and update the Electron IPC/preload surface. Replace the current empty-text re-upload workaround in `RagPanel.tsx`.

- [ ] **Step 5: Verify persistence test and HTTP smoke flow**

Run: `python3 -m unittest tests/test_rag_persistence.py -v`

Expected: PASS; start the server in a temporary data directory, upload a document, restart it, and confirm `/docs` and `/query` retain the document.

### Task 4: Wire renderer chat, RAG answers, and status to the runtime

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/RagPanel.tsx`
- Modify: `src/preload/index.ts`

**Interfaces:**
- Renderer consumes `window.nemi.chat`, `window.nemi.getOmniRouteCombos`, and `window.nemi.getServiceStatus`.
- `RagPanel` accepts a provider mode including `omniroute` and calls the main-process chat API for generated answers.

- [ ] **Step 1: Write the failing UI route test**

```ts
test('uses OmniRoute as the initial model mode', () => {
  expect(defaultModelMode()).toBe('omniroute')
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/uiRouting.test.ts`

Expected: FAIL because the extracted default-mode helper does not exist.

- [ ] **Step 3: Implement the renderer wiring**

Set OmniRoute as default, populate combo choices dynamically, direct chat and RAG generation through the preload API, retain Ollama and optional OpenAI selection, and display distinct ready/starting/error badges for all three services.

- [ ] **Step 4: Verify renderer behavior**

Run: `npm run build`

Expected: PASS with no TypeScript errors.

### Task 5: Add activation-phrase voice flow and validate the app

**Files:**
- Create: `src/renderer/src/voiceActivation.ts`
- Create: `tests/voiceActivation.test.ts`
- Modify: `src/renderer/src/App.tsx`

**Interfaces:**
- Produces `isActivationPhrase(transcript: string): boolean` and `readinessBriefing(status): string`.
- `App.tsx` uses the helpers after the user presses Voice and routes only post-activation speech to chat.

- [ ] **Step 1: Write failing phrase tests**

```ts
test.each(['Hey NEMI, I am Abhi', 'hey nemi i am abhi'])('accepts %s', phrase => {
  expect(isActivationPhrase(phrase)).toBe(true)
})
test('rejects a normal question before activation', () => {
  expect(isActivationPhrase('What is on my calendar?')).toBe(false)
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/voiceActivation.test.ts`

Expected: FAIL because the activation helper does not exist.

- [ ] **Step 3: Implement phrase activation and speech briefing**

Normalize punctuation/case, keep listening after phrase recognition, speak a concise status briefing, and clear any pre-activation transcript. Keep browser and local-STT paths aligned; send recorded audio with its real MIME type rather than labeling WebM bytes as WAV.

- [ ] **Step 4: Run all automated tests and build**

Run: `npm test && python3 -m unittest discover -s tests -p 'test_*.py' -v && npm run build`

Expected: PASS.

- [ ] **Step 5: Perform end-to-end local smoke checks**

Run NEMI, confirm ports 20128/5002/5003 become healthy, verify a configured OmniRoute combo replies, upload/restart/query a RAG document, and press Voice to confirm the activation phrase produces the readiness briefing.

import { describe, expect, it, vi } from 'vitest'
import { createManagedService } from '../src/main/serviceRuntime'

describe('createManagedService', () => {
  it('reuses a healthy service without spawning a child process', async () => {
    const spawn = vi.fn()
    const service = createManagedService({
      name: 'Voice',
      healthCheck: vi.fn().mockResolvedValue(true),
      spawn,
      retryDelayMs: 0,
      readinessAttempts: 1,
    })

    await expect(service.startOrReuse()).resolves.toMatchObject({
      name: 'Voice',
      state: 'ready',
      owned: false,
    })
    expect(spawn).not.toHaveBeenCalled()
  })

  it('starts a missing service and owns it once it becomes healthy', async () => {
    const child = { kill: vi.fn(), once: vi.fn(), stdout: null, stderr: null }
    const healthCheck = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const service = createManagedService({
      name: 'RAG',
      healthCheck,
      spawn: vi.fn().mockReturnValue(child),
      retryDelayMs: 0,
      readinessAttempts: 2,
    })

    await expect(service.startOrReuse()).resolves.toMatchObject({
      name: 'RAG',
      state: 'ready',
      owned: true,
    })
    service.stopOwned()
    expect(child.kill).toHaveBeenCalledOnce()
  })

  it('kills spawned child if readiness check fails to prevent process leak', async () => {
    const child = { kill: vi.fn() }
    const healthCheck = vi.fn().mockResolvedValue(false)
    const service = createManagedService({
      name: 'Local service',
      healthCheck,
      spawn: vi.fn().mockReturnValue(child),
      retryDelayMs: 0,
      readinessAttempts: 2,
    })

    const status = await service.startOrReuse()
    expect(status).toMatchObject({
      name: 'Local service',
      state: 'error',
      owned: false,
    })
    expect(child.kill).toHaveBeenCalledOnce()
  })

  it('does not re-own a child after teardown wins a pending startup', async () => {
    let resolveHealth: ((healthy: boolean) => void) | undefined
    const child = { kill: vi.fn() }
    const healthCheck = vi.fn()
      .mockResolvedValueOnce(false)
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveHealth = resolve }))
    const service = createManagedService({
      name: 'RAG',
      healthCheck,
      spawn: vi.fn().mockReturnValue(child),
      retryDelayMs: 0,
      readinessAttempts: 2,
    })

    const startup = service.startOrReuse()
    await Promise.resolve()
    service.stopOwned()
    resolveHealth?.(true)

    await expect(startup).resolves.not.toMatchObject({ state: 'ready', owned: true })
    expect(child.kill).toHaveBeenCalledOnce()
  })
})

export type ServiceState = 'ready' | 'starting' | 'error'

export interface ServiceStatus {
  name: string
  state: ServiceState
  owned: boolean
  detail?: string
}

export interface ManagedChild {
  kill: () => void
}

export interface ManagedServiceOptions {
  name: string
  healthCheck: () => Promise<boolean>
  spawn: () => ManagedChild
  readinessAttempts?: number
  retryDelayMs?: number
}

export interface ManagedService {
  startOrReuse: () => Promise<ServiceStatus>
  stopOwned: () => void
  getStatus: () => ServiceStatus
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createManagedService(options: ManagedServiceOptions): ManagedService {
  const readinessAttempts = options.readinessAttempts ?? 20
  const retryDelayMs = options.retryDelayMs ?? 250
  let child: ManagedChild | null = null
  let status: ServiceStatus = { name: options.name, state: 'starting', owned: false }
  let lifecycleToken = 0

  const waitUntilHealthy = async (): Promise<boolean> => {
    for (let attempt = 0; attempt < readinessAttempts; attempt += 1) {
      if (await options.healthCheck()) return true
      if (attempt < readinessAttempts - 1) await wait(retryDelayMs)
    }
    return false
  }

  return {
    async startOrReuse(): Promise<ServiceStatus> {
      const startToken = lifecycleToken
      if (await options.healthCheck()) {
        if (startToken !== lifecycleToken) return status
        status = { name: options.name, state: 'ready', owned: false }
        return status
      }

      try {
        const spawnedChild = options.spawn()
        if (startToken !== lifecycleToken) {
          try {
            spawnedChild.kill()
          } catch {
            // ignore cleanup errors
          }
          return status
        }
        child = spawnedChild
        if (await waitUntilHealthy()) {
          if (startToken !== lifecycleToken) {
            try {
              child?.kill()
            } catch {
              // ignore cleanup errors
            }
            child = null
            return status
          }
          status = { name: options.name, state: 'ready', owned: true }
        } else {
          try {
            child.kill()
          } catch {
            // ignore cleanup errors
          }
          child = null
          status = { name: options.name, state: 'error', owned: false, detail: `${options.name} did not become ready` }
        }
      } catch (error) {
        try {
          child?.kill()
        } catch {
          // ignore cleanup errors
        }
        child = null
        status = {
          name: options.name,
          state: 'error',
          owned: false,
          detail: error instanceof Error ? error.message : String(error),
        }
      }
      return status
    },

    stopOwned(): void {
      lifecycleToken += 1
      const ownedChild = child
      child = null
      try {
        ownedChild?.kill()
      } catch {
        // A child may have exited between the state check and kill call.
      }
    },

    getStatus(): ServiceStatus {
      return status
    },
  }
}

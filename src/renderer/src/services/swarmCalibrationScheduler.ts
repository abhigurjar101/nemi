/**
 * NEMI Swarm Calibration Scheduler
 *
 * Boots once at app startup.
 * - If ≥ 7 days have elapsed since the last calibration run, schedules
 *   runWeeklyCalibration() via a deferred setTimeout (non-blocking).
 * - Exposes manualTrigger() for the "Run Calibration Now" UI button.
 * - Never interferes with the hot trading path.
 */

import { getLastRunTimestamp, runWeeklyCalibration } from './calibrationModule'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const BOOT_DELAY_MS = 5000 // wait 5s after app boot before running

let scheduledTimer: ReturnType<typeof setTimeout> | null = null
let isRunning = false

type CalibrationListener = (phase: 'start' | 'complete' | 'error', detail?: string) => void
const listeners: CalibrationListener[] = []

export function onCalibrationEvent(cb: CalibrationListener): () => void {
  listeners.push(cb)
  return () => {
    const idx = listeners.indexOf(cb)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

function emit(phase: 'start' | 'complete' | 'error', detail?: string) {
  listeners.forEach((cb) => {
    try { cb(phase, detail) } catch {}
  })
}

function shouldRunNow(): boolean {
  const last = getLastRunTimestamp()
  if (last === null) return true // never run before
  return Date.now() - last >= SEVEN_DAYS_MS
}

/**
 * Internal runner — handles concurrency guard and emits lifecycle events.
 */
function doRun(trigger: 'scheduled' | 'manual'): void {
  if (isRunning) {
    console.info('[CalibrationScheduler] Calibration already in progress, skipping.')
    return
  }
  isRunning = true
  emit('start', `Calibration triggered: ${trigger}`)

  try {
    const reports = runWeeklyCalibration()
    const proposalsGenerated = reports.filter(
      (r) => r.hasEnoughData && r.proposedWeightDelta !== 0
    ).length
    emit(
      'complete',
      `Calibration complete. ${reports.length} agent reports generated. ${proposalsGenerated} proposals pending human approval.`
    )
  } catch (e) {
    console.error('[CalibrationScheduler] Calibration run failed:', e)
    emit('error', String(e))
  } finally {
    isRunning = false
  }
}

/**
 * Bootstrap: call once on app startup.
 * If a weekly run is due, schedules it after a short boot delay
 * so it doesn't block initial render.
 */
export function bootstrapCalibrationScheduler(): void {
  if (scheduledTimer !== null) return // already bootstrapped

  if (shouldRunNow()) {
    scheduledTimer = setTimeout(() => {
      scheduledTimer = null
      doRun('scheduled')
    }, BOOT_DELAY_MS)
  } else {
    const last = getLastRunTimestamp()!
    const nextRunIn = SEVEN_DAYS_MS - (Date.now() - last)
    console.info(
      `[CalibrationScheduler] Next scheduled calibration in ${Math.round(nextRunIn / 3600000)}h`
    )
  }
}

/**
 * Manual trigger from the UI "Run Calibration Now" button.
 * Always runs regardless of the 7-day schedule.
 */
export function manualTriggerCalibration(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer)
    scheduledTimer = null
  }
  doRun('manual')
}

/** Whether a calibration run is currently in progress */
export function isCalibrationRunning(): boolean {
  return isRunning
}

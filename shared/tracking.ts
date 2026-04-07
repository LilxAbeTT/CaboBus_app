export type ServiceOperationalStatus =
  | 'active_recent'
  | 'active_stale'
  | 'probably_stopped'

export const RECENT_SIGNAL_THRESHOLD_MS = 90_000
export const STALE_SIGNAL_THRESHOLD_MS = 300_000
export const REALTIME_MIN_SIGNAL_INTERVAL_MS = 8_000
export const REALTIME_MIN_DISTANCE_METERS = 15

export function getSignalAgeMs(
  recordedAt?: string | null,
  nowMs = Date.now(),
) {
  if (!recordedAt) {
    return null
  }

  const parsedTime = Date.parse(recordedAt)

  if (Number.isNaN(parsedTime)) {
    return null
  }

  return Math.max(0, nowMs - parsedTime)
}

export function getServiceOperationalStatus(
  recordedAt?: string | null,
  nowMs = Date.now(),
): ServiceOperationalStatus {
  const signalAgeMs = getSignalAgeMs(recordedAt, nowMs)

  if (signalAgeMs === null) {
    return 'probably_stopped'
  }

  if (signalAgeMs <= RECENT_SIGNAL_THRESHOLD_MS) {
    return 'active_recent'
  }

  if (signalAgeMs <= STALE_SIGNAL_THRESHOLD_MS) {
    return 'active_stale'
  }

  return 'probably_stopped'
}

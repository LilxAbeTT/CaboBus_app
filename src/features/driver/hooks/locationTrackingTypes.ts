import type { Coordinates } from '../../../types/domain'

export interface DriverLocationReading {
  coordinates: Coordinates
  accuracyMeters: number | null
  capturedAt: string
}

export interface DriverLocationSubmissionResult {
  accepted: boolean
  recordedAt?: string
  rejectionMessage?: string
  shouldContinue?: boolean
}

export type DriverLocationPermissionState =
  | 'not_requested'
  | 'granted'
  | 'denied'
  | 'unsupported'

export type DriverTrackingStatus =
  | 'stopped'
  | 'requesting_permission'
  | 'waiting_first_signal'
  | 'first_signal_received'
  | 'tracking'
  | 'signal_timeout'
  | 'error'

export type DriverTrackingMode = 'browser' | 'native-background'

export interface DriverLocationTrackingHookResult {
  permissionState: DriverLocationPermissionState
  trackingStatus: DriverTrackingStatus
  trackingError: string | null
  lastTrackedPosition: Coordinates | null
  lastTrackedAt: string | null
  lastTrackedAccuracyMeters: number | null
  isTracking: boolean
  trackingMode: DriverTrackingMode
  supportsBackgroundTracking: boolean
  requestPermission: () => Promise<boolean>
  startTracking: (
    onLocation: (
      reading: DriverLocationReading,
    ) => Promise<DriverLocationSubmissionResult>,
  ) => void
  stopTracking: () => void
  openSettings?: () => Promise<void>
}

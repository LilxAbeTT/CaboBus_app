import { useBrowserLocationTracking } from './useBrowserLocationTracking'
import { useNativeBackgroundLocationTracking } from './useNativeBackgroundLocationTracking'
import { isNativeApp } from '../../../lib/platform'
import type { DriverLocationTrackingHookResult } from './locationTrackingTypes'

export function useDriverLocationTracking(): DriverLocationTrackingHookResult {
  const browserTracking = useBrowserLocationTracking()
  const nativeTracking = useNativeBackgroundLocationTracking()

  return isNativeApp ? nativeTracking : browserTracking
}

import { getServiceOperationalStatus } from '../../shared/tracking'
import type { Doc } from '../_generated/dataModel'

export function getLastSignalAt(
  activeService: Doc<'activeServices'>,
  latestLocation?: Doc<'locationUpdates'> | null,
) {
  return latestLocation?.recordedAt ?? activeService.lastLocationUpdateAt ?? null
}

export function getOperationalStatusForService({
  activeService,
  latestLocation,
  nowMs,
}: {
  activeService: Doc<'activeServices'>
  latestLocation?: Doc<'locationUpdates'> | null
  nowMs: number
}) {
  return getServiceOperationalStatus(
    getLastSignalAt(activeService, latestLocation),
    nowMs,
  )
}

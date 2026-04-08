import { getServiceOperationalStatus } from '../../shared/tracking'
import type { Doc } from '../_generated/dataModel'

export function getLastSignalAt(
  activeService: Doc<'activeServices'>,
) {
  return activeService.lastLocationUpdateAt ?? null
}

export function getOperationalStatusForService({
  activeService,
  nowMs,
}: {
  activeService: Doc<'activeServices'>
  nowMs: number
}) {
  return getServiceOperationalStatus(
    getLastSignalAt(activeService),
    nowMs,
  )
}

import { Preferences } from '@capacitor/preferences'

import type { DriverLocationReading } from '../hooks/locationTrackingTypes'

const TRACKING_QUEUE_STORAGE_PREFIX = 'cabobus.driver.nativeTrackingQueue.'

export type QueuedNativeTrackingReading = DriverLocationReading

function getTrackingQueueStorageKey(driverId: string, serviceId: string) {
  return `${TRACKING_QUEUE_STORAGE_PREFIX}${driverId}.${serviceId}`
}

function isQueuedNativeTrackingReading(
  value: unknown,
): value is QueuedNativeTrackingReading {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<QueuedNativeTrackingReading>

  return (
    typeof candidate.capturedAt === 'string' &&
    typeof candidate.accuracyMeters !== 'undefined' &&
    typeof candidate.coordinates?.lat === 'number' &&
    Number.isFinite(candidate.coordinates.lat) &&
    typeof candidate.coordinates?.lng === 'number' &&
    Number.isFinite(candidate.coordinates.lng) &&
    (candidate.accuracyMeters === null ||
      (typeof candidate.accuracyMeters === 'number' &&
        Number.isFinite(candidate.accuracyMeters)))
  )
}

export async function readQueuedNativeTrackingReadings(
  driverId: string,
  serviceId: string,
) {
  const storageKey = getTrackingQueueStorageKey(driverId, serviceId)
  const { value } = await Preferences.get({ key: storageKey })

  if (!value) {
    return [] as QueuedNativeTrackingReading[]
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (!Array.isArray(parsedValue)) {
      await Preferences.remove({ key: storageKey })
      return []
    }

    const queuedReadings = parsedValue.filter(isQueuedNativeTrackingReading)

    if (queuedReadings.length !== parsedValue.length) {
      await Preferences.remove({ key: storageKey })
      return []
    }

    return queuedReadings
  } catch {
    await Preferences.remove({ key: storageKey })
    return []
  }
}

export async function writeQueuedNativeTrackingReadings(
  driverId: string,
  serviceId: string,
  readings: QueuedNativeTrackingReading[],
) {
  const storageKey = getTrackingQueueStorageKey(driverId, serviceId)

  if (readings.length === 0) {
    await Preferences.remove({ key: storageKey })
    return
  }

  await Preferences.set({
    key: storageKey,
    value: JSON.stringify(readings),
  })
}

export async function appendQueuedNativeTrackingReading(
  driverId: string,
  serviceId: string,
  reading: QueuedNativeTrackingReading,
) {
  const currentQueue = await readQueuedNativeTrackingReadings(driverId, serviceId)

  await writeQueuedNativeTrackingReadings(driverId, serviceId, [
    ...currentQueue,
    reading,
  ])
}

export async function clearQueuedNativeTrackingReadings(
  driverId: string,
  serviceId: string,
) {
  await Preferences.remove({
    key: getTrackingQueueStorageKey(driverId, serviceId),
  })
}

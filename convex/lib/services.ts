import { ConvexError } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { DatabaseReader } from '../_generated/server'

export async function getOpenServices(db: DatabaseReader) {
  const [activeServices, pausedServices] = await Promise.all([
    db
      .query('activeServices')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect(),
    db
      .query('activeServices')
      .withIndex('by_status', (q) => q.eq('status', 'paused'))
      .collect(),
  ])

  return [...activeServices, ...pausedServices]
}

export async function getOpenServiceForDriver(
  db: DatabaseReader,
  driverId: Id<'users'>,
) {
  const activeService = await db
    .query('activeServices')
    .withIndex('by_driver_status', (q) =>
      q.eq('driverId', driverId).eq('status', 'active'),
    )
    .first()

  if (activeService) {
    return activeService
  }

  return await db
    .query('activeServices')
    .withIndex('by_driver_status', (q) =>
      q.eq('driverId', driverId).eq('status', 'paused'),
    )
    .first()
}

export async function getOpenServiceForVehicle(
  db: DatabaseReader,
  vehicleId: Id<'vehicles'>,
) {
  const activeService = await db
    .query('activeServices')
    .withIndex('by_vehicle_status', (q) =>
      q.eq('vehicleId', vehicleId).eq('status', 'active'),
    )
    .first()

  if (activeService) {
    return activeService
  }

  return await db
    .query('activeServices')
    .withIndex('by_vehicle_status', (q) =>
      q.eq('vehicleId', vehicleId).eq('status', 'paused'),
    )
    .first()
}

export async function getOpenServiceForSession(
  db: DatabaseReader,
  driverId: Id<'users'>,
  vehicleId?: Id<'vehicles'>,
) {
  const [serviceByDriver, serviceByVehicle] = await Promise.all([
    getOpenServiceForDriver(db, driverId),
    vehicleId ? getOpenServiceForVehicle(db, vehicleId) : Promise.resolve(null),
  ])

  if (
    serviceByDriver &&
    serviceByVehicle &&
    serviceByDriver._id !== serviceByVehicle._id
  ) {
    throw new ConvexError(
      'La sesion tiene conflicto entre el conductor y la unidad seleccionada.',
    )
  }

  return serviceByDriver ?? serviceByVehicle ?? null
}

export async function getLatestLocationForService(
  db: DatabaseReader,
  activeServiceId: Id<'activeServices'>,
) {
  return await db
    .query('locationUpdates')
    .withIndex('by_active_service_recorded_at', (q) =>
      q.eq('activeServiceId', activeServiceId),
    )
    .order('desc')
    .first()
}

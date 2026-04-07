import { ConvexError } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { DatabaseReader } from '../_generated/server'

function isOpenServiceStatus(status: 'active' | 'paused' | 'completed') {
  return status === 'active' || status === 'paused'
}

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
  const driverServices = await db
    .query('activeServices')
    .withIndex('by_driver', (q) => q.eq('driverId', driverId))
    .collect()

  return driverServices.find((service) => isOpenServiceStatus(service.status)) ?? null
}

export async function getOpenServiceForVehicle(
  db: DatabaseReader,
  vehicleId: Id<'vehicles'>,
) {
  const vehicleServices = await db
    .query('activeServices')
    .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
    .collect()

  return vehicleServices.find((service) => isOpenServiceStatus(service.status)) ?? null
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

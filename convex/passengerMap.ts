import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { toRouteSummary } from './lib/routes'
import { getOperationalStatusForService } from './lib/serviceOperationalState'

function isDefined<T>(value: T | null): value is T {
  return value !== null
}

export const getSnapshot = query({
  args: {
    nowMs: v.optional(v.number()),
  },
  handler: async ({ db }, { nowMs }) => {
    const effectiveNowMs = nowMs ?? Date.now()
    const [routes, activeServices] = await Promise.all([
      db
        .query('routes')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect(),
      db
        .query('activeServices')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect(),
    ])

    const routeById = new Map(routes.map((route) => [route._id, route]))
    const fallbackVehicleIds = new Set<Id<'vehicles'>>()
    const fallbackDriverIds = new Set<Id<'users'>>()

    activeServices.forEach((service) => {
      if (!service.vehicleUnitNumber || !service.vehicleLabel) {
        fallbackVehicleIds.add(service.vehicleId)
      }

      if (!service.driverName) {
        fallbackDriverIds.add(service.driverId)
      }
    })

    const [fallbackVehicles, fallbackDrivers] = await Promise.all([
      Promise.all([...fallbackVehicleIds].map((vehicleId) => db.get(vehicleId))),
      Promise.all([...fallbackDriverIds].map((driverId) => db.get(driverId))),
    ])

    const vehicleById = new Map(
      fallbackVehicles
        .filter(isDefined)
        .map((vehicle) => [vehicle._id, vehicle] as const),
    )
    const driverById = new Map(
      fallbackDrivers
        .filter(isDefined)
        .map((driver) => [driver._id, driver] as const),
    )

    const activeVehicles = await Promise.all(
      activeServices.map(async (service) => {
        const route = routeById.get(service.routeId)
        const vehicle = vehicleById.get(service.vehicleId)
        const driver = driverById.get(service.driverId)

        if (
          !route ||
          !service.lastPosition ||
          service.lastLocationSource !== 'device' ||
          !service.lastLocationUpdateAt
        ) {
          return null
        }

        return {
          id: service.vehicleId,
          unitNumber: service.vehicleUnitNumber ?? vehicle?.unitNumber ?? 'Unidad',
          label: service.vehicleLabel ?? vehicle?.label ?? 'Unidad activa',
          routeId: route._id,
          routeName: service.routeName ?? route.name,
          driverName: service.driverName ?? driver?.name ?? 'Conductor',
          status: service.status,
          position: service.lastPosition,
          lastUpdate: service.lastLocationUpdateAt,
          lastUpdateSource: service.lastLocationSource,
          operationalStatus: getOperationalStatusForService({
            activeService: service,
            nowMs: effectiveNowMs,
          }),
        }
      }),
    )

    return {
      routes: routes.map((route) => toRouteSummary(route)),
      activeVehicles: activeVehicles.filter(isDefined),
    }
  },
})

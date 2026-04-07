import { v } from 'convex/values'
import { query } from './_generated/server'
import { toRouteSummary } from './lib/routes'
import {
  getLastSignalAt,
  getOperationalStatusForService,
} from './lib/serviceOperationalState'

function isDefined<T>(value: T | null): value is T {
  return value !== null
}

export const getSnapshot = query({
  args: {
    nowMs: v.optional(v.number()),
  },
  handler: async ({ db }, { nowMs }) => {
    const effectiveNowMs = nowMs ?? Date.now()
    const routes = await db
      .query('routes')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()

    const activeServices = await db
      .query('activeServices')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()

    const activeVehicles = await Promise.all(
      activeServices.map(async (service) => {
        const [vehicle, route, driver, latestLocation] = await Promise.all([
          db.get(service.vehicleId),
          db.get(service.routeId),
          db.get(service.driverId),
          db
            .query('locationUpdates')
            .withIndex('by_active_service_recorded_at', (q) =>
              q.eq('activeServiceId', service._id),
            )
            .order('desc')
            .first(),
        ])

        if (!vehicle || !route || !driver || !latestLocation) {
          return null
        }

        return {
          id: vehicle._id,
          unitNumber: vehicle.unitNumber,
          label: vehicle.label,
          routeId: route._id,
          routeName: route.name,
          driverName: driver.name,
          status: service.status,
          position: latestLocation.position,
          lastUpdate: getLastSignalAt(service, latestLocation) ?? latestLocation.recordedAt,
          lastUpdateSource: latestLocation.source,
          operationalStatus: getOperationalStatusForService({
            activeService: service,
            latestLocation,
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

import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type DatabaseReader } from './_generated/server'
import { recordSystemEvent } from './lib/systemEvents'
import { toRouteSummary } from './lib/routes'
import { getOperationalStatusForService } from './lib/serviceOperationalState'

function isDefined<T>(value: T | null): value is T {
  return value !== null
}

async function getActiveRouteDocuments(db: DatabaseReader) {
  return await db
    .query('routes')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect()
}

async function getActiveVehicleDocuments(db: DatabaseReader) {
  return await db
    .query('activeServices')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect()
}

export const getRoutes = query({
  args: {},
  handler: async ({ db }) => {
    const routes = await getActiveRouteDocuments(db)

    return routes.map((route) => toRouteSummary(route))
  },
})

export const getActiveVehicles = query({
  args: {
    nowMs: v.optional(v.number()),
  },
  handler: async ({ db }, { nowMs }) => {
    const activeServices = await getActiveVehicleDocuments(db)
    const effectiveNowMs = nowMs ?? Date.now()

    const fallbackRouteIds = new Set<Id<'routes'>>()
    const fallbackVehicleIds = new Set<Id<'vehicles'>>()
    const fallbackDriverIds = new Set<Id<'users'>>()

    activeServices.forEach((service) => {
      if (!service.routeName) {
        fallbackRouteIds.add(service.routeId)
      }

      if (!service.vehicleUnitNumber || !service.vehicleLabel) {
        fallbackVehicleIds.add(service.vehicleId)
      }

      if (!service.driverName) {
        fallbackDriverIds.add(service.driverId)
      }
    })

    const [fallbackRoutes, fallbackVehicles, fallbackDrivers] = await Promise.all([
      Promise.all([...fallbackRouteIds].map((routeId) => db.get(routeId))),
      Promise.all([...fallbackVehicleIds].map((vehicleId) => db.get(vehicleId))),
      Promise.all([...fallbackDriverIds].map((driverId) => db.get(driverId))),
    ])

    const routeById = new Map(
      fallbackRoutes.filter(isDefined).map((route) => [route._id, route] as const),
    )
    const vehicleById = new Map(
      fallbackVehicles
        .filter(isDefined)
        .map((vehicle) => [vehicle._id, vehicle] as const),
    )
    const driverById = new Map(
      fallbackDrivers.filter(isDefined).map((driver) => [driver._id, driver] as const),
    )

    return activeServices
      .map((service) => {
        const route = routeById.get(service.routeId)
        const vehicle = vehicleById.get(service.vehicleId)
        const driver = driverById.get(service.driverId)

        if (
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
          routeId: service.routeId,
          routeName: service.routeName ?? route?.name ?? 'Ruta activa',
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
      })
      .filter(isDefined)
  },
})

export const submitRouteReport = mutation({
  args: {
    routeId: v.id('routes'),
    issueType: v.union(
      v.literal('bus_never_arrived'),
      v.literal('too_delayed'),
      v.literal('map_not_matching'),
      v.literal('unit_problem'),
      v.literal('other'),
    ),
    details: v.optional(v.string()),
  },
  handler: async ({ db }, { routeId, issueType, details }) => {
    const route = await db.get(routeId)

    if (!route) {
      throw new ConvexError('La ruta seleccionada ya no está disponible.')
    }

    const trimmedDetails = details?.trim()
    const issueTypeLabel = {
      bus_never_arrived: 'La unidad no pasó',
      too_delayed: 'Va muy retrasada',
      map_not_matching: 'El mapa no coincide',
      unit_problem: 'Problema con la unidad',
      other: 'Otro problema',
    }[issueType]

    await recordSystemEvent(db, {
      category: 'route',
      title: `Reporte de pasajero: ${issueTypeLabel}`,
      description: trimmedDetails
        ? `Un pasajero reportó "${issueTypeLabel}" en ${route.name}. Detalle: ${trimmedDetails}`
        : `Un pasajero reportó "${issueTypeLabel}" en ${route.name}.`,
      actorName: 'Pasajero',
      targetType: 'route',
      targetId: route._id,
    })

    return {
      reportedAt: new Date().toISOString(),
      routeId: route._id,
      issueType,
    }
  },
})

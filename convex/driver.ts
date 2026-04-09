import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type DatabaseReader } from './_generated/server'
import { requireAuthenticatedSession, toUserSummary } from './lib/auth'
import {
  getActiveServiceRouteFields,
  getActiveServiceSnapshotFields,
} from './lib/activeServiceSnapshot'
import { evaluateServerLocationPlausibility } from './lib/location'
import { getRouteSegments, toRouteSummary } from './lib/routes'
import {
  getOpenServiceForDriver,
  getOpenServiceForVehicle,
} from './lib/services'
import { getOperationalStatusForService } from './lib/serviceOperationalState'
import { recordSystemEvent } from './lib/systemEvents'

async function getAssignedVehicle(
  db: DatabaseReader,
  driver: {
    _id: Id<'users'>
    defaultVehicleId?: Id<'vehicles'>
  },
  currentServiceVehicleId?: Id<'vehicles'>,
) {
  const preferredVehicleId = currentServiceVehicleId ?? driver.defaultVehicleId

  if (!preferredVehicleId) {
    return null
  }

  return await db.get(preferredVehicleId)
}

export const getPanelState = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )

    const [routes, currentService] = await Promise.all([
      db
        .query('routes')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect(),
      getOpenServiceForDriver(db, driver._id),
    ])

    const vehicle = await getAssignedVehicle(db, driver, currentService?.vehicleId)
    const routeById = new Map(routes.map((route) => [route._id, route]))

    let currentServiceState = null

    if (currentService) {
      const route = routeById.get(currentService.routeId)

      currentServiceState = {
        id: currentService._id,
        routeId: currentService.routeId,
        routeName: currentService.routeName ?? route?.name ?? 'Ruta activa',
        status: currentService.status,
        startedAt: currentService.startedAt,
        lastLocationUpdateAt: currentService.lastLocationUpdateAt ?? undefined,
        lastPosition: currentService.lastPosition,
        lastLocationSource: currentService.lastLocationSource,
        operationalStatus: getOperationalStatusForService({
          activeService: currentService,
          nowMs: Date.now(),
        }),
      }
    }

    return {
      driver: toUserSummary(driver),
      vehicle: vehicle
        ? {
            id: vehicle._id,
            unitNumber: vehicle.unitNumber,
            label: vehicle.label,
            status: vehicle.status,
            defaultRouteId: vehicle.defaultRouteId,
          }
        : null,
      availableRoutes: routes.map((route) => toRouteSummary(route)),
      preferredRouteId:
        currentServiceState?.routeId ??
        driver.defaultRouteId ??
        vehicle?.defaultRouteId,
      currentService: currentServiceState,
    }
  },
})

export const activateService = mutation({
  args: {
    sessionToken: v.string(),
    routeId: v.id('routes'),
  },
  handler: async ({ db }, { sessionToken, routeId }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )

    if (!driver.defaultVehicleId) {
      throw new ConvexError(
        'Tu cuenta no tiene una unidad asignada. Contacta a administracion.',
      )
    }

    const [route, vehicle, currentDriverService, currentVehicleService] =
      await Promise.all([
        db.get(routeId),
        db.get(driver.defaultVehicleId),
        getOpenServiceForDriver(db, driver._id),
        getOpenServiceForVehicle(db, driver.defaultVehicleId),
      ])

    if (!route || route.status !== 'active') {
      throw new ConvexError('La ruta seleccionada no esta disponible.')
    }

    if (!vehicle || vehicle.status === 'maintenance') {
      throw new ConvexError('Tu unidad asignada no esta disponible.')
    }

    if (currentDriverService) {
      throw new ConvexError('Ya tienes un servicio abierto.')
    }

    if (currentVehicleService && currentVehicleService.driverId !== driver._id) {
      throw new ConvexError('Tu unidad asignada ya tiene un servicio abierto.')
    }

    const startedAt = new Date().toISOString()
    const serviceId = await db.insert('activeServices', {
      vehicleId: vehicle._id,
      routeId: route._id,
      driverId: driver._id,
      ...getActiveServiceSnapshotFields({
        route,
        vehicle,
        driver,
      }),
      status: 'active',
      startedAt,
      lastLocationUpdateAt: undefined,
      lastPosition: undefined,
      lastLocationSource: undefined,
    })

    await db.patch(vehicle._id, {
      status: 'in_service',
      defaultRouteId: route._id,
    })

    await db.patch(driver._id, {
      defaultRouteId: route._id,
    })

    await recordSystemEvent(db, {
      category: 'service',
      title: 'Servicio iniciado',
      description: `${vehicle.unitNumber} inicio servicio en ${route.name}.`,
      actorName: driver.name,
      actorRole: 'driver',
      targetType: 'service',
      targetId: serviceId,
    })

    return {
      serviceId,
      routeId: route._id,
      startedAt,
    }
  },
})

export const pauseCurrentService = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )
    const currentService = await getOpenServiceForDriver(db, driver._id)

    if (!currentService || currentService.status !== 'active') {
      throw new ConvexError('No hay un servicio activo para pausar.')
    }

    await db.patch(currentService._id, {
      status: 'paused',
    })

    await recordSystemEvent(db, {
      category: 'service',
      title: 'Servicio pausado',
      description: `${currentService.vehicleUnitNumber ?? 'Unidad'} pauso su servicio en ${currentService.routeName ?? 'ruta activa'}.`,
      actorName: driver.name,
      actorRole: 'driver',
      targetType: 'service',
      targetId: currentService._id,
    })

    return {
      serviceId: currentService._id,
      status: 'paused',
    }
  },
})

export const resumeCurrentService = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )
    const currentService = await getOpenServiceForDriver(db, driver._id)

    if (!currentService || currentService.status !== 'paused') {
      throw new ConvexError('No hay un servicio pausado para reanudar.')
    }

    await db.patch(currentService._id, {
      status: 'active',
    })

    await recordSystemEvent(db, {
      category: 'service',
      title: 'Servicio reanudado',
      description: `${currentService.vehicleUnitNumber ?? 'Unidad'} reanudo su servicio en ${currentService.routeName ?? 'ruta activa'}.`,
      actorName: driver.name,
      actorRole: 'driver',
      targetType: 'service',
      targetId: currentService._id,
    })

    return {
      serviceId: currentService._id,
      status: 'active',
    }
  },
})

export const finishCurrentService = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )
    const currentService = await getOpenServiceForDriver(db, driver._id)

    if (!currentService) {
      throw new ConvexError('No hay un servicio abierto para este conductor.')
    }

    const endedAt = new Date().toISOString()

    await db.patch(currentService._id, {
      status: 'completed',
      endedAt,
    })

    await db.patch(currentService.vehicleId, {
      status: 'available',
    })

    await recordSystemEvent(db, {
      category: 'service',
      title: 'Servicio finalizado',
      description: `${currentService.vehicleUnitNumber ?? 'Unidad'} finalizo su servicio en ${currentService.routeName ?? 'ruta activa'}.`,
      actorName: driver.name,
      actorRole: 'driver',
      targetType: 'service',
      targetId: currentService._id,
    })

    return {
      serviceId: currentService._id,
      endedAt,
    }
  },
})

export const addLocationUpdate = mutation({
  args: {
    sessionToken: v.string(),
    lat: v.number(),
    lng: v.number(),
    accuracyMeters: v.optional(v.number()),
  },
  handler: async ({ db }, { sessionToken, lat, lng, accuracyMeters }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )
    const currentService = await getOpenServiceForDriver(db, driver._id)

    if (!currentService || currentService.status !== 'active') {
      throw new ConvexError(
        'Activa o reanuda un servicio antes de enviar ubicacion.',
      )
    }

    const route = await db.get(currentService.routeId)

    if (!route) {
      throw new ConvexError('La ruta activa no existe.')
    }

    const plausibility = evaluateServerLocationPlausibility({
      accuracyMeters: accuracyMeters ?? null,
      nextPosition: { lat, lng },
      routeSegments: getRouteSegments(route),
    })

    if (!plausibility.accepted) {
      if (plausibility.reason === 'low_accuracy') {
        throw new ConvexError(
          'La precision del GPS es demasiado baja para compartir esta ubicacion.',
        )
      }

      throw new ConvexError(
        'La ubicacion recibida cae demasiado lejos de la ruta activa.',
      )
    }

    const recordedAt = new Date().toISOString()
    const locationUpdateId = await db.insert('locationUpdates', {
      activeServiceId: currentService._id,
      vehicleId: currentService.vehicleId,
      routeId: route._id,
      position: { lat, lng },
      recordedAt,
      source: 'device',
    })

    await db.patch(currentService._id, {
      lastLocationUpdateAt: recordedAt,
      lastPosition: { lat, lng },
      lastLocationSource: 'device',
    })

    return {
      locationUpdateId,
      recordedAt,
    }
  },
})

export const changeAssignedRoute = mutation({
  args: {
    sessionToken: v.string(),
    routeId: v.id('routes'),
  },
  handler: async ({ db }, { sessionToken, routeId }) => {
    const { user: driver } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'driver',
    )

    const [route, currentService] = await Promise.all([
      db.get(routeId),
      getOpenServiceForDriver(db, driver._id),
    ])

    if (!route || route.status !== 'active') {
      throw new ConvexError('La ruta seleccionada no esta disponible.')
    }

    if (driver.defaultRouteId === route._id && currentService?.routeId === route._id) {
      return {
        routeId: route._id,
        routeName: route.name,
        changedAt: new Date().toISOString(),
      }
    }

    const changedAt = new Date().toISOString()

    await db.patch(driver._id, {
      defaultRouteId: route._id,
    })

    if (driver.defaultVehicleId) {
      await db.patch(driver.defaultVehicleId, {
        defaultRouteId: route._id,
      })
    }

    if (currentService) {
      await db.patch(currentService._id, {
        routeId: route._id,
        ...getActiveServiceRouteFields(route),
        lastLocationUpdateAt: undefined,
        lastPosition: undefined,
        lastLocationSource: undefined,
      })

      await recordSystemEvent(db, {
        category: 'route',
        title: 'Ruta reasignada',
        description: `${driver.name} cambio su servicio a ${route.name}.`,
        actorName: driver.name,
        actorRole: 'driver',
        targetType: 'route',
        targetId: route._id,
      })
    }

    return {
      routeId: route._id,
      routeName: route.name,
      changedAt,
    }
  },
})

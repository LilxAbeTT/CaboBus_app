import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type DatabaseWriter } from './_generated/server'
import {
  hashPassword,
  normalizeEmail,
  requireAuthenticatedSession,
} from './lib/auth'
import { toRouteSummary } from './lib/routes'
import {
  getLastSignalAt,
  getOperationalStatusForService,
} from './lib/serviceOperationalState'
import {
  getLatestLocationForService,
  getOpenServiceForDriver,
  getOpenServiceForVehicle,
  getOpenServices,
} from './lib/services'

async function ensureUniqueDriverEmail(
  db: DatabaseWriter,
  email: string,
  excludedUserId?: Id<'users'>,
) {
  const existingUser = await db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first()

  if (existingUser && existingUser._id !== excludedUserId) {
    throw new ConvexError('Ya existe un conductor con ese correo.')
  }
}

async function ensureUniqueVehicleUnitNumber(
  db: DatabaseWriter,
  unitNumber: string,
  excludedVehicleId?: Id<'vehicles'>,
) {
  const existingVehicle = await db
    .query('vehicles')
    .withIndex('by_unit_number', (q) => q.eq('unitNumber', unitNumber))
    .first()

  if (existingVehicle && existingVehicle._id !== excludedVehicleId) {
    throw new ConvexError('Ya existe una unidad con ese numero.')
  }
}

async function requireOpenServiceById(
  db: DatabaseWriter,
  serviceId: Id<'activeServices'>,
) {
  const service = await db.get(serviceId)

  if (!service || service.status === 'completed') {
    throw new ConvexError('El servicio indicado ya no esta abierto.')
  }

  return service
}

export const getDashboardState = query({
  args: {
    sessionToken: v.string(),
    nowMs: v.number(),
  },
  handler: async ({ db }, { sessionToken, nowMs }) => {
    const { user: admin } = await requireAuthenticatedSession(
      db,
      sessionToken,
      'admin',
    )

    const [routes, drivers, vehicles, openServices] = await Promise.all([
      db
        .query('routes')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect(),
      db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', 'driver'))
        .collect(),
      db.query('vehicles').order('asc').collect(),
      getOpenServices(db),
    ])

    const services = (
      await Promise.all(
        openServices.map(async (service) => {
          const [vehicle, route, driver, latestLocation] = await Promise.all([
            db.get(service.vehicleId),
            db.get(service.routeId),
            db.get(service.driverId),
            getLatestLocationForService(db, service._id),
          ])

          if (!vehicle || !route || !driver) {
            return null
          }

          return {
            id: service._id,
            routeId: route._id,
            routeName: route.name,
            routeDirection: route.direction,
            transportType: route.transportType ?? 'urbano',
            vehicleId: vehicle._id,
            unitNumber: vehicle.unitNumber,
            vehicleLabel: vehicle.label,
            driverId: driver._id,
            driverName: driver.name,
            status: service.status,
            startedAt: service.startedAt,
            lastSignalAt: getLastSignalAt(service, latestLocation) ?? undefined,
            lastSignalSource: latestLocation?.source,
            lastPosition: latestLocation?.position,
            operationalStatus: getOperationalStatusForService({
              activeService: service,
              latestLocation,
              nowMs,
            }),
          }
        }),
      )
    ).filter((service) => service !== null)

    const routeSummaries = routes
      .map((route) => {
        const routeServices = services.filter((service) => service.routeId === route._id)

        return {
          routeId: route._id,
          routeName: route.name,
          routeDirection: route.direction,
          transportType: route.transportType ?? 'urbano',
          totalServices: routeServices.length,
          activeRecent: routeServices.filter(
            (service) => service.operationalStatus === 'active_recent',
          ).length,
          activeStale: routeServices.filter(
            (service) => service.operationalStatus === 'active_stale',
          ).length,
          probablyStopped: routeServices.filter(
            (service) => service.operationalStatus === 'probably_stopped',
          ).length,
          pausedServices: routeServices.filter((service) => service.status === 'paused')
            .length,
        }
      })
      .filter((route) => route.totalServices > 0)
      .sort((left, right) => left.routeName.localeCompare(right.routeName, 'es'))

    const serviceByDriverId = new Map(
      openServices.map((service) => [service.driverId, service]),
    )
    const serviceByVehicleId = new Map(
      openServices.map((service) => [service.vehicleId, service]),
    )
    const routeNameById = new Map(routes.map((route) => [route._id, route.name]))
    const vehicleLabelById = new Map(
      vehicles.map((vehicle) => [vehicle._id, `${vehicle.unitNumber} - ${vehicle.label}`]),
    )

    return {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
      overview: {
        totals: {
          activeRoutes: routes.length,
          openServices: services.length,
          activeServices: services.filter((service) => service.status === 'active')
            .length,
          pausedServices: services.filter((service) => service.status === 'paused')
            .length,
          activeRecent: services.filter(
            (service) => service.operationalStatus === 'active_recent',
          ).length,
          activeStale: services.filter(
            (service) => service.operationalStatus === 'active_stale',
          ).length,
          probablyStopped: services.filter(
            (service) => service.operationalStatus === 'probably_stopped',
          ).length,
        },
        routes: routeSummaries,
        services: services.sort((left, right) =>
          right.startedAt.localeCompare(left.startedAt),
        ),
      },
      routes: routes
        .map((route) => toRouteSummary(route))
        .sort((left, right) => left.name.localeCompare(right.name, 'es')),
      drivers: drivers
        .sort((left, right) => left.name.localeCompare(right.name, 'es'))
        .map((driver) => {
          const openService = serviceByDriverId.get(driver._id)

          return {
            id: driver._id,
            name: driver.name,
            email: driver.email,
            status: driver.status,
            defaultRouteId: driver.defaultRouteId,
            defaultRouteName: driver.defaultRouteId
              ? routeNameById.get(driver.defaultRouteId)
              : undefined,
            defaultVehicleId: driver.defaultVehicleId,
            defaultVehicleLabel: driver.defaultVehicleId
              ? vehicleLabelById.get(driver.defaultVehicleId)
              : undefined,
            hasOpenService: openService !== undefined,
            currentRouteName: openService
              ? routeNameById.get(openService.routeId)
              : undefined,
            currentServiceStatus: openService?.status,
          }
        }),
      vehicles: vehicles
        .sort((left, right) => left.unitNumber.localeCompare(right.unitNumber, 'es'))
        .map((vehicle) => {
          const openService = serviceByVehicleId.get(vehicle._id)

          return {
            id: vehicle._id,
            unitNumber: vehicle.unitNumber,
            label: vehicle.label,
            status: vehicle.status,
            defaultRouteId: vehicle.defaultRouteId,
            defaultRouteName: vehicle.defaultRouteId
              ? routeNameById.get(vehicle.defaultRouteId)
              : undefined,
            hasOpenService: openService !== undefined,
            currentRouteName: openService
              ? routeNameById.get(openService.routeId)
              : undefined,
            currentServiceStatus: openService?.status,
          }
        }),
    }
  },
})

export const createDriver = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    defaultRouteId: v.optional(v.id('routes')),
    defaultVehicleId: v.optional(v.id('vehicles')),
  },
  handler: async (
    { db },
    {
      sessionToken,
      name,
      email,
      password,
      status,
      defaultRouteId,
      defaultVehicleId,
    },
  ) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')

    const normalizedEmail = normalizeEmail(email)
    await ensureUniqueDriverEmail(db, normalizedEmail)
    const passwordHash = await hashPassword(password)

    if (defaultRouteId) {
      const route = await db.get(defaultRouteId)

      if (!route) {
        throw new ConvexError('La ruta asignada ya no existe.')
      }
    }

    if (defaultVehicleId) {
      const vehicle = await db.get(defaultVehicleId)

      if (!vehicle) {
        throw new ConvexError('La unidad asignada ya no existe.')
      }
    }

    const driverId = await db.insert('users', {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      defaultRouteId,
      defaultVehicleId,
      role: 'driver',
      status: status ?? 'active',
      createdAt: new Date().toISOString(),
    })

    return {
      driverId,
    }
  },
})

export const updateDriver = mutation({
  args: {
    sessionToken: v.string(),
    driverId: v.id('users'),
    name: v.string(),
    email: v.string(),
    status: v.union(v.literal('active'), v.literal('inactive')),
    password: v.optional(v.string()),
    defaultRouteId: v.optional(v.id('routes')),
    defaultVehicleId: v.optional(v.id('vehicles')),
  },
  handler: async (
    { db },
    {
      sessionToken,
      driverId,
      name,
      email,
      status,
      password,
      defaultRouteId,
      defaultVehicleId,
    },
  ) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')

    const driver = await db.get(driverId)

    if (!driver || driver.role !== 'driver') {
      throw new ConvexError('El conductor indicado no existe.')
    }

    const openService = await getOpenServiceForDriver(db, driverId)

    if (status === 'inactive' && openService) {
      throw new ConvexError(
        'No puedes inactivar un conductor con un servicio abierto.',
      )
    }

    const normalizedEmail = normalizeEmail(email)
    await ensureUniqueDriverEmail(db, normalizedEmail, driverId)

    if (defaultRouteId) {
      const route = await db.get(defaultRouteId)

      if (!route) {
        throw new ConvexError('La ruta asignada ya no existe.')
      }
    }

    if (defaultVehicleId) {
      const vehicle = await db.get(defaultVehicleId)

      if (!vehicle) {
        throw new ConvexError('La unidad asignada ya no existe.')
      }
    }

    const patch: Partial<typeof driver> = {
      name: name.trim(),
      email: normalizedEmail,
      status,
      defaultRouteId,
      defaultVehicleId,
    }

    if (password && password.trim()) {
      patch.passwordHash = await hashPassword(password)
    }

    await db.patch(driverId, patch)

    return {
      driverId,
    }
  },
})

export const createVehicle = mutation({
  args: {
    sessionToken: v.string(),
    unitNumber: v.string(),
    label: v.string(),
    status: v.union(v.literal('available'), v.literal('maintenance')),
    defaultRouteId: v.optional(v.id('routes')),
  },
  handler: async (
    { db },
    { sessionToken, unitNumber, label, status, defaultRouteId },
  ) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')

    const normalizedUnitNumber = unitNumber.trim()
    await ensureUniqueVehicleUnitNumber(db, normalizedUnitNumber)

    if (defaultRouteId) {
      const route = await db.get(defaultRouteId)

      if (!route) {
        throw new ConvexError('La ruta por defecto ya no existe.')
      }
    }

    const vehicleId = await db.insert('vehicles', {
      unitNumber: normalizedUnitNumber,
      label: label.trim(),
      status,
      defaultRouteId,
      createdAt: new Date().toISOString(),
    })

    return {
      vehicleId,
    }
  },
})

export const updateVehicle = mutation({
  args: {
    sessionToken: v.string(),
    vehicleId: v.id('vehicles'),
    unitNumber: v.string(),
    label: v.string(),
    status: v.union(v.literal('available'), v.literal('maintenance')),
    defaultRouteId: v.optional(v.id('routes')),
  },
  handler: async (
    { db },
    { sessionToken, vehicleId, unitNumber, label, status, defaultRouteId },
  ) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')

    const vehicle = await db.get(vehicleId)

    if (!vehicle) {
      throw new ConvexError('La unidad indicada no existe.')
    }

    const openService = await getOpenServiceForVehicle(db, vehicleId)

    if (status === 'maintenance' && openService) {
      throw new ConvexError(
        'No puedes mandar a mantenimiento una unidad con servicio abierto.',
      )
    }

    const normalizedUnitNumber = unitNumber.trim()
    await ensureUniqueVehicleUnitNumber(db, normalizedUnitNumber, vehicleId)

    if (defaultRouteId) {
      const route = await db.get(defaultRouteId)

      if (!route) {
        throw new ConvexError('La ruta por defecto ya no existe.')
      }
    }

    await db.patch(vehicleId, {
      unitNumber: normalizedUnitNumber,
      label: label.trim(),
      status,
      defaultRouteId,
    })

    return {
      vehicleId,
    }
  },
})

export const pauseService = mutation({
  args: {
    sessionToken: v.string(),
    serviceId: v.id('activeServices'),
  },
  handler: async ({ db }, { sessionToken, serviceId }) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')
    const service = await requireOpenServiceById(db, serviceId)

    if (service.status !== 'active') {
      throw new ConvexError('Solo puedes pausar servicios activos.')
    }

    await db.patch(serviceId, {
      status: 'paused',
    })

    return {
      serviceId,
      status: 'paused',
    }
  },
})

export const resumeService = mutation({
  args: {
    sessionToken: v.string(),
    serviceId: v.id('activeServices'),
  },
  handler: async ({ db }, { sessionToken, serviceId }) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')
    const service = await requireOpenServiceById(db, serviceId)

    if (service.status !== 'paused') {
      throw new ConvexError('Solo puedes reanudar servicios pausados.')
    }

    await db.patch(serviceId, {
      status: 'active',
    })

    return {
      serviceId,
      status: 'active',
    }
  },
})

export const finishService = mutation({
  args: {
    sessionToken: v.string(),
    serviceId: v.id('activeServices'),
  },
  handler: async ({ db }, { sessionToken, serviceId }) => {
    await requireAuthenticatedSession(db, sessionToken, 'admin')
    const service = await requireOpenServiceById(db, serviceId)

    const endedAt = new Date().toISOString()

    await db.patch(serviceId, {
      status: 'completed',
      endedAt,
    })

    await db.patch(service.vehicleId, {
      status: 'available',
    })

    return {
      serviceId,
      endedAt,
    }
  },
})

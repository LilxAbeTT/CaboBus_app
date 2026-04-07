import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const coordinates = v.object({
  lat: v.number(),
  lng: v.number(),
})

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    defaultRouteId: v.optional(v.id('routes')),
    defaultVehicleId: v.optional(v.id('vehicles')),
    role: v.union(v.literal('passenger'), v.literal('driver'), v.literal('admin')),
    status: v.union(v.literal('active'), v.literal('inactive')),
    createdAt: v.string(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  routes: defineTable({
    importKey: v.optional(v.string()),
    slug: v.string(),
    name: v.string(),
    direction: v.string(),
    transportType: v.optional(
      v.union(v.literal('urbano'), v.literal('colectivo')),
    ),
    sourceFile: v.optional(v.string()),
    status: v.union(v.literal('draft'), v.literal('active')),
    color: v.string(),
    segments: v.optional(v.array(v.array(coordinates))),
    path: v.optional(v.array(coordinates)),
    createdAt: v.string(),
  })
    .index('by_import_key', ['importKey'])
    .index('by_slug', ['slug'])
    .index('by_status', ['status']),

  vehicles: defineTable({
    unitNumber: v.string(),
    label: v.string(),
    status: v.union(
      v.literal('available'),
      v.literal('in_service'),
      v.literal('maintenance'),
    ),
    defaultRouteId: v.optional(v.id('routes')),
    createdAt: v.string(),
  }).index('by_unit_number', ['unitNumber']),

  activeServices: defineTable({
    vehicleId: v.id('vehicles'),
    routeId: v.id('routes'),
    driverId: v.id('users'),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('completed')),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
    lastLocationUpdateAt: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_driver', ['driverId'])
    .index('by_vehicle', ['vehicleId']),

  locationUpdates: defineTable({
    activeServiceId: v.id('activeServices'),
    vehicleId: v.id('vehicles'),
    routeId: v.id('routes'),
    position: coordinates,
    recordedAt: v.string(),
    source: v.union(v.literal('seed'), v.literal('device')),
  })
    .index('by_active_service_recorded_at', ['activeServiceId', 'recordedAt'])
    .index('by_vehicle_recorded_at', ['vehicleId', 'recordedAt']),

  sessions: defineTable({
    token: v.string(),
    userId: v.id('users'),
    role: v.union(v.literal('driver'), v.literal('admin')),
    createdAt: v.string(),
    expiresAt: v.string(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),
})

import type { ServiceOperationalStatus } from '../../shared/tracking'

export type UserRole = 'passenger' | 'driver' | 'admin'

export type UserStatus = 'active' | 'inactive'

export type RouteStatus = 'draft' | 'active'

export type TransportType = 'urbano' | 'colectivo'

export type VehicleStatus = 'available' | 'in_service' | 'maintenance'

export type ActiveServiceStatus = 'active' | 'paused' | 'completed'

export type LocationUpdateSource = 'seed' | 'device'

export interface Coordinates {
  lat: number
  lng: number
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  defaultRouteId?: string
  defaultVehicleId?: string
}

export interface AuthenticatedSession {
  token: string
  expiresAt: string
  user: AppUser
}

export interface BusRoute {
  id: string
  importKey: string
  slug: string
  name: string
  direction: string
  transportType: TransportType
  sourceFile: string
  status: RouteStatus
  color: string
  segments: Coordinates[][]
}

export interface Vehicle {
  id: string
  unitNumber: string
  label: string
  status: VehicleStatus
  defaultRouteId?: string
}

export interface ActiveService {
  id: string
  vehicleId: string
  routeId: string
  driverId: string
  status: ActiveServiceStatus
  startedAt: string
  lastLocationUpdateAt?: string
}

export interface LocationUpdate {
  id: string
  activeServiceId: string
  vehicleId: string
  routeId: string
  position: Coordinates
  recordedAt: string
  source: LocationUpdateSource
}

export interface PassengerMapVehicle {
  id: string
  unitNumber: string
  label: string
  routeId: string
  routeName: string
  driverName: string
  status: ActiveServiceStatus
  position: Coordinates
  lastUpdate: string
  lastUpdateSource: LocationUpdateSource
  operationalStatus: ServiceOperationalStatus
}

export interface PassengerMapSnapshot {
  routes: BusRoute[]
  activeVehicles: PassengerMapVehicle[]
}

export interface DriverPanelCurrentService {
  id: string
  routeId: string
  routeName: string
  status: ActiveServiceStatus
  startedAt: string
  lastLocationUpdateAt?: string
  lastPosition?: Coordinates
  lastLocationSource?: LocationUpdateSource
  operationalStatus?: ServiceOperationalStatus
}

export interface DriverPanelState {
  driver: AppUser | null
  vehicle: Vehicle | null
  availableRoutes: BusRoute[]
  preferredRouteId?: string
  currentService: DriverPanelCurrentService | null
}

export interface AdminOperationalService {
  id: string
  routeId: string
  routeName: string
  routeDirection: string
  transportType: TransportType
  vehicleId: string
  unitNumber: string
  vehicleLabel: string
  driverId: string
  driverName: string
  status: ActiveServiceStatus
  startedAt: string
  lastSignalAt?: string
  lastSignalSource?: LocationUpdateSource
  lastPosition?: Coordinates
  operationalStatus: ServiceOperationalStatus
}

export interface AdminOperationalRouteSummary {
  routeId: string
  routeName: string
  routeDirection: string
  transportType: TransportType
  totalServices: number
  activeRecent: number
  activeStale: number
  probablyStopped: number
  pausedServices: number
}

export interface AdminOperationalOverview {
  totals: {
    activeRoutes: number
    openServices: number
    activeServices: number
    pausedServices: number
    activeRecent: number
    activeStale: number
    probablyStopped: number
  }
  routes: AdminOperationalRouteSummary[]
  services: AdminOperationalService[]
}

export interface AdminManagedDriver {
  id: string
  name: string
  email: string
  status: UserStatus
  defaultRouteId?: string
  defaultRouteName?: string
  defaultVehicleId?: string
  defaultVehicleLabel?: string
  hasOpenService: boolean
  currentRouteName?: string
  currentServiceStatus?: ActiveServiceStatus
}

export interface AdminManagedVehicle {
  id: string
  unitNumber: string
  label: string
  status: VehicleStatus
  defaultRouteId?: string
  defaultRouteName?: string
  hasOpenService: boolean
  currentRouteName?: string
  currentServiceStatus?: ActiveServiceStatus
}

export interface AdminDashboardState {
  admin: AppUser
  overview: AdminOperationalOverview
  routes: BusRoute[]
  drivers: AdminManagedDriver[]
  vehicles: AdminManagedVehicle[]
}

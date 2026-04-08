import type { Doc } from '../_generated/dataModel'
import { getRouteTransportType } from './routes'

type RouteDocument = Doc<'routes'>
type VehicleDocument = Doc<'vehicles'>
type DriverDocument = Doc<'users'>

export function getActiveServiceRouteFields(route: RouteDocument) {
  return {
    routeName: route.name,
    routeDirection: route.direction,
    routeTransportType: getRouteTransportType(route),
  }
}

export function getActiveServiceVehicleFields(vehicle: VehicleDocument) {
  return {
    vehicleUnitNumber: vehicle.unitNumber,
    vehicleLabel: vehicle.label,
  }
}

export function getActiveServiceDriverFields(driver: Pick<DriverDocument, 'name'>) {
  return {
    driverName: driver.name,
  }
}

export function getActiveServiceSnapshotFields({
  route,
  vehicle,
  driver,
}: {
  route: RouteDocument
  vehicle: VehicleDocument
  driver: Pick<DriverDocument, 'name'>
}) {
  return {
    ...getActiveServiceRouteFields(route),
    ...getActiveServiceVehicleFields(vehicle),
    ...getActiveServiceDriverFields(driver),
  }
}

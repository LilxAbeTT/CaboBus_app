const BROWSER_SIGNAL_MAX_ACCURACY_METERS = 2_500
const ROUTE_SANITY_MAX_DISTANCE_METERS = 25_000

type Coordinates = {
  lat: number
  lng: number
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function projectCoordinateToMeters(point: Coordinates, referenceLatitude: number) {
  const metersPerLatitudeDegree = 111_320
  const metersPerLongitudeDegree =
    Math.cos(toRadians(referenceLatitude)) * metersPerLatitudeDegree

  return {
    x: point.lng * metersPerLongitudeDegree,
    y: point.lat * metersPerLatitudeDegree,
  }
}

function getDistanceToSegmentMeters(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates,
) {
  const referenceLatitude =
    (point.lat + segmentStart.lat + segmentEnd.lat) / 3
  const projectedPoint = projectCoordinateToMeters(point, referenceLatitude)
  const projectedStart = projectCoordinateToMeters(
    segmentStart,
    referenceLatitude,
  )
  const projectedEnd = projectCoordinateToMeters(segmentEnd, referenceLatitude)
  const deltaX = projectedEnd.x - projectedStart.x
  const deltaY = projectedEnd.y - projectedStart.y
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY

  if (segmentLengthSquared === 0) {
    return Math.hypot(
      projectedPoint.x - projectedStart.x,
      projectedPoint.y - projectedStart.y,
    )
  }

  const projectionFactor = Math.max(
    0,
    Math.min(
      1,
      ((projectedPoint.x - projectedStart.x) * deltaX +
        (projectedPoint.y - projectedStart.y) * deltaY) /
        segmentLengthSquared,
    ),
  )

  const projectedClosestPoint = {
    x: projectedStart.x + projectionFactor * deltaX,
    y: projectedStart.y + projectionFactor * deltaY,
  }

  return Math.hypot(
    projectedPoint.x - projectedClosestPoint.x,
    projectedPoint.y - projectedClosestPoint.y,
  )
}

export function getMinimumDistanceToRouteMeters(
  point: Coordinates,
  routeSegments: Coordinates[][],
) {
  let closestDistanceMeters: number | null = null

  routeSegments.forEach((segment) => {
    if (segment.length === 0) {
      return
    }

    if (segment.length === 1) {
      const referenceLatitude = (point.lat + segment[0].lat) / 2
      const projectedPoint = projectCoordinateToMeters(point, referenceLatitude)
      const projectedStop = projectCoordinateToMeters(segment[0], referenceLatitude)
      const pointDistanceMeters = Math.hypot(
        projectedPoint.x - projectedStop.x,
        projectedPoint.y - projectedStop.y,
      )

      closestDistanceMeters =
        closestDistanceMeters === null
          ? pointDistanceMeters
          : Math.min(closestDistanceMeters, pointDistanceMeters)

      return
    }

    for (let index = 0; index < segment.length - 1; index += 1) {
      const segmentDistanceMeters = getDistanceToSegmentMeters(
        point,
        segment[index],
        segment[index + 1],
      )

      closestDistanceMeters =
        closestDistanceMeters === null
          ? segmentDistanceMeters
          : Math.min(closestDistanceMeters, segmentDistanceMeters)
    }
  })

  return closestDistanceMeters
}

export function evaluateServerLocationPlausibility({
  accuracyMeters,
  nextPosition,
  routeSegments,
}: {
  accuracyMeters?: number | null
  nextPosition: Coordinates
  routeSegments: Coordinates[][]
}) {
  const distanceToRouteMeters = getMinimumDistanceToRouteMeters(
    nextPosition,
    routeSegments,
  )

  if (
    accuracyMeters !== null &&
    accuracyMeters !== undefined &&
    accuracyMeters > BROWSER_SIGNAL_MAX_ACCURACY_METERS
  ) {
    return {
      accepted: false,
      reason: 'low_accuracy' as const,
      distanceToRouteMeters,
    }
  }

  if (
    distanceToRouteMeters !== null &&
    distanceToRouteMeters > ROUTE_SANITY_MAX_DISTANCE_METERS
  ) {
    return {
      accepted: false,
      reason: 'outside_route_zone' as const,
      distanceToRouteMeters,
    }
  }

  return {
    accepted: true,
    distanceToRouteMeters,
  }
}

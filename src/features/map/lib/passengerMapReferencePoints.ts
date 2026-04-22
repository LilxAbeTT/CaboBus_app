import type { BusRoute, BusStop, Coordinates } from '../../../types/domain'
import {
  normalizeTextForSearch,
  repairPossibleMojibake,
} from '../../../../shared/routeDetails'

const MAX_GUIDE_POINTS_PER_ROUTE = 5
const MAX_COLONY_POINTS_PER_ROUTE = 5
const GUIDE_POINT_BUFFER_METERS = 180
const COLONY_POINT_BUFFER_METERS = 220

const RAW_COLONY_LABEL_SPLITS = new Map<string, string[]>([
  ['col. zacatal. vista hermosa', ['Zacatal', 'Vista Hermosa']],
  ['zacatal. san jose viejo', ['Zacatal', 'San José Viejo']],
  ['col. centro san jose del cabo transpeninsular', ['Colonia Centro']],
  ['san bernabe transpeninsular', ['San Bernabé']],
])

const COLONY_LABEL_ALIASES = new Map<string, string>([
  ['col. 1 de mayo', 'Colonia 1 de Mayo'],
  ['col. centro san jose del cabo', 'Colonia Centro'],
  ['colonia centro', 'Colonia Centro'],
  ['centro', 'Centro'],
  ['col. santa rosa', 'Santa Rosa'],
  ['santa rosa', 'Santa Rosa'],
  ['santa rosa ampliacion', 'Santa Rosa Ampliación'],
  ['col. zacatal', 'Zacatal'],
  ['colonia zacatal', 'Zacatal'],
  ['zacatal', 'Zacatal'],
  ['guaymitas', 'Guaymitas'],
  ['vista hermosa', 'Vista Hermosa'],
  ['monte real', 'Monte Real'],
  ['monterreal', 'Monte Real'],
  ['monte bello', 'Monte Bello'],
  ['nueva esperanza', 'Nueva Esperanza'],
  ['puerto nuevo', 'Puerto Nuevo'],
  ['colonia luis donaldo colosio', 'Colonia Luis Donaldo Colosio'],
  ['colonia pablo l martinez', 'Colonia Pablo L. Martínez'],
  ['colonia pablo l. martinez', 'Colonia Pablo L. Martínez'],
  ['colonia san bernabe', 'Colonia San Bernabé'],
  ['san bernabe', 'San Bernabé'],
  ['colonia san jose viejo', 'San José Viejo'],
  ['san jose viejo', 'San José Viejo'],
  ['colonia veredas', 'Las Veredas'],
  ['las veredas', 'Las Veredas'],
  ['colonia costa dorada', 'Costa Dorada'],
  ['colonia el rincon de la playa', 'El Rincón de la Playa'],
  ['colonia ejidal la ballena etapa 1', 'La Ballena'],
  ['predio la ballena', 'La Ballena'],
  ['colonia san jose viejo', 'San José Viejo'],
  ['fracc. villa bonita', 'Villa Bonita'],
  ['fraccionamiento villa bonita', 'Villa Bonita'],
  ['villa bonita', 'Villa Bonita'],
  ['invi santa anita', 'Invi Santa Anita'],
  ['villas de cortes', 'Villas de Cortés'],
  ['y villas de cortez', 'Villas de Cortés'],
  ['zona hotelera', 'Zona Hotelera'],
  ['fonatur', 'FONATUR'],
])

const COLONY_ALLOWLIST = new Set(COLONY_LABEL_ALIASES.keys())
const NON_COLONY_PATTERN =
  /\b(transpeninsular|boulevard|blvd|calle|corredor turistico|arroyo|soriana|imss|ites|plaza|semaforo|glorieta|walmart)\b/i
const GUIDE_SKIP_PATTERN = /^(transpeninsular|boulevard\b|calle\b|corredor turistico)$/i

export type PassengerMapReferencePointKind =
  | 'guide'
  | 'official_stop'
  | 'route_colony'

export interface PassengerMapReferencePoint {
  id: string
  kind: PassengerMapReferencePointKind
  label: string
  position: Coordinates
  routeIds: string[]
  routeNames: string[]
  reportCount?: number
  sourceLabel?: string
}

type RouteDistanceCheckpoint = {
  point: Coordinates
  cumulativeMeters: number
}

export function buildPassengerMapReferencePoints(
  routes: BusRoute[],
  stops: BusStop[],
): PassengerMapReferencePoint[] {
  const routeById = new Map(routes.map((route) => [route.id, route] as const))
  const officialStops = buildOfficialStopReferencePoints(stops, routeById)
  const officialStopsByRouteId = new Map<string, PassengerMapReferencePoint[]>()

  officialStops.forEach((point) => {
    point.routeIds.forEach((routeId) => {
      const current = officialStopsByRouteId.get(routeId) ?? []
      current.push(point)
      officialStopsByRouteId.set(routeId, current)
    })
  })

  const routePoints = routes.flatMap((route) =>
    buildRouteDerivedReferencePoints(route, officialStopsByRouteId.get(route.id) ?? []),
  )

  return [...officialStops, ...routePoints]
}

export function countPassengerMapReferencePointsByRoute(
  referencePoints: PassengerMapReferencePoint[],
  includedKinds?: PassengerMapReferencePointKind[],
) {
  const countsByRouteId = new Map<string, number>()
  const includedKindSet = includedKinds ? new Set(includedKinds) : null

  referencePoints.forEach((referencePoint) => {
    if (includedKindSet && !includedKindSet.has(referencePoint.kind)) {
      return
    }

    referencePoint.routeIds.forEach((routeId) => {
      countsByRouteId.set(routeId, (countsByRouteId.get(routeId) ?? 0) + 1)
    })
  })

  return countsByRouteId
}

function buildOfficialStopReferencePoints(
  stops: BusStop[],
  routeById: Map<string, BusRoute>,
): PassengerMapReferencePoint[] {
  return stops.map((stop) => {
    const routeNames = stop.routeIds
      .map((routeId) => routeById.get(routeId)?.name)
      .filter((routeName): routeName is string => Boolean(routeName))

    return {
      id: `stop:${stop.id}`,
      kind: 'official_stop',
      label: repairPossibleMojibake(stop.name ?? 'Parada oficial'),
      position: stop.position,
      routeIds: stop.routeIds,
      routeNames,
      reportCount: stop.reportCount,
      sourceLabel: 'Parada oficial',
    } satisfies PassengerMapReferencePoint
  })
}

function buildRouteDerivedReferencePoints(
  route: BusRoute,
  officialStops: PassengerMapReferencePoint[],
) {
  const checkpoints = buildRouteDistanceCheckpoints(route.segments)

  if (checkpoints.length < 2) {
    return []
  }

  const totalDistanceMeters = checkpoints[checkpoints.length - 1]?.cumulativeMeters ?? 0

  if (totalDistanceMeters <= 0) {
    return []
  }

  const colonyLabels = resolveRouteColonyLabels(route.passengerInfo.landmarks)
  const colonyPoints = buildRouteLabeledReferencePoints({
    route,
    checkpoints,
    totalDistanceMeters,
    labels: colonyLabels,
    maxPoints: MAX_COLONY_POINTS_PER_ROUTE,
    kind: 'route_colony',
    sourceLabel: 'Colonia sobre el recorrido',
    collisionPoints: officialStops,
    collisionBufferMeters: COLONY_POINT_BUFFER_METERS,
  })
  const colonyLabelSet = new Set(
    colonyLabels.map((label) => normalizeReferenceLabelForComparison(label)),
  )
  const guideLabels = resolveRouteGuideLabels(
    route.passengerInfo.landmarks,
    colonyLabelSet,
  )
  const guidePoints = buildRouteLabeledReferencePoints({
    route,
    checkpoints,
    totalDistanceMeters,
    labels: guideLabels,
    maxPoints: MAX_GUIDE_POINTS_PER_ROUTE,
    kind: 'guide',
    sourceLabel: 'Punto guía aproximado',
    collisionPoints: [...officialStops, ...colonyPoints],
    collisionBufferMeters: GUIDE_POINT_BUFFER_METERS,
  })

  return [...colonyPoints, ...guidePoints]
}

function buildRouteLabeledReferencePoints({
  route,
  checkpoints,
  totalDistanceMeters,
  labels,
  maxPoints,
  kind,
  sourceLabel,
  collisionPoints,
  collisionBufferMeters,
}: {
  route: BusRoute
  checkpoints: RouteDistanceCheckpoint[]
  totalDistanceMeters: number
  labels: string[]
  maxPoints: number
  kind: PassengerMapReferencePointKind
  sourceLabel: string
  collisionPoints: PassengerMapReferencePoint[]
  collisionBufferMeters: number
}) {
  const slicedLabels = labels.slice(0, maxPoints)

  return slicedLabels.flatMap((label, index) => {
    const fraction = (index + 1) / (slicedLabels.length + 1)
    const position = getPointAtRouteFraction(checkpoints, totalDistanceMeters, fraction)

    if (!position) {
      return []
    }

    const overlapsExistingPoint = collisionPoints.some(
      (referencePoint) =>
        getDistanceBetweenCoordinatesMeters(referencePoint.position, position) <=
        collisionBufferMeters,
    )

    if (overlapsExistingPoint) {
      return []
    }

    return [
      {
        id: `${kind}:${route.id}:${index}`,
        kind,
        label,
        position,
        routeIds: [route.id],
        routeNames: [route.name],
        sourceLabel,
      } satisfies PassengerMapReferencePoint,
    ]
  })
}

function resolveRouteColonyLabels(rawLandmarks: string[]) {
  return dedupeStrings(
    rawLandmarks.flatMap((rawLandmark) => normalizeRawLandmarkToColonyLabels(rawLandmark)),
  )
}

function resolveRouteGuideLabels(
  rawLandmarks: string[],
  colonyLabelSet: Set<string>,
) {
  return dedupeStrings(
    rawLandmarks
      .map((rawLandmark) => normalizeRawLandmarkToGuideLabel(rawLandmark))
      .filter((label): label is string => Boolean(label))
      .filter(
        (label) => !colonyLabelSet.has(normalizeReferenceLabelForComparison(label)),
      ),
  )
}

function normalizeRawLandmarkToColonyLabels(rawLandmark: string) {
  const normalizedLandmark = normalizeRawReferenceLabel(rawLandmark)

  if (!normalizedLandmark) {
    return []
  }

  const landmarkKey = normalizeReferenceLabelForComparison(normalizedLandmark)
  const splitLabels = RAW_COLONY_LABEL_SPLITS.get(landmarkKey)

  if (splitLabels) {
    return splitLabels
  }

  const aliasedLabel = COLONY_LABEL_ALIASES.get(landmarkKey)

  if (aliasedLabel) {
    return [aliasedLabel]
  }

  if (NON_COLONY_PATTERN.test(landmarkKey)) {
    return []
  }

  if (/^(colonia|col\.)\s+/i.test(normalizedLandmark)) {
    const colonyName = normalizedLandmark
      .replace(/^(colonia|col\.)\s+/i, '')
      .trim()

    return colonyName ? [`Colonia ${colonyName}`] : []
  }

  if (/^(fracc\.|fraccionamiento)\s+/i.test(normalizedLandmark)) {
    const fractionationName = normalizedLandmark
      .replace(/^(fracc\.|fraccionamiento)\s+/i, '')
      .trim()

    return fractionationName ? [fractionationName] : []
  }

  if (COLONY_ALLOWLIST.has(landmarkKey)) {
    return [normalizedLandmark]
  }

  return []
}

function normalizeRawLandmarkToGuideLabel(rawLandmark: string) {
  const normalizedLandmark = normalizeRawReferenceLabel(rawLandmark)

  if (!normalizedLandmark) {
    return null
  }

  const cleanedLabel = normalizedLandmark
    .replace(/^y\s+/i, '')
    .replace(/[.,]\s*$/g, '')
    .trim()

  if (!cleanedLabel || GUIDE_SKIP_PATTERN.test(normalizeReferenceLabelForComparison(cleanedLabel))) {
    return null
  }

  return cleanedLabel
}

function normalizeRawReferenceLabel(value: string) {
  return repairPossibleMojibake(value)
    .replace(/^y\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeReferenceLabelForComparison(value: string) {
  return normalizeTextForSearch(value)
    .replace(/[.]/g, '')
    .trim()
}

function buildRouteDistanceCheckpoints(segments: Coordinates[][]): RouteDistanceCheckpoint[] {
  const checkpoints: RouteDistanceCheckpoint[] = []
  let cumulativeMeters = 0
  let previousPoint: Coordinates | null = null

  segments.forEach((segment) => {
    segment.forEach((point) => {
      if (
        previousPoint &&
        previousPoint.lat === point.lat &&
        previousPoint.lng === point.lng
      ) {
        return
      }

      if (previousPoint) {
        cumulativeMeters += getDistanceBetweenCoordinatesMeters(previousPoint, point)
      }

      checkpoints.push({
        point,
        cumulativeMeters,
      })
      previousPoint = point
    })
  })

  return checkpoints
}

function getPointAtRouteFraction(
  checkpoints: RouteDistanceCheckpoint[],
  totalDistanceMeters: number,
  fraction: number,
) {
  const targetDistance = totalDistanceMeters * fraction

  for (let index = 1; index < checkpoints.length; index += 1) {
    const previousCheckpoint = checkpoints[index - 1]
    const currentCheckpoint = checkpoints[index]

    if (currentCheckpoint.cumulativeMeters < targetDistance) {
      continue
    }

    const segmentDistance =
      currentCheckpoint.cumulativeMeters - previousCheckpoint.cumulativeMeters

    if (segmentDistance <= 0) {
      return currentCheckpoint.point
    }

    const segmentFraction =
      (targetDistance - previousCheckpoint.cumulativeMeters) / segmentDistance

    return {
      lat:
        previousCheckpoint.point.lat +
        (currentCheckpoint.point.lat - previousCheckpoint.point.lat) * segmentFraction,
      lng:
        previousCheckpoint.point.lng +
        (currentCheckpoint.point.lng - previousCheckpoint.point.lng) * segmentFraction,
    } satisfies Coordinates
  }

  return checkpoints[checkpoints.length - 1]?.point ?? null
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index)
}

function getDistanceBetweenCoordinatesMeters(first: Coordinates, second: Coordinates) {
  const earthRadiusMeters = 6_371_000
  const latDeltaRadians = degreesToRadians(second.lat - first.lat)
  const lngDeltaRadians = degreesToRadians(second.lng - first.lng)
  const firstLatRadians = degreesToRadians(first.lat)
  const secondLatRadians = degreesToRadians(second.lat)

  const haversine =
    Math.sin(latDeltaRadians / 2) * Math.sin(latDeltaRadians / 2) +
    Math.cos(firstLatRadians) *
      Math.cos(secondLatRadians) *
      Math.sin(lngDeltaRadians / 2) *
      Math.sin(lngDeltaRadians / 2)

  return (
    2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { BusRoute } from '../../../types/domain'

const passengerRouteSelectionStorageKey = 'cabobus.passenger-map.selected-route-id'

export function usePassengerRouteSelection(
  routes: BusRoute[],
  preferredRouteId?: string | null,
) {
  const routeIds = useMemo(() => new Set(routes.map((route) => route.id)), [routes])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? preferredRouteId ?? null
      : preferredRouteId ??
        window.localStorage.getItem(passengerRouteSelectionStorageKey),
  )
  const effectiveSelectedRouteId =
    selectedRouteId && routeIds.has(selectedRouteId)
      ? selectedRouteId
      : null
  const clearSelectedRoute = useCallback(() => {
    setSelectedRouteId(null)
  }, [])

  useEffect(() => {
    if (!effectiveSelectedRouteId) {
      window.localStorage.removeItem(passengerRouteSelectionStorageKey)
      return
    }

    window.localStorage.setItem(
      passengerRouteSelectionStorageKey,
      effectiveSelectedRouteId,
    )
  }, [effectiveSelectedRouteId])

  return {
    hasHydratedSelection: true,
    selectedRouteId: effectiveSelectedRouteId,
    setSelectedRouteId,
    clearSelectedRoute,
  }
}

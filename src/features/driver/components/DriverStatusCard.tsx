import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'
import type { AuthenticatedSession } from '../../../types/domain'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import {
  REALTIME_ROUTE_SANITY_MAX_DISTANCE_METERS,
  evaluateBrowserSignalPlausibility,
  evaluateRealtimeSignalDispatch,
  formatElapsedSignalTime,
  getMinimumDistanceToRouteMeters,
} from '../../../lib/trackingSignal'
import {
  useBrowserLocationTracking,
  type BrowserLocationReading,
} from '../hooks/useBrowserLocationTracking'
import { DriverRouteMap } from './DriverRouteMap'
import {
  DriverPanelEmptyState,
  DriverRouteChangeModal,
  DriverRouteInfoModal,
} from './DriverStatusModals'
import { DriverStatusSummary } from './DriverStatusSummary'
import {
  getErrorMessage,
  getTrackingRejectionMessage,
  readStoredAutoSharePreference,
  writeStoredAutoSharePreference,
} from './driverStatusCardUtils'

export function DriverStatusCard({
  session,
  onLogout,
}: {
  session: AuthenticatedSession
  onLogout: () => void
}) {
  const currentTimeMs = useCurrentTime(15_000)
  const {
    permissionState,
    trackingStatus,
    trackingError,
    lastBrowserPosition,
    requestPermission,
    startTracking,
    stopTracking,
  } = useBrowserLocationTracking()

  const logout = useMutation(api.auth.logout)
  const activateService = useMutation(api.driver.activateService)
  const pauseCurrentService = useMutation(api.driver.pauseCurrentService)
  const resumeCurrentService = useMutation(api.driver.resumeCurrentService)
  const finishCurrentService = useMutation(api.driver.finishCurrentService)
  const addLocationUpdate = useMutation(api.driver.addLocationUpdate)
  const changeAssignedRoute = useMutation(api.driver.changeAssignedRoute)
  const panelState = useQuery(api.driver.getPanelState, {
    sessionToken: session.token,
  })

  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [pendingRouteId, setPendingRouteId] = useState('')
  const [isRouteChangeOpen, setRouteChangeOpen] = useState(false)
  const [isRouteInfoOpen, setRouteInfoOpen] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [shouldAutoResumeShare, setShouldAutoResumeShare] = useState(() =>
    readStoredAutoSharePreference(session.user.id),
  )

  const lastSentSignalRef = useRef<{
    recordedAt: string | null
    position: { lat: number; lng: number } | null
  }>({
    recordedAt: null,
    position: null,
  })

  const currentService = panelState?.currentService ?? null
  const showManualFallback = currentService?.status === 'active'
  const hasAssignedVehicle = Boolean(panelState?.vehicle)
  const isRealtimeBusy =
    trackingStatus === 'requesting_permission' ||
    trackingStatus === 'waiting_first_signal'
  const isRealtimeActive =
    trackingStatus === 'first_signal_received' || trackingStatus === 'tracking'
  const isShareRunning = isRealtimeBusy || isRealtimeActive
  const timeSinceLastSignal = formatElapsedSignalTime(
    currentService?.lastLocationUpdateAt ?? null,
    currentTimeMs,
  )

  useEffect(() => {
    if (!panelState) {
      return
    }

    const nextRouteId =
      currentService?.routeId ??
      panelState.preferredRouteId ??
      panelState.vehicle?.defaultRouteId ??
      panelState.availableRoutes[0]?.id ??
      ''

    if (nextRouteId) {
      setSelectedRouteId((currentValue) => currentValue || nextRouteId)
      setPendingRouteId((currentValue) => currentValue || nextRouteId)
    }
  }, [currentService?.routeId, panelState])

  const selectedRoute = useMemo(
    () =>
      panelState?.availableRoutes.find((route) => route.id === selectedRouteId) ?? null,
    [panelState?.availableRoutes, selectedRouteId],
  )
  const routeInView = useMemo(
    () =>
      panelState?.availableRoutes.find(
        (route) => route.id === (currentService?.routeId ?? selectedRouteId),
      ) ?? selectedRoute,
    [currentService?.routeId, panelState?.availableRoutes, selectedRoute, selectedRouteId],
  )

  const suggestedPoint = useMemo(() => {
    if (
      currentService?.lastPosition &&
      routeInView &&
      (() => {
        const distanceToRouteMeters = getMinimumDistanceToRouteMeters(
          currentService.lastPosition,
          routeInView.segments,
        )

        return (
          distanceToRouteMeters === null ||
          distanceToRouteMeters <= REALTIME_ROUTE_SANITY_MAX_DISTANCE_METERS
        )
      })()
    ) {
      return currentService.lastPosition
    }

    return routeInView?.segments[0]?.[0] ?? null
  }, [currentService?.lastPosition, routeInView])

  useEffect(() => {
    if (!suggestedPoint) {
      return
    }

    setManualLat((currentValue) => currentValue || suggestedPoint.lat.toFixed(6))
    setManualLng((currentValue) => currentValue || suggestedPoint.lng.toFixed(6))
  }, [suggestedPoint])

  useEffect(() => {
    lastSentSignalRef.current = {
      recordedAt:
        currentService?.lastLocationSource === 'device'
          ? (currentService.lastLocationUpdateAt ?? null)
          : null,
      position:
        currentService?.lastLocationSource === 'device'
          ? (currentService.lastPosition ?? null)
          : null,
    }
  }, [
    currentService?.lastLocationSource,
    currentService?.lastLocationUpdateAt,
    currentService?.lastPosition,
  ])

  useEffect(() => {
    writeStoredAutoSharePreference(session.user.id, shouldAutoResumeShare)
  }, [session.user.id, shouldAutoResumeShare])

  useEffect(() => {
    if (!panelState) {
      return
    }

    if (currentService?.status === 'active') {
      return
    }

    stopTracking()

    if (shouldAutoResumeShare) {
      setShouldAutoResumeShare(false)
    }
  }, [currentService?.status, panelState, shouldAutoResumeShare, stopTracking])

  const sendLocationUpdate = useCallback(
    async (lat: number, lng: number, accuracyMeters?: number | null) => {
      const result = await addLocationUpdate({
        sessionToken: session.token,
        lat,
        lng,
        accuracyMeters: accuracyMeters ?? undefined,
      })

      lastSentSignalRef.current = {
        recordedAt: result.recordedAt,
        position: { lat, lng },
      }

      return result.recordedAt
    },
    [addLocationUpdate, session.token],
  )

  const sendTrackedLocationUpdate = useCallback(
    async (reading: BrowserLocationReading) => {
      if (!routeInView) {
        return {
          accepted: false,
          rejectionMessage: 'No hay una ruta activa para validar tu ubicacion.',
        }
      }

      const plausibility = evaluateBrowserSignalPlausibility({
        accuracyMeters: reading.accuracyMeters,
        nextPosition: reading.coordinates,
        routeSegments: routeInView.segments,
      })

      if (!plausibility.accepted) {
        return {
          accepted: false,
          rejectionMessage: getTrackingRejectionMessage(
            plausibility.reason ?? 'outside_route_zone',
          ),
        }
      }

      const dispatchDecision = evaluateRealtimeSignalDispatch({
        lastSentAt: lastSentSignalRef.current.recordedAt,
        lastSentPosition: lastSentSignalRef.current.position,
        nextPosition: reading.coordinates,
      })

      if (!dispatchDecision.shouldSend && dispatchDecision.reason) {
        return {
          accepted: false,
          shouldContinue: true,
        }
      }

      const recordedAt = await sendLocationUpdate(
        reading.coordinates.lat,
        reading.coordinates.lng,
        reading.accuracyMeters,
      )

      return {
        accepted: true,
        recordedAt,
      }
    },
    [routeInView, sendLocationUpdate],
  )

  useEffect(() => {
    if (
      !shouldAutoResumeShare ||
      permissionState !== 'granted' ||
      currentService?.status !== 'active' ||
      trackingStatus !== 'stopped'
    ) {
      return
    }

    setErrorMessage(null)
    startTracking(sendTrackedLocationUpdate)
  }, [
    currentService?.status,
    permissionState,
    sendTrackedLocationUpdate,
    shouldAutoResumeShare,
    startTracking,
    trackingStatus,
  ])

  if (!panelState) {
    return (
      <DriverPanelEmptyState
        title="Cargando tu panel"
        description="Estamos validando tu sesion, tu unidad y la ruta actual."
      />
    )
  }

  if (!hasAssignedVehicle) {
    return (
      <DriverPanelEmptyState
        title="Tu cuenta aun no tiene unidad asignada"
        description="Pide a administracion que te asigne una unidad para poder iniciar ruta."
      />
    )
  }

  if (panelState.availableRoutes.length === 0) {
    return (
      <DriverPanelEmptyState
        title="No hay rutas disponibles"
        description="Las rutas oficiales no estan activas en este momento."
      />
    )
  }

  const runAction = (runner: () => Promise<void>) => {
    setErrorMessage(null)
    setFeedbackMessage(null)

    void (async () => {
      setIsSubmitting(true)

      try {
        await runner()
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  const beginRealtimeShare = async () => {
    const hasPermission =
      permissionState === 'granted' ? true : await requestPermission()

    if (!hasPermission) {
      setFeedbackMessage('Autoriza tu ubicacion para empezar a compartir.')
      return
    }

    startTracking(sendTrackedLocationUpdate)
  }

  const handleStartRoute = () => {
    if (!selectedRoute) {
      setErrorMessage('No hay una ruta seleccionada para operar.')
      return
    }

    runAction(async () => {
      if (!currentService) {
        await activateService({
          sessionToken: session.token,
          routeId: selectedRoute.id as Id<'routes'>,
        })
        setFeedbackMessage(`Ruta iniciada en ${selectedRoute.name}.`)
      } else if (currentService.status === 'paused') {
        await resumeCurrentService({
          sessionToken: session.token,
        })
        setFeedbackMessage('Ruta reanudada.')
      } else {
        setFeedbackMessage('Tu ruta ya esta activa.')
      }

      setShouldAutoResumeShare(true)
      await beginRealtimeShare()
    })
  }

  const handlePauseRoute = () => {
    runAction(async () => {
      await pauseCurrentService({
        sessionToken: session.token,
      })
      stopTracking()
      setShouldAutoResumeShare(false)
      setFeedbackMessage('Ruta pausada.')
    })
  }

  const handleFinishRoute = () => {
    runAction(async () => {
      await finishCurrentService({
        sessionToken: session.token,
      })
      stopTracking()
      setShouldAutoResumeShare(false)
      setFeedbackMessage('Ruta finalizada.')
    })
  }

  const handleConfirmRouteChange = () => {
    if (!pendingRouteId) {
      return
    }

    runAction(async () => {
      const result = await changeAssignedRoute({
        sessionToken: session.token,
        routeId: pendingRouteId as Id<'routes'>,
      })
      setSelectedRouteId(result.routeId)
      setPendingRouteId(result.routeId)
      setRouteChangeOpen(false)
      setFeedbackMessage(`Ruta cambiada a ${result.routeName}.`)
    })
  }

  const handleSendManualLocation = () => {
    const lat = Number(manualLat)
    const lng = Number(manualLng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErrorMessage('Ingresa una latitud y longitud validas.')
      return
    }

    runAction(async () => {
      await sendLocationUpdate(lat, lng)
      setFeedbackMessage('Ubicacion enviada.')
    })
  }

  const handleLogout = () => {
    stopTracking()
    setShouldAutoResumeShare(false)
    setIsLoggingOut(true)

    void (async () => {
      try {
        await logout({ sessionToken: session.token })
      } finally {
        writeStoredAutoSharePreference(session.user.id, false)
        onLogout()
        setIsLoggingOut(false)
      }
    })()
  }

  const lastSignalLabel = currentService?.lastLocationUpdateAt
    ? timeSinceLastSignal
    : 'Sin senal aun'

  return (
    <>
      <section className="space-y-3">
        <DriverStatusSummary
          driverName={panelState.driver?.name ?? session.user.name}
          vehicle={panelState.vehicle}
          routeInView={routeInView}
          currentService={currentService}
          lastSignalLabel={lastSignalLabel}
          isLoggingOut={isLoggingOut}
          isSubmitting={isSubmitting}
          isShareRunning={isShareRunning}
          onLogout={handleLogout}
          onOpenRouteInfo={() => setRouteInfoOpen(true)}
          onOpenRouteChange={() => {
            setPendingRouteId(routeInView?.id ?? selectedRouteId)
            setRouteChangeOpen(true)
          }}
          onStartRoute={handleStartRoute}
          onPauseRoute={handlePauseRoute}
          onFinishRoute={handleFinishRoute}
        />

        <section className="panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
          <DriverRouteMap
            route={routeInView}
            livePosition={lastBrowserPosition}
            lastSharedPosition={currentService?.lastPosition ?? null}
          />

          {showManualFallback ? (
            <div className="mt-3 grid gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Latitud</span>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Longitud</span>
                <input
                  type="text"
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </label>
              <button
                type="button"
                onClick={handleSendManualLocation}
                disabled={isSubmitting || currentService?.status !== 'active'}
                className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Enviar
              </button>
            </div>
          ) : null}
        </section>

        {feedbackMessage ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedbackMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {trackingError ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {trackingError}
          </p>
        ) : null}
      </section>

      {isRouteChangeOpen ? (
        <DriverRouteChangeModal
          routes={panelState.availableRoutes}
          currentRouteId={routeInView?.id ?? selectedRouteId}
          pendingRouteId={pendingRouteId}
          onPendingRouteChange={setPendingRouteId}
          onClose={() => setRouteChangeOpen(false)}
          onConfirm={handleConfirmRouteChange}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {isRouteInfoOpen && routeInView ? (
        <DriverRouteInfoModal
          route={routeInView}
          onClose={() => setRouteInfoOpen(false)}
        />
      ) : null}
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConvexError } from 'convex/values'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { AuthenticatedSession } from '../../../types/domain'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import {
  evaluateRealtimeSignalDispatch,
  formatElapsedSignalTime,
} from '../../../lib/trackingSignal'
import {
  useBrowserLocationTracking,
  type BrowserLocationReading,
} from '../hooks/useBrowserLocationTracking'

const AUTO_SHARE_STORAGE_PREFIX = 'vabus.driver.autoShare.'

function formatDateTime(value?: string) {
  if (!value) {
    return 'Sin registro'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCoordinate(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(6) : value
}

function getErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return String(error.data)
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrio un error inesperado.'
}

function getPermissionLabel(permissionState: string) {
  switch (permissionState) {
    case 'granted':
      return 'Listo'
    case 'denied':
      return 'Bloqueado'
    case 'unsupported':
      return 'No disponible'
    default:
      return 'Pendiente'
  }
}

function getTrackingLabel(trackingStatus: string) {
  switch (trackingStatus) {
    case 'requesting_permission':
      return 'Solicitando permiso'
    case 'waiting_first_signal':
      return 'Buscando primera ubicacion'
    case 'first_signal_received':
    case 'tracking':
      return 'Compartiendo ubicacion'
    case 'signal_timeout':
      return 'Sin senal por ahora'
    case 'error':
      return 'Con incidencia'
    default:
      return 'Detenido'
  }
}

function getSharePreferenceKey(driverId: string) {
  return `${AUTO_SHARE_STORAGE_PREFIX}${driverId}`
}

function readStoredAutoSharePreference(driverId: string) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(getSharePreferenceKey(driverId)) === 'true'
}

function writeStoredAutoSharePreference(driverId: string, enabled: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  const storageKey = getSharePreferenceKey(driverId)

  if (enabled) {
    window.localStorage.setItem(storageKey, 'true')
    return
  }

  window.localStorage.removeItem(storageKey)
}

function getDispatchRuleLabel(reason: 'too_soon' | 'no_meaningful_change' | null) {
  switch (reason) {
    case 'too_soon':
      return 'La ubicacion se omitio por llegar demasiado pronto.'
    case 'no_meaningful_change':
      return 'La ubicacion se omitio porque el cambio fue minimo.'
    default:
      return 'La ubicacion se comparte cuando hay tiempo suficiente y movimiento real.'
  }
}

function DriverPanelEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="panel px-4 py-5 sm:px-6 sm:py-6">
      <p className="eyebrow">Conductor</p>
      <h2 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  )
}

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
    lastBrowserAt,
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
  const panelState = useQuery(api.driver.getPanelState, {
    sessionToken: session.token,
  })

  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [showManualFallback, setShowManualFallback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [shouldAutoResumeShare, setShouldAutoResumeShare] = useState(() =>
    readStoredAutoSharePreference(session.user.id),
  )
  const [lastRealtimeSkipReason, setLastRealtimeSkipReason] = useState<
    'too_soon' | 'no_meaningful_change' | null
  >(null)
  const lastSentSignalRef = useRef<{
    recordedAt: string | null
    position: { lat: number; lng: number } | null
  }>({
    recordedAt: null,
    position: null,
  })

  const currentService = panelState?.currentService ?? null
  const selectedRoute =
    panelState?.availableRoutes.find((route) => route.id === selectedRouteId) ?? null
  const suggestedPoint = useMemo(() => {
    if (!panelState) {
      return null
    }

    if (currentService?.lastPosition) {
      return currentService.lastPosition
    }

    const routeForSuggestion =
      panelState.availableRoutes.find((route) => route.id === selectedRouteId) ??
      panelState.availableRoutes.find(
        (route) => route.id === panelState.preferredRouteId,
      ) ??
      panelState.availableRoutes.find(
        (route) => route.id === panelState.vehicle?.defaultRouteId,
      ) ??
      panelState.availableRoutes[0]

    return routeForSuggestion?.segments[0]?.[0] ?? null
  }, [
    currentService?.lastPosition,
    panelState,
    selectedRouteId,
  ])

  const serviceStatus = currentService?.status ?? null
  const isRealtimeBusy =
    trackingStatus === 'requesting_permission' ||
    trackingStatus === 'waiting_first_signal'
  const isRealtimeActive =
    trackingStatus === 'first_signal_received' || trackingStatus === 'tracking'
  const isShareRunning = isRealtimeBusy || isRealtimeActive
  const hasAssignedVehicle = Boolean(panelState?.vehicle)
  const hasActiveService = serviceStatus === 'active'
  const isPausedService = serviceStatus === 'paused'
  const latestSignalAt = currentService?.lastLocationUpdateAt
  const timeSinceLastSignal = formatElapsedSignalTime(latestSignalAt ?? null, currentTimeMs)

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
    }
  }, [
    currentService?.routeId,
    panelState,
  ])

  useEffect(() => {
    if (!suggestedPoint) {
      return
    }

    setManualLat((currentValue) =>
      currentValue || suggestedPoint.lat.toFixed(6),
    )
    setManualLng((currentValue) =>
      currentValue || suggestedPoint.lng.toFixed(6),
    )
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
    async (lat: number, lng: number) => {
      const result = await addLocationUpdate({
        sessionToken: session.token,
        lat,
        lng,
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
      const dispatchDecision = evaluateRealtimeSignalDispatch({
        lastSentAt: lastSentSignalRef.current.recordedAt,
        lastSentPosition: lastSentSignalRef.current.position,
        nextPosition: reading.coordinates,
      })

      if (!dispatchDecision.shouldSend) {
        setLastRealtimeSkipReason(dispatchDecision.reason ?? null)
        return {
          accepted: false,
          rejectionMessage: getDispatchRuleLabel(dispatchDecision.reason ?? null),
        }
      }

      setLastRealtimeSkipReason(null)
      const recordedAt = await sendLocationUpdate(
        reading.coordinates.lat,
        reading.coordinates.lng,
      )

      return {
        accepted: true,
        recordedAt,
      }
    },
    [sendLocationUpdate],
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
    setLastRealtimeSkipReason(null)
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
        description="Estamos validando tu sesion, tu unidad y el estado actual del servicio."
      />
    )
  }

  if (!hasAssignedVehicle) {
    return (
      <DriverPanelEmptyState
        title="Tu cuenta aun no tiene unidad asignada"
        description="Entra con tu usuario y pide a administracion que te asigne una unidad para poder iniciar servicio."
      />
    )
  }

  if (panelState.availableRoutes.length === 0) {
    return (
      <DriverPanelEmptyState
        title="No hay rutas disponibles"
        description="Las rutas oficiales no estan activas en este momento. Revisa la configuracion desde administracion."
      />
    )
  }

  const runMutation = (runner: () => Promise<void>) => {
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
      setFeedbackMessage(
        'Tu servicio quedo listo. Autoriza la ubicacion para empezar a compartir en tiempo real.',
      )
      return
    }

    setErrorMessage(null)
    setLastRealtimeSkipReason(null)
    startTracking(sendTrackedLocationUpdate)
  }

  const handlePrimaryAction = () => {
    if (!selectedRoute) {
      setErrorMessage('Selecciona la ruta que vas a operar.')
      return
    }

    if (isShareRunning) {
      stopTracking()
      setShouldAutoResumeShare(false)
      setLastRealtimeSkipReason(null)
      setFeedbackMessage('Se detuvo el envio en tiempo real. Tu servicio sigue abierto.')
      return
    }

    runMutation(async () => {
      if (!currentService) {
        await activateService({
          sessionToken: session.token,
          routeId: selectedRoute.id as Id<'routes'>,
        })
        setFeedbackMessage(`Servicio iniciado en ${selectedRoute.name}.`)
      } else if (currentService.status === 'paused') {
        await resumeCurrentService({
          sessionToken: session.token,
        })
        setFeedbackMessage('Servicio reanudado.')
      }

      setShouldAutoResumeShare(true)
      await beginRealtimeShare()
    })
  }

  const handlePauseService = () => {
    stopTracking()
    setShouldAutoResumeShare(false)
    setLastRealtimeSkipReason(null)

    runMutation(async () => {
      await pauseCurrentService({
        sessionToken: session.token,
      })
      setFeedbackMessage('Servicio pausado.')
    })
  }

  const handleFinishService = () => {
    stopTracking()
    setShouldAutoResumeShare(false)
    setLastRealtimeSkipReason(null)

    runMutation(async () => {
      await finishCurrentService({
        sessionToken: session.token,
      })
      setFeedbackMessage('Servicio finalizado.')
    })
  }

  const handleSendManualLocation = () => {
    const lat = Number(manualLat)
    const lng = Number(manualLng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErrorMessage('Ingresa una latitud y longitud validas.')
      return
    }

    runMutation(async () => {
      await sendLocationUpdate(lat, lng)
      setFeedbackMessage(
        `Ubicacion enviada: ${formatCoordinate(manualLat)}, ${formatCoordinate(manualLng)}.`,
      )
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

  const primaryButtonLabel = isShareRunning
    ? 'Detener envio en tiempo real'
    : isPausedService
    ? 'Reanudar y compartir ubicacion'
    : hasActiveService
    ? 'Compartir ubicacion'
    : 'Iniciar y compartir ubicacion'

  return (
    <section className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <p className="eyebrow">Conductor</p>
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-slate-900 sm:text-3xl">
                {panelState.driver?.name ?? session.user.name}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Unidad asignada: {panelState.vehicle?.unitNumber} -{' '}
                {panelState.vehicle?.label}
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Ruta</span>
              <select
                value={selectedRouteId}
                onChange={(event) => setSelectedRouteId(event.target.value)}
                disabled={Boolean(currentService)}
                className="mt-2 min-h-12 w-full rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                {panelState.availableRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} - {route.direction}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Servicio
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {currentService
                    ? currentService.status === 'active'
                      ? 'En marcha'
                      : 'Pausado'
                    : 'Sin iniciar'}
                </p>
              </article>

              <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Ubicacion
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {getTrackingLabel(trackingStatus)}
                </p>
              </article>

              <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Permiso
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {getPermissionLabel(permissionState)}
                </p>
              </article>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isSubmitting || isLoggingOut}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Procesando...' : primaryButtonLabel}
              </button>

              {currentService ? (
                <button
                  type="button"
                  onClick={handlePauseService}
                  disabled={isSubmitting || currentService.status !== 'active'}
                  className="flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Pausar servicio
                </button>
              ) : null}

              {currentService ? (
                <button
                  type="button"
                  onClick={handleFinishService}
                  disabled={isSubmitting}
                  className="flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Finalizar
                </button>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(237,249,245,0.98),rgba(248,244,234,0.95))] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              Estado actual
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>
                Ruta activa:{' '}
                <span className="font-semibold text-slate-900">
                  {currentService?.routeName ?? selectedRoute?.name ?? 'Sin ruta'}
                </span>
              </p>
              <p>
                Ultima senal:{' '}
                <span className="font-semibold text-slate-900">
                  {formatDateTime(latestSignalAt)}
                </span>
              </p>
              <p>
                Tiempo desde la ultima senal:{' '}
                <span className="font-semibold text-slate-900">
                  {timeSinceLastSignal}
                </span>
              </p>
              {lastBrowserAt ? (
                <p>
                  Ultima lectura del telefono:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(lastBrowserAt)}
                  </span>
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowManualFallback((currentValue) => !currentValue)}
              className="mt-5 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
            >
              {showManualFallback
                ? 'Ocultar envio manual'
                : 'Abrir envio manual si el GPS falla'}
            </button>

            {showManualFallback ? (
              <div className="mt-4 space-y-3 rounded-[1.4rem] bg-white/80 p-4">
                <input
                  type="text"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  placeholder="Latitud"
                  className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <input
                  type="text"
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  placeholder="Longitud"
                  className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={handleSendManualLocation}
                  disabled={isSubmitting || currentService?.status !== 'active'}
                  className="flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Enviar ubicacion manual
                </button>
                {suggestedPoint ? (
                  <p className="text-sm text-slate-600">
                    Punto sugerido: {suggestedPoint.lat.toFixed(6)},{' '}
                    {suggestedPoint.lng.toFixed(6)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {lastBrowserPosition ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Ultima lectura del telefono: {lastBrowserPosition.lat.toFixed(6)},{' '}
          {lastBrowserPosition.lng.toFixed(6)}
        </p>
      ) : null}

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

      {lastRealtimeSkipReason ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {getDispatchRuleLabel(lastRealtimeSkipReason)}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
        </button>
      </div>
    </section>
  )
}

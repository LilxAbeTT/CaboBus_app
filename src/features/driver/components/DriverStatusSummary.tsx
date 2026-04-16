import type { BusRoute, DriverPanelCurrentService, Vehicle } from '../../../types/domain'
import { formatDateTime, getTransportTypeLabel } from './driverStatusCardUtils'

export function DriverStatusSummary({
  driverName,
  vehicle,
  routeInView,
  currentService,
  lastSignalLabel,
  trackingModeLabel,
  backgroundSupportLabel,
  isLoggingOut,
  isSubmitting,
  isShareRunning,
  onLogout,
  onOpenRouteInfo,
  onOpenRouteChange,
  onStartRoute,
  onPauseRoute,
  onFinishRoute,
}: {
  driverName: string
  vehicle: Vehicle | null
  routeInView: BusRoute | null
  currentService: DriverPanelCurrentService | null
  lastSignalLabel: string
  trackingModeLabel: string
  backgroundSupportLabel: string
  isLoggingOut: boolean
  isSubmitting: boolean
  isShareRunning: boolean
  onLogout: () => void
  onOpenRouteInfo: () => void
  onOpenRouteChange: () => void
  onStartRoute: () => void
  onPauseRoute: () => void
  onFinishRoute: () => void
}) {
  return (
    <section className="panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Conductor</p>
            <h2 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">
              {driverName}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {vehicle?.unitNumber} - {vehicle?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isLoggingOut ? 'Cerrando...' : 'Salir'}
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.14),_transparent_48%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(243,248,255,0.95))] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {routeInView ? (
                  <>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {getTransportTypeLabel(routeInView.transportType)}
                    </span>
                    <span
                      className="h-2.5 w-14 rounded-full"
                      style={{ backgroundColor: routeInView.color }}
                    />
                  </>
                ) : null}
              </div>
              <h3 className="mt-3 truncate font-display text-2xl text-slate-900">
                {routeInView?.name ?? 'Sin ruta asignada'}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenRouteInfo}
                disabled={!routeInView}
                className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Info
              </button>
              <button
                type="button"
                onClick={onOpenRouteChange}
                className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                Cambiar
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStartRoute}
            disabled={
              isSubmitting ||
              isLoggingOut ||
              (currentService?.status === 'active' && isShareRunning)
            }
            className="min-h-11 flex-1 rounded-full bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Iniciar ruta
          </button>
          <button
            type="button"
            onClick={onPauseRoute}
            disabled={isSubmitting || currentService?.status !== 'active'}
            className="min-h-11 flex-1 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Pausar ruta
          </button>
          <button
            type="button"
            onClick={onFinishRoute}
            disabled={isSubmitting || !currentService}
            className="min-h-11 flex-1 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Terminar ruta
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {trackingModeLabel}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-800">
            {backgroundSupportLabel}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Ultima senal: {lastSignalLabel}
          </span>
          {currentService?.lastLocationUpdateAt ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {formatDateTime(currentService.lastLocationUpdateAt)}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

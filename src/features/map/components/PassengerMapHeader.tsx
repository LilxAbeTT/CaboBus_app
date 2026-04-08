import { Link } from 'react-router'
import type { PassengerRouteDistanceEntry } from './passengerMapViewUtils'

export function PassengerMapHeader({
  recommendedRoute,
  onOpenRoutes,
  onFocusRecommended,
}: {
  recommendedRoute: PassengerRouteDistanceEntry | null
  onOpenRoutes: () => void
  onFocusRecommended: () => void
}) {
  return (
    <header className="panel px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 transition hover:border-teal-300"
          aria-label="Volver al inicio"
        >
          <img
            src="/logo.png"
            alt="VaBus"
            className="h-12 w-16 object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenRoutes}
            className="flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Rutas
          </button>
          <button
            type="button"
            onClick={onFocusRecommended}
            disabled={!recommendedRoute}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            Cerca
          </button>
          <Link
            to="/"
            className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Regresar
          </Link>
        </div>
      </div>
    </header>
  )
}

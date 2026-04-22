import { memo } from 'react'
import type { BusRoute } from '../../../types/domain'

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export const PassengerMapSelectionSummary = memo(function PassengerMapSelectionSummary({
  selectedRoute,
  onOpenRoutes,
}: {
  selectedRoute: BusRoute | null
  onOpenRoutes: () => void
}) {
  if (!selectedRoute) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-2 z-10 flex justify-center sm:bottom-3">
      <button
        type="button"
        onClick={onOpenRoutes}
        className="pointer-events-auto max-w-[min(92vw,30rem)] rounded-full border border-white/80 bg-white/94 px-4 py-2 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.7)] backdrop-blur transition hover:border-slate-200 hover:bg-white"
        aria-label={`Cambiar ruta desde ${selectedRoute.name}`}
        title="Cambiar ruta"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-10 shrink-0 rounded-full"
            style={{ backgroundColor: selectedRoute.color }}
          />
          <p className="truncate text-sm font-semibold text-slate-900">
            {selectedRoute.name}
          </p>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ChevronDownIcon />
          </span>
        </div>
      </button>
    </div>
  )
})

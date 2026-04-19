import { memo } from 'react'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import { getOperationalStatusLabel } from '../../../lib/trackingSignal'
import type { BusRoute } from '../../../types/domain'
import {
  formatDistanceRange,
  formatLastUpdate,
  formatRelativeLastUpdate,
  getSignalBadgeClass,
  type PassengerMapVehicleView,
} from './passengerMapViewUtils'

const PASSENGER_MAP_RELATIVE_TIME_INTERVAL_MS = 30_000

export const PassengerMapSelectionSummary = memo(function PassengerMapSelectionSummary({
  selectedRoute,
  selectedRouteDistanceMeters,
  selectedVehicle,
  hasGeneralViewAction,
  onFocusVehicle,
  onResetView,
}: {
  selectedRoute: BusRoute | null
  selectedRouteDistanceMeters: number | null
  selectedVehicle: PassengerMapVehicleView | null
  hasGeneralViewAction: boolean
  onFocusVehicle: (vehicleId: string) => void
  onResetView: () => void
}) {
  const currentTimeMs = useCurrentTime(PASSENGER_MAP_RELATIVE_TIME_INTERVAL_MS)

  if (!selectedRoute && !selectedVehicle) {
    return null
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3">
      <div className="pointer-events-auto rounded-[1.3rem] bg-white/94 px-4 py-3 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.6)] backdrop-blur">
        {selectedRoute ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-2.5 w-12 rounded-full"
              style={{ backgroundColor: selectedRoute.color }}
            />
            <p className="font-semibold text-slate-900">{selectedRoute.name}</p>
            {selectedRouteDistanceMeters !== null ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {selectedRouteDistanceMeters <= 600
                  ? 'Cerca de ti'
                  : formatDistanceRange(selectedRouteDistanceMeters)}
              </span>
            ) : null}
          </div>
        ) : null}

        {selectedVehicle ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{selectedVehicle.unitNumber}</span>
              <span>{formatRelativeLastUpdate(selectedVehicle.lastUpdate, currentTimeMs)}</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSignalBadgeClass(
                  selectedVehicle.operationalStatus,
                )}`}
              >
                {getOperationalStatusLabel(selectedVehicle.operationalStatus)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onFocusVehicle(selectedVehicle.id)}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Ver unidad
              </button>
              {hasGeneralViewAction ? (
                <button
                  type="button"
                  onClick={onResetView}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                >
                  Vista general
                </button>
              ) : null}
              <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                Ultima senal: {formatLastUpdate(selectedVehicle.lastUpdate)}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
})

import { memo } from 'react'
import { Link } from 'react-router'
import type { BusRoute } from '../../../types/domain'

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export const PassengerMapHeader = memo(function PassengerMapHeader({
  onOpenRoutes,
}: {
  routeCount?: number
  referencePointCount?: number
  isRouteFocused?: boolean
  personalRoutes?: BusRoute[]
  onOpenRoutes: () => void
  onOpenPersonalRoute?: (routeId: string) => void
}) {
  return (
    <header className="absolute left-4 right-4 top-4 z-[1400] flex items-center gap-3">
      <Link
        to="/"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-[0_8px_16px_-6px_rgba(15,23,42,0.15)] backdrop-blur transition hover:bg-white text-slate-700"
        aria-label="Volver al menú principal"
      >
        <MenuIcon />
      </Link>

      <button
        type="button"
        onClick={onOpenRoutes}
        className="flex h-12 flex-1 items-center gap-3 rounded-full bg-white/90 px-4 shadow-[0_8px_16px_-6px_rgba(15,23,42,0.15)] backdrop-blur transition hover:bg-white"
        aria-label="Buscar ruta o destino"
      >
        <SearchIcon />
        <span className="text-base font-medium text-slate-500">¿A dónde vas?</span>
      </button>
    </header>
  )
})
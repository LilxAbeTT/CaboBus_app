import { useEffect, useMemo } from 'react'
import { Link, Navigate } from 'react-router'
import { usePassengerMapSnapshot } from '../features/map/hooks/usePassengerMapSnapshot'
import { convexUrl } from '../lib/env'
import { isNativeApp } from '../lib/platform'
import { getMapRuntimePerformanceProfile, prefersLiteMobileUi } from '../lib/runtimePerformance'
import { preloadPassengerMapAssets, preloadPassengerMapPage } from './pageLoaders'
import type { BusRoute, PassengerMapSnapshot } from '../types/domain'

function preloadPassengerMapRoute() {
  preloadPassengerMapAssets()
}

function preloadPassengerMapRouteOnTouch() {
  preloadPassengerMapPage()
}

const passengerAccess = {
  href: '/passenger-map',
  actionLabel: 'Abrir mapa',
  description:
    'Consulta rutas reales de San Jose del Cabo, encuentra referencias del trayecto y revisa unidades activas cuando esten transmitiendo senal.',
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M6.8 4.75h10.4a3 3 0 0 1 3 3v6.7a2.55 2.55 0 0 1-2.55 2.55h-.75a1.9 1.9 0 0 1-3.8 0h-2.2a1.9 1.9 0 0 1-3.8 0h-.75a2.55 2.55 0 0 1-2.55-2.55v-6.7a3 3 0 0 1 3-3Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M6.8 4.75h10.4a3 3 0 0 1 3 3v6.7a2.55 2.55 0 0 1-2.55 2.55h-.75a1.9 1.9 0 0 1-3.8 0h-2.2a1.9 1.9 0 0 1-3.8 0h-.75a2.55 2.55 0 0 1-2.55-2.55v-6.7a3 3 0 0 1 3-3Zm.2 4.3h10M8 12.25h1m6 0h1M8.2 17a.4.4 0 1 0 0 .8a.4.4 0 0 0 0-.8Zm7.6 0a.4.4 0 1 0 0 .8a.4.4 0 0 0 0-.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.14" />
      <path
        d="m14.95 8.6-1.7 4.65-4.65 1.7 1.7-4.65 4.65-1.7Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="m4.75 6.75 4.75-2 5 2 4.75-2v12.5l-4.75 2-5-2-4.75 2V6.75Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="m4.75 6.75 4.75-2 5 2 4.75-2v12.5l-4.75 2-5-2-4.75 2V6.75Zm4.75-2v12.5m5-10.5v12.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M7.5 17.5c4.6 0 2.9-11 8.8-11a3.2 3.2 0 1 1 0 6.4H7.8a3 3 0 1 0 0 6h8.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 17.5a8 8 0 0 1 16 0M7.5 17.5a4.5 4.5 0 0 1 9 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="17.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

function getTransportTypeLabel(transportType: BusRoute['transportType']) {
  return transportType === 'colectivo' ? 'Colectivo' : 'Urbano'
}

function getRouteReferenceLabel(route: BusRoute) {
  const landmarks = route.passengerInfo.landmarks.slice(0, 2)

  if (landmarks.length === 0) {
    return route.direction || 'Trayecto disponible'
  }

  return landmarks.join(' / ')
}

function scrollToAboutSection() {
  document.getElementById('home-about-cabobus')?.scrollIntoView({
    behavior: prefersLiteMobileUi() ? 'auto' : 'smooth',
    block: 'start',
  })
}

type HomeRouteEntry = {
  route: BusRoute
  referencePointCount: number
}

function buildHomeRouteEntries(routes: BusRoute[]) {
  return routes
    .map((route) => {
      return {
        route,
        referencePointCount: route.passengerInfo.landmarks.length,
      } satisfies HomeRouteEntry
    })
    .sort((left, right) => {
      if (right.referencePointCount !== left.referencePointCount) {
        return right.referencePointCount - left.referencePointCount
      }

      return left.route.name.localeCompare(right.route.name, 'es')
    })
}

function HomeRoutesFallback() {
  return (
    <section className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white/92 p-3 shadow-[0_14px_28px_-24px_rgba(15,35,54,0.3)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-teal-700">
          Mapa publico
        </p>
        <Link
          to={passengerAccess.href}
          onMouseEnter={preloadPassengerMapRoute}
          onFocus={preloadPassengerMapRoute}
          onTouchStart={preloadPassengerMapRouteOnTouch}
          className="inline-flex min-h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[0.72rem] font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Ver rutas
        </Link>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Abre el mapa para consultar rutas y referencias de San Jose del Cabo.
      </p>
    </section>
  )
}

function HomeRouteStrip({ snapshot }: { snapshot: PassengerMapSnapshot | undefined }) {
  const routeEntries = useMemo(
    () => (snapshot ? buildHomeRouteEntries(snapshot.routes).slice(0, 10) : []),
    [snapshot],
  )

  if (snapshot === undefined) {
    return (
      <section className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white/92 p-3 shadow-[0_14px_28px_-24px_rgba(15,35,54,0.3)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-teal-700">
            Rutas disponibles
          </p>
          <div className="mobile-perf-pulse h-6 w-16 animate-pulse rounded-full bg-slate-200/80" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="mobile-perf-pulse h-16 min-w-[10rem] animate-pulse rounded-[1rem] bg-slate-200/75"
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white/92 p-3 shadow-[0_14px_28px_-24px_rgba(15,35,54,0.3)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-teal-700">
          Rutas disponibles
        </p>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[0.64rem] font-semibold text-white">
          {snapshot.routes.length} trayectos
        </span>
      </div>

      <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
        {routeEntries.map((entry) => (
          <Link
            key={entry.route.id}
            to={`/passenger-map?route=${encodeURIComponent(entry.route.id)}`}
            onMouseEnter={preloadPassengerMapRoute}
            onFocus={preloadPassengerMapRoute}
            onTouchStart={preloadPassengerMapRouteOnTouch}
            className="home-card group min-w-[10.25rem] snap-start rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_12px_20px_-22px_rgba(15,35,54,0.34)] transition hover:-translate-y-0.5 hover:border-teal-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-900"
                style={{
                  backgroundColor: `${entry.route.color}22`,
                  color: entry.route.color,
                }}
              >
                <RouteIcon />
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-slate-700">
                {getTransportTypeLabel(entry.route.transportType)}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[0.88rem] font-semibold leading-5 text-slate-900">
              {entry.route.name}
            </p>

            <p className="mt-1.5 line-clamp-2 text-[0.68rem] font-semibold leading-5 text-slate-500">
              {getRouteReferenceLabel(entry.route)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function HomePassengerOverview() {
  const snapshot = usePassengerMapSnapshot()
  const activeVehicleCount = snapshot?.activeVehicles.length ?? 0
  const routeCount = snapshot?.routes.length

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Rutas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {routeCount ?? '--'}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Senales
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {activeVehicleCount}
          </p>
        </div>
        <div className="col-span-2 rounded-[1.1rem] border border-teal-100 bg-teal-50 px-3 py-3 text-teal-900 sm:col-span-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-teal-700">
            Acceso
          </p>
          <p className="mt-1 text-sm font-semibold leading-5">Sin registro para consultar</p>
        </div>
      </div>

      <HomeRouteStrip snapshot={snapshot} />
    </div>
  )
}

function HomeConnectedPassengerOverview() {
  if (!convexUrl) {
    return <HomeRoutesFallback />
  }

  return <HomePassengerOverview />
}

function HomeMapPreview() {
  return (
    <div className="relative min-h-[20rem] overflow-hidden rounded-[1.8rem] border border-slate-200 bg-[#dcefdc] shadow-[0_28px_44px_-34px_rgba(15,35,54,0.5)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[length:3.8rem_3.8rem]" />
      <div className="absolute left-[7%] top-[16%] h-[34rem] w-12 -rotate-[34deg] rounded-full border-[1.35rem] border-white/78" />
      <div className="absolute left-[30%] top-[-8%] h-[35rem] w-12 rotate-[18deg] rounded-full border-[1.2rem] border-white/72" />
      <div className="absolute right-[8%] top-[6%] h-[32rem] w-12 rotate-[46deg] rounded-full border-[1.15rem] border-white/70" />
      <div className="absolute left-[12%] right-[16%] top-[48%] h-3 rotate-[-8deg] rounded-full bg-teal-500 shadow-[0_0_0_5px_rgba(20,184,166,0.18)]" />
      <div className="absolute left-[20%] right-[22%] top-[64%] h-3 rotate-[15deg] rounded-full bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.18)]" />
      <div className="absolute left-[38%] right-[12%] top-[31%] h-3 rotate-[30deg] rounded-full bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.16)]" />
      <div className="absolute left-[16%] top-[44%] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]">
        <MapIcon />
        Centro
      </div>
      <div className="absolute right-[11%] top-[24%] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]">
        <BusIcon />
        Unidad activa
      </div>
      <div className="absolute bottom-4 left-4 right-4 rounded-[1.2rem] border border-white/80 bg-white/90 p-3 shadow-[0_18px_34px_-24px_rgba(15,35,54,0.45)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-teal-700">
          Vista de pasajero
        </p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">
          Rutas, referencias y unidades activas en un solo mapa.
        </p>
      </div>
    </div>
  )
}

function HomeAboutSection() {
  return (
    <section
      id="home-about-cabobus"
      className="min-w-0 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_22px_42px_-34px_rgba(15,35,54,0.45)] sm:p-6"
    >
      <div className="max-w-3xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-700">
          Que es CaboBus
        </p>
        <h2 className="mt-2 font-display text-2xl leading-8 text-slate-900 sm:text-3xl">
          Una guia sencilla para moverte en San Jose del Cabo
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          CaboBus agrega una capa digital sobre las rutas existentes. No necesitas crear una
          cuenta: abre el mapa, revisa los recorridos disponibles y usa las referencias visuales
          para decidir que ruta consultar.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-700">
            <MapIcon />
          </span>
          <p className="mt-3 font-semibold text-slate-900">Abre el mapa</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Entra directo a la vista publica desde cualquier celular.
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700">
            <RouteIcon />
          </span>
          <p className="mt-3 font-semibold text-slate-900">Elige una ruta</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Filtra por trayecto y enfoca el recorrido para leerlo mejor.
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-700">
            <SignalIcon />
          </span>
          <p className="mt-3 font-semibold text-slate-900">Revisa actividad</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Las unidades aparecen cuando hay una senal reciente disponible.
          </p>
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const performanceProfile = getMapRuntimePerformanceProfile()

    if (!performanceProfile.shouldAutoPreloadHeavyMapAssets) {
      const idleCallbackId =
        typeof window.requestIdleCallback === 'function'
          ? window.requestIdleCallback(() => {
              preloadPassengerMapPage()
            }, { timeout: 2500 })
          : null
      const timeoutId =
        idleCallbackId === null
          ? window.setTimeout(() => {
              preloadPassengerMapPage()
            }, 1800)
          : null

      return () => {
        if (idleCallbackId !== null) {
          window.cancelIdleCallback(idleCallbackId)
        }
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      preloadPassengerMapRoute()
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [])

  if (isNativeApp) {
    return <Navigate to="/driver/login" replace />
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-3 pb-5 pt-2 sm:px-5 sm:pb-8 sm:pt-4">
      <div className="overflow-hidden rounded-[2rem] border border-white/85 bg-[linear-gradient(180deg,#fffaf0_0%,#f8fbfd_46%,#eef7f4_100%)] shadow-[0_30px_70px_-46px_rgba(15,35,54,0.55)]">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-amber-400" />

        <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.82fr)] lg:items-center lg:px-7 lg:py-7">
          <div>
            <div className="flex items-center justify-between gap-3">
              <img
                src="/logo.png"
                alt="CaboBus"
                className="h-14 w-28 shrink-0 object-contain sm:h-16 sm:w-32"
              />
              <button
                type="button"
                onClick={scrollToAboutSection}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[0.72rem] font-semibold text-slate-700 shadow-[0_12px_20px_-24px_rgba(15,23,42,0.45)] transition hover:border-teal-300 hover:text-teal-700"
              >
                <CompassIcon />
                Que es
              </button>
            </div>

            <div className="mt-5 max-w-2xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-teal-700">
                Mapa publico de rutas
              </p>
              <h1 className="mt-3 font-display text-[2.75rem] leading-[0.96] text-slate-950 sm:text-[4.2rem]">
                Encuentra tu ruta en CaboBus
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                {passengerAccess.description}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to={passengerAccess.href}
                onMouseEnter={preloadPassengerMapRoute}
                onFocus={preloadPassengerMapRoute}
                onTouchStart={preloadPassengerMapRouteOnTouch}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_-24px_rgba(15,23,42,0.75)] transition hover:bg-teal-700"
              >
                {passengerAccess.actionLabel}
                <ArrowIcon />
              </Link>
              <Link
                to="/passenger-map"
                onMouseEnter={preloadPassengerMapRoute}
                onFocus={preloadPassengerMapRoute}
                onTouchStart={preloadPassengerMapRouteOnTouch}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-teal-300 hover:text-teal-700"
              >
                Explorar rutas
                <MapIcon />
              </Link>
            </div>
          </div>

          <HomeMapPreview />
        </div>

        <div className="grid min-w-0 gap-4 px-4 pb-5 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1fr)] lg:px-7 lg:pb-7">
          <HomeConnectedPassengerOverview />
          <HomeAboutSection />
        </div>
      </div>
    </section>
  )
}

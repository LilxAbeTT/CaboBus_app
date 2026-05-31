import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { usePassengerMapSnapshot } from '../features/map/hooks/usePassengerMapSnapshot'
import { usePassengerGeolocation } from '../features/map/hooks/usePassengerGeolocation'
import { getMinimumDistanceToRouteMeters } from '../lib/trackingSignal'
import { convexUrl } from '../lib/env'
import { isNativeApp } from '../lib/platform'
import { getMapRuntimePerformanceProfile } from '../lib/runtimePerformance'
import { preloadPassengerMapAssets, preloadPassengerMapPage } from './pageLoaders'
import type { BusRoute, PassengerMapSnapshot } from '../types/domain'

function preloadPassengerMapRoute() {
  preloadPassengerMapAssets()
}

function preloadPassengerMapRouteOnTouch() {
  preloadPassengerMapPage()
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="m4.75 6.75 4.75-2 5 2 4.75-2v12.5l-4.75 2-5-2-4.75 2V6.75Z" fill="currentColor" opacity="0.14" />
      <path d="m4.75 6.75 4.75-2 5 2 4.75-2v12.5l-4.75 2-5-2-4.75 2V6.75Zm4.75-2v12.5m5-10.5v12.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}



function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}


function getRouteReferenceLabel(route: BusRoute) {
  const landmarks = route.passengerInfo.landmarks.slice(0, 2)
  if (landmarks.length === 0) {
    return route.direction || 'Trayecto disponible'
  }
  return landmarks.join(' / ')
}

function formatDistance(meters: number | null) {
  if (meters === null) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function HomeRouteList({ snapshot }: { snapshot: PassengerMapSnapshot | undefined }) {
  const { position, permissionState, isRequestingPermission, requestPermission } = usePassengerGeolocation()

  const routeEntries = useMemo(() => {
    if (!snapshot) return []
    
    const entries = snapshot.routes.map((route) => {
      const distanceMeters = position 
        ? getMinimumDistanceToRouteMeters(position, route.segments) 
        : null
      return {
        route,
        referencePointCount: route.passengerInfo.landmarks.length,
        distanceMeters
      }
    })

    if (position) {
      entries.sort((a, b) => {
        if (a.distanceMeters !== null && b.distanceMeters !== null) {
          return a.distanceMeters - b.distanceMeters
        }
        return 0
      })
    } else {
      entries.sort((a, b) => {
        if (b.referencePointCount !== a.referencePointCount) {
          return b.referencePointCount - a.referencePointCount
        }
        return a.route.name.localeCompare(b.route.name, 'es')
      })
    }

    return entries.slice(0, 4)
  }, [snapshot, position])

  if (snapshot === undefined) {
    return (
      <div className="space-y-3 px-1">
        <h2 className="text-sm font-semibold text-slate-800">Cargando rutas...</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[1rem] bg-slate-200/75" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-800">
          {position ? 'Rutas más cercanas' : 'Rutas disponibles'}
        </h2>
        
        {permissionState !== 'granted' && (
          <button
            type="button"
            onClick={() => requestPermission()}
            disabled={isRequestingPermission}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-teal-700 transition hover:bg-slate-200 hover:text-teal-800 disabled:opacity-50"
          >
            <LocationIcon />
            {isRequestingPermission ? 'Buscando...' : 'Ver cercanas'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
        {routeEntries.map((entry) => (
          <Link
            key={entry.route.id}
            to={`/passenger-map?route=${encodeURIComponent(entry.route.id)}`}
            onMouseEnter={preloadPassengerMapRoute}
            onFocus={preloadPassengerMapRoute}
            onTouchStart={preloadPassengerMapRouteOnTouch}
            className="group relative flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-[1rem] border border-slate-200 bg-white p-2 sm:p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            {entry.distanceMeters !== null && (
              <div className="absolute right-3 top-3">
                <span className="whitespace-nowrap rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">
                  a {formatDistance(entry.distanceMeters)}
                </span>
              </div>
            )}
            
            <span className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center">
              <img 
                src={entry.route.transportType === 'colectivo' ? '/assets/bus_colectivo.png' : '/assets/bus_urbano.png'} 
                alt="Icono de ruta" 
                className="h-10 w-10 sm:h-14 sm:w-14 object-contain drop-shadow-sm transition-transform group-hover:scale-110" 
              />
            </span>
            
            <div className="flex w-full flex-col items-center px-1">
              <p className="text-sm sm:text-base font-bold leading-tight text-slate-900 lg:text-lg">
                {entry.route.name}
              </p>
              <p className="mt-0.5 sm:mt-1 line-clamp-2 text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">
                {getRouteReferenceLabel(entry.route)}
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-1 sm:mt-2 text-center">
        <Link
          to="/passenger-map"
          onMouseEnter={preloadPassengerMapRoute}
          onFocus={preloadPassengerMapRoute}
          onTouchStart={preloadPassengerMapRouteOnTouch}
          className="inline-block rounded-full px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-teal-700 hover:bg-slate-50"
        >
          Ver todas las rutas
        </Link>
      </div>
    </section>
  )
}

function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-sm scale-100 overflow-hidden rounded-[1.5rem] bg-white shadow-2xl transition-all">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="bg-teal-50/50 p-6 sm:p-8 text-center border-b border-teal-100/50">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sobre CaboBus</h2>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-slate-600 text-center">
            CaboBus es tu guía en tiempo real para el transporte de San José del Cabo. Consulta los recorridos y descubre al instante qué unidades están transmitiendo su ubicación.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-500 active:bg-teal-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const snapshot = usePassengerMapSnapshot()
  const [isAboutOpen, setIsAboutOpen] = useState(false)

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
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-4 pb-2 pt-3 sm:px-8 sm:pb-4 sm:pt-5 h-[100dvh] sm:h-auto overflow-y-auto sm:overflow-visible">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center pb-3 sm:pb-6 shrink-0">
        <div className="col-start-2 flex justify-center">
          <img
            src="/assets/logo.png"
            alt="CaboBus"
            className="h-32 w-auto max-w-[200px] object-contain sm:h-48 sm:max-w-none"
          />
        </div>
        <div className="col-start-3 flex justify-end">
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            className="group inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-teal-600 shadow-sm border border-slate-200 transition hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 hover:shadow"
            aria-label="Acerca de CaboBus"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center pb-2 sm:pb-0">
        <div className="my-3 text-center sm:my-8">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[2rem] lg:text-4xl">
          Sigue tu ruta en <span className="text-teal-700">tiempo real</span>
        </h1>
        <p className="mx-auto mt-1 sm:mt-3 max-w-md text-xs sm:text-sm lg:text-base text-slate-600">
          Consulta recorridos y unidades activas de San José del Cabo.
        </p>
      </div>

      <div className="mb-4 sm:mb-10 px-2 sm:px-10">
        <Link
          to="/passenger-map"
          onMouseEnter={preloadPassengerMapRoute}
          onFocus={preloadPassengerMapRoute}
          onTouchStart={preloadPassengerMapRouteOnTouch}
          className="group flex w-full items-center justify-center gap-2 sm:gap-3 rounded-full sm:rounded-[1.25rem] bg-teal-600 py-3 sm:py-4 text-base sm:text-lg font-bold text-white shadow-[0_8px_16px_-6px_rgba(13,148,136,0.4)] transition active:scale-[0.98] active:bg-teal-700 md:hover:-translate-y-1 md:hover:bg-teal-500 md:hover:shadow-[0_12px_20px_-6px_rgba(13,148,136,0.5)]"
        >
          <MapIcon />
          Abrir Mapa de Rutas
        </Link>
      </div>

      {convexUrl ? (
        <HomeRouteList snapshot={snapshot} />
      ) : (
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
          El mapa público no está conectado en este momento.
        </div>
      )}
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  )
}
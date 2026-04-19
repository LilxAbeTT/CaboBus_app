import type { StyleSpecification, WebGLContextAttributesWithType } from 'maplibre-gl'
import { fallbackMapStyle, mapAttribution, mapStyleUrl } from './env'

const FALLBACK_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

type NavigatorWithHints = Navigator & {
  connection?: {
    saveData?: boolean
  }
  deviceMemory?: number
}

export type MapRuntimePerformanceProfile = {
  prefersLiteUi: boolean
  prefersLiteMap: boolean
  shouldAutoPreloadHeavyMapAssets: boolean
  primaryStyle: string | StyleSpecification
  attribution: string
  pixelRatio: number
  maxTileCacheSize: number | null
  fadeDuration: number
  refreshExpiredTiles: boolean
  trackResize: boolean
  renderWorldCopies: boolean
  showNavigationControl: boolean
  canvasContextAttributes: WebGLContextAttributesWithType
}

function getRuntimeSignals() {
  if (typeof window === 'undefined') {
    return {
      isCoarsePointer: false,
      isSmallViewport: false,
      saveData: false,
      deviceMemory: null as number | null,
      devicePixelRatio: 1,
    }
  }

  const navigatorWithHints = navigator as NavigatorWithHints

  return {
    isCoarsePointer: window.matchMedia('(pointer: coarse)').matches,
    isSmallViewport: window.innerWidth <= 820,
    saveData: navigatorWithHints.connection?.saveData === true,
    deviceMemory:
      typeof navigatorWithHints.deviceMemory === 'number'
        ? navigatorWithHints.deviceMemory
        : null,
    devicePixelRatio: window.devicePixelRatio || 1,
  }
}

export function prefersLiteMobileUi() {
  const { isCoarsePointer, isSmallViewport, saveData, deviceMemory } = getRuntimeSignals()

  return (
    saveData ||
    deviceMemory === 1 ||
    deviceMemory === 2 ||
    deviceMemory === 3 ||
    (isCoarsePointer && isSmallViewport)
  )
}

export function getMapRuntimePerformanceProfile(): MapRuntimePerformanceProfile {
  const { devicePixelRatio } = getRuntimeSignals()
  const prefersLiteUi = prefersLiteMobileUi()
  const prefersLiteMap = prefersLiteUi

  return {
    prefersLiteUi,
    prefersLiteMap,
    shouldAutoPreloadHeavyMapAssets: !prefersLiteMap,
    primaryStyle: prefersLiteMap ? fallbackMapStyle : mapStyleUrl,
    attribution: prefersLiteMap ? FALLBACK_MAP_ATTRIBUTION : mapAttribution,
    pixelRatio: prefersLiteMap
      ? Math.min(devicePixelRatio, 1.5)
      : Math.min(devicePixelRatio, 2),
    maxTileCacheSize: prefersLiteMap ? 24 : null,
    fadeDuration: prefersLiteMap ? 0 : 300,
    refreshExpiredTiles: !prefersLiteMap,
    trackResize: false,
    renderWorldCopies: false,
    showNavigationControl: !prefersLiteMap,
    canvasContextAttributes: {
      antialias: false,
      powerPreference: prefersLiteMap ? 'low-power' : 'high-performance',
      preserveDrawingBuffer: false,
    },
  }
}

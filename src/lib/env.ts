import type { StyleSpecification } from 'maplibre-gl'

export const convexUrl = import.meta.env.VITE_CONVEX_URL
export const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

function normalizeOptionalEnvValue(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

function appendQueryParam(url: string, key: string, value: string) {
  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}${key}=${encodeURIComponent(value)}`
}

const stadiaStyleId =
  normalizeOptionalEnvValue(import.meta.env.VITE_STADIA_STYLE_ID) ??
  'alidade_smooth'
export const stadiaMapsApiKey = normalizeOptionalEnvValue(
  import.meta.env.VITE_STADIA_MAPS_API_KEY,
)
export const stadiaMapsStyleId = stadiaStyleId
const mapStyleUrlOverride = normalizeOptionalEnvValue(
  import.meta.env.VITE_MAP_STYLE_URL,
)

const defaultStadiaStyleUrl = `https://tiles.stadiamaps.com/styles/${stadiaStyleId}.json`

export const mapStyleUrl = stadiaMapsApiKey
  ? appendQueryParam(mapStyleUrlOverride ?? defaultStadiaStyleUrl, 'api_key', stadiaMapsApiKey)
  : mapStyleUrlOverride ?? defaultStadiaStyleUrl

export const fallbackMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    'openstreetmap-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'openstreetmap-raster',
      type: 'raster',
      source: 'openstreetmap-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

export const mapInitialCenter: [number, number] = [-109.701, 23.058]
export const mapInitialZoom = 13
export const mapMaxZoom = 19
export const mapAttribution =
  '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a> ' +
  '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

let mapLibrePromise: Promise<typeof import('maplibre-gl')> | null = null

export function loadMapLibre() {
  if (!mapLibrePromise) {
    mapLibrePromise = import('maplibre-gl')
  }

  return mapLibrePromise
}

export function preloadMapLibre() {
  void loadMapLibre()
}

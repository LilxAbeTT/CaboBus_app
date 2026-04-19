import { preloadMapLibre } from '../lib/maplibreLoader'

export function loadPassengerMapPage() {
  return import('./PassengerMapPage')
}

export function preloadPassengerMapPage() {
  void loadPassengerMapPage()
}

export function preloadPassengerMapAssets() {
  preloadPassengerMapPage()
  preloadMapLibre()
}

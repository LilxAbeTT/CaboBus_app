# CaboBus

MVP de movilidad urbana en tiempo real para San Jose del Cabo, BCS.

El proyecto hoy incluye:

- mapa publico para pasajeros;
- panel web para administracion;
- flujo de conductor en web;
- app del conductor con Capacitor y tracking nativo en segundo plano;
- backend en Convex;
- rutas reales importadas desde KML.

## Stack

- React 19
- Vite 8
- TypeScript 5
- Tailwind CSS 4
- React Router 7
- Leaflet + OpenStreetMap
- Convex
- Capacitor Android/iOS

## Arranque rapido

1. Instala dependencias:
   - `npm install`
2. Levanta Convex en local:
   - `npm run convex:dev`
3. En otra terminal, inicia frontend:
   - `npm run dev`
4. Si necesitas volver a sembrar rutas, usuarios y unidades:
   - `npm run convex:seed`

## Scripts utiles

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
- `npm run convex:dev`
- `npm run convex:codegen`
- `npm run convex:seed`
- `npm run routes:prepare`
- `npm run cap:sync`
- `npm run cap:android`
- `npm run cap:ios`

## Notas operativas

- `VITE_CONVEX_URL` y `VITE_CONVEX_SITE_URL` se leen desde `.env.local`.
- El mapa del pasajero no requiere login.
- Conductor y admin usan sesion minima propia con Convex.
- La app nativa del conductor usa `POST /driver/location` para subir ubicaciones en segundo plano.

## Referencia interna

Para estado real del repo, arquitectura actual y decisiones vigentes:

- [project-map.md](C:\Users\larr_\Documents\CaboBus_app\.agents\project-map.md)

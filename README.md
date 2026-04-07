# VaBus_app

Base inicial del MVP de VaBus construida con React, Vite y TypeScript.

## Stack actual

- React 19
- Vite 8
- TypeScript 5
- Tailwind CSS 4
- React Router 7
- Convex
- Leaflet + OpenStreetMap

## Scripts

- `npm run dev`
- `npm run convex:dev`
- `npm run convex:codegen`
- `npm run convex:seed`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Backend local

- Convex queda configurado con `.env.local`.
- Para usar consultas reales del mapa, ejecuta `npm run convex:dev` en paralelo al frontend.
- Para volver a sembrar datos iniciales, ejecuta `npm run convex:seed`.

## Estructura base

```text
convex/
  _generated/
  passengerMap.ts
  routes.ts
  schema.ts
  seed.ts
  vehicles.ts

src/
  app/
  components/
  features/
    admin/
    auth/
    driver/
    map/
    routes/
    vehicles/
  hooks/
  lib/
  pages/
  services/
  styles/
  types/
```

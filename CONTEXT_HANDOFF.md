# CaboBus - Contexto de Continuidad

Este documento resume el estado actual del proyecto para continuar en otro chat sin perder contexto.

La fuente principal de verdad sigue siendo [agents.md] (/CaboBus_app/agents.md). Este archivo es un handoff operativo basado en ese contexto y en el estado real del repositorio.

## 1. Vision del proyecto

CaboBus es una plataforma de movilidad urbana en tiempo real para San Jose del Cabo, BCS, Mexico.

Objetivo del MVP:
- pasajero: ver rutas cargadas, unidades activas y ultima actualizacion en mapa;
- conductor: iniciar/activar servicio y compartir ubicacion;
- admin: gestionar operacion basica, rutas y unidades.

Principios permanentes heredados de `agents.md`:
- priorizar simplicidad;
- evitar sobreingenieria;
- mantener el proyecto 100% en TypeScript;
- no depender de IDs demo fijos en flujos funcionales;
- si auth completa no es necesaria todavia, preferir sesion minima local;
- no agregar librerias innecesarias.

## 2. Stack actual

- React 19
- Vite 8
- TypeScript 5
- Tailwind CSS 4
- React Router 7
- Leaflet + OpenStreetMap
- Convex como backend del MVP

Scripts utiles:
- `npm run dev`
- `npm run convex:dev`
- `npm run convex:codegen`
- `npm run routes:prepare`
- `npm run convex:seed`
- `npm run lint`
- `npm run build`

## 3. Arquitectura y estructura actual

Estructura principal:

```text
convex/
  _generated/
  data/
  lib/
  driver.ts
  passengerMap.ts
  routes.ts
  schema.ts
  seed.ts
  vehicles.ts

data/
  raw/
  processed/

scripts/
  routes/

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

Separaciones importantes ya aplicadas:
- lectura, transformacion, normalizacion y persistencia de rutas reales estan separadas;
- la logica de negocio fuerte vive en Convex y hooks/utilidades, no dentro de componentes de UI;
- mapa, conductor y sesiones tienen sus propios hooks y componentes por feature.

## 4. Estado funcional actual

### Frontend base

Ya existe:
- layout base;
- rutas principales con React Router;
- paginas base: `Home`, `Login`, `PassengerMap`, `DriverPanel`, `AdminDashboard`;
- estilos base con Tailwind y enfoque responsive inicial.

### Convex

Backend ya integrado con modelos iniciales para:
- `users`
- `routes`
- `vehicles`
- `activeServices`
- `locationUpdates`

Schema actual principal en [schema.ts](C:/Users/larr_/Documents/CaboBus_app/convex/schema.ts).

Nota importante:
- la tabla `routes` mantiene campos opcionales legacy (`path`, `importKey`, `segments`, etc.) para compatibilidad/migracion de datos antiguos locales;
- el flujo funcional nuevo ya usa rutas normalizadas con `segments`.

### Rutas reales importadas

Archivos fuente disponibles:
- [sjc_urbano_routes.kml](C:/Users/larr_/Documents/CaboBus_app/data/raw/sjc_urbano_routes.kml)
- [sjc_colectivo_routes.kml](C:/Users/larr_/Documents/CaboBus_app/data/raw/sjc_colectivo_routes.kml)

Pipeline ya implementado:
- parser KML en [kml.ts](C:/Users/larr_/Documents/CaboBus_app/scripts/routes/kml.ts)
- normalizacion en [normalize.ts](C:/Users/larr_/Documents/CaboBus_app/scripts/routes/normalize.ts)
- generacion de artefactos en [prepare.ts](C:/Users/larr_/Documents/CaboBus_app/scripts/routes/prepare.ts)

Artefactos generados:
- [routes.geojson](C:/Users/larr_/Documents/CaboBus_app/data/processed/routes.geojson)
- [importedRoutes.generated.ts](C:/Users/larr_/Documents/CaboBus_app/convex/data/importedRoutes.generated.ts)

Estado actual de rutas:
- 15 rutas reales importadas y sembradas en Convex;
- agrupadas por `transportType`: `urbano` y `colectivo`;
- con `importKey` estable por ruta para seeds idempotentes.

### PassengerMap

Estado actual:
- renderiza rutas reales desde Convex en Leaflet;
- renderiza unidades activas en tiempo real;
- permite seleccionar una ruta especifica;
- agrupa visualmente por tipo de transporte;
- resalta la ruta seleccionada y atenua las demas;
- filtra unidades activas por ruta seleccionada;
- centra/ajusta el mapa a la geometria seleccionada;
- permite volver a vista general;
- persiste la ruta seleccionada en `localStorage`.

Archivos clave:
- [PassengerMapView.tsx](C:/Users/larr_/Documents/CaboBus_app/src/features/map/components/PassengerMapView.tsx)
- [usePassengerMapSnapshot.ts](C:/Users/larr_/Documents/CaboBus_app/src/features/map/hooks/usePassengerMapSnapshot.ts)
- [usePassengerRouteSelection.ts](C:/Users/larr_/Documents/CaboBus_app/src/features/map/hooks/usePassengerRouteSelection.ts)

### DriverPanel

Estado actual:
- usa sesion minima local por conductor/unidad;
- permite seleccionar conductor y unidad disponibles;
- activa servicio real en Convex;
- finaliza servicio;
- envia ubicacion manual de prueba;
- muestra estado actual del servicio;
- muestra ultima ubicacion y ultimo timestamp.

Ademas:
- ya existe intento de tracking real desde geolocalizacion del navegador;
- el modo manual sigue disponible como fallback;
- ambos modos escriben por la misma mutacion de Convex para evitar logica duplicada.

Archivos clave:
- [DriverStatusCard.tsx](C:/Users/larr_/Documents/CaboBus_app/src/features/driver/components/DriverStatusCard.tsx)
- [useDriverSession.ts](C:/Users/larr_/Documents/CaboBus_app/src/features/driver/hooks/useDriverSession.ts)
- [useBrowserLocationTracking.ts](C:/Users/larr_/Documents/CaboBus_app/src/features/driver/hooks/useBrowserLocationTracking.ts)
- [driver.ts](C:/Users/larr_/Documents/CaboBus_app/convex/driver.ts)

## 5. Tipos y dominio actual

Tipos compartidos principales en [domain.ts](C:/Users/larr_/Documents/CaboBus_app/src/types/domain.ts).

Formas importantes:
- `BusRoute` usa `segments` en vez de `path` como formato canonico del frontend;
- `TransportType` actual: `urbano | colectivo`;
- `PassengerMapSnapshot` ya esta alineado con Convex;
- `DriverPanelState` ya refleja servicio actual, rutas disponibles y sesion.

## 6. Reglas permanentes ya incorporadas en agents.md

Estas reglas ya se agregaron al proyecto y conviene respetarlas en cualquier continuacion:

- no reintroducir dependencias a conductor/unidad demo hardcodeados;
- preferir sesion minima local antes que auth completa si basta para el MVP;
- las rutas reales importadas deben tratarse como fuente operativa del mapa;
- conservar nombre, tipo, color, geometria y archivo fuente cuando existan;
- usar `importKey` estable para seeds y migraciones;
- los artefactos derivados de rutas se regeneran por script, no a mano;
- cuando el mapa este cargado visualmente, ofrecer enfoque por ruta antes de agregar complejidad;
- el tracking real del conductor debe apoyarse primero en geolocalizacion del navegador;
- el modo manual debe seguir disponible como fallback;
- tracking real y manual deben compartir la misma ruta de escritura al backend.

## 7. Problemas abiertos o sensibles

### A. Tracking real del navegador todavia inestable

Este es el frente mas sensible actual.

Situacion:
- ya existe soporte de geolocalizacion real en el panel del conductor;
- el flujo pide permiso, intenta una lectura inicial y luego abre seguimiento;
- el modo manual sigue funcionando.

Problema observado:
- en pruebas reales puede quedarse en "Esperando permiso..." y luego caer en timeout;
- a veces el navegador vuelve a mostrar el prompt, sobre todo si el permiso es temporal o se cambia de pestaña;
- esto no significa necesariamente que la app este rota, pero si indica que el flujo aun necesita endurecerse para uso real de campo.

Importante:
- esto puede pasar tambien en produccion, no solo en localhost;
- `localhost` ya es un contexto valido para geolocalizacion web;
- la causa puede ser del browser, del dispositivo, del GPS, de la red o de la forma en que se pide la primera posicion.

Siguiente mejora recomendada para este frente:
- separar claramente "pedir permiso" de "iniciar tracking";
- usar una primera posicion mas tolerante y rapida;
- agregar reintentos controlados;
- reflejar mejor en UI cuando hay permiso pero aun no hay fix de ubicacion;
- evaluar condiciones de `enableHighAccuracy`, `maximumAge` y `timeout`.

### B. Compatibilidad legacy en rutas

Todavia existe compatibilidad temporal con `path` en backend para migrar datos locales viejos.

No es codigo muerto todavia, pero a futuro convendria:
- migrar completamente datos locales;
- eliminar `path` del schema y helpers legacy cuando ya no haga falta.

### C. Warning de chunk grande en build

`npm run build` compila bien, pero Vite muestra warning por chunk > 500 kB.

No bloquea el MVP hoy.

## 8. Ultima validacion conocida

Estado validado recientemente:
- `npx convex codegen --typecheck disable` OK
- `npm run lint` OK
- `npm run build` OK

## 9. Como levantar el proyecto

1. Ejecutar `npm install` si hace falta.
2. Ejecutar `npm run convex:dev`.
3. En otra terminal, ejecutar `npm run dev`.
4. Si se requieren datos frescos, ejecutar `npm run convex:seed`.

Notas:
- `.env.local` ya existe para Convex local;
- `convex:seed` tambien ejecuta la preparacion de rutas reales antes de sembrar.

## 10. Siguiente paso recomendado

Si el siguiente chat quiere continuar por prioridad real de campo, el mejor frente es:

1. robustecer la geolocalizacion real del conductor para uso en dispositivo;
2. mantener el fallback manual intacto;
3. mejorar la UX de estado de tracking: permiso, primera fix, tracking activo, señal desactualizada y reintento controlado.

Si se quiere seguir por otra via, la siguiente opcion mas coherente es:

1. avanzar en admin basico para revisar rutas, unidades y servicios activos;
2. o bien terminar la limpieza de compatibilidad legacy de rutas cuando el pipeline este estable.

## 11. Prompt corto sugerido para retomar en otro chat

Puedes usar algo como esto:

> Lee `agents.md` y `CONTEXT_HANDOFF.md` como contexto principal. Conserva la arquitectura actual. Quiero continuar CaboBus desde el estado real del repo, sin rehacer la base existente.

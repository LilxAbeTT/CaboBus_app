# Project Map - VaBus_app

Estado real revisado y actualizado el 2026-04-07 sobre el repositorio y la implementacion actual.

## 1. Proposito del producto

VaBus es un MVP de movilidad urbana en tiempo real para San Jose del Cabo, BCS, Mexico.

Objetivo central:

- dar visibilidad digital sobre rutas reales ya existentes;
- permitir a pasajeros consultar rutas y unidades activas sin friccion;
- permitir a conductores operar una unidad y compartir ubicacion;
- permitir administracion operativa basica sin sobreingenieria.

## 2. Invariantes del proyecto

Estas decisiones deben tratarse como reglas estables mientras no se redefinan explicitamente:

- stack principal: React + Vite + TypeScript + Tailwind + React Router + Leaflet + Convex;
- backend elegido para el MVP: Convex;
- rutas reales importadas desde KML son fuente operativa, no mock;
- pasajero entra sin login;
- conductor y admin usan login propio con sesion minima administrada en Convex;
- admin entra por ruta directa, no desde la navegacion publica;
- tracking real del conductor con geolocalizacion del navegador y fallback manual;
- una sola ruta de escritura de ubicaciones al backend;
- cambios incrementales, simples y seguros.

## 3. Estado real del proyecto

El repo ya esta en MVP operativo parcial, no en bootstrap.

Hoy ya existe:

- frontend funcional con layout, router y paginas reales;
- acceso publico diferenciado para pasajero y conductor;
- login real minimo para conductor;
- login real minimo para admin;
- mapa de pasajero conectado a Convex;
- panel de conductor con sesion autenticada;
- activacion, pausa, reanudacion y finalizacion real de servicio;
- tracking real del navegador con arranque en dos pasos;
- fallback manual para ubicacion;
- dashboard admin con monitoreo y gestion;
- pipeline de importacion de rutas reales;
- seed reproducible en Convex.

Lo que sigue pendiente o incompleto:

- endurecer auth mas alla de la sesion minima propia del MVP;
- pruebas automaticas;
- eventos operativos/auditoria;
- refinamientos de UX finales sobre vistas ya funcionales.

## 4. Stack y scripts

Dependencias principales observadas:

- React 19
- Vite 8
- TypeScript 5
- Tailwind CSS 4
- React Router 7
- Leaflet
- Convex

Scripts importantes:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
- `npm run convex:dev`
- `npm run convex:codegen`
- `npm run routes:prepare`
- `npm run convex:seed`

## 5. Mapa del repositorio

```text
.
|-- .agents/
|-- convex/
|   |-- _generated/
|   |-- data/
|   |-- lib/
|   |-- admin.ts
|   |-- auth.ts
|   |-- driver.ts
|   |-- passengerMap.ts
|   |-- routes.ts
|   |-- schema.ts
|   |-- seed.ts
|   `-- vehicles.ts
|-- data/
|   |-- processed/
|   `-- raw/
|-- scripts/
|   `-- routes/
`-- src/
    |-- app/
    |-- components/
    |-- features/
    |   |-- admin/
    |   |-- auth/
    |   |-- driver/
    |   |-- map/
    |   |-- routes/
    |   `-- vehicles/
    |-- hooks/
    |-- lib/
    |-- pages/
    |-- styles/
    `-- types/
```

## 6. Arquitectura por capa

### Frontend

- `src/app/router.tsx`: rutas publicas, acceso conductor y acceso admin.
- `src/components/layout/AppLayout.tsx`: shell global publico, sin exponer admin.
- `src/pages/HomePage.tsx`: selector de acceso pasajero/conductor.
- `src/pages/PassengerMapPage.tsx`: acceso anonimo al mapa.
- `src/pages/DriverLoginPage.tsx`: login del conductor.
- `src/pages/DriverPanelPage.tsx`: guard de sesion y panel autenticado.
- `src/pages/AdminLoginPage.tsx`: login admin por URL directa.
- `src/pages/AdminDashboardPage.tsx`: guard de sesion y panel admin.
- `src/features/*`: UI y logica por dominio.
- `src/types/domain.ts`: contratos principales del frontend.

### Backend / auth / datos

- `convex/schema.ts`: tablas `users`, `routes`, `vehicles`, `activeServices`, `locationUpdates`, `sessions`.
- `convex/auth.ts`: login, logout y lectura de sesion.
- `convex/driver.ts`: queries y mutations operativas del conductor autenticado.
- `convex/admin.ts`: dashboard de gestion y acciones admin.
- `convex/passengerMap.ts`: snapshot consolidado para pasajero.
- `convex/lib/auth.ts`: hash de password, sesiones e identidad minima.
- `convex/lib/services.ts`: helpers de servicios abiertos y ultima ubicacion.
- `convex/seed.ts`: seed idempotente de rutas, conductores, admin y unidades.

### Pipeline de rutas reales

- `scripts/routes/kml.ts`: parser KML.
- `scripts/routes/normalize.ts`: normalizacion a seeds + GeoJSON.
- `scripts/routes/prepare.ts`: genera artefactos derivados.
- `data/raw/*.kml`: fuentes operativas.
- `convex/data/importedRoutes.generated.ts`: seed generado para Convex.
- `data/processed/routes.geojson`: artefacto derivado para inspeccion/export.

## 7. Dominios y estado actual

### Acceso / auth

Archivos clave:

- `src/pages/HomePage.tsx`
- `src/pages/DriverLoginPage.tsx`
- `src/pages/AdminLoginPage.tsx`
- `src/features/auth/components/RoleLoginCard.tsx`
- `src/features/auth/hooks/useStoredAuthSession.ts`
- `convex/auth.ts`

Estado:

- pasajero entra sin login;
- conductor usa login real minimo con sesion por token en Convex;
- admin usa login real minimo por URL directa;
- el home publico ya es una bienvenida simple con logo y dos cards;
- conductor y admin guardan sesion en `localStorage`;
- las vistas protegidas validan la sesion antes de cargar.

Notas:

- no hay proveedor externo de identidad;
- la solucion actual es auth propia simple, suficiente para el MVP.

### Passenger map

Archivos clave:

- `src/features/map/components/PassengerMapView.tsx`
- `src/features/map/hooks/usePassengerMapSnapshot.ts`
- `src/features/map/hooks/usePassengerRouteSelection.ts`
- `convex/passengerMap.ts`

Estado:

- consume snapshot real desde Convex;
- renderiza rutas reales en Leaflet;
- agrupa por `transportType`;
- permite enfoque por ruta;
- oculta unidades con senal `probably_stopped`;
- persiste la ruta seleccionada en `localStorage`.

Notas:

- el mapa es publico y anonimo por diseno;
- servicios pausados no son la vista principal del pasajero.

### Driver

Archivos clave:

- `src/features/driver/components/DriverStatusCard.tsx`
- `src/features/driver/hooks/useBrowserLocationTracking.ts`
- `src/lib/trackingSignal.ts`
- `convex/driver.ts`

Estado:

- conductor autenticado por login real;
- la cuenta del conductor puede tener unidad y ruta base asignadas;
- el panel muestra nombre, ruta y acciones operativas esenciales;
- activacion real de servicio;
- pausa real de servicio;
- reanudacion real de servicio;
- finalizacion real de servicio;
- envio manual de ubicacion como fallback secundario;
- tracking real del navegador separado en permiso + arranque;
- el boton principal ya inicia o reanuda compartir ubicacion segun contexto;
- el intento de compartir queda persistido para recuperarse tras recarga si la sesion y el servicio siguen activos;
- control simple de frecuencia y distancia minima antes de enviar;
- misma mutation de backend para tracking real y manual.

Notas:

- ya no hay seleccion tecnica de unidad en el flujo del conductor;
- la logica operativa principal ya vive en Convex y utilidades compartidas.

### Admin

Archivos clave:

- `src/features/admin/components/AdminOverview.tsx`
- `src/features/admin/hooks/useAdminOperationalOverview.ts`
- `convex/admin.ts`

Estado:

- dashboard real conectado a Convex;
- monitoreo de servicios abiertos;
- pausa, reanudacion y finalizacion de servicios desde admin;
- gestion de conductores;
- gestion de unidades;
- asignacion de ruta base y unidad base a cada conductor;
- consulta del catalogo de rutas oficiales importadas.

Notas:

- no se prioriza CRUD manual de rutas;
- el foco admin actual es operacion, conductores y unidades.

### Routes / vehicles feature folders

Estado:

- `routes` y `vehicles` no son features frontend independientes;
- la gestion vive hoy dentro del panel admin;
- las rutas oficiales siguen viniendo del pipeline KML -> normalizacion -> seed.

## 8. Flujos operativos actuales

### Flujo pasajero

1. El usuario entra al home y elige `Soy pasajero`.
2. Se abre `PassengerMapPage` sin login.
3. `PassengerMapView` consulta `api.passengerMap.getSnapshot`.
4. Convex devuelve rutas activas y servicios activos con ultima ubicacion.
5. Frontend calcula frescura de senal y dibuja mapa + enfoque por ruta.

### Flujo conductor

1. El usuario entra al home y elige `Soy conductor`.
2. Se abre `DriverLoginPage`.
3. `api.auth.login` valida email/password y crea sesion.
4. `DriverPanelPage` valida la sesion y carga `api.driver.getPanelState`.
5. El conductor ve su unidad asignada y la ruta preseleccionada segun su cuenta.
6. Usa un boton principal para iniciar o reanudar servicio y compartir ubicacion.
7. Si el permiso ya existe, el tracking arranca directo; si no, primero lo solicita.
8. Puede pausar o finalizar servicio, y abrir envio manual solo como fallback.
9. Ambas vias terminan en `api.driver.addLocationUpdate`.

### Flujo admin

1. El admin entra por URL directa `/admin/login`.
2. `api.auth.login` valida la sesion admin.
3. `AdminDashboardPage` consulta `api.admin.getDashboardState`.
4. Desde la UI puede gestionar conductores y unidades.
5. Tambien puede pausar, reanudar o finalizar servicios abiertos.

### Flujo de rutas reales

1. Colocar/actualizar KML en `data/raw/`.
2. Ejecutar `npm run routes:prepare`.
3. Se regeneran `convex/data/importedRoutes.generated.ts` y `data/processed/routes.geojson`.
4. Ejecutar `npm run convex:seed` para sembrar/actualizar Convex.

## 9. Seeds y accesos base

Estado actual del seed:

- crea/actualiza 2 conductores base;
- crea/actualiza 1 admin base;
- crea/actualiza 2 unidades base;
- regenera y siembra 15 rutas importadas;
- asigna ruta base y unidad base a los conductores semilla;
- completa servicios abiertos semilla previos para evitar conflictos.

Referencia:

- las credenciales semilla del entorno local estan definidas en `convex/seed.ts`.
- si cambian, volver a ejecutar `npm run convex:seed`.

## 10. Riesgos y deuda tecnica visibles

- `DriverStatusCard.tsx` concentra bastante UI y orquestacion;
- `AdminOverview.tsx` ya es gestor real y probablemente necesitara subdivision por componentes;
- hay senales de problemas de encoding/mojibake en textos importados y algo de documentacion;
- `CONTEXT_HANDOFF.md` sigue atrasado respecto al acceso y admin actuales;
- no se observaron tests automaticos;
- `passengerMap.getSnapshot` mantiene patron N+1 por servicio activo;
- `locationUpdates` no tiene estrategia de retencion;
- `routes` aun conserva compatibilidad legacy con `path`.

## 11. Artefactos y archivos sensibles

Tratar como generados o derivados:

- `convex/data/importedRoutes.generated.ts`
- `data/processed/routes.geojson`
- `convex/_generated/*`
- `dist/*`

No editar a mano si el flujo correcto es regenerarlos.

## 12. Validacion recomendada por tipo de cambio

Cambios de frontend:

- `npm run lint`
- `npm run build`

Cambios de Convex:

- `npm run convex:codegen`
- `npm run lint`
- `npm run build`
- `npm run convex:seed` si cambia seed/auth/schema

Cambios en pipeline de rutas:

- `npm run routes:prepare`
- `npm run convex:seed`
- `npm run build`

## 13. Estado validado mas reciente

Validado en esta actualizacion:

- `npm run convex:codegen` OK
- `npm run build` OK
- `npm run lint` OK
- `npm run convex:seed` OK

## 14. Criterio para siguientes chats

Antes de editar:

1. Leer `agents.md`.
2. Leer este `project-map`.
3. Confirmar si la tarea toca:
   - acceso/auth
   - conductor
   - admin
   - pasajero/mapa
   - rutas reales
4. Revisar los archivos reales del modulo afectado.
5. No asumir que lo pendiente es auth o admin basico: esas bases ya existen.

## 15. Siguiente frontera recomendada

La siguiente etapa coherente ya no es abrir flujos base, sino endurecer y estabilizar:

- dividir UI grande en subcomponentes sin cambiar comportamiento;
- agregar eventos operativos o bitacora simple;
- decidir politica de retencion/limpieza de `locationUpdates`;
- cerrar pruebas automaticas basicas para auth, conductor y admin;
- limpiar compatibilidad legacy de rutas cuando ya no haga falta `path`.

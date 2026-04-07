# Workflow - Solucionar Bug

Usar para errores funcionales, regresiones o comportamiento inconsistente.

## Objetivo

Encontrar causa raiz, corregirla con el menor cambio posible y reducir riesgo de regresion.

## Preparacion

1. Leer `.agents/project-map.md`.
2. Identificar flujo exacto que falla.
3. Reunir evidencia:
   - modulo afectado
   - trigger
   - datos involucrados
   - comportamiento esperado vs real

## Reparto con subagentes

Configuracion recomendada:

- `explorer` 1:
  - reconstruir el flujo funcional y ubicar archivos sospechosos.
- `explorer` 2:
  - revisar impacto cruzado en Convex, tipos o rutas reales.
- `worker` opcional:
  - aplicar fix aislado si el ownership es claro.

## Secuencia

1. Reproducir o inferir el bug con evidencia concreta.
2. Aislar la capa del problema:
   - UI
   - estado local
   - hook
   - contrato frontend/backend
   - Convex
   - seed/datos
3. Corregir causa raiz, no solo sintoma.
4. Revisar si el fix afecta:
   - passenger map
   - driver tracking
   - seed de rutas
   - sesiones locales
5. Validar el flujo afectado y una regresion cercana.

## Pistas especificas de este repo

Si el bug es de conductor, revisar primero:

- `src/features/driver/components/DriverStatusCard.tsx`
- `src/features/driver/hooks/useBrowserLocationTracking.ts`
- `src/features/driver/hooks/useDriverSession.ts`
- `src/lib/trackingSignal.ts`
- `convex/driver.ts`

Si el bug es de mapa, revisar primero:

- `src/features/map/components/PassengerMapView.tsx`
- `src/features/map/hooks/usePassengerRouteSelection.ts`
- `convex/passengerMap.ts`
- `convex/lib/routes.ts`

Si el bug es de rutas reales, revisar primero:

- `scripts/routes/*.ts`
- `data/raw/*.kml`
- `convex/data/importedRoutes.generated.ts`
- `convex/seed.ts`

## Cierre esperado

Documenta:

- causa raiz;
- fix aplicado;
- validacion hecha;
- riesgo residual si existe.

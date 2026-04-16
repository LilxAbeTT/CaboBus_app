# Workflow - Implementar o Modificar

Usar para features nuevas, mejoras incrementales o cambios de comportamiento.

## Objetivo

Implementar el menor cambio razonable sin romper la base actual del MVP.

## Preparacion

1. Lee `.agents/project-map.md`.
2. Revisa el estado real del modulo afectado.
3. Define si el cambio toca:
   - frontend
   - Convex
   - pipeline de rutas
   - documentacion operativa

## Reparto con subagentes

Si el cambio es mediano o grande:

- `explorer` frontend:
  - revisar componentes, hooks y tipos afectados;
  - detectar deuda o puntos de extension naturales.
- `explorer` backend:
  - revisar schema, queries, mutations, seeds e impacto en contratos.
- `worker` opcional:
  - implementar un bloque acotado con ownership claro de archivos.

Ownership sugerido:

- UI y hooks en `src/features/...`
- contratos y utilidades en `src/types` o `src/lib`
- backend en `convex/...`
- rutas reales solo en `scripts/routes`, `data/raw`, `convex/data`, `data/processed`

## Secuencia

1. Confirmar objetivo tecnico exacto.
2. Revisar contratos actuales antes de inventar otros nuevos.
3. Ajustar tipos y flujo antes de tocar UI grande.
4. Implementar el cambio mas pequeno que cierre el objetivo.
5. Mantener una sola fuente de verdad por flujo.
6. Si cambian datos de rutas, regenerar artefactos por script.
7. Validar con scripts minimos.
8. Resumir que se cambio, que no, y siguiente paso.

## Reglas de CaboBus a respetar

- no reintroducir IDs demo fijos en flujos funcionales;
- no duplicar la escritura de ubicaciones;
- no tratar rutas reales como mocks;
- no meter logica de negocio compleja directamente en componentes si ya esta creciendo demasiado;
- no agregar dependencias sin necesidad.

## Validacion minima

Frontend:

- `npm run lint`
- `npm run build`

Convex:

- `npm run convex:codegen`
- `npm run lint`
- `npm run build`

Rutas reales:

- `npm run routes:prepare`
- `npm run convex:seed` si aplica

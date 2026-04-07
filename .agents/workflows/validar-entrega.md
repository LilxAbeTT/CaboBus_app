# Workflow - Validar Entrega

Usar antes de cerrar una tarea importante o despues de integrar trabajo de subagentes.

## Objetivo

Comprobar que el cambio quedo consistente con el MVP y con el estado actual del repo.

## Reparto con subagentes

Configuracion recomendada para cambios medianos o grandes:

- `explorer` 1:
  - revisar impacto funcional del modulo principal.
- `explorer` 2:
  - revisar regresiones en capa adyacente.

Ejemplos:

- si cambias `driver`, un subagente revisa frontend y otro Convex;
- si cambias `routes`, un subagente revisa parser/seed y otro mapa/frontend.

## Checklist

1. Imports y tipos limpios.
2. Contratos frontend/backend consistentes.
3. Sin reintroducir mocks fijos en flujos funcionales.
4. Sin editar a mano artefactos generados si habia script.
5. Sin romper fallback manual o tracking real si la tarea toca conductor.
6. Sin romper enfoque por ruta si la tarea toca mapa.
7. Documentacion operativa actualizada si el cambio altera flujo base.

## Scripts recomendados

Minimo general:

- `npm run lint`
- `npm run build`

Si toca Convex:

- `npm run convex:codegen`

Si toca rutas:

- `npm run routes:prepare`
- `npm run convex:seed` si aplica

## Cierre esperado

Resume:

- que se valido;
- que no se pudo validar;
- riesgos residuales;
- siguiente paso recomendado.

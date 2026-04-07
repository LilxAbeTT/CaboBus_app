# Workflow - Revisar Arquitectura

Usar para auditorias tecnicas, planes de refactor, deuda tecnica o decisiones de siguiente fase.

## Objetivo

Entender el estado real del proyecto y proponer cambios defendibles sin sobreingenieria.

## Reparto con subagentes

Configuracion recomendada:

- `explorer` frontend:
  - componentes grandes, hooks, fronteras UI/dominio.
- `explorer` backend:
  - schema, indices, queries, mutations, seed.
- `explorer` docs/pipeline:
  - `agents.md`, `CONTEXT_HANDOFF.md`, `.agents`, scripts de rutas y artefactos.

## Preguntas guia

1. Que ya esta bien resuelto para el MVP.
2. Que sigue siendo placeholder.
3. Donde hay mezcla excesiva de responsabilidades.
4. Que invariantes no deben romperse.
5. Cual es el siguiente cuello de botella tecnico real.

## Focos actuales conocidos

- `DriverStatusCard.tsx` y `PassengerMapView.tsx` como componentes demasiado cargados;
- admin y auth siguen placeholder;
- compatibilidad legacy de `routes.path`;
- consultas Convex con margen de mejora en indices y N+1;
- documentacion/handoffs con desalineaciones menores.

## Salida esperada

La revision debe separar:

- hallazgos actuales;
- riesgos si no se atienden;
- acciones recomendadas a corto plazo;
- acciones que todavia no valen la pena para el MVP.

## Regla

No proponer microservicios, abstracciones prematuras ni redisenos grandes sin evidencia fuerte.

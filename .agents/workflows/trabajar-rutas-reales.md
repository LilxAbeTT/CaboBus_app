# Workflow - Trabajar Rutas Reales

Usar para importar, corregir, ampliar o depurar rutas desde archivos externos.

## Objetivo

Mantener el flujo reproducible de rutas reales sin editar manualmente artefactos derivados.

## Archivos clave

- `data/raw/*.kml`
- `scripts/routes/kml.ts`
- `scripts/routes/normalize.ts`
- `scripts/routes/prepare.ts`
- `convex/data/importedRoutes.ts`
- `convex/data/importedRoutes.generated.ts`
- `data/processed/routes.geojson`
- `convex/seed.ts`

## Regla central

La geometria operativa viene de archivos reales importados. Los artefactos generados deben regenerarse por script.

## Reparto con subagentes

Configuracion recomendada:

- `explorer` parser/normalizacion:
  - revisar KML, nombres, colores, importKey, mojibake, geometria.
- `explorer` consumo backend/frontend:
  - revisar seed, `toRouteSummary`, snapshot y uso en mapa.
- `worker` opcional:
  - aplicar cambios solo en parser o solo en seed/consumo, no en ambos a la vez salvo que el ownership este claro.

## Secuencia

1. Confirmar que el cambio nace en fuente KML o en transformacion.
2. Tocar primero parser/normalizacion si el dato base esta mal.
3. Regenerar artefactos con `npm run routes:prepare`.
4. Revisar diffs de artefactos generados.
5. Sembrar con `npm run convex:seed` si la tarea lo requiere.
6. Verificar consumo en mapa y en seleccion de rutas.

## Criterios de calidad

- conservar `name`, `direction`, `transportType`, `color`, `segments`, `sourceFile`;
- mantener `importKey` estable;
- no introducir ediciones manuales que rompan la reproducibilidad;
- no degradar compatibilidad mientras siga existiendo legacy `path`.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { ImportedRouteSeed } from '../../convex/data/importedRoutes.ts'
import { normalizeImportedRoutes } from './normalize.ts'
import { parseKmlDocument } from './kml.ts'

const workspaceRoot = resolve(import.meta.dirname, '..', '..')
const rawFiles = [
  {
    transportType: 'urbano' as const,
    filePath: resolve(workspaceRoot, 'data', 'raw', 'sjc_urbano_routes.kml'),
  },
  {
    transportType: 'colectivo' as const,
    filePath: resolve(workspaceRoot, 'data', 'raw', 'sjc_colectivo_routes.kml'),
  },
]

const generatedRoutesPath = resolve(
  workspaceRoot,
  'convex',
  'data',
  'importedRoutes.generated.ts',
)
const geoJsonPath = resolve(workspaceRoot, 'data', 'processed', 'routes.geojson')

function serializeRoutesFile(routes: ImportedRouteSeed[]) {
  return `import type { ImportedRouteSeed } from './importedRoutes'

export const importedRouteSeeds: ImportedRouteSeed[] = ${JSON.stringify(routes, null, 2)} as ImportedRouteSeed[]
`
}

async function writeOutputFile(filePath: string, content: string) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

async function main() {
  const documents = await Promise.all(
    rawFiles.map(async ({ transportType, filePath }) => {
      const source = await readFile(filePath, 'utf8')
      return parseKmlDocument(filePath, transportType, source)
    }),
  )

  const { routes, geoJson } = normalizeImportedRoutes(documents)

  await Promise.all([
    writeOutputFile(generatedRoutesPath, serializeRoutesFile(routes)),
    writeOutputFile(geoJsonPath, `${JSON.stringify(geoJson, null, 2)}\n`),
  ])

  console.log(
    `Rutas importadas: ${routes.length} (${documents.map((document) => `${document.transportType}: ${document.placemarks.length}`).join(', ')})`,
  )
  console.log(`GeoJSON generado en ${geoJsonPath}`)
  console.log(`Seeds generados en ${generatedRoutesPath}`)
}

void main()

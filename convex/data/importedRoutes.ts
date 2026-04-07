import type { Coordinates, TransportType } from '../../src/types/domain'

export interface ImportedRouteSeed {
  importKey: string
  slug: string
  name: string
  direction: string
  transportType: TransportType
  sourceFile: string
  status: 'active'
  color: string
  segments: Coordinates[][]
}

import { basename } from 'node:path'

import type { Coordinates, TransportType } from '../../src/types/domain.ts'

export interface ParsedKmlStyleMap {
  id: string
  normalStyleId?: string
}

export interface ParsedKmlPlacemark {
  folderName: string
  folderIndex: number
  placemarkIndex: number
  name: string
  description?: string
  styleUrl?: string
  segments: Coordinates[][]
}

export interface ParsedKmlDocument {
  sourceFile: string
  transportType: TransportType
  documentName: string
  placemarks: ParsedKmlPlacemark[]
  styleColors: Map<string, string>
  styleMaps: Map<string, ParsedKmlStyleMap>
}

function matchBlocks(source: string, tagName: string) {
  const expression = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'g')

  return Array.from(source.matchAll(expression), (match) => match[1])
}

function readFirstTagValue(source: string, tagName: string) {
  const match = source.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`),
  )

  return match?.[1]?.trim()
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function repairMojibake(value: string) {
  if (!/[ÃÂ]/.test(value)) {
    return value
  }

  return Buffer.from(value, 'latin1').toString('utf8')
}

function normalizeText(value?: string) {
  if (!value) {
    return ''
  }

  return repairMojibake(decodeXmlEntities(value))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function kmlColorToHex(value?: string) {
  if (!value || value.length !== 8) {
    return undefined
  }

  const rr = value.slice(6, 8)
  const gg = value.slice(4, 6)
  const bb = value.slice(2, 4)

  return `#${rr}${gg}${bb}`.toUpperCase()
}

function parseCoordinatesBlock(source: string) {
  return source
    .trim()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [lngValue, latValue] = entry.split(',')
      const lat = Number(latValue)
      const lng = Number(lngValue)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error(`Coordenada invalida encontrada en KML: ${entry}`)
      }

      return { lat, lng }
    })
}

function parseStyleColors(source: string) {
  const styles = new Map<string, string>()
  const styleExpression =
    /<Style\s+id="([^"]+)"[\s\S]*?<LineStyle>[\s\S]*?<color>([^<]+)<\/color>/g

  for (const match of source.matchAll(styleExpression)) {
    const [, styleId, kmlColor] = match
    const color = kmlColorToHex(kmlColor.trim())

    if (color) {
      styles.set(styleId, color)
    }
  }

  return styles
}

function parseStyleMaps(source: string) {
  const styleMaps = new Map<string, ParsedKmlStyleMap>()
  const styleMapExpression = /<StyleMap\s+id="([^"]+)">([\s\S]*?)<\/StyleMap>/g

  for (const match of source.matchAll(styleMapExpression)) {
    const [, id, body] = match
    const normalPairMatch = body.match(
      /<Pair>[\s\S]*?<key>normal<\/key>[\s\S]*?<styleUrl>#([^<]+)<\/styleUrl>[\s\S]*?<\/Pair>/,
    )

    styleMaps.set(id, {
      id,
      normalStyleId: normalPairMatch?.[1],
    })
  }

  return styleMaps
}

function resolvePlacemarkColor(
  placemark: ParsedKmlPlacemark,
  styleColors: Map<string, string>,
  styleMaps: Map<string, ParsedKmlStyleMap>,
  transportType: TransportType,
) {
  const fallbackColor = transportType === 'urbano' ? '#0F766E' : '#D97706'
  const styleReference = placemark.styleUrl?.replace(/^#/, '')

  if (!styleReference) {
    return fallbackColor
  }

  const styleMap = styleMaps.get(styleReference)
  const directColor =
    styleColors.get(styleReference) ??
    (styleMap?.normalStyleId ? styleColors.get(styleMap.normalStyleId) : undefined)

  return directColor ?? fallbackColor
}

export function parseKmlDocument(
  sourceFilePath: string,
  transportType: TransportType,
  source: string,
): ParsedKmlDocument {
  const documentBody = readFirstTagValue(source, 'Document') ?? source
  const documentName = normalizeText(readFirstTagValue(documentBody, 'name'))
  const styleColors = parseStyleColors(documentBody)
  const styleMaps = parseStyleMaps(documentBody)
  const placemarks: ParsedKmlPlacemark[] = []

  matchBlocks(documentBody, 'Folder').forEach((folderBody, folderIndex) => {
    const folderName = normalizeText(readFirstTagValue(folderBody, 'name'))

    matchBlocks(folderBody, 'Placemark').forEach((placemarkBody, placemarkIndex) => {
      const lineStrings = matchBlocks(placemarkBody, 'LineString')
      const segments = lineStrings
        .map((lineString) => readFirstTagValue(lineString, 'coordinates'))
        .filter((value): value is string => Boolean(value))
        .map((coordinatesBlock) => parseCoordinatesBlock(coordinatesBlock))
        .filter((segment) => segment.length > 1)

      if (segments.length === 0) {
        return
      }

      placemarks.push({
        folderName,
        folderIndex,
        placemarkIndex,
        name: normalizeText(readFirstTagValue(placemarkBody, 'name')) || folderName,
        description: normalizeText(readFirstTagValue(placemarkBody, 'description')),
        styleUrl: readFirstTagValue(placemarkBody, 'styleUrl')?.trim(),
        segments,
      })
    })
  })

  return {
    sourceFile: basename(sourceFilePath),
    transportType,
    documentName,
    placemarks,
    styleColors,
    styleMaps,
  }
}

export function getPlacemarkColor(
  document: ParsedKmlDocument,
  placemark: ParsedKmlPlacemark,
) {
  return resolvePlacemarkColor(
    placemark,
    document.styleColors,
    document.styleMaps,
    document.transportType,
  )
}

import type { UniversityCampusNode } from '../ui/university-idle-types'

export interface CanvasSize {
  width: number
  height: number
}

export interface CampusNodeLayout extends UniversityCampusNode {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

export interface CampusSceneState {
  title: string
  subtitle: string
  focusLabel: string
  nodes: UniversityCampusNode[]
  selectedNodeId?: string | null
  timeMs?: number
}

export function buildCampusNodeLayout(
  size: CanvasSize,
  nodes: UniversityCampusNode[],
): CampusNodeLayout[] {
  const { width, height } = size
  const baseWidth = Math.max(280, Math.min(width * 0.2, 188))
  const baseHeight = Math.max(98, Math.min(height * 0.14, 132))
  const centerX = width * 0.5
  const centerY = height * 0.49
  const orbitX = width * 0.26
  const orbitY = height * 0.2

  return nodes.map((node, index) => {
    const anchor = node.anchor ?? { x: 0.5, y: 0.5 }
    const wobbleX = Math.sin(index * 1.37) * width * 0.018
    const wobbleY = Math.cos(index * 0.93) * height * 0.015
    const x = clamp(width * anchor.x + wobbleX, width * 0.08, width * 0.92)
    const y = clamp(height * anchor.y + wobbleY, height * 0.12, height * 0.9)
    const driftX = clamp(
      centerX + (anchor.x - 0.5) * orbitX,
      width * 0.12,
      width * 0.88,
    )
    const driftY = clamp(
      centerY + (anchor.y - 0.5) * orbitY,
      height * 0.14,
      height * 0.88,
    )
    const nodeWidth = Math.max(
      96,
      Math.min(baseWidth, width * (node.kind === 'core' ? 0.24 : 0.18)),
    )
    const nodeHeight = Math.max(
      80,
      Math.min(baseHeight, height * (node.kind === 'core' ? 0.14 : 0.12)),
    )
    const sizeBoost = node.selected ? 1.06 : 1

    return {
      ...node,
      x: node.primary ? centerX : (x + driftX) / 2,
      y: node.primary ? height * 0.28 : (y + driftY) / 2,
      width: nodeWidth * sizeBoost,
      height: nodeHeight * sizeBoost,
      radius: Math.min(nodeWidth, nodeHeight) * 0.23,
    }
  })
}

export function drawUniversityCampusScene(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  state: CampusSceneState,
): CampusNodeLayout[] {
  const layouts = buildCampusNodeLayout(size, state.nodes)
  const { width, height } = size

  drawBackdrop(ctx, width, height)
  drawCampusGround(ctx, width, height)
  drawCampusPaths(ctx, width, height, layouts)
  drawCampusLandmarks(ctx, width, height, state)
  drawCampusNodes(ctx, layouts, state)
  drawCampusOverlay(ctx, width, height, state)

  return layouts
}

export function hitTestCampusNode(
  layouts: CampusNodeLayout[],
  x: number,
  y: number,
): CampusNodeLayout | null {
  for (let index = layouts.length - 1; index >= 0; index -= 1) {
    const node = layouts[index]
    if (containsRoundedRect(node.x, node.y, node.width, node.height, node.radius, x, y)) {
      return node
    }
  }

  return null
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#0f172a')
  gradient.addColorStop(0.45, '#164e63')
  gradient.addColorStop(1, '#f8fafc')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.2, 24, width * 0.5, height * 0.2, width * 0.64)
  glow.addColorStop(0, 'rgba(103, 232, 249, 0.28)')
  glow.addColorStop(1, 'rgba(8, 145, 178, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
}

function drawCampusGround(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const groundTop = height * 0.34
  const groundGradient = ctx.createLinearGradient(0, groundTop, 0, height)
  groundGradient.addColorStop(0, '#ecfeff')
  groundGradient.addColorStop(0.5, '#dbeafe')
  groundGradient.addColorStop(1, '#f8fafc')
  ctx.fillStyle = groundGradient
  ctx.fillRect(0, groundTop, width, height - groundTop)

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  for (let index = 0; index < 12; index += 1) {
    const x = (((index * 97) % 11) / 10) * width
    const y = groundTop + (((index * 53) % 8) / 8) * (height - groundTop)
    ctx.beginPath()
    ctx.arc(x, y, 1.6 + (index % 3) * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCampusPaths(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layouts: CampusNodeLayout[],
) {
  const plazaY = height * 0.48
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)'
  ctx.lineWidth = Math.max(10, width * 0.014)
  ctx.beginPath()
  ctx.moveTo(width * 0.5, height * 0.22)
  ctx.quadraticCurveTo(width * 0.5, plazaY - height * 0.04, width * 0.5, plazaY)
  ctx.stroke()

  const plazaGradient = ctx.createRadialGradient(width * 0.5, plazaY, 8, width * 0.5, plazaY, width * 0.12)
  plazaGradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)')
  plazaGradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
  ctx.fillStyle = plazaGradient
  ctx.beginPath()
  ctx.arc(width * 0.5, plazaY, width * 0.12, 0, Math.PI * 2)
  ctx.fill()

  layouts.forEach((node) => {
    const baseX = width * 0.5
    const baseY = plazaY
    ctx.strokeStyle = node.selected ? 'rgba(34, 197, 94, 0.36)' : 'rgba(15, 23, 42, 0.08)'
    ctx.lineWidth = node.selected ? Math.max(6, width * 0.009) : Math.max(4, width * 0.006)
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.quadraticCurveTo((baseX + node.x) / 2, baseY - height * 0.14, node.x, node.y)
    ctx.stroke()
  })
}

function drawCampusLandmarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CampusSceneState,
) {
  const skylineTop = height * 0.16
  ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.1 + index * 0.18)
    const buildingWidth = width * (0.07 + (index % 2) * 0.025)
    const buildingHeight = height * (0.06 + (index % 3) * 0.018)
    roundedRect(ctx, x, skylineTop + (index % 2) * 8, buildingWidth, buildingHeight, 14)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = `600 ${Math.max(14, width * 0.024)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(state.title, width * 0.06, height * 0.06)
  ctx.fillStyle = 'rgba(255,255,255,0.76)'
  ctx.font = `500 ${Math.max(11, width * 0.015)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText(state.subtitle, width * 0.06, height * 0.06 + Math.max(18, width * 0.028))
}

function drawCampusNodes(
  ctx: CanvasRenderingContext2D,
  layouts: CampusNodeLayout[],
  state: CampusSceneState,
) {
  layouts.forEach((node, index) => {
    const selected = state.selectedNodeId === node.id || Boolean(node.selected)
    const tone = getNodeTone(node.kind, node.unlocked)
    const glow = ctx.createRadialGradient(node.x, node.y, 6, node.x, node.y, node.width * 0.8)
    glow.addColorStop(0, selected ? tone.glowSelected : tone.glow)
    glow.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.width * 0.56, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(node.x - node.width / 2, node.y - node.height / 2)
    const lift = selected ? -4 : 0
    const bodyGradient = ctx.createLinearGradient(0, 0, 0, node.height)
    bodyGradient.addColorStop(0, tone.top)
    bodyGradient.addColorStop(1, tone.bottom)
    ctx.fillStyle = bodyGradient
    ctx.strokeStyle = selected ? tone.borderSelected : tone.border
    ctx.lineWidth = selected ? 2.5 : 1.4
    roundedRect(ctx, 0, lift, node.width, node.height, 22)
    ctx.fill()
    ctx.stroke()

    const bannerHeight = Math.max(18, node.height * 0.22)
    ctx.fillStyle = selected ? tone.bannerSelected : tone.banner
    roundedRect(ctx, 0, lift, node.width, bannerHeight, 22)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.font = `700 ${Math.max(11, node.width * 0.11)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(node.kind.toUpperCase(), 14, lift + 10)

    ctx.fillStyle = selected ? '#ffffff' : '#f8fafc'
    ctx.font = `700 ${Math.max(13, node.width * 0.115)}px ui-sans-serif, system-ui, sans-serif`
    ctx.fillText(node.label, 14, lift + bannerHeight + 10)

    ctx.fillStyle = node.unlocked ? 'rgba(15,23,42,0.72)' : 'rgba(15,23,42,0.56)'
    ctx.font = `500 ${Math.max(10, node.width * 0.082)}px ui-sans-serif, system-ui, sans-serif`
    const detailLine = node.effectLabel ?? node.note ?? 'Listo para conectar'
    wrapText(ctx, detailLine, 14, lift + bannerHeight + 34, node.width - 28, 15)

    if (node.costLabel) {
      ctx.fillStyle = selected ? '#0f172a' : tone.costText
      ctx.font = `700 ${Math.max(10, node.width * 0.08)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(node.costLabel, 14, node.height - 20)
    }

    if (!node.unlocked) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
      roundedRect(ctx, 0, lift, node.width, node.height, 22)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.font = `700 ${Math.max(10, node.width * 0.082)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText('Bloqueado', node.width - 84, node.height - 20)
    }

    if (selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      roundedRect(ctx, -4, lift - 4, node.width + 8, node.height + 8, 26)
      ctx.stroke()
    }

    ctx.restore()

    if (index % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.beginPath()
      ctx.arc(node.x + node.width * 0.34, node.y - node.height * 0.2, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function drawCampusOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CampusSceneState,
) {
  const footerHeight = Math.max(42, height * 0.08)
  const footerY = height - footerHeight
  const footerGradient = ctx.createLinearGradient(0, footerY, 0, height)
  footerGradient.addColorStop(0, 'rgba(15, 23, 42, 0)')
  footerGradient.addColorStop(1, 'rgba(15, 23, 42, 0.18)')
  ctx.fillStyle = footerGradient
  ctx.fillRect(0, footerY, width, footerHeight)

  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.font = `600 ${Math.max(10, width * 0.014)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText(state.focusLabel, width * 0.06, height - 10)
}

function getNodeTone(kind: UniversityCampusNode['kind'], unlocked: boolean) {
  if (!unlocked) {
    return {
      top: '#cbd5e1',
      bottom: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.42)',
      borderSelected: 'rgba(255,255,255,0.42)',
      banner: 'rgba(15, 23, 42, 0.15)',
      bannerSelected: 'rgba(15, 23, 42, 0.26)',
      glow: 'rgba(148, 163, 184, 0.22)',
      glowSelected: 'rgba(226, 232, 240, 0.4)',
      costText: 'rgba(15,23,42,0.72)',
    }
  }

  switch (kind) {
    case 'core':
      return {
        top: '#ffffff',
        bottom: '#dbeafe',
        border: 'rgba(59, 130, 246, 0.48)',
        borderSelected: 'rgba(255,255,255,0.92)',
        banner: 'rgba(37, 99, 235, 0.96)',
        bannerSelected: 'rgba(15, 118, 110, 0.96)',
        glow: 'rgba(56, 189, 248, 0.32)',
        glowSelected: 'rgba(16, 185, 129, 0.42)',
        costText: '#1e3a8a',
      }
    case 'program':
      return {
        top: '#ecfeff',
        bottom: '#bae6fd',
        border: 'rgba(14, 165, 233, 0.42)',
        borderSelected: 'rgba(255,255,255,0.9)',
        banner: 'rgba(8, 145, 178, 0.96)',
        bannerSelected: 'rgba(14, 116, 144, 0.96)',
        glow: 'rgba(56, 189, 248, 0.34)',
        glowSelected: 'rgba(34, 197, 94, 0.42)',
        costText: '#0f766e',
      }
    case 'staff':
      return {
        top: '#fdf2f8',
        bottom: '#f9a8d4',
        border: 'rgba(236, 72, 153, 0.38)',
        borderSelected: 'rgba(255,255,255,0.9)',
        banner: 'rgba(190, 24, 93, 0.96)',
        bannerSelected: 'rgba(219, 39, 119, 0.96)',
        glow: 'rgba(244, 114, 182, 0.32)',
        glowSelected: 'rgba(236, 72, 153, 0.42)',
        costText: '#9d174d',
      }
    case 'upgrade':
      return {
        top: '#fff7ed',
        bottom: '#fdba74',
        border: 'rgba(249, 115, 22, 0.4)',
        borderSelected: 'rgba(255,255,255,0.9)',
        banner: 'rgba(234, 88, 12, 0.96)',
        bannerSelected: 'rgba(202, 138, 4, 0.96)',
        glow: 'rgba(251, 146, 60, 0.32)',
        glowSelected: 'rgba(245, 158, 11, 0.42)',
        costText: '#9a3412',
      }
    case 'expansion':
      return {
        top: '#f8fafc',
        bottom: '#c4b5fd',
        border: 'rgba(124, 58, 237, 0.38)',
        borderSelected: 'rgba(255,255,255,0.9)',
        banner: 'rgba(109, 40, 217, 0.96)',
        bannerSelected: 'rgba(124, 58, 237, 0.96)',
        glow: 'rgba(168, 85, 247, 0.28)',
        glowSelected: 'rgba(129, 140, 248, 0.4)',
        costText: '#6d28d9',
      }
    default:
      return {
        top: '#f8fafc',
        bottom: '#e2e8f0',
        border: 'rgba(100, 116, 139, 0.36)',
        borderSelected: 'rgba(255,255,255,0.9)',
        banner: 'rgba(51, 65, 85, 0.96)',
        bannerSelected: 'rgba(15, 23, 42, 0.96)',
        glow: 'rgba(148, 163, 184, 0.24)',
        glowSelected: 'rgba(203, 213, 225, 0.38)',
        costText: '#334155',
      }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/)
  let line = ''
  let offsetY = 0

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + offsetY)
      offsetY += lineHeight
      line = word
    } else {
      line = testLine
    }

    if (index === words.length - 1 && line) {
      ctx.fillText(line, x, y + offsetY)
    }
  })
}

function containsRoundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  _radius: number,
  pointX: number,
  pointY: number,
) {
  const left = x - width / 2
  const top = y - height / 2
  return pointX >= left && pointX <= left + width && pointY >= top && pointY <= top + height
}

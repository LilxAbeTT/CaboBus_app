import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { UniversityIdleAction, UniversityIdleViewState } from '../ui/university-idle-types'
import {
  drawUniversityCampusScene,
  hitTestCampusNode,
  type CampusNodeLayout,
} from './university-idle-canvas'

export interface UniversityIdleCampusCanvasProps {
  state: UniversityIdleViewState
  onAction?: (action: UniversityIdleAction) => void
  className?: string
}

interface CanvasMetrics {
  width: number
  height: number
  dpr: number
}

export function UniversityIdleCampusCanvas({
  state,
  onAction,
  className,
}: UniversityIdleCampusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState<CanvasMetrics>({ width: 0, height: 0, dpr: 1 })
  const layoutsRef = useRef<CampusNodeLayout[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      setMetrics({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
        dpr,
      })
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || metrics.width === 0 || metrics.height === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    canvas.width = Math.round(metrics.width * metrics.dpr)
    canvas.height = Math.round(metrics.height * metrics.dpr)
    canvas.style.width = `${metrics.width}px`
    canvas.style.height = `${metrics.height}px`
    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0)
    ctx.clearRect(0, 0, metrics.width, metrics.height)

    layoutsRef.current = drawUniversityCampusScene(ctx, metrics, {
      title: state.campus.name,
      subtitle: state.campus.subtitle,
      focusLabel: state.campus.focusLabel,
      nodes: state.campus.nodes,
      selectedNodeId: state.campus.nodes.find((node) => node.selected)?.id ?? null,
      timeMs: 0,
    })
  }, [metrics.dpr, metrics.height, metrics.width, state])

  function resolvePointerTarget(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return hitTestCampusNode(layoutsRef.current, x, y)
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const targetNode = resolvePointerTarget(event)
    if (!targetNode) {
      return
    }

    event.preventDefault()
    onAction?.({ type: 'selectNode', nodeId: targetNode.id })
  }

  return (
    <div ref={containerRef} className={`university-idle-canvas-frame ${className ?? ''}`.trim()}>
      <canvas
        ref={canvasRef}
        className="university-idle-canvas"
        onPointerDown={handlePointerDown}
        aria-label="Campus universitario interactivo"
        role="img"
      />
      <div className="university-idle-canvas-hint">
        Toca un edificio para ver su impacto y acciones.
      </div>
    </div>
  )
}

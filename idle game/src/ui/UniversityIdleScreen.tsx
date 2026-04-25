import type {
  UniversityIdleAction,
  UniversityIdlePanelSection,
  UniversityIdleViewState,
  UniversityTab,
} from './university-idle-types'
import { UniversityIdleCampusCanvas } from '../canvas/UniversityIdleCampusCanvas'
import { UNIVERSITY_IDLE_TABS } from './university-idle-types'

export interface UniversityIdleScreenProps {
  state: UniversityIdleViewState
  onAction?: (action: UniversityIdleAction) => void
  className?: string
}

export function UniversityIdleScreen({
  state,
  onAction,
  className,
}: UniversityIdleScreenProps) {
  const selectedNode = state.campus.nodes.find((node) => node.selected) ?? state.campus.nodes[0]
  const activePanels = state.panels.filter((panel) => panel.tab === state.activeTab)

  return (
    <main className={`university-idle-shell ${className ?? ''}`.trim()}>
      <section className="university-idle-hero">
        <div>
          <p className="university-idle-eyebrow">Idle universitario</p>
          <h1 className="university-idle-title">{state.title}</h1>
          <p className="university-idle-subtitle">{state.subtitle}</p>
        </div>

        <div className="university-idle-hero-status">
          {state.statusPills.map((pill) => (
            <span key={pill} className="university-idle-pill">
              {pill}
            </span>
          ))}
          <span className="university-idle-last-sync">{state.lastSyncLabel}</span>
        </div>
      </section>

      <section className="university-idle-hud">
        {state.stats.map((stat) => (
          <article
            key={stat.label}
            className={`university-idle-stat university-idle-stat--${stat.tone ?? 'neutral'}`}
          >
            <p className="university-idle-stat-label">{stat.label}</p>
            <p className="university-idle-stat-value">{stat.value}</p>
            <p className="university-idle-stat-hint">{stat.hint}</p>
          </article>
        ))}
      </section>

      <section className="university-idle-campus">
        <div className="university-idle-campus-header">
          <div>
            <p className="university-idle-section-eyebrow">{state.campus.name}</p>
            <h2 className="university-idle-section-title">Vista del campus</h2>
          </div>
          <div className="university-idle-campus-chips">
            <span>{state.campus.subtitle}</span>
            <span>{state.campus.focusLabel}</span>
          </div>
        </div>

        <UniversityIdleCampusCanvas state={state} onAction={onAction} />

        <div className="university-idle-campus-detail">
          <div>
            <p className="university-idle-detail-eyebrow">Nodo activo</p>
            <h3 className="university-idle-detail-title">
              {selectedNode?.label ?? 'Selecciona un edificio'}
            </h3>
            <p className="university-idle-detail-copy">
              {selectedNode?.effectLabel ?? state.campus.focusLabel}
            </p>
          </div>

          <div className="university-idle-detail-actions">
            {selectedNode?.costLabel ? (
              <button
                type="button"
                className="university-idle-action-button university-idle-action-button--primary"
                onClick={() => onAction?.({ type: 'buyNode', nodeId: selectedNode.id })}
              >
                Desbloquear {selectedNode.costLabel}
              </button>
            ) : null}

            <button
              type="button"
              className="university-idle-action-button university-idle-action-button--secondary"
              onClick={() => onAction?.({ type: 'expandCampus' })}
            >
              Expandir campus
            </button>
          </div>
        </div>
      </section>

      <nav className="university-idle-tabs" aria-label="Secciones del juego">
        {UNIVERSITY_IDLE_TABS.map((tab) => {
          const active = state.activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              className={`university-idle-tab ${active ? 'university-idle-tab--active' : ''}`}
              onClick={() => onAction?.({ type: 'selectTab', tab })}
            >
              {formatTabLabel(tab)}
            </button>
          )
        })}
      </nav>

      <section className="university-idle-panels">
        {activePanels.map((panel) => (
          <UniversityIdlePanel key={panel.id} panel={panel} onAction={onAction} />
        ))}
      </section>

      {state.footerNote ? <footer className="university-idle-footer">{state.footerNote}</footer> : null}
    </main>
  )
}

interface UniversityIdlePanelProps {
  panel: UniversityIdlePanelSection
  onAction?: (action: UniversityIdleAction) => void
}

function UniversityIdlePanel({ panel, onAction }: UniversityIdlePanelProps) {
  return (
    <article className="university-idle-panel">
      <div className="university-idle-panel-copy">
        <p className="university-idle-section-eyebrow">{panel.eyebrow}</p>
        <h3 className="university-idle-panel-title">{panel.title}</h3>
        <p className="university-idle-panel-description">{panel.description}</p>
      </div>

      <div className="university-idle-panel-grid">
        {panel.items.map((item) => (
          <div key={item.label} className="university-idle-panel-item">
            <p className="university-idle-panel-item-label">{item.label}</p>
            <p className="university-idle-panel-item-value">{item.value}</p>
            {item.note ? <p className="university-idle-panel-item-note">{item.note}</p> : null}
          </div>
        ))}
      </div>

      {panel.actions?.length ? (
        <div className="university-idle-panel-actions">
          {panel.actions.map((button) => (
            <button
              key={button.label}
              type="button"
              className={`university-idle-action-button university-idle-action-button--${button.tone ?? 'ghost'}`}
              onClick={() => onAction?.(button.action)}
            >
              {button.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function formatTabLabel(tab: UniversityTab) {
  switch (tab) {
    case 'campus':
      return 'Campus'
    case 'programs':
      return 'Carreras'
    case 'staff':
      return 'Personal'
    case 'expansion':
      return 'Expansion'
    case 'prestige':
      return 'Prestigio'
    default:
      return tab
  }
}

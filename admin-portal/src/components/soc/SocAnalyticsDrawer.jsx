import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { eventsByType, fmt, severityBreakdown } from '../../utils/socMetrics';
import { SocDonut, SocHBarList, SocLineArea } from './SocChartPrimitives';
import { IconOperationalHub } from './socIcons';
import SocOperationalCentral from './SocOperationalCentral';

const SEV_COLORS = {
  CRITICAL: '#ff4040',
  HIGH: '#ff8800',
  MEDIUM: '#b44dff',
  LOW: '#00d4ff',
};

const SEV_LABELS = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
};

export const ANALYTICS_TOOL_IDS = ['events', 'timeline', 'severity'];
export const OPERATIONAL_TOOL_ID = 'operational';
export const FLOW_TOOL_ID = 'flow';

export const ALL_TOOL_IDS = [...ANALYTICS_TOOL_IDS, OPERATIONAL_TOOL_ID, FLOW_TOOL_ID];

const TOOLS = [
  {
    id: 'events',
    label: 'Eventos por Tipo',
    tooltip: 'Eventos por Tipo',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Linha do Tempo',
    tooltip: 'Linha do Tempo',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
      </svg>
    ),
  },
  {
    id: 'severity',
    label: 'Severidade dos Alertas',
    tooltip: 'Severidade dos Alertas',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M12 2L4 5v6c0 5.25 3.4 10.15 8 11.35C16.6 21.15 20 16.25 20 11V5l-8-3zm-1 14v-2h2v2h-2zm0-4V8h2v4h-2z" />
      </svg>
    ),
  },
  {
    id: OPERATIONAL_TOOL_ID,
    label: 'Central Operacional',
    tooltip: 'Central Operacional',
    icon: <IconOperationalHub size={16} />,
  },
  {
    id: FLOW_TOOL_ID,
    label: 'Fluxo de ameaças',
    tooltip: 'Visualizar fluxo temporal e volumétrico de ameaças',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M3 12h2l3-9 4 18 3-12 2 3h4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Empty state operacional — metadados somente quando fornecidos (sem inventar valores). */
function SocPanelEmptyState({ title, description, meta }) {
  const rows = (meta || []).filter((m) => m.value != null && m.value !== '');
  return (
    <div className="soc-panel-empty-state" role="status">
      <div className="soc-panel-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="soc-panel-empty-title">{title}</p>
      <p className="soc-panel-empty-desc">{description}</p>
      {rows.length > 0 && (
        <dl className="soc-panel-empty-meta">
          {rows.map(({ label, value }) => (
            <div key={label} className="soc-panel-empty-meta-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Rodapé técnico de proveniência — apresentação apenas, sem alterar dados. */
function PanelSource({ lines }) {
  const items = (lines || []).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="soc-panel-source" role="note">
      <span className="soc-panel-source-label">Fonte</span>
      {items.map((line) => (
        <span key={line} className="soc-panel-source-line">{line}</span>
      ))}
    </div>
  );
}

function EventsPanel({ data }) {
  const baseline = data?.phase_b?.behavioral_baseline;
  const byType = useMemo(() => eventsByType(baseline), [baseline]);
  const rawTypes = baseline?.alerts_24h_by_type || [];
  const totalEvents = rawTypes.reduce((s, r) => s + (r.count || 0), 0);

  if (!byType.length) {
    return (
      <div className="soc-analytics-panel-content">
        <SocPanelEmptyState
          title="SEM CATEGORIAS DE ALERTA"
          description="Não há alertas threat-watch categorizados nas últimas 24 horas para exibir por tipo."
          meta={[
            { label: 'Tipos distintos', value: rawTypes.length },
            { label: 'Eventos agregados (24h)', value: totalEvents },
          ]}
        />
        <PanelSource
          lines={[
            'phase_b.behavioral_baseline.alerts_24h_by_type',
            'Threat-watch, 24h',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="soc-analytics-panel-content">
      <SocHBarList rows={byType} emptyLabel="Sem categorias de alerta nas últimas 24h." />
      <PanelSource
        lines={[
          'phase_b.behavioral_baseline.alerts_24h_by_type',
          'Threat-watch, 24h',
        ]}
      />
    </div>
  );
}

function TimelinePanel({ data }) {
  const hourly = data?.charts?.attacks_per_hour || [];
  const hasData = hourly.some((p) => p.count > 0);
  const eventCount = hourly.reduce((s, p) => s + (p.count || 0), 0);
  const activeBuckets = hourly.filter((p) => p.count > 0).length;

  if (!hasData) {
    return (
      <div className="soc-analytics-panel-content">
        <h3 className="soc-panel-subtitle">Linha do Tempo de Ameaças</h3>
        <SocPanelEmptyState
          title="TELEMETRIA TEMPORAL INSUFICIENTE"
          description="Não há eventos com dados temporais suficientes para construir uma linha do tempo confiável na janela de 24h UTC."
          meta={[
            { label: 'Buckets observados (24h)', value: hourly.length || null },
            { label: 'Eventos na série', value: eventCount },
            { label: 'Buckets com atividade', value: activeBuckets },
          ]}
        />
        <PanelSource
          lines={[
            'charts.attacks_per_hour',
            'Threat-watch com timestamp ISO',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="soc-analytics-panel-content">
      <h3 className="soc-panel-subtitle">Linha do Tempo de Ameaças</h3>
      <SocLineArea series={hourly} emptyLabel="TELEMETRIA TEMPORAL INSUFICIENTE" />
      <PanelSource
        lines={[
          'charts.attacks_per_hour',
          `Threat-watch, 24h UTC · ${eventCount} eventos · ${activeBuckets} buckets ativos`,
        ]}
      />
    </div>
  );
}

function SeverityPanel({ data }) {
  const { buckets, total: sevTotal } = useMemo(
    () => severityBreakdown(data?.critical_events),
    [data?.critical_events]
  );
  const sevSegments = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((k) => ({
    key: k,
    label: SEV_LABELS[k],
    value: buckets[k],
    color: SEV_COLORS[k],
  }));
  const activeSegments = sevSegments.filter((s) => s.value > 0);

  if (sevTotal <= 0) {
    return (
      <div className="soc-analytics-panel-content">
        <SocPanelEmptyState
          title="SEM EVENTOS CLASSIFICADOS"
          description="Não há eventos em critical_events com severidade registrada no snapshot actual."
          meta={[
            { label: 'Eventos analisados', value: (data?.critical_events || []).length },
          ]}
        />
        <PanelSource lines={['critical_events', 'Severidade real']} />
      </div>
    );
  }

  return (
    <div className="soc-analytics-panel-content">
      <div className="soc-sev-block">
        <div className="soc-sev-body">
          <SocDonut
            segments={sevSegments}
            total={sevTotal}
            centerLabel="TOTAL"
            size={120}
            emptyLabel="Sem eventos críticos classificados."
          />
          <ul className="soc-decomp-legend soc-decomp-legend--compact soc-sev-legend">
            {activeSegments.map((seg) => (
              <li key={seg.key}>
                <span className="soc-legend-dot" style={{ background: seg.color }} />
                <span className="soc-legend-name">{seg.label}</span>
                <span className="soc-legend-val" style={{ color: seg.color }}>{fmt(seg.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <PanelSource
        lines={[
          'critical_events',
          `Severidade real · total ${fmt(sevTotal)} = soma das categorias exibidas`,
        ]}
      />
    </div>
  );
}

function OperationalPanel({ centralProps }) {
  if (!centralProps) return <p className="muted">Sem telemetria operacional.</p>;
  return <SocOperationalCentral {...centralProps} />;
}

const PANELS = {
  events: EventsPanel,
  timeline: TimelinePanel,
  severity: SeverityPanel,
  operational: OperationalPanel,
};

export function SocToolRail({ activeTool, onToolClick, toolButtonRefs }) {
  return (
    <div className="soc-tool-rail" role="toolbar" aria-label="Ferramentas analíticas SOC">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          ref={(el) => {
            if (toolButtonRefs?.current) toolButtonRefs.current[tool.id] = el;
          }}
          type="button"
          className={`soc-tool-btn${activeTool === tool.id ? ' soc-tool-btn--active' : ''}${tool.id === OPERATIONAL_TOOL_ID ? ' soc-tool-btn--operational' : ''}${tool.id === FLOW_TOOL_ID ? ' soc-tool-btn--flow' : ''}`}
          onClick={() => onToolClick(tool.id)}
          title={tool.tooltip || tool.label}
          aria-label={tool.tooltip || tool.label}
          data-tip={tool.tooltip || tool.label}
          aria-pressed={activeTool === tool.id}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

export default function SocAnalyticsDrawer({
  activeTool,
  data,
  onClose,
  centralProps,
  returnFocusRef,
}) {
  const drawerRef = useRef(null);
  const isOperational = activeTool === OPERATIONAL_TOOL_ID;

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      returnFocusRef?.current?.focus?.();
    });
  }, [onClose, returnFocusRef]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (activeTool) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeTool, handleKeyDown]);

  useEffect(() => {
    if (activeTool && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [activeTool]);

  if (!activeTool) return null;

  const Panel = PANELS[activeTool];
  if (!Panel) return null;

  const toolMeta = TOOLS.find((t) => t.id === activeTool);

  return (
    <>
      {isOperational && (
        <button
          type="button"
          className="soc-legacy-drawer-overlay"
          aria-label="Fechar Central Operacional"
          onClick={handleClose}
        />
      )}
      <div
        ref={drawerRef}
        className={`soc-analytics-drawer${isOperational ? ' soc-analytics-drawer--operational' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={toolMeta?.label || 'Painel analítico'}
        tabIndex={-1}
      >
        <div className="soc-analytics-drawer-header">
          <span className="soc-analytics-drawer-title">{toolMeta?.label}</span>
          <button
            type="button"
            className="soc-analytics-drawer-close"
            onClick={handleClose}
            aria-label="Fechar painel analítico"
          >
            ✕
          </button>
        </div>
        <div className="soc-analytics-drawer-body">
          {activeTool === OPERATIONAL_TOOL_ID ? (
            <OperationalPanel centralProps={centralProps} />
          ) : (
            <Panel data={data} />
          )}
        </div>
      </div>
    </>
  );
}

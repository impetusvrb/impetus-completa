/**
 * AIOI-P0C — Widget Fila Executiva CEO (CEO Queue Widget)
 *
 * Fonte exclusiva: GET /api/aioi/queue
 * ORG-1: aioi_executive_queue_snapshot é AUTHORITATIVE.
 * Proibido: cálculo de score, ranking paralelo, fonte F47 direta.
 * READ ONLY · NO COGNITIVE ACTIVATION
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi } from '../../../services/api';
import {
  AlertTriangle,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
  Layers
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────── */

const BAND_CONFIG = {
  critical: { label: 'CRÍTICO', cls: 'aioi-queue__band--critical' },
  high:     { label: 'ALTO',    cls: 'aioi-queue__band--high' },
  medium:   { label: 'MÉDIO',   cls: 'aioi-queue__band--medium' },
  low:      { label: 'BAIXO',   cls: 'aioi-queue__band--low' }
};

const CATEGORY_LABELS = {
  equipment_failure:    'Falha de Equipamento',
  equipment_degradation:'Degradação',
  production_deviation: 'Desvio de Produção',
  quality_issue:        'Problema de Qualidade',
  safety_incident:      'Incidente de Segurança',
  maintenance_required: 'Manutenção Necessária',
  communication_risk:   'Risco de Comunicação',
  task_overdue:         'Tarefa Atrasada',
  environmental_alert:  'Alerta Ambiental',
  kpi_deviation:        'Desvio de KPI',
  system_event:         'Evento de Sistema'
};

const STATUS_LABELS = {
  open:             'Aberto',
  triaged:          'Triado',
  pending_approval: 'Aguardando Aprovação',
  approved:         'Aprovado',
  in_progress:      'Em Andamento',
  resolved:         'Resolvido',
  dismissed:        'Descartado',
  escalated:        'Escalonado'
};

const BREACH_CONFIG = {
  ON_TRACK: { label: 'No prazo',  cls: 'aioi-queue__breach--ok' },
  AT_RISK:  { label: 'Em risco',  cls: 'aioi-queue__breach--risk' },
  BREACHED: { label: 'Violado',   cls: 'aioi-queue__breach--breach' }
};

function formatAge(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
}

function countByBand(items) {
  const c = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of (items || [])) {
    const b = item.priority_band;
    if (c[b] !== undefined) c[b]++;
  }
  return c;
}

/* ─── sub-componentes ─────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="cc-widget aioi-queue aioi-queue--loading">
      <div className="aioi-queue__header">
        <div className="aioi-queue__skeleton-title" />
      </div>
      <div className="aioi-queue__indicators">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aioi-queue__ind-card aioi-queue__ind-card--skeleton" />
        ))}
      </div>
      <div className="aioi-queue__list">
        {[1, 2, 3].map(i => (
          <div key={i} className="aioi-queue__item aioi-queue__item--skeleton" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message, queueActive }) {
  return (
    <div className="cc-widget aioi-queue">
      <div className="aioi-queue__header">
        <span className="aioi-queue__header-icon"><Layers size={16} /></span>
        <span className="aioi-queue__header-title">FILA EXECUTIVA CEO</span>
        <span className="aioi-queue__header-badge">AIOI · P0</span>
      </div>
      <div className="aioi-queue__empty">
        <Activity size={28} className="aioi-queue__empty-icon" />
        <p className="aioi-queue__empty-msg">
          {queueActive === false
            ? 'Fila AIOI inativa. Aguardando ativação do piloto.'
            : (message || 'Sem eventos operacionais na fila.')}
        </p>
        <span className="aioi-queue__empty-sub">
          {queueActive === false
            ? 'IMPETUS_AIOI_QUEUE_ACTIVE=false'
            : 'SNAPSHOT_NOT_MATERIALIZED'}
        </span>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="cc-widget aioi-queue cc-widget--error">
      <div className="aioi-queue__header">
        <span className="aioi-queue__header-icon"><AlertTriangle size={16} /></span>
        <span className="aioi-queue__header-title">FILA EXECUTIVA CEO</span>
      </div>
      <div className="aioi-queue__empty">
        <p className="aioi-queue__empty-msg">Erro ao carregar fila AIOI.</p>
        {onRetry && (
          <button className="aioi-queue__retry" onClick={onRetry}>
            <RefreshCw size={12} /> Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

function IndicatorCard({ value, label, cls }) {
  return (
    <div className={`aioi-queue__ind-card ${cls || ''}`}>
      <span className="aioi-queue__ind-value">{value}</span>
      <span className="aioi-queue__ind-label">{label}</span>
    </div>
  );
}

function QueueItem({ item }) {
  const band = BAND_CONFIG[item.priority_band] || { label: item.priority_band, cls: '' };
  const breach = BREACH_CONFIG[item.breach_state] || BREACH_CONFIG.ON_TRACK;
  const catLabel = CATEGORY_LABELS[item.category] || item.category;
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  return (
    <div className={`aioi-queue__item ${band.cls}`}>
      <div className="aioi-queue__item-rank">
        #{item.rank ?? '—'}
      </div>

      <div className="aioi-queue__item-main">
        <div className="aioi-queue__item-top">
          <span className={`aioi-queue__band-badge ${band.cls}`}>{band.label}</span>
          <span className="aioi-queue__item-score">{item.priority_score ?? 0}</span>
          <span className="aioi-queue__item-cat">{catLabel}</span>
          {item.scores_provisional && (
            <span className="aioi-queue__item-provisional" title="Score provisório">~</span>
          )}
        </div>

        <div className="aioi-queue__item-mid">
          <span className="aioi-queue__item-status">{statusLabel}</span>
          {item.entity_type && (
            <span className="aioi-queue__item-entity">{item.entity_type}</span>
          )}
          <span className={`aioi-queue__breach-tag ${breach.cls}`}>{breach.label}</span>
        </div>

        <div className="aioi-queue__item-bot">
          <span className="aioi-queue__item-meta">
            <Clock size={10} />
            {formatTs(item.created_at)}
          </span>
          <span className="aioi-queue__item-meta">
            <Activity size={10} />
            {formatAge(item.aging_hours)}
          </span>
          {item.correlation_id && (
            <span className="aioi-queue__item-corr" title={item.correlation_id}>
              {item.correlation_id.slice(0, 12)}…
            </span>
          )}
        </div>
      </div>

      <div className="aioi-queue__item-arrow">
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

/* ─── widget principal ────────────────────────────────────────── */

const REFRESH_MS = 60_000;

export default function WidgetAIOIQueue() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setState(s => ({ ...s, status: s.status === 'ok' ? 'refreshing' : 'loading' }));
    try {
      const res = await aioi.getQueue({ limit: 20 });
      const data = res?.data;
      setState({ status: 'ok', data });
      setLastUpdated(new Date());
    } catch (err) {
      setState({ status: 'error', data: null });
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (state.status === 'loading') return <Skeleton />;
  if (state.status === 'error') return <ErrorState onRetry={load} />;

  const data = state.data;

  if (!data?.ok || data.empty || !data.items?.length) {
    return <EmptyState message={data?.message} queueActive={data?.queue_active} />;
  }

  const items = data.items || [];
  const bands = countByBand(items);
  const total = data.item_count || items.length;
  const isRefreshing = state.status === 'refreshing';

  return (
    <div className="cc-widget aioi-queue">
      {/* ─ cabeçalho ─ */}
      <div className="aioi-queue__header">
        <span className="aioi-queue__header-icon"><Layers size={14} /></span>
        <span className="aioi-queue__header-title">FILA EXECUTIVA CEO</span>
        <span className="aioi-queue__header-badge">AIOI · P0</span>
        <button
          className={`aioi-queue__refresh-btn ${isRefreshing ? 'aioi-queue__refresh-btn--spin' : ''}`}
          onClick={load}
          title="Atualizar fila"
          aria-label="Atualizar fila executiva"
        >
          <RefreshCw size={12} />
        </button>
        {lastUpdated && (
          <span className="aioi-queue__updated">
            {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ─ indicadores de faixa ─ */}
      <div className="aioi-queue__indicators">
        <IndicatorCard value={total}           label="Total"    cls="aioi-queue__ind-card--total" />
        <IndicatorCard value={bands.critical}  label="Crítico"  cls="aioi-queue__ind-card--critical" />
        <IndicatorCard value={bands.high}      label="Alto"     cls="aioi-queue__ind-card--high" />
        <IndicatorCard value={bands.medium + bands.low} label="Médio/Baixo" cls="aioi-queue__ind-card--medium" />
      </div>

      {/* ─ fonte e snapshot ─ */}
      <div className="aioi-queue__source-bar">
        <span className="aioi-queue__source-label">
          {data.authority?.toUpperCase() || 'AIOI'} · {data.source || 'aioi_executive_queue_snapshot'}
        </span>
        {data.generated_at && (
          <span className="aioi-queue__source-ts">
            snapshot: {formatTs(data.generated_at)}
          </span>
        )}
      </div>

      {/* ─ lista de itens ─ */}
      <div className="aioi-queue__list" role="list" aria-label="Fila executiva CEO">
        {items.map(item => (
          <QueueItem key={item.ioe_id || item.rank} item={item} />
        ))}
      </div>

      {/* ─ rodapé ─ */}
      <div className="aioi-queue__footer">
        <span className="aioi-queue__footer-info">
          runtime_enabled: false · cognitive_execution_allowed: false
        </span>
      </div>
    </div>
  );
}

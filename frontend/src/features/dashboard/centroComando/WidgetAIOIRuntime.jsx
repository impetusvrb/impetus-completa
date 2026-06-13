/**
 * AIOI-P1A.7 — Widget Runtime Contínuo (Observabilidade Operacional)
 *
 * Fonte: GET /api/aioi/runtime/health + /api/aioi/runtime/metrics
 * READ ONLY · NO COGNITIVE ACTIVATION · ADDITIVE ONLY
 * Não altera WidgetAIOIQueue.
 *
 * Exibe:
 *   - Estado do continuous worker
 *   - Throughput (classificados, projetados)
 *   - Outbox: pending / failed / DLQ
 *   - Latências p50 / p95 / p99
 *   - Invariants de segurança
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi } from '../../../services/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Radio,
  BarChart2,
  ShieldCheck
} from 'lucide-react';

const POLL_INTERVAL_MS = 30_000;

/* ─── sub-components ──────────────────────────────────────────── */

function StatusDot({ ok, running }) {
  const color = !ok ? 'var(--red)' : running ? 'var(--green)' : 'var(--amber)';
  return (
    <span
      className="aioi-runtime__dot"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        animation: running && ok ? 'blink 1.4s infinite' : 'none',
        flexShrink: 0
      }}
    />
  );
}

function MetricTile({ label, value, unit = '', accent = '--text-secondary', icon: Icon }) {
  return (
    <div className="aioi-runtime__tile">
      {Icon && <Icon size={13} style={{ color: `var(${accent})`, marginBottom: 2 }} />}
      <span className="aioi-runtime__tile-value" style={{ color: `var(${accent})` }}>
        {value ?? '—'}
        {unit && <span className="aioi-runtime__tile-unit">{unit}</span>}
      </span>
      <span className="aioi-runtime__tile-label">{label}</span>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────── */

export default function WidgetAIOIRuntime() {
  const [health, setHealth]     = useState(null);
  const [metrics, setMetrics]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([
        aioi.getRuntimeHealth(),
        aioi.getRuntimeMetrics()
      ]);

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value?.data ?? healthRes.value);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value?.data ?? metricsRes.value);
      }

      setError(null);
      setLastFetch(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Erro ao carregar runtime');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const tid = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(tid);
  }, [fetchData]);

  const ok      = health?.ok      ?? false;
  const running = health?.worker_running ?? false;
  const invariantsOk = health?.invariants_preserved ?? true;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="impetus-card aioi-runtime__card">
        <div className="aioi-runtime__header">
          <Radio size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-runtime__title">AIOI RUNTIME</span>
        </div>
        <div className="aioi-runtime__loading">
          <RefreshCw size={16} className="spin" style={{ color: 'var(--text-tertiary)' }} />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error && !health) {
    return (
      <div className="impetus-card aioi-runtime__card">
        <div className="aioi-runtime__header">
          <Radio size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-runtime__title">AIOI RUNTIME</span>
        </div>
        <div className="aioi-runtime__error">
          <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const h = health || {};
  const m = metrics || {};

  const runtimeMode  = h.runtime_mode || 'operational_only';
  const workerStatus = running ? 'ATIVO' : (h.continuous_worker_enabled ? 'PARADO' : 'DESATIVADO');

  return (
    <div className="impetus-card aioi-runtime__card">
      {/* Header */}
      <div className="aioi-runtime__header">
        <div className="aioi-runtime__header-left">
          <Radio size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-runtime__title">AIOI RUNTIME</span>
          <span className="aioi-runtime__mode">{runtimeMode.toUpperCase().replace('_', ' ')}</span>
        </div>
        <div className="aioi-runtime__header-right">
          <StatusDot ok={ok} running={running} />
          <span
            className="aioi-runtime__worker-status"
            style={{
              color: running ? 'var(--green)' : h.continuous_worker_enabled ? 'var(--amber)' : 'var(--text-tertiary)'
            }}
          >
            {workerStatus}
          </span>
        </div>
      </div>

      {/* Invariants badge */}
      <div
        className="aioi-runtime__invariants"
        style={{ color: invariantsOk ? 'var(--green)' : 'var(--red)' }}
      >
        <ShieldCheck size={11} />
        <span>INVARIANTS {invariantsOk ? 'PRESERVADOS' : 'VIOLADOS'}</span>
      </div>

      {/* Throughput metrics */}
      <div className="aioi-runtime__section-label">THROUGHPUT</div>
      <div className="aioi-runtime__tiles">
        <MetricTile
          label="Ingeridos"
          value={m.ingested_events ?? h.run_count ?? 0}
          accent="--cyan"
          icon={Activity}
        />
        <MetricTile
          label="Classificados"
          value={m.classified_events ?? 0}
          accent="--green"
          icon={BarChart2}
        />
        <MetricTile
          label="Snapshots"
          value={m.projected_snapshots ?? 0}
          accent="--text-secondary"
          icon={CheckCircle}
        />
        <MetricTile
          label="Ciclos"
          value={m.cycle_count ?? h.run_count ?? 0}
          accent="--text-secondary"
        />
      </div>

      {/* Outbox status */}
      <div className="aioi-runtime__section-label">OUTBOX</div>
      <div className="aioi-runtime__tiles">
        <MetricTile
          label="Pendente"
          value={m.outbox_pending ?? h.outbox_pending ?? 0}
          accent={
            (m.outbox_pending ?? h.outbox_pending ?? 0) > 0 ? '--amber' : '--text-secondary'
          }
        />
        <MetricTile
          label="Entregue"
          value={m.outbox_delivered ?? 0}
          accent="--green"
        />
        <MetricTile
          label="Falhou"
          value={m.outbox_failed ?? h.outbox_failed ?? 0}
          accent={
            (m.outbox_failed ?? h.outbox_failed ?? 0) > 0 ? '--red' : '--text-secondary'
          }
          icon={(m.outbox_failed ?? h.outbox_failed ?? 0) > 0 ? AlertTriangle : undefined}
        />
        <MetricTile
          label="DLQ"
          value={m.dlq_count ?? h.dlq_count ?? 0}
          accent={
            (m.dlq_count ?? h.dlq_count ?? 0) > 0 ? '--red' : '--text-secondary'
          }
        />
      </div>

      {/* Latency */}
      <div className="aioi-runtime__section-label">LATÊNCIA CICLO (ms)</div>
      <div className="aioi-runtime__tiles">
        <MetricTile
          label="p50"
          value={m.latency_p50 ?? h.latency_p95 ?? 0}
          unit="ms"
          accent="--text-secondary"
          icon={Clock}
        />
        <MetricTile
          label="p95"
          value={m.latency_p95 ?? h.latency_p95 ?? 0}
          unit="ms"
          accent={
            (m.latency_p95 ?? h.latency_p95 ?? 0) > 5000 ? '--amber' : '--text-secondary'
          }
        />
        <MetricTile
          label="p99"
          value={m.latency_p99 ?? 0}
          unit="ms"
          accent={
            (m.latency_p99 ?? 0) > 10000 ? '--red' : '--text-secondary'
          }
        />
      </div>

      {/* Footer */}
      <div className="aioi-runtime__footer">
        <span className="aioi-runtime__tenants">
          {h.pilot_tenants_count ?? 0} tenant(s) piloto
        </span>
        {lastFetch && (
          <span className="aioi-runtime__last-fetch">
            {new Date(lastFetch).toLocaleTimeString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}

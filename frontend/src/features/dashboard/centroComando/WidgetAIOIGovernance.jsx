/**
 * AIOI-P1D.5 — Widget Governance & Lifecycle (READ ONLY)
 *
 * Fonte: GET /api/aioi/governance/status | capacity | retention
 * Exibe retenção, crescimento, pressão de backlog e status de capacidade.
 * Nenhuma ação operacional — observabilidade apenas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi } from '../../../services/api';
import {
  Shield,
  Database,
  HardDrive,
  AlertTriangle,
  RefreshCw,
  Archive,
  TrendingUp
} from 'lucide-react';

const POLL_INTERVAL_MS = 60_000;

const STATUS_COLORS = {
  NORMAL: 'var(--green)',
  WARNING: 'var(--amber)',
  HIGH: 'var(--orange)',
  CRITICAL: 'var(--red)'
};

function StatusBadge({ status }) {
  const s = status || 'NORMAL';
  const color = STATUS_COLORS[s] || 'var(--text-secondary)';
  return (
    <span
      className="aioi-gov__status-badge"
      style={{ color, borderColor: color }}
    >
      {s}
    </span>
  );
}

function GovTile({ label, value, unit = '', accent = '--text-secondary' }) {
  return (
    <div className="aioi-gov__tile">
      <span className="aioi-gov__tile-value" style={{ color: `var(${accent})` }}>
        {value ?? '—'}
        {unit && <span className="aioi-gov__tile-unit">{unit}</span>}
      </span>
      <span className="aioi-gov__tile-label">{label}</span>
    </div>
  );
}

export default function WidgetAIOIGovernance() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await aioi.getGovernanceStatus();
      setStatus(res?.data ?? res);
      setError(null);
      setLastFetch(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Erro ao carregar governance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const tid = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(tid);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="impetus-card aioi-gov__card">
        <div className="aioi-gov__header">
          <Shield size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-gov__title">AIOI GOVERNANCE</span>
        </div>
        <div className="aioi-gov__loading">
          <RefreshCw size={16} className="spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="impetus-card aioi-gov__card">
        <div className="aioi-gov__header">
          <Shield size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-gov__title">AIOI GOVERNANCE</span>
        </div>
        <div className="aioi-gov__error">
          <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const cap = status?.capacity || {};
  const retention = cap.retention || {};
  const storage = cap.storage || {};
  const overall = status?.capacity_status || cap.overall_status || 'NORMAL';

  return (
    <div className="impetus-card aioi-gov__card">
      <div className="aioi-gov__header">
        <div className="aioi-gov__header-left">
          <Shield size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-gov__title">AIOI GOVERNANCE</span>
          <span className="aioi-gov__mode">READ ONLY</span>
        </div>
        <StatusBadge status={overall} />
      </div>

      <div className="aioi-gov__section-label">CAPACITY STATUS</div>
      <div className="aioi-gov__tiles">
        <GovTile
          label="Backlog"
          value={cap.backlog_pressure?.value ?? 0}
          accent={cap.backlog_pressure?.status === 'NORMAL' ? '--text-secondary' : '--amber'}
        />
        <GovTile
          label="Snapshot excess"
          value={retention.snapshot_excess ?? 0}
          accent={cap.snapshot_pressure?.status === 'NORMAL' ? '--text-secondary' : '--amber'}
        />
        <GovTile
          label="Delivered"
          value={cap.outbox_growth?.value ?? 0}
          accent="--text-secondary"
        />
        <GovTile
          label="Storage"
          value={storage.total_mb ?? 0}
          unit=" MB"
          accent={storage.status === 'NORMAL' ? '--text-secondary' : '--amber'}
        />
      </div>

      <div className="aioi-gov__section-label">RETENTION ESTIMATE</div>
      <div className="aioi-gov__tiles aioi-gov__tiles--2">
        <GovTile
          label="Outbox elegível"
          value={retention.outbox_eligible_purge ?? 0}
          accent="--cyan"
        />
        <GovTile
          label="Dias retenção"
          value={retention.outbox_retention_days ?? 90}
          accent="--text-secondary"
        />
      </div>

      <div className="aioi-gov__section-label">PROJECTED GROWTH</div>
      <div className="aioi-gov__info-row">
        <Archive size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Snapshot limit: {retention.snapshot_retention_count ?? 1000} ·
          excess: {retention.snapshot_excess ?? 0}
        </span>
      </div>
      <div className="aioi-gov__info-row">
        <TrendingUp size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Storage: {storage.total_mb ?? 0} MB total (outbox + snapshots + IOE)
        </span>
      </div>
      <div className="aioi-gov__info-row">
        <Database size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Mode: dry-run · auto_action: false
        </span>
      </div>

      <div className="aioi-gov__footer">
        <HardDrive size={11} style={{ color: 'var(--text-tertiary)' }} />
        <span className="aioi-gov__invariants">INVARIANTS PRESERVED</span>
        {lastFetch && (
          <span className="aioi-gov__last-fetch">
            {new Date(lastFetch).toLocaleTimeString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}

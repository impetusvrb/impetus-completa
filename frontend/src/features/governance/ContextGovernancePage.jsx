/**
 * Context Governance Dashboard (Phase 4)
 *
 * Painel administrativo de governança contextual organizacional.
 * Consome `GET /dashboard/v2/governance/snapshot`. Para admins/auditores.
 *
 * Segue o DS Industrial 4.0 (`tokens.css` + `styles.css`):
 *   - fundo dark, acentos cyan/green/amber/red
 *   - Rajdhani + Share Tech Mono
 *   - border-radius ≤ 8px
 *   - reutiliza classes globais `.impetus-card`, `.btn`, `.badge-*`
 */
import React, { useMemo } from 'react';
import { useGovernanceContext } from './useGovernanceContext';
import './ContextGovernancePage.css';

function _scoreColor(score) {
  if (score == null) return 'var(--text-secondary)';
  if (score >= 85) return 'var(--green)';
  if (score >= 70) return 'var(--cyan)';
  if (score >= 50) return 'var(--amber)';
  return 'var(--red)';
}

function _severityBadge(severity) {
  const map = {
    critical: { color: 'var(--red)', label: 'CRÍTICO' },
    high:     { color: 'var(--red)', label: 'ALTO' },
    medium:   { color: 'var(--amber)', label: 'MÉDIO' },
    warn:     { color: 'var(--amber)', label: 'ATENÇÃO' },
    low:      { color: 'var(--text-tertiary)', label: 'BAIXO' }
  };
  return map[severity] || map.low;
}

function ScorePanel({ integrity }) {
  if (!integrity) return null;
  const items = [
    { key: 'overall_score', label: 'GLOBAL', value: integrity.overall_score },
    { key: 'contextual_integrity', label: 'CONTEXTUAL', value: integrity.contextual_integrity },
    { key: 'security_integrity', label: 'SEGURANÇA', value: integrity.security_integrity },
    { key: 'hierarchy_integrity', label: 'HIERARQUIA', value: integrity.hierarchy_integrity },
    { key: 'identity_quality', label: 'IDENTIDADE', value: integrity.identity_quality },
    { key: 'lgpd_alignment', label: 'LGPD', value: integrity.lgpd_alignment }
  ];
  return (
    <div className="governance-score-grid">
      {items.map((it) => (
        <div className="governance-score-card" key={it.key}>
          <div className="governance-score-label">{it.label}</div>
          <div className="governance-score-value" style={{ color: _scoreColor(it.value) }}>
            {it.value != null ? it.value.toFixed(1) : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function RisksPanel({ risks }) {
  if (!risks) return null;
  const top = risks.top || [];
  return (
    <div className="impetus-card governance-card">
      <div className="governance-card-header">
        <span className="governance-card-title">RISCOS CONTEXTUAIS ATIVOS</span>
        <span className="governance-card-meta">{risks.total} detectados</span>
      </div>
      {top.length === 0 ? (
        <div className="governance-empty">Nenhum risco ativo detectado.</div>
      ) : (
        <ul className="governance-list">
          {top.map((r) => {
            const sev = _severityBadge(r.severity);
            return (
              <li className="governance-list-item" key={r.risk_id}>
                <span className="governance-severity-dot" style={{ background: sev.color }} />
                <div className="governance-list-content">
                  <div className="governance-list-title">{r.type}</div>
                  <div className="governance-list-detail">{r.impact}</div>
                  <div className="governance-list-meta">
                    <span style={{ color: sev.color }}>{sev.label}</span>
                    <span>· users {r.affected_users?.length ?? 0}</span>
                    <span>· conf {(r.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecommendationsPanel({ recommendations }) {
  if (!recommendations) return null;
  const top = recommendations.top || [];
  return (
    <div className="impetus-card governance-card">
      <div className="governance-card-header">
        <span className="governance-card-title">RECOMENDAÇÕES (NÃO-AUTOMÁTICAS)</span>
        <span className="governance-card-meta">{recommendations.total} sugestões</span>
      </div>
      {top.length === 0 ? (
        <div className="governance-empty">Sem recomendações abertas.</div>
      ) : (
        <ul className="governance-list">
          {top.map((r) => {
            const sev = _severityBadge(r.severity);
            return (
              <li className="governance-list-item" key={r.id}>
                <span className="governance-severity-dot" style={{ background: sev.color }} />
                <div className="governance-list-content">
                  <div className="governance-list-title">{r.suggestion}</div>
                  <div className="governance-list-detail">{r.rationale}</div>
                  <div className="governance-list-meta">
                    <span style={{ color: sev.color }}>{sev.label}</span>
                    <span>· tipo {r.type}</span>
                    {r.target?.user_id && <span>· user {String(r.target.user_id).slice(0, 8)}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CapabilityIssuesPanel({ capabilities }) {
  if (!capabilities) return null;
  const issues = capabilities.issues || [];
  const conflicts = capabilities.conflicting_policies || [];
  return (
    <div className="impetus-card governance-card">
      <div className="governance-card-header">
        <span className="governance-card-title">CAPABILITIES / POLÍTICAS</span>
        <span className="governance-card-meta">{issues.length} alertas · {conflicts.length} conflitos</span>
      </div>
      {issues.length === 0 && conflicts.length === 0 ? (
        <div className="governance-empty">Nenhuma inconsistência detectada.</div>
      ) : (
        <>
          {issues.length > 0 && (
            <ul className="governance-list">
              {issues.slice(0, 12).map((i, idx) => (
                <li className="governance-list-item" key={`i-${idx}`}>
                  <span className="governance-severity-dot" style={{ background: 'var(--amber)' }} />
                  <div className="governance-list-content">
                    <div className="governance-list-title">{i.capability}</div>
                    <div className="governance-list-detail">{i.detail}</div>
                    <div className="governance-list-meta">
                      <span>tipo: {i.kind}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {conflicts.length > 0 && (
            <ul className="governance-list governance-conflicts">
              {conflicts.slice(0, 5).map((c, idx) => (
                <li className="governance-list-item" key={`c-${idx}`}>
                  <span className="governance-severity-dot" style={{ background: 'var(--red)' }} />
                  <div className="governance-list-content">
                    <div className="governance-list-title">{c.policies.join(' ↔ ')}</div>
                    <div className="governance-list-detail">
                      Caps: {c.overlapping_capabilities.join(', ')} (efeitos: {c.effects.join(' / ')})
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function HistoryPanel({ history }) {
  if (!history) return null;
  const events = history.recent_events || [];
  return (
    <div className="impetus-card governance-card">
      <div className="governance-card-header">
        <span className="governance-card-title">HISTÓRICO CONTEXTUAL</span>
        <span className="governance-card-meta">{history.total_in_buffer} eventos no buffer</span>
      </div>
      {events.length === 0 ? (
        <div className="governance-empty">Sem eventos no período.</div>
      ) : (
        <ul className="governance-history-list">
          {events.slice(0, 25).map((e) => (
            <li key={e.id}>
              <span className="governance-history-time">{e.occurred_at?.slice(11, 19)}</span>
              <span className="governance-history-kind">{e.kind}</span>
              <span className="governance-history-scope">{e.scope}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AreaBreakdownPanel({ integrity }) {
  if (!integrity?.by_area) return null;
  const rows = Object.values(integrity.by_area);
  if (rows.length === 0) return null;
  return (
    <div className="impetus-card governance-card">
      <div className="governance-card-header">
        <span className="governance-card-title">SCORE POR ÁREA</span>
      </div>
      <table className="governance-table">
        <thead>
          <tr>
            <th>Área</th><th>Users</th><th>Global</th><th>Segurança</th><th>LGPD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.area}>
              <td>{a.area}</td>
              <td>{a.user_count}</td>
              <td style={{ color: _scoreColor(a.overall_score) }}>{a.overall_score}</td>
              <td style={{ color: _scoreColor(a.security_integrity) }}>{a.security_integrity}</td>
              <td style={{ color: _scoreColor(a.lgpd_alignment) }}>{a.lgpd_alignment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContextGovernancePage() {
  const { snapshot, summary, loading, error, available, lastFetchedAt, refresh } = useGovernanceContext();

  const healthLabel = summary?.health_label || 'unknown';
  const healthColor = useMemo(() => {
    switch (healthLabel) {
      case 'healthy':  return 'var(--green)';
      case 'attention': return 'var(--cyan)';
      case 'degraded': return 'var(--amber)';
      case 'critical': return 'var(--red)';
      default:         return 'var(--text-tertiary)';
    }
  }, [healthLabel]);

  if (!available) {
    return (
      <div className="governance-page">
        <div className="impetus-card governance-card">
          <div className="governance-card-header">
            <span className="governance-card-title">CONTEXT GOVERNANCE</span>
          </div>
          <div className="governance-empty">
            {error === 'forbidden'
              ? 'Apenas administradores e auditores têm acesso a este painel.'
              : 'Camada de governança indisponível.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="governance-page">
      <header className="governance-header">
        <div>
          <div className="governance-header-eyebrow">CONTEXT GOVERNANCE · IDENTITY INTEGRITY</div>
          <h1 className="governance-header-title">Saúde Contextual da Organização</h1>
          <div className="governance-header-meta">
            <span style={{ color: healthColor }}>● {healthLabel.toUpperCase()}</span>
            {summary?.total_users != null && <span>· {summary.total_users} utilizadores</span>}
            {lastFetchedAt && <span>· atualizado {new Date(lastFetchedAt).toLocaleTimeString()}</span>}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <ScorePanel integrity={snapshot?.integrity} />

      <div className="governance-grid">
        <RisksPanel risks={snapshot?.risks} />
        <RecommendationsPanel recommendations={snapshot?.recommendations} />
        <CapabilityIssuesPanel capabilities={snapshot?.capabilities} />
        <AreaBreakdownPanel integrity={snapshot?.integrity} />
        <HistoryPanel history={snapshot?.history} />
      </div>
    </div>
  );
}

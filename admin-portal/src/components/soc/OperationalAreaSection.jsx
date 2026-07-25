import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GeoIpContext from '../GeoIpContext';
import LegacyListDrawer from './LegacyListDrawer';
import SocBarChart from './SocBarChart';
import {
  IconAlert,
  IconBan,
  IconHammer,
  IconUserX,
  IconGlobe,
  IconGitBranch,
} from './socIcons';
import {
  LEGACY_LIMITS,
  exploreListLabel,
  canExploreList,
  previewMeta,
  sortCriticalEvents,
  sortCorrelationIncidents,
  takePreview,
  isBusyOp,
  isItemBusy,
  filterPromotionQueue,
} from '../../utils/legacyDashboardUtils';

function severityColor(sev) {
  if (sev === 'CRITICAL') return 'var(--red)';
  if (sev === 'HIGH') return 'var(--orange)';
  if (sev === 'MEDIUM') return 'var(--amber)';
  return 'var(--text3)';
}

function criticalSeverityIconColor(sev) {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'var(--red)';
  if (sev === 'MEDIUM') return 'var(--orange)';
  return 'var(--amber)';
}

function StatusPill({ ok, label, active, onClick, filter }) {
  const Tag = onClick ? 'button' : 'span';
  const color = filter ? (active ? 'var(--cyan)' : 'var(--text-secondary)') : (ok ? 'var(--green)' : 'var(--amber)');
  const border = filter ? (active ? 'var(--cyan)' : 'var(--border-subtle)') : (ok ? 'var(--green)' : 'var(--amber)');
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`badge soc-legacy-pill${active ? ' soc-legacy-pill--active' : ''}`}
      style={{
        color,
        borderColor: border,
        marginRight: 8,
        marginBottom: 8,
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
    >
      {filter ? label : `${ok ? '●' : '○'} ${label}`}
    </Tag>
  );
}

function DomainHeader({ title, meta, exploreLabel, onExplore, showExplore }) {
  return (
    <header className="soc-op-domain-header">
      <div>
        <h2 className="soc-op-domain-title">{title}</h2>
        {meta && <p className="soc-legacy-section-meta">{meta}</p>}
      </div>
      {showExplore && exploreLabel && onExplore && (
        <button type="button" className="btn btn-ghost soc-legacy-explore-btn" onClick={(e) => onExplore(e.currentTarget)}>
          {exploreLabel}
        </button>
      )}
    </header>
  );
}

function CriticalEventCard({ event }) {
  const color = criticalSeverityIconColor(event.severity);
  return (
    <article className="soc-critical-card">
      <div className="soc-critical-card-sev" style={{ color }}>
        <IconAlert size={16} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>{event.severity}</span>
      </div>
      <div className="soc-critical-card-type">{event.type}</div>
      <div className="soc-critical-card-ip" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>
        {event.ip}
        {event.country_code && <span className="muted"> ({event.country_code})</span>}
      </div>
      <time className="soc-critical-card-ts muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
        {new Date(event.at).toLocaleString('pt-BR')}
      </time>
    </article>
  );
}

function CriticalEventsTable({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr><th>Hora</th><th>Severidade</th><th>Tipo</th><th>IP / País</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Nenhum evento crítico recente.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={`${row.at}-${row.ip}-${i}`}>
                <td data-label="Hora">{new Date(row.at).toLocaleString('pt-BR')}</td>
                <td data-label="Severidade" style={{ color: severityColor(row.severity), fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{row.severity}</td>
                <td data-label="Tipo">{row.type}</td>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.ip}>
                  {row.ip} <span className="muted">({row.country_code})</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CorrelationTable({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr><th>ID</th><th>Classificação</th><th>Severidade</th><th>Risco</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted" style={{ fontSize: '0.8rem' }}>Sem incidentes correlacionados no payload.</td>
            </tr>
          ) : (
            rows.map((inc) => (
              <tr key={inc.incidentId}>
                <td data-label="ID" className="soc-legacy-mono-cell" title={inc.incidentId}>{String(inc.incidentId).slice(0, 16)}…</td>
                <td data-label="Classificação">{inc.classification}</td>
                <td data-label="Severidade" style={{ color: severityColor(inc.severity), fontSize: '0.72rem' }}>{inc.severity}</td>
                <td data-label="Risco" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{inc.riskScore}</td>
                <td data-label="Estado">{inc.status || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ThreatIntelTable({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead><tr><th>IP</th><th>País</th><th>ISP</th><th>Sinal</th></tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="muted" style={{ fontSize: '0.8rem' }}>Sem IPs para análise.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.ip}>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.ip}>{row.ip}</td>
                <td data-label="País">{row.country_code}</td>
                <td data-label="ISP" title={row.isp || '—'}>{String(row.isp || '—').slice(0, 28)}</td>
                <td data-label="Sinal" style={{ fontSize: '0.72rem', color: row.abuse_score === 'elevated' ? 'var(--amber)' : 'var(--green)' }}>
                  {row.cloud_provider?.name || row.abuse_score}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Sec01Table({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr><th>Classificação</th><th>Tipo</th><th>IP</th><th>Contexto GeoIP</th><th>Caminho</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Observatório sem eventos recentes — tráfego nominal ou módulo em arranque.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={`${row.source_ip}-${i}`}>
                <td data-label="Classificação" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>{row.classification}</td>
                <td data-label="Tipo">{row.event_type}</td>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.source_ip || '—'}>{row.source_ip || '—'}</td>
                <td data-label="GeoIP">
                  {row.source_ip ? (
                    <GeoIpContext country_code={row.country_code} country={row.country} geo_state={row.geo_state} />
                  ) : (
                    <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>—</span>
                  )}
                </td>
                <td data-label="Caminho" title={row.path_prefix || '—'}>{row.path_prefix || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BlockedIpsTable({ rows, onExplain }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr>
            <th>IP</th>
            <th>País</th>
            <th>Origem</th>
            <th>Motivo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Nenhum IP bloqueado no momento.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.ip}-${row.source}`}>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.ip}>{row.ip}</td>
                <td data-label="País">{row.country_code} {row.country}</td>
                <td data-label="Origem">{row.source}</td>
                <td data-label="Motivo" title={row.reason}>{row.reason}</td>
                <td data-label="Ação">
                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.68rem', padding: '2px 8px' }} onClick={() => onExplain(row.ip)}>
                    Porquê?
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AttackOriginsTable({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr><th>IP</th><th>País</th><th>Hits</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Sem tráfego suspeito recente nos logs nginx.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.ip}>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.ip}>{row.ip}</td>
                <td data-label="País">{row.country_code} {row.country}</td>
                <td data-label="Hits">{row.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function FailedLoginsTable({ rows }) {
  return (
    <div className="table-wrap soc-legacy-table-wrap">
      <table className="data soc-legacy-data-table">
        <thead>
          <tr><th>Data</th><th>Ação</th><th>IP</th><th>Contexto GeoIP</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Sem falhas de login registadas.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Data">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                <td data-label="Ação">{row.acao}</td>
                <td data-label="IP" className="soc-legacy-mono-cell" title={row.ip || '—'}>{row.ip || '—'}</td>
                <td data-label="GeoIP">
                  {row.ip ? (
                    <GeoIpContext country_code={row.country_code} country={row.country} geo_state={row.geo_state} />
                  ) : (
                    <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AttackGraphCard({ graph }) {
  if (!graph) return null;
  return (
    <article className="soc-attack-graph-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>{graph.ip}</span>
        <span className="muted" style={{ fontSize: '0.7rem' }}>{graph.type}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {(graph.nodes || []).map((n, i) => (
          <React.Fragment key={n.id}>
            {i > 0 && <span className="muted" style={{ fontSize: '0.65rem' }}>→</span>}
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid var(--border-subtle)',
                color: n.type === 'block' || n.type === 'critical' ? 'var(--red)' : n.type === 'detect' ? 'var(--amber)' : 'var(--text-secondary)',
                fontFamily: n.type === 'attacker' ? 'var(--font-mono)' : 'inherit',
              }}
            >
              {n.label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <ol className="soc-attack-graph-narrative" style={{ margin: 0, paddingLeft: 18, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        {(graph.narrative || []).map((s) => (
          <li key={s.step} style={{ marginBottom: 4 }}>{s.description}</li>
        ))}
      </ol>
    </article>
  );
}

function RankingRow({ label, sublabel, value, maxValue, accent }) {
  const pct = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 0;
  return (
    <div className="soc-ranking-row">
      <div className="soc-ranking-row-head">
        <span className="soc-ranking-row-label" title={label}>{label}</span>
        <span className="soc-ranking-row-value" style={{ color: accent || 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          {value}
        </span>
      </div>
      {sublabel && <span className="soc-ranking-row-sub muted" style={{ fontSize: '0.68rem' }}>{sublabel}</span>}
      <div className="soc-ranking-row-bar" style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accent || 'var(--cyan)'}, ${accent || 'var(--cyan)'}66)`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function CompactPlaybookCard({ pb }) {
  const govColor = pb.governance === 'automatic' ? 'var(--green)' : 'var(--amber)';
  return (
    <div className="soc-legacy-queue-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: '0.78rem' }}>{pb.title}</strong>
        <span style={{ fontSize: '0.62rem', color: govColor, fontFamily: 'var(--font-mono)' }}>{pb.governance}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>{pb.summary}</p>
    </div>
  );
}

function HardeningSummary({ items, onAction, busyOp, onOpenDrawer, total }) {
  const pending = (items || []).filter((i) => i.status === 'PENDING');
  const { preview } = takePreview(pending, LEGACY_LIMITS.HARDENING);

  if (pending.length === 0) {
    return (
      <div className="soc-human-action-panel">
        <div className="soc-human-action-panel-head">
          <span className="soc-human-action-panel-icon" style={{ color: 'var(--amber)' }}><IconHammer size={16} /></span>
          <strong>Hardening semi-auto (SEC-11)</strong>
        </div>
        <p className="muted soc-legacy-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          Fila vazia — SEC-11 sem recomendações pendentes.
        </p>
      </div>
    );
  }

  return (
    <div className="soc-human-action-panel">
      <div className="soc-human-action-panel-head">
        <span className="soc-human-action-panel-icon" style={{ color: 'var(--amber)' }}><IconHammer size={16} /></span>
        <div>
          <strong>Hardening semi-auto (SEC-11)</strong>
          <p className="soc-legacy-section-meta" style={{ margin: '2px 0 0' }}>{previewMeta(preview.length, total ?? pending.length)}</p>
        </div>
      </div>
      <div className="soc-legacy-queue">
        {preview.map((item) => {
          const itemBusy = isItemBusy(busyOp, 'hardening', item.id);
          return (
            <div key={item.id} className="soc-legacy-queue-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.title}</span>
                <span className="badge" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', fontSize: '0.62rem' }}>semi-auto</span>
              </div>
              <p className="muted" style={{ margin: '4px 0', fontSize: '0.72rem' }}>{item.detail}</p>
              <div className="soc-legacy-actions">
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                  disabled={itemBusy || isBusyOp(busyOp, 'hardening', item.id, 'reject')}
                  onClick={() => onAction(item.id, 'approve')}
                >
                  {isBusyOp(busyOp, 'hardening', item.id, 'approve') ? 'A aprovar…' : 'Aprovar'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                  disabled={itemBusy || isBusyOp(busyOp, 'hardening', item.id, 'approve')}
                  onClick={() => onAction(item.id, 'reject')}
                >
                  {isBusyOp(busyOp, 'hardening', item.id, 'reject') ? 'A rejeitar…' : 'Rejeitar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {canExploreList(total ?? pending.length, preview.length) && exploreListLabel(total ?? pending.length) && (
        <button type="button" className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline" onClick={(e) => onOpenDrawer(e.currentTarget)}>
          {exploreListLabel(total ?? pending.length)}
        </button>
      )}
    </div>
  );
}

function PromotionSummary({ queue, modules, note, busyOp, onApprove, onOpenDrawer, phaseFilter, onPhaseFilter, total }) {
  const filtered = filterPromotionQueue(queue, phaseFilter);
  const { preview } = takePreview(filtered, LEGACY_LIMITS.PROMOTION);

  return (
    <div className="soc-human-action-panel">
      <div className="soc-human-action-panel-head">
        <span className="soc-human-action-panel-icon" style={{ color: 'var(--cyan)' }}><IconGitBranch size={16} /></span>
        <div>
          <strong>Promoção SEC-14…18 (assist)</strong>
          <p className="soc-legacy-section-meta" style={{ margin: '2px 0 0' }}>{previewMeta(preview.length, total ?? filtered.length)}</p>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.75rem' }}>{note}</p>
      <div className="soc-legacy-pill-row">
        <StatusPill filter label="Todos" active={!phaseFilter} onClick={() => onPhaseFilter?.(null)} />
        {(modules || []).map((m) => (
          <StatusPill
            key={m.phase}
            filter
            label={m.phase}
            active={phaseFilter === m.phase}
            onClick={() => onPhaseFilter?.(m.phase)}
          />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="muted soc-legacy-empty" style={{ fontSize: '0.8rem' }}>Fila assist vazia{phaseFilter ? ` para ${phaseFilter}` : ''}.</p>
      ) : (
        <>
          <div className="soc-legacy-queue">
            {preview.map((item) => (
              <div key={item.id} className="soc-legacy-queue-item">
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.phase} — {item.action}</div>
                <p className="muted" style={{ margin: '4px 0', fontSize: '0.7rem' }}>{item.detail}</p>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '0.66rem', padding: '2px 8px' }}
                  disabled={isBusyOp(busyOp, 'promotion', item.id, 'approve')}
                  onClick={() => onApprove(item.id)}
                >
                  {isBusyOp(busyOp, 'promotion', item.id, 'approve') ? 'A aprovar…' : 'Aprovar assist'}
                </button>
              </div>
            ))}
          </div>
          {canExploreList(total ?? filtered.length, preview.length) && exploreListLabel(total ?? filtered.length) && (
            <button type="button" className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline" onClick={(e) => onOpenDrawer(e.currentTarget)}>
              {exploreListLabel(total ?? filtered.length)}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function HardeningQueueFull({ items, onAction, busyOp }) {
  const pending = (items || []).filter((i) => i.status === 'PENDING');
  if (pending.length === 0) {
    return (
      <p className="muted soc-legacy-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        Fila vazia — SEC-11 sem recomendações pendentes.
      </p>
    );
  }
  return (
    <div className="soc-legacy-queue">
      {pending.map((item) => {
        const itemBusy = isItemBusy(busyOp, 'hardening', item.id);
        return (
          <div key={item.id} className="soc-legacy-queue-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.title}</span>
              <span className="badge" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', fontSize: '0.65rem' }}>semi-auto</span>
            </div>
            <p className="muted" style={{ margin: '6px 0', fontSize: '0.75rem' }}>{item.detail}</p>
            <div className="soc-legacy-actions">
              <button
                type="button"
                className="btn"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                disabled={itemBusy || isBusyOp(busyOp, 'hardening', item.id, 'reject')}
                onClick={() => onAction(item.id, 'approve')}
              >
                {isBusyOp(busyOp, 'hardening', item.id, 'approve') ? 'A aprovar…' : 'Aprovar'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                disabled={itemBusy || isBusyOp(busyOp, 'hardening', item.id, 'approve')}
                onClick={() => onAction(item.id, 'reject')}
              >
                {isBusyOp(busyOp, 'hardening', item.id, 'reject') ? 'A rejeitar…' : 'Rejeitar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PromotionQueueFull({ queue, modules, note, busyOp, onApprove, phaseFilter, onPhaseFilter }) {
  const filtered = filterPromotionQueue(queue, phaseFilter);
  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.78rem' }}>{note}</p>
      <div className="soc-legacy-pill-row">
        <StatusPill filter label="Todos" active={!phaseFilter} onClick={() => onPhaseFilter?.(null)} />
        {(modules || []).map((m) => (
          <StatusPill
            key={m.phase}
            filter
            label={m.phase}
            active={phaseFilter === m.phase}
            onClick={() => onPhaseFilter?.(m.phase)}
          />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="muted soc-legacy-empty" style={{ fontSize: '0.8rem' }}>Fila assist vazia{phaseFilter ? ` para ${phaseFilter}` : ''}.</p>
      ) : (
        <div className="soc-legacy-queue">
          {filtered.map((item) => (
            <div key={item.id} className="soc-legacy-queue-item">
              <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.phase} — {item.action}</div>
              <p className="muted" style={{ margin: '4px 0', fontSize: '0.72rem' }}>{item.detail}</p>
              <button
                type="button"
                className="btn"
                style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                disabled={isBusyOp(busyOp, 'promotion', item.id, 'approve')}
                onClick={() => onApprove(item.id)}
              >
                {isBusyOp(busyOp, 'promotion', item.id, 'approve') ? 'A aprovar…' : 'Aprovar assist'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function OperationalAreaSection({
  data,
  score,
  audit,
  twin,
  sim,
  vault,
  predictive,
  promotion,
  pb,
  soc,
  s,
  infra,
  busyOp,
  onHardening,
  onPromotion,
  onSimulation,
  onExplain,
  onDrawerOpen,
  onRegisterDrawerOpener,
  returnFocusRef,
}) {
  const [drawer, setDrawer] = useState(null);
  const [promotionPhaseFilter, setPromotionPhaseFilter] = useState(null);
  const [intelTab, setIntelTab] = useState('sec02');
  const drawerTriggerRef = useRef(null);

  const openDrawer = useCallback((config, triggerEl = null) => {
    drawerTriggerRef.current = triggerEl || null;
    setDrawer(config);
    onDrawerOpen?.();
  }, [onDrawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    requestAnimationFrame(() => {
      drawerTriggerRef.current?.focus?.({ preventScroll: true });
      drawerTriggerRef.current = null;
    });
  }, []);

  const blockedIps = data?.blocked_ips || [];
  const attackOrigins = data?.attack_origins || [];
  const failedLogins = data?.failed_logins || [];
  const criticalSorted = useMemo(() => sortCriticalEvents(data?.critical_events), [data?.critical_events]);
  const sec01Events = data?.ai_detections?.recent_events || [];
  const correlationSorted = useMemo(
    () => sortCorrelationIncidents(pb.correlation?.incidents),
    [pb.correlation?.incidents]
  );
  const threatIntelRows = pb.threat_intelligence?.ip_lookups || [];
  const attackGraphs = data?.attack_graphs || [];
  const hardeningPending = (pb.hardening_queue?.pending || []).filter((i) => i.status === 'PENDING');
  const promotionFiltered = useMemo(
    () => filterPromotionQueue(promotion.queue, promotionPhaseFilter),
    [promotion.queue, promotionPhaseFilter]
  );

  const blockedPreview = takePreview(blockedIps, LEGACY_LIMITS.BLOCKED_IPS);
  const originsPreview = takePreview(attackOrigins, LEGACY_LIMITS.ATTACK_ORIGINS);
  const loginsPreview = takePreview(failedLogins, LEGACY_LIMITS.FAILED_LOGINS);
  const criticalPreview = takePreview(criticalSorted, LEGACY_LIMITS.CRITICAL_EVENTS);
  const graphsPreview = takePreview(attackGraphs, LEGACY_LIMITS.ATTACK_GRAPH);

  const correlationCount = correlationSorted.length;
  const sec03Count = threatIntelRows.length;
  const sec01Count = sec01Events.length;

  const originsMax = Math.max(1, ...(originsPreview.preview || []).map((r) => r.count || 0));

  const drawerById = useMemo(() => ({
    'critical-events': {
      id: 'critical-events',
      title: 'Eventos críticos',
      subtitle: exploreListLabel(criticalPreview.total),
      content: <CriticalEventsTable rows={criticalSorted} />,
    },
    hardening: {
      id: 'hardening',
      title: 'Fila hardening semi-auto (SEC-11)',
      subtitle: exploreListLabel(hardeningPending.length),
      content: (
        <HardeningQueueFull
          items={pb.hardening_queue?.pending}
          busyOp={busyOp}
          onAction={onHardening}
        />
      ),
    },
    promotion: {
      id: 'promotion',
      title: 'Promoção SEC-14…18 (assist)',
      subtitle: `${promotionFiltered.length} registro(s) no payload`,
      content: (
        <PromotionQueueFull
          queue={promotion.queue}
          modules={promotion.modules}
          note={promotion.promotion_note}
          busyOp={busyOp}
          onApprove={onPromotion}
          phaseFilter={promotionPhaseFilter}
          onPhaseFilter={setPromotionPhaseFilter}
        />
      ),
    },
    'blocked-ips': {
      id: 'blocked-ips',
      title: 'IPs bloqueados',
      subtitle: exploreListLabel(blockedPreview.total),
      content: <BlockedIpsTable rows={blockedIps} onExplain={onExplain} />,
    },
    'failed-logins': {
      id: 'failed-logins',
      title: 'Tentativas de login falhadas',
      subtitle: exploreListLabel(loginsPreview.total),
      content: <FailedLoginsTable rows={failedLogins} />,
    },
    'attack-origins': {
      id: 'attack-origins',
      title: 'Origem dos ataques (top IPs)',
      subtitle: exploreListLabel(originsPreview.total),
      content: <AttackOriginsTable rows={attackOrigins} />,
    },
  }), [
    blockedIps, blockedPreview.total, busyOp, criticalPreview.total, criticalSorted,
    failedLogins, hardeningPending.length, loginsPreview.total, onExplain, onHardening,
    onPromotion, attackOrigins, originsPreview.total, pb.hardening_queue?.pending,
    promotion, promotionFiltered.length, promotionPhaseFilter,
  ]);

  useEffect(() => {
    if (!onRegisterDrawerOpener) return undefined;
    onRegisterDrawerOpener((drawerId) => {
      const cfg = drawerById[drawerId];
      if (cfg) openDrawer(cfg);
    });
    return () => onRegisterDrawerOpener(null);
  }, [drawerById, onRegisterDrawerOpener, openDrawer]);

  return (
    <>
      <section id="sec-criticos" className="soc-op-domain" aria-label="Prioridade de ameaças">
        <DomainHeader
          title="Prioridade de ameaças"
          meta={previewMeta(criticalPreview.preview.length, criticalPreview.total)}
          exploreLabel={exploreListLabel(criticalPreview.total)}
          showExplore={canExploreList(criticalPreview.total, criticalPreview.preview.length)}
          onExplore={(trigger) => openDrawer({
            id: 'critical-events',
            title: 'Eventos críticos',
            subtitle: exploreListLabel(criticalPreview.total),
            content: <CriticalEventsTable rows={criticalSorted} />,
          }, trigger)}
        />
        {criticalPreview.preview.length === 0 ? (
          <p className="muted soc-legacy-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            Nenhum evento crítico recente.
          </p>
        ) : (
          <div className="soc-critical-cards">
            {criticalPreview.preview.map((ev, i) => (
              <CriticalEventCard key={`${ev.at}-${ev.ip}-${i}`} event={ev} />
            ))}
          </div>
        )}
      </section>

      <section id="sec-intel" className="soc-op-domain" aria-label="Inteligência de ameaças">
        <DomainHeader
          title="Inteligência de ameaças"
          meta={pb.correlation?.enabled ? 'Motor SEC-02 activo' : 'Motor SEC-02 inactivo'}
        />
        <div className="soc-intel-tabs" role="tablist" aria-label="Fontes de inteligência">
          <button
            type="button"
            role="tab"
            aria-selected={intelTab === 'sec02'}
            className={`soc-intel-tab${intelTab === 'sec02' ? ' soc-intel-tab--active' : ''}`}
            onClick={() => setIntelTab('sec02')}
          >
            SEC-02 ({correlationCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={intelTab === 'sec03'}
            className={`soc-intel-tab${intelTab === 'sec03' ? ' soc-intel-tab--active' : ''}`}
            onClick={() => setIntelTab('sec03')}
          >
            SEC-03 ({sec03Count})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={intelTab === 'sec01'}
            className={`soc-intel-tab${intelTab === 'sec01' ? ' soc-intel-tab--active' : ''}`}
            onClick={() => setIntelTab('sec01')}
          >
            SEC-01 ({sec01Count})
          </button>
        </div>
        <div className="soc-intel-tab-panel" role="tabpanel">
          {intelTab === 'sec02' && (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: '0.78rem' }}>
                Correlação de incidentes — ingest: {pb.correlation_ingest?.correlated ?? 0} correlacionados
              </p>
              <CorrelationTable rows={correlationSorted} />
            </>
          )}
          {intelTab === 'sec03' && (
            <ThreatIntelTable rows={threatIntelRows} />
          )}
          {intelTab === 'sec01' && (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: '0.82rem' }}>
                Classificação determinística de padrões HTTP; não bloqueia utilizadores. Modo {data?.ai_detections?.mode || 'observe'}.
              </p>
              <Sec01Table rows={sec01Events} />
            </>
          )}
        </div>
      </section>

      <section id="sec-humana" className="soc-op-domain" aria-label="Acção humana">
        <DomainHeader title="Acção humana necessária" />
        <div className="soc-human-action-grid">
          <HardeningSummary
            items={pb.hardening_queue?.pending}
            busyOp={busyOp}
            onAction={onHardening}
            total={hardeningPending.length}
            onOpenDrawer={(trigger) => openDrawer({
              id: 'hardening',
              title: 'Fila hardening semi-auto (SEC-11)',
              subtitle: exploreListLabel(hardeningPending.length),
              content: (
                <HardeningQueueFull
                  items={pb.hardening_queue?.pending}
                  busyOp={busyOp}
                  onAction={onHardening}
                />
              ),
            }, trigger)}
          />
          <PromotionSummary
            queue={promotion.queue}
            modules={promotion.modules}
            note={promotion.promotion_note}
            busyOp={busyOp}
            onApprove={onPromotion}
            total={promotionFiltered.length}
            phaseFilter={promotionPhaseFilter}
            onPhaseFilter={setPromotionPhaseFilter}
            onOpenDrawer={(trigger) => openDrawer({
              id: 'promotion',
              title: 'Promoção SEC-14…18 (assist)',
              subtitle: `${promotionFiltered.length} registro(s) no payload`,
              content: (
                <PromotionQueueFull
                  queue={promotion.queue}
                  modules={promotion.modules}
                  note={promotion.promotion_note}
                  busyOp={busyOp}
                  onApprove={onPromotion}
                  phaseFilter={promotionPhaseFilter}
                  onPhaseFilter={setPromotionPhaseFilter}
                />
              ),
            }, trigger)}
          />
        </div>
        {(pb.playbooks || []).length > 0 && (
          <div className="soc-human-playbooks">
            <h3 className="soc-legacy-kicker" style={{ marginTop: 12 }}>Playbooks activos</h3>
            <div className="soc-legacy-queue">
              {pb.playbooks.slice(0, 2).map((p) => (
                <CompactPlaybookCard key={p.id} pb={p} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="sec-investigacao" className="soc-op-domain" aria-label="Investigação">
        <DomainHeader title="Investigação" />
        <div className="soc-investigation-grid">
          <div className="soc-investigation-panel">
            <div className="soc-investigation-panel-head">
              <IconUserX size={16} />
              <strong>Tentativas de login falhadas</strong>
            </div>
            <p className="soc-legacy-section-meta">{previewMeta(loginsPreview.preview.length, loginsPreview.total)}</p>
            {loginsPreview.preview.length === 0 ? (
              <p className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Sem falhas registadas.</p>
            ) : (
              loginsPreview.preview.map((row) => (
                <RankingRow
                  key={row.id}
                  label={row.ip || '—'}
                  sublabel={`${new Date(row.created_at).toLocaleString('pt-BR')} · ${row.acao}`}
                  value={1}
                  maxValue={1}
                  accent="var(--red)"
                />
              ))
            )}
            {canExploreList(loginsPreview.total, loginsPreview.preview.length) && exploreListLabel(loginsPreview.total) && (
              <button
                type="button"
                className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline"
                onClick={(e) => openDrawer({
                  id: 'failed-logins',
                  title: 'Tentativas de login falhadas',
                  subtitle: exploreListLabel(loginsPreview.total),
                  content: <FailedLoginsTable rows={failedLogins} />,
                }, e.currentTarget)}
              >
                {exploreListLabel(loginsPreview.total)}
              </button>
            )}
          </div>

          <div className="soc-investigation-panel">
            <div className="soc-investigation-panel-head">
              <IconBan size={16} />
              <strong>IPs bloqueados</strong>
            </div>
            <p className="soc-legacy-section-meta">{previewMeta(blockedPreview.preview.length, blockedPreview.total)}</p>
            {blockedPreview.preview.length === 0 ? (
              <p className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Nenhum IP bloqueado.</p>
            ) : (
              blockedPreview.preview.map((row) => (
                <RankingRow
                  key={`${row.ip}-${row.source}`}
                  label={row.ip}
                  sublabel={`${row.country_code || ''} ${row.source} — ${String(row.reason || '').slice(0, 40)}`}
                  value={1}
                  maxValue={1}
                  accent="var(--amber)"
                />
              ))
            )}
            {canExploreList(blockedPreview.total, blockedPreview.preview.length) && exploreListLabel(blockedPreview.total) && (
              <button
                type="button"
                className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline"
                onClick={(e) => openDrawer({
                  id: 'blocked-ips',
                  title: 'IPs bloqueados',
                  subtitle: exploreListLabel(blockedPreview.total),
                  content: <BlockedIpsTable rows={blockedIps} onExplain={onExplain} />,
                }, e.currentTarget)}
              >
                {exploreListLabel(blockedPreview.total)}
              </button>
            )}
          </div>

          <div className="soc-investigation-panel">
            <div className="soc-investigation-panel-head">
              <IconGlobe size={16} />
              <strong>Origem dos ataques (top IPs)</strong>
            </div>
            <p className="soc-legacy-section-meta">{previewMeta(originsPreview.preview.length, originsPreview.total)}</p>
            {originsPreview.preview.length === 0 ? (
              <p className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Sem tráfego suspeito recente.</p>
            ) : (
              originsPreview.preview.map((row) => (
                <RankingRow
                  key={row.ip}
                  label={row.ip}
                  sublabel={`${row.country_code || ''} ${row.country || ''}`}
                  value={row.count}
                  maxValue={originsMax}
                  accent="var(--cyan)"
                />
              ))
            )}
            {canExploreList(originsPreview.total, originsPreview.preview.length) && exploreListLabel(originsPreview.total) && (
              <button
                type="button"
                className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline"
                onClick={(e) => openDrawer({
                  id: 'attack-origins',
                  title: 'Origem dos ataques (top IPs)',
                  subtitle: exploreListLabel(originsPreview.total),
                  content: <AttackOriginsTable rows={attackOrigins} />,
                }, e.currentTarget)}
              >
                {exploreListLabel(originsPreview.total)}
              </button>
            )}
          </div>
        </div>
      </section>

      {attackGraphs.length > 0 && (
        <section id="sec-attack-graph" className="soc-op-domain" aria-label="Attack Graph">
          <DomainHeader
            title="Attack Graph — incidentes recentes"
            meta={previewMeta(graphsPreview.preview.length, graphsPreview.total)}
            exploreLabel={exploreListLabel(graphsPreview.total)}
            showExplore={canExploreList(graphsPreview.total, graphsPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'attack-graphs',
              title: 'Attack Graph — incidentes',
              subtitle: exploreListLabel(graphsPreview.total),
              content: (
                <div className="soc-attack-graph-list">
                  {attackGraphs.map((g) => (
                    <AttackGraphCard key={g.incident_id} graph={g} />
                  ))}
                </div>
              ),
            }, trigger)}
          />
          <div className="soc-attack-graph-list">
            {graphsPreview.preview.map((g) => (
              <AttackGraphCard key={g.incident_id} graph={g} />
            ))}
          </div>
        </section>
      )}

      <section id="sec-trend-7d" className="soc-op-domain" aria-label="Tendência 7 dias">
        <DomainHeader title="Tendência 7 dias" />
        <SocBarChart title="Ataques por dia (7d)" series={data?.charts?.attacks_per_day} />
      </section>

      <details className="soc-op-advanced">
        <summary>Análise avançada e postura técnica</summary>
        <div className="soc-op-advanced-grid">
          <div className="card soc-legacy-baseline-card">
            <div className="soc-legacy-kicker">Baseline comportamental (7d)</div>
            <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              Logins falhados hoje: <strong style={{ color: 'var(--cyan)' }}>{pb.behavioral_baseline?.login_failed?.today ?? 0}</strong>
              {' · '}média: {pb.behavioral_baseline?.login_failed?.daily_avg ?? 0}/dia
            </p>
            {(pb.behavioral_baseline?.anomalies || []).length === 0 ? (
              <p className="muted soc-legacy-empty" style={{ fontSize: '0.75rem' }}>Tráfego dentro do baseline — sem anomalias.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem' }}>
                {pb.behavioral_baseline.anomalies.map((a) => (
                  <li key={a.id} style={{ color: a.severity === 'HIGH' ? 'var(--red)' : 'var(--amber)', marginBottom: 4 }}>
                    {a.label}: {a.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="soc-legacy-kicker">Auto-auditoria</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: audit?.passed === audit?.total ? 'var(--green)' : 'var(--amber)' }}>
              {audit?.passed ?? 0}/{audit?.total ?? 0} checks
            </div>
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
              {(audit?.checks || []).map((c) => (
                <li key={c.id} style={{ fontSize: '0.75rem', marginBottom: 4, color: c.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {c.ok ? '●' : '○'} {c.label}
                  <span className="muted" style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                    {String(c.detail || '').slice(0, 40)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {score && (
            <div className="card">
              <div className="soc-legacy-kicker">Domínios do score</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(score.domains || []).map((d) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 90, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{d.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.earned / d.max) * 100}%`, height: '100%', background: 'rgba(0,212,255,0.55)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text3)', width: 48, textAlign: 'right' }}>
                      {d.earned}/{d.max}
                    </span>
                  </div>
                ))}
              </div>
              {(score.penalties || []).length > 0 && (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: '0.75rem', color: 'var(--amber)' }}>
                  {score.penalties.map((p, i) => (
                    <li key={i}>{p.points} pts — {p.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </details>

      <LegacyListDrawer
        open={Boolean(drawer)}
        title={drawer?.title}
        subtitle={drawer?.subtitle}
        onClose={closeDrawer}
        returnFocusRef={drawerTriggerRef}
      >
        {drawer?.content}
      </LegacyListDrawer>
    </>
  );
}

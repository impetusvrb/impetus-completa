import React, { useCallback, useMemo, useRef, useState } from 'react';
import GeoIpContext from '../GeoIpContext';
import LegacyListDrawer from './LegacyListDrawer';
import {
  LEGACY_LIMITS,
  busyKey,
  exploreListLabel,
  filterPromotionQueue,
  isBusyOp,
  isItemBusy,
  previewMeta,
  sortCorrelationIncidents,
  sortCriticalEvents,
  takePreview,
  canExploreList,
} from '../../utils/legacyDashboardUtils';

function severityColor(sev) {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'var(--red)';
  if (sev === 'MEDIUM') return 'var(--amber)';
  return 'var(--text3)';
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

function LegacyStatCard({ title, value, hint, accent }) {
  return (
    <div className="card soc-legacy-stat-card">
      <div className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: 700, color: accent || 'var(--cyan)', marginTop: 6 }}>{value}</div>
      {hint && <div className="muted" style={{ fontSize: '0.72rem', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function LegacySectionHeader({ title, meta, exploreLabel, onExplore, showExplore }) {
  return (
    <div className="soc-legacy-section-header">
      <div>
        <h2 className="soc-legacy-section-title">{title}</h2>
        {meta && <p className="soc-legacy-section-meta">{meta}</p>}
      </div>
      {showExplore && exploreLabel && onExplore && (
        <button type="button" className="btn btn-ghost soc-legacy-explore-btn" onClick={(e) => onExplore(e.currentTarget)}>
          {exploreLabel}
        </button>
      )}
    </div>
  );
}

function BarChart({ title, series, emptyLabel }) {
  const max = Math.max(1, ...(series || []).map((s) => s.count || 0));
  const hasData = (series || []).some((s) => s.count > 0);

  return (
    <div className="card">
      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 12 }}>
        {title}
      </div>
      {!hasData ? (
        <p className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {emptyLabel || 'Sem eventos no período — estado nominal.'}
        </p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 8 }}>
          {(series || []).map((s) => (
            <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                title={`${s.count} eventos`}
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: `${Math.max(4, (s.count / max) * 100)}%`,
                  minHeight: s.count > 0 ? 6 : 2,
                  background: 'linear-gradient(180deg, rgba(0,212,255,0.7), rgba(0,100,140,0.35))',
                  border: '1px solid rgba(0,212,255,0.35)',
                  borderRadius: 3,
                }}
              />
              <span style={{ fontSize: '0.62rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score }) {
  const total = score?.total ?? 0;
  const pct = score?.pct ?? 0;
  const color = total >= 800 ? 'var(--green)' : total >= 600 ? 'var(--cyan)' : total >= 400 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 24px ${color}33`,
        }}
      >
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>{total}</span>
        <span className="muted" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>/1000</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 6 }}>
          Security Score
        </div>
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4 }} />
        </div>
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{pct}% maturidade</span>
      </div>
    </div>
  );
}

function PlaybookCard({ pb }) {
  const govColor = pb.governance === 'automatic' ? 'var(--green)' : 'var(--amber)';
  return (
    <div className="soc-legacy-queue-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: '0.82rem' }}>{pb.title}</strong>
        <span style={{ fontSize: '0.65rem', color: govColor, fontFamily: 'var(--font-mono)' }}>{pb.governance}</span>
      </div>
      <p className="muted" style={{ margin: '0 0 8px', fontSize: '0.75rem' }}>{pb.summary}</p>
      <ol style={{ margin: 0, paddingLeft: 16, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        {(pb.steps || []).slice(0, 4).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function AttackGraphCard({ graph }) {
  if (!graph) return null;
  return (
    <div className="soc-legacy-queue-item">
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
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        {(graph.narrative || []).slice(0, 5).map((s) => (
          <li key={s.step} style={{ marginBottom: 2 }}>{s.description}</li>
        ))}
      </ol>
    </div>
  );
}

function HardeningQueue({ items, onAction, busyOp, limit, showExplore, onExplore, total }) {
  const pending = (items || []).filter((i) => i.status === 'PENDING');
  const { preview } = takePreview(pending, limit ?? pending.length);

  if (pending.length === 0) {
    return (
      <p className="muted soc-legacy-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        Fila vazia — SEC-11 sem recomendações pendentes.
      </p>
    );
  }

  const renderItems = (list) => (
    <div className="soc-legacy-queue">
      {list.map((item) => {
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

  return (
    <>
      {showExplore && (
        <LegacySectionHeader
          title="Fila hardening semi-auto (SEC-11)"
          meta={previewMeta(preview.length, total ?? pending.length)}
          exploreLabel={exploreListLabel(total ?? pending.length)}
          onExplore={onExplore}
          showExplore={canExploreList(total ?? pending.length, preview.length)}
        />
      )}
      {renderItems(showExplore ? preview : pending)}
    </>
  );
}

function PromotionQueue({ queue, modules, note, busyOp, onApprove, limit, showExplore, onExplore, phaseFilter, onPhaseFilter, total }) {
  const filtered = filterPromotionQueue(queue, phaseFilter);
  const { preview } = takePreview(filtered, limit ?? filtered.length);

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
        <>
          {showExplore && (
            <p className="soc-legacy-section-meta">{previewMeta(preview.length, total ?? filtered.length)}</p>
          )}
          <div className="soc-legacy-queue">
            {(showExplore ? preview : filtered).map((item) => (
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
          {showExplore && canExploreList(total ?? filtered.length, preview.length) && exploreListLabel(total ?? filtered.length) && (
            <button type="button" className="btn btn-ghost soc-legacy-explore-btn soc-legacy-explore-btn--inline" onClick={(e) => onExplore(e.currentTarget)}>
              {exploreListLabel(total ?? filtered.length)}
            </button>
          )}
        </>
      )}
    </>
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

export default function LegacyGovernanceSection({
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
}) {
  const [drawer, setDrawer] = useState(null);
  const [promotionPhaseFilter, setPromotionPhaseFilter] = useState(null);
  const drawerTriggerRef = useRef(null);

  const openDrawer = useCallback((config, triggerEl = null) => {
    drawerTriggerRef.current = triggerEl || null;
    setDrawer(config);
  }, []);

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
  const sec01Preview = takePreview(sec01Events, LEGACY_LIMITS.SEC01);
  const correlationPreview = takePreview(correlationSorted, LEGACY_LIMITS.CORRELATION);
  const graphsPreview = takePreview(attackGraphs, LEGACY_LIMITS.ATTACK_GRAPH);

  const simBusy = isBusyOp(busyOp, 'simulation', '', 'run');

  return (
    <>
      <div className="soc-legacy-grid soc-legacy-grid--3">
        <div className="card">
          <ScoreGauge score={score} />
          {(score?.penalties || []).length > 0 && (
            <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: '0.75rem', color: 'var(--amber)' }}>
              {score.penalties.map((p, i) => (
                <li key={i}>{p.points} pts — {p.reason}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="soc-legacy-kicker">Domínios do score</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(score?.domains || []).map((d) => (
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
      </div>

      <div className="soc-legacy-phase-label">Fase C — Enterprise</div>

      <div className="soc-legacy-grid soc-legacy-grid--3">
        <div className="card">
          <div className="soc-legacy-kicker">Gêmeo digital — prod vs homolog</div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            Produção: <strong style={{ color: twin.parity?.prod_online ? 'var(--green)' : 'var(--amber)' }}>{twin.production?.online ?? 0}/{twin.production?.total ?? 3}</strong>
            {' · '}Lab: <strong style={{ color: twin.parity?.lab_available ? 'var(--green)' : 'var(--text3)' }}>{twin.homolog_lab?.online ?? 0}/{twin.homolog_lab?.total ?? 5}</strong>
          </p>
          <StatusPill ok={twin.parity?.twin_ready} label="Twin operacional" />
          <ul style={{ margin: '10px 0 0', paddingLeft: 16, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {(twin.production?.processes || []).map((p) => (
              <li key={p.name}>{p.name}: {p.status}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="soc-legacy-kicker">Simulador semanal SEC-19</div>
            <button type="button" className="btn btn-ghost" style={{ fontSize: '0.68rem', padding: '2px 8px' }} disabled={simBusy} onClick={onSimulation}>
              {simBusy ? 'A correr…' : 'Executar'}
            </button>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            Score: <strong style={{ color: 'var(--cyan)' }}>{sim.operational_score ?? '—'}</strong>
            {' · '}Cobertura: {sim.coverage_ratio != null ? `${Math.round(sim.coverage_ratio * 100)}%` : '—'}
          </p>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.72rem' }}>
            {sim.status === 'not_run' ? sim.message : `${sim.decision || '—'} · ${sim.scenarios_total ?? 0} cenários · sintético (sem HTTP prod)`}
          </p>
          {sim.generated_at && (
            <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.68rem' }}>
              {new Date(sim.generated_at).toLocaleString('pt-BR')}{sim.from_cache ? ' (cache)' : ''}
            </p>
          )}
        </div>
        <div className="card">
          <div className="soc-legacy-kicker">Vault / segredos</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: vault.ok ? 'var(--green)' : 'var(--red)' }}>
            {vault.ok ? 'Inventário OK' : 'Atenção'}
          </div>
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: '0.72rem' }}>
            {(vault.inventory || []).map((s) => (
              <li key={s.name} style={{ color: s.present && s.secure ? 'var(--green)' : 'var(--amber)' }}>
                {s.present && s.secure ? '●' : '○'} {s.name}
              </li>
            ))}
          </ul>
          {vault.rotation_recommendation && (
            <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.68rem' }}>{vault.rotation_recommendation}</p>
          )}
        </div>
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <div className="card">
          <h2 className="soc-legacy-section-title">IA preditiva — pre-warm (SEC-10)</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.78rem' }}>
            Nível: <strong style={{ color: 'var(--amber)' }}>{predictive.threat_level || '—'}</strong>
            {' · '}Modo: {predictive.current_mode || predictive.mode || 'observe'}
          </p>
          {(predictive.pre_warm || []).length === 0 ? (
            <p className="muted soc-legacy-empty" style={{ fontSize: '0.8rem' }}>Sem acções de pre-warm recomendadas.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem' }}>
              {predictive.pre_warm.map((a) => (
                <li key={a.action} style={{ marginBottom: 4 }}>
                  <span style={{ color: a.priority === 'HIGH' || a.priority === 'CRITICAL' ? 'var(--red)' : 'var(--amber)' }}>{a.label}</span>
                  <span className="muted"> — {a.rationale}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="soc-legacy-section-title">Promoção SEC-14…18 (assist)</h2>
          <PromotionQueue
            queue={promotion.queue}
            modules={promotion.modules}
            note={promotion.promotion_note}
            busyOp={busyOp}
            onApprove={onPromotion}
            limit={LEGACY_LIMITS.PROMOTION}
            showExplore
            total={promotionFiltered.length}
            phaseFilter={promotionPhaseFilter}
            onPhaseFilter={setPromotionPhaseFilter}
            onExplore={(trigger) => openDrawer({
              id: 'promotion',
              title: 'Promoção SEC-14…18 (assist)',
              subtitle: `${promotionFiltered.length} registro(s) no payload`,
              content: (
                <PromotionQueue
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
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--stats">
        <LegacyStatCard title="SOC incidentes abertos" value={soc.open_incidents ?? 0} accent="var(--amber)" hint="SEC-02 correlação" />
        <LegacyStatCard title="Países activos" value={soc.countries_active ?? 0} hint={`${soc.events_mapped ?? 0} eventos mapeados`} />
        <LegacyStatCard title="Risco médio SEC-02" value={soc.risk_avg ?? 0} accent="var(--cyan)" />
        <LegacyStatCard title="Anomalias baseline" value={soc.anomalies ?? 0} accent={(soc.anomalies ?? 0) > 0 ? 'var(--red)' : 'var(--green)'} />
      </div>

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

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <div className="card">
          <LegacySectionHeader
            title="Correlação SEC-02"
            meta={`${previewMeta(correlationPreview.preview.length, correlationPreview.total)} · ingest: ${pb.correlation_ingest?.correlated ?? 0} correlacionados`}
            exploreLabel={exploreListLabel(correlationPreview.total)}
            showExplore={canExploreList(correlationPreview.total, correlationPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'correlation',
              title: 'Correlação SEC-02',
              subtitle: exploreListLabel(correlationPreview.total),
              content: <CorrelationTable rows={correlationSorted} />,
            }, trigger)}
          />
          <p className="muted" style={{ marginTop: 0, fontSize: '0.78rem' }}>
            {pb.correlation?.enabled ? 'Motor activo' : 'Motor inactivo'}
          </p>
          <CorrelationTable rows={correlationPreview.preview} />
        </div>
        <div className="card">
          <h2 className="soc-legacy-section-title">Threat Intelligence (SEC-03)</h2>
          <div className="table-wrap soc-legacy-table-wrap">
            <table className="data soc-legacy-data-table">
              <thead><tr><th>IP</th><th>País</th><th>ISP</th><th>Sinal</th></tr></thead>
              <tbody>
                {(pb.threat_intelligence?.ip_lookups || []).length === 0 ? (
                  <tr><td colSpan={4} className="muted" style={{ fontSize: '0.8rem' }}>Sem IPs para análise.</td></tr>
                ) : (
                  (pb.threat_intelligence.ip_lookups).slice(0, LEGACY_LIMITS.THREAT_INTEL).map((row) => (
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
        </div>
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <div className="card">
          <h2 className="soc-legacy-section-title">Playbooks activos</h2>
          {(pb.playbooks || []).length === 0 ? (
            <p className="muted soc-legacy-empty" style={{ fontSize: '0.8rem' }}>Nenhum playbook corresponde aos incidentes actuais.</p>
          ) : (
            <div className="soc-legacy-queue">
              {pb.playbooks.map((p) => (
                <PlaybookCard key={p.id} pb={p} />
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <p className="muted" style={{ marginTop: 0, fontSize: '0.78rem' }}>{pb.hardening_queue?.governance_note}</p>
          <HardeningQueue
            items={pb.hardening_queue?.pending}
            busyOp={busyOp}
            onAction={onHardening}
            limit={LEGACY_LIMITS.HARDENING}
            showExplore
            total={hardeningPending.length}
            onExplore={(trigger) => openDrawer({
              id: 'hardening',
              title: 'Fila hardening semi-auto (SEC-11)',
              subtitle: exploreListLabel(hardeningPending.length),
              content: (
                <HardeningQueue
                  items={pb.hardening_queue?.pending}
                  busyOp={busyOp}
                  onAction={onHardening}
                />
              ),
            }, trigger)}
          />
        </div>
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--stats">
        <LegacyStatCard title="IPs bloqueados" value={s.blocked_ips_total ?? 0} hint={`fail2ban: ${s.fail2ban_banned ?? 0} · UFW: ${s.ufw_denies ?? 0}`} />
        <LegacyStatCard title="Alertas 24h" value={s.alerts_24h ?? 0} accent="var(--amber)" />
        <LegacyStatCard title="Logins falhados 24h" value={s.failed_logins_24h ?? 0} accent={s.failed_logins_24h > 0 ? 'var(--red)' : 'var(--green)'} />
        <LegacyStatCard title="Eventos críticos" value={s.critical_open ?? 0} accent="var(--red)" hint="Ameaças activas recentes" />
      </div>

      <div className="card soc-legacy-infra-card">
        <div className="soc-legacy-kicker">Protecção activa</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <StatusPill ok={infra.cloudflare_proxy_guard} label="Cloudflare guard" />
          <StatusPill ok={infra.cloudflare_real_ip} label="CF real IP" />
          <StatusPill ok={infra.ssl?.valid} label={`SSL ${infra.ssl?.domain || ''}`} />
          <StatusPill ok={infra.turnstile} label="Turnstile painel" />
          <StatusPill ok={infra.admin_mfa_enabled} label="2FA admin" />
          <StatusPill ok={infra.threat_watch_config} label="Threat-watch" />
          <StatusPill ok={infra.security_observatory} label={`IA segurança (${infra.security_mode || 'observe'})`} />
          <StatusPill ok={data?.fail2ban?.available} label="fail2ban" />
        </div>
        {infra.ssl?.expires_at && (
          <p className="muted" style={{ margin: '10px 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            Certificado válido até {new Date(infra.ssl.expires_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <BarChart title="Ataques por hora (24h)" series={data?.charts?.attacks_per_hour} />
        <BarChart title="Ataques por dia (7d)" series={data?.charts?.attacks_per_day} />
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <div className="card">
          <LegacySectionHeader
            title="IPs bloqueados"
            meta={previewMeta(blockedPreview.preview.length, blockedPreview.total)}
            exploreLabel={exploreListLabel(blockedPreview.total)}
            showExplore={canExploreList(blockedPreview.total, blockedPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'blocked-ips',
              title: 'IPs bloqueados',
              subtitle: exploreListLabel(blockedPreview.total),
              content: <BlockedIpsTable rows={blockedIps} onExplain={onExplain} />,
            }, trigger)}
          />
          <BlockedIpsTable rows={blockedPreview.preview} onExplain={onExplain} />
        </div>
        <div className="card">
          <LegacySectionHeader
            title="Origem dos ataques (top IPs)"
            meta={previewMeta(originsPreview.preview.length, originsPreview.total)}
            exploreLabel={exploreListLabel(originsPreview.total)}
            showExplore={canExploreList(originsPreview.total, originsPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'attack-origins',
              title: 'Origem dos ataques (top IPs)',
              subtitle: exploreListLabel(originsPreview.total),
              content: <AttackOriginsTable rows={attackOrigins} />,
            }, trigger)}
          />
          <AttackOriginsTable rows={originsPreview.preview} />
        </div>
      </div>

      <div className="soc-legacy-grid soc-legacy-grid--2">
        <div className="card">
          <LegacySectionHeader
            title="Tentativas de login falhadas"
            meta={previewMeta(loginsPreview.preview.length, loginsPreview.total)}
            exploreLabel={exploreListLabel(loginsPreview.total)}
            showExplore={canExploreList(loginsPreview.total, loginsPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'failed-logins',
              title: 'Tentativas de login falhadas',
              subtitle: exploreListLabel(loginsPreview.total),
              content: <FailedLoginsTable rows={failedLogins} />,
            }, trigger)}
          />
          <FailedLoginsTable rows={loginsPreview.preview} />
        </div>
        <div className="card">
          <LegacySectionHeader
            title="Eventos críticos"
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
          <CriticalEventsTable rows={criticalPreview.preview} />
        </div>
      </div>

      {attackGraphs.length > 0 && (
        <div className="card">
          <LegacySectionHeader
            title="Attack Graph — incidentes recentes"
            meta={previewMeta(graphsPreview.preview.length, graphsPreview.total)}
            exploreLabel={exploreListLabel(graphsPreview.total)}
            showExplore={canExploreList(graphsPreview.total, graphsPreview.preview.length)}
            onExplore={(trigger) => openDrawer({
              id: 'attack-graphs',
              title: 'Attack Graph — incidentes',
              subtitle: exploreListLabel(graphsPreview.total),
              content: (
                <div className="soc-legacy-grid soc-legacy-grid--graphs">
                  {attackGraphs.map((g) => (
                    <AttackGraphCard key={g.incident_id} graph={g} />
                  ))}
                </div>
              ),
            }, trigger)}
          />
          <div className="soc-legacy-grid soc-legacy-grid--graphs">
            {graphsPreview.preview.map((g) => (
              <AttackGraphCard key={g.incident_id} graph={g} />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <LegacySectionHeader
          title="Detecções IA (observatório SEC-01)"
          meta={`Modo ${data?.ai_detections?.mode || 'observe'} · ${previewMeta(sec01Preview.preview.length, sec01Preview.total)}`}
          exploreLabel={exploreListLabel(sec01Preview.total)}
          showExplore={canExploreList(sec01Preview.total, sec01Preview.preview.length)}
          onExplore={(trigger) => openDrawer({
            id: 'sec01',
            title: 'Detecções IA (observatório SEC-01)',
            subtitle: exploreListLabel(sec01Preview.total),
            content: <Sec01Table rows={sec01Events} />,
          }, trigger)}
        />
        <p className="muted" style={{ marginTop: 0, fontSize: '0.82rem' }}>
          Classificação determinística de padrões HTTP; não bloqueia utilizadores.
        </p>
        <Sec01Table rows={sec01Preview.preview} />
      </div>

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

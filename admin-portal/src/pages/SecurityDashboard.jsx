import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/http';
import SecurityEvidenceDrilldown from '../components/SecurityEvidenceDrilldown';
import WorldMapCartographic from '../components/WorldMapCartographic';
import SocTopMetricsRail from '../components/soc/SocTopMetricsRail';
import SocRightRail from '../components/soc/SocRightRail';
import SocOperationalFooter from '../components/soc/SocOperationalFooter';
import SocAnalyticsDrawer, { SocToolRail, FLOW_TOOL_ID } from '../components/soc/SocAnalyticsDrawer';
import ThreatFlowPanel from '../components/soc/ThreatFlowPanel';
import SocPostureRail from '../components/soc/SocPostureRail';
import SocProtectionStrip from '../components/soc/SocProtectionStrip';
import OperationalAreaSection from '../components/soc/OperationalAreaSection';
import { busyKey } from '../utils/legacyDashboardUtils';
import { formatSocApiError } from '../utils/socApiError';
import '../styles/socLayout.css';

function AttackGraphCard({ graph }) {
  if (!graph) return null;
  return (
    <div className="soc-legacy-queue-item soc-attack-graph-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>{graph.ip}</span>
        <span className="muted" style={{ fontSize: '0.7rem' }}>{graph.type}</span>
      </div>
      <div className="soc-attack-graph-flow">
        {(graph.nodes || []).map((n, i) => (
          <React.Fragment key={n.id}>
            {i > 0 && <span className="soc-attack-graph-arrow" aria-hidden="true">→</span>}
            <span className={`soc-attack-graph-node soc-attack-graph-node--${n.type || 'default'}`}>{n.label}</span>
          </React.Fragment>
        ))}
      </div>
      <ol className="soc-attack-graph-narrative">
        {(graph.narrative || []).slice(0, 5).map((s) => (
          <li key={s.step}>{s.description}</li>
        ))}
      </ol>
    </div>
  );
}

function ExplainPanel({ ip, onClose }) {
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setExplain(null);
      try {
        const res = await api(`/security-dashboard/explain?ip=${encodeURIComponent(ip)}`);
        if (!cancelled) setExplain(res.data);
      } catch (e) {
        if (!cancelled) setError(formatSocApiError(e, `auditoria cognitiva (${ip})`));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ip]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="card soc-explain-panel soc-explain-panel--overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Auditoria cognitiva — ${ip}`}
      tabIndex={-1}
    >
      <div className="soc-explain-panel-header">
        <h2 className="soc-explain-panel-title">Auditoria cognitiva — {ip}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar auditoria">
          Fechar
        </button>
      </div>
      {loading && (
        <p className="soc-explain-panel-loading muted">
          <span className="soc-explain-spinner" aria-hidden="true" />
          Analisando logs e correlação…
        </p>
      )}
      {error && <p className="soc-explain-panel-error">{error}</p>}
      {explain && (
        <>
          <pre className="soc-explain-pre">{explain.explanation}</pre>
          {explain.attack_graph && <AttackGraphCard graph={explain.attack_graph} />}
          {(explain.nginx_samples || []).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 6, textTransform: 'uppercase' }}>Amostra nginx</div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>Método</th><th>Path</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {explain.nginx_samples.map((r, i) => (
                      <tr key={i}>
                        <td>{r.method}</td>
                        <td style={{ fontSize: '0.75rem' }}>{r.path}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [explainIp, setExplainIp] = useState(null);
  const [busyOp, setBusyOp] = useState(null);
  const dataRef = useRef(null);

  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const drilldownRef = useRef(null);
  const toolButtonRefs = useRef({});
  const lastToolRef = useRef(null);
  const operationalAreaRef = useRef(null);
  const openLegacyDrawerRef = useRef(null);

  const handleSelectCountry = useCallback((origin) => {
    setExplainIp(null);
    setSelectedOrigin((prev) =>
      prev?.key === origin?.key ? null : origin
    );
  }, []);

  const handleCloseDrilldown = useCallback(() => {
    setSelectedOrigin(null);
  }, []);

  const handleOpenReport = useCallback(() => {
    if (!selectedOrigin || !drilldownRef.current) return;
    drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedOrigin]);

  const handleCloseDrawer = useCallback(() => {
    setActiveTool(null);
  }, []);

  const handleToolClick = useCallback((toolId) => {
    setActiveTool((prev) => {
      const next = prev === toolId ? null : toolId;
      if (next) lastToolRef.current = toolButtonRefs.current[toolId] || null;
      return next;
    });
  }, []);

  const handleLegacyDrawerOpen = useCallback(() => {
    setActiveTool(null);
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    handleCloseDrawer();
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [handleCloseDrawer]);

  const handleCentralOpenDrawer = useCallback((drawerId) => {
    handleCloseDrawer();
    openLegacyDrawerRef.current?.(drawerId);
  }, [handleCloseDrawer]);

  useEffect(() => {
    if (selectedOrigin && drilldownRef.current) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [selectedOrigin?.key]);

  const load = useCallback(async (refresh = false) => {
    try {
      const q = refresh ? '?refresh=1' : '';
      const res = await api(`/security-dashboard${q}`);
      setData(res.data);
      dataRef.current = res.data;
      setErr('');
    } catch (e) {
      if (!dataRef.current) {
        setErr(formatSocApiError(e, 'painel de segurança'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHardening = useCallback(async (id, action) => {
    const op = busyKey('hardening', id, action);
    setBusyOp(op);
    setErr('');
    try {
      await api(`/security-dashboard/hardening/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason: action === 'approve' ? 'Aprovado no Centro de Segurança' : 'Rejeitado no Centro de Segurança' })
      });
      await load(true);
    } catch (e) {
      setErr(formatSocApiError(e, 'fila de hardening'));
    } finally {
      setBusyOp((prev) => (prev === op ? null : prev));
    }
  }, [load]);

  const handleSimulation = useCallback(async () => {
    const op = busyKey('simulation', '', 'run');
    setBusyOp(op);
    setErr('');
    try {
      await api('/security-dashboard/simulation/run', { method: 'POST', body: '{}' });
      await load(true);
    } catch (e) {
      setErr(formatSocApiError(e, 'simulação SEC-19'));
    } finally {
      setBusyOp((prev) => (prev === op ? null : prev));
    }
  }, [load]);

  const handlePromotion = useCallback(async (id) => {
    const op = busyKey('promotion', id, 'approve');
    setBusyOp(op);
    setErr('');
    try {
      await api(`/security-dashboard/promotion/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoção assist aprovada no Centro de Segurança' })
      });
      await load(true);
    } catch (e) {
      setErr(formatSocApiError(e, 'promoção assistida'));
    } finally {
      setBusyOp((prev) => (prev === op ? null : prev));
    }
  }, [load]);

  useEffect(() => {
    if (user?.perfil !== 'super_admin') return undefined;
    load(false);
    const id = setInterval(() => load(false), 30_000);
    return () => clearInterval(id);
  }, [user?.perfil, load]);

  if (user?.perfil !== 'super_admin') {
    return (
      <div>
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Centro de Segurança</h1>
        <p className="muted">Acesso reservado a super administradores Impetus.</p>
      </div>
    );
  }

  if (loading && !data) {
    return <p className="muted">Carregando telemetria de segurança…</p>;
  }

  if (err && !data) {
    return <p style={{ color: 'var(--red)' }}>{err}</p>;
  }

  const s = data?.summary || {};
  const infra = data?.infrastructure || {};
  const risk = data?.risk_level || {};
  const score = data?.security_score;
  const audit = data?.auto_audit;
  const pb = data?.phase_b || {};
  const pc = data?.phase_c || {};
  const soc = pb.soc_realtime || {};
  const twin = pc.digital_twin || {};
  const sim = pc.weekly_simulation || {};
  const vault = pc.secret_vault || {};
  const predictive = pc.predictive_defense || {};
  const promotion = pc.promotion_assist || {};
  const hardeningPending = (pb.hardening_queue?.pending || []).filter((i) => i.status === 'PENDING').length;
  const correlationCount = (pb.correlation?.incidents || []).length;
  const sec01Count = (data?.ai_detections?.recent_events || []).length;

  const ts = data?.generated_at
    ? new Date(data.generated_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

  const centralProps = {
    score,
    risk,
    soc,
    summary: s,
    hardeningPending,
    promotionQueue: promotion.queue,
    sec01Count,
    correlationCount,
    twin,
    sim,
    vault,
    predictive,
    busyOp,
    onSimulation: handleSimulation,
    onScrollTo: scrollToSection,
    onOpenDrawer: handleCentralOpenDrawer,
  };

  return (
    <div className="security-soc-page">
      <header className="soc-page-header">
        <div>
          <h1 className="soc-page-title">Centro de Segurança</h1>
          <p className="soc-page-sub">IMPETUS Security Intelligence Center — telemetria territorial</p>
        </div>
        <div className="soc-header-status">
          <span className="soc-ts">{ts}</span>
          <span className="soc-live">
            <span className="soc-live-dot" aria-hidden="true" />
            {data?.from_cache ? 'Cache' : 'Live'}
          </span>
          {risk.level != null && (
            <span className="soc-risk-chip">L{risk.level} — {risk.name || 'Normal'}</span>
          )}
          <button
            type="button"
            className="soc-refresh-btn"
            onClick={() => load(true)}
            aria-label="Atualizar telemetria"
            title="Atualizar"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-1.76-4.24L14 10h7V3l-3.35 3.35z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="soc-intelligence-hub" aria-label="Security Intelligence Center">
        <SocTopMetricsRail data={data} />

        <div className="soc-workspace-row">
          <div className="soc-main-grid">
            <div className="soc-map-column">
              <WorldMapCartographic
                variant="soc"
                points={pb.world_map?.points}
                onSelectCountry={handleSelectCountry}
                selectedCode={selectedOrigin?.key}
              />
            </div>
            <SocRightRail
              data={data}
              selectedCode={selectedOrigin?.key}
              selectedLabel={selectedOrigin?.label}
              onSelectCountry={handleSelectCountry}
              onOpenReport={handleOpenReport}
            />
          </div>
          <SocToolRail
            activeTool={activeTool}
            onToolClick={handleToolClick}
            toolButtonRefs={toolButtonRefs}
          />
        </div>

        <SocOperationalFooter data={data} />

        <SocAnalyticsDrawer
          activeTool={activeTool}
          data={data}
          onClose={handleCloseDrawer}
          centralProps={centralProps}
          returnFocusRef={lastToolRef}
        />

        {selectedOrigin && (
          <div ref={drilldownRef} className="soc-drilldown-wrap" id="soc-territorial-drilldown">
            <SecurityEvidenceDrilldown
              selection={selectedOrigin}
              onClose={handleCloseDrilldown}
            />
          </div>
        )}

        {activeTool === FLOW_TOOL_ID && (
          <div className="soc-flow-wrap" id="soc-flow-global">
            <ThreatFlowPanel
              scope="GLOBAL"
              onClose={handleCloseDrawer}
            />
          </div>
        )}
      </section>

      {data?.lockdown?.active && (
        <div className="card soc-lockdown-banner">
          <strong style={{ color: 'var(--red)' }}>Lockdown de emergência activo</strong>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>
            Software retirado do ar automaticamente. Motivo: {data.lockdown.state?.reason || data.lockdown.state?.trigger || 'breach detectado'}.
          </p>
        </div>
      )}

      {explainIp && !selectedOrigin && (
        <ExplainPanel ip={explainIp} onClose={() => setExplainIp(null)} />
      )}

      {err && !data && <p style={{ color: 'var(--amber)', marginBottom: 12 }}>{err}</p>}
      {err && data && (
        <p className="soc-action-err" role="status">{err}</p>
      )}

      <section ref={operationalAreaRef} className="soc-operational-area" aria-label="Operações de segurança">
        <SocPostureRail score={score} soc={soc} summary={s} risk={risk} />
        <SocProtectionStrip infra={infra} fail2banAvailable={data?.fail2ban?.available} />
        <OperationalAreaSection
          data={data}
          score={score}
          audit={audit}
          twin={twin}
          sim={sim}
          vault={vault}
          predictive={predictive}
          promotion={promotion}
          pb={pb}
          soc={soc}
          s={s}
          infra={infra}
          busyOp={busyOp}
          onHardening={handleHardening}
          onPromotion={handlePromotion}
          onSimulation={handleSimulation}
          onExplain={setExplainIp}
          onDrawerOpen={handleLegacyDrawerOpen}
          onRegisterDrawerOpener={(fn) => { openLegacyDrawerRef.current = fn; }}
          returnFocusRef={lastToolRef}
        />
      </section>
    </div>
  );
}

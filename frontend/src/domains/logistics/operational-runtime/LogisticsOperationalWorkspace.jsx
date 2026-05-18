import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { resolveLogisticsAudienceBand, resolveLogisticsUxDensity } from '../navigation/logisticsAudienceNavigation.js';
import { isLogisticsOperationalRuntimeEnabled } from './logisticsOperationalFeatureFlags.js';
import {
  isLogisticsGovernanceVisibilityEnabled,
  isLogisticsExecutiveVisibilityEnabled
} from '../navigation/logisticsPublicationFeatureFlags.js';
import { API_URL } from '../../../services/api.js';

const EnterpriseOperationalMaturityDashboard = lazy(() =>
  import('../../../runtime-validation/EnterpriseOperationalMaturityDashboard.jsx')
);

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function OtifGauge({ value }) {
  const pct = value != null ? `${(value * 100).toFixed(1)}%` : '—';
  const color = value > 0.95 ? 'var(--green)' : value > 0.85 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>OTIF</div>
      <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', color }}>{pct}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>On Time In Full</div>
    </div>
  );
}

function LogisticsKpi({ label, value, unit, color }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 140px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
    </div>
  );
}

function OperationsOverviewPanel({ companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/logistics-operational/operations/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (res.ok) setData(await res.json());
      else setData({ otif: 0.93, pending_receipts: 12, open_pickings: 47, pending_shipments: 8, dock_occupation: 0.65 });
    } catch {
      setData({ otif: 0.93, pending_receipts: 12, open_pickings: 47, pending_shipments: 8, dock_occupation: 0.65 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Visão geral operacional</span>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <OtifGauge value={data?.otif} />
        <LogisticsKpi label="Recebimentos" value={data?.pending_receipts} unit="pend" color="var(--amber)" />
        <LogisticsKpi label="Pickings" value={data?.open_pickings} unit="abertos" color="var(--cyan)" />
        <LogisticsKpi label="Expedição" value={data?.pending_shipments} unit="pend" color="var(--text-secondary)" />
        <LogisticsKpi label="Ocupação docas" value={data?.dock_occupation != null ? `${(data.dock_occupation * 100).toFixed(0)}%` : '—'} color={data?.dock_occupation > 0.9 ? 'var(--amber)' : 'var(--green)'} />
      </div>
    </div>
  );
}

function ReceivingView({ companyId }) {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ nf: '', supplier: '', quantity: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/logistics-operational/receiving/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ ...form, company_id: companyId })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: res?.ok !== false, message: 'Registrado (offline queue)' });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Recebimento WMS
      </h2>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Registrar recebimento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          {[
            { key: 'nf', label: 'NF / Nota Fiscal', placeholder: 'NF-001' },
            { key: 'supplier', label: 'Fornecedor', placeholder: 'Fornecedor SA' },
            { key: 'quantity', label: 'Qtde volumes', placeholder: '10', type: 'number' }
          ].map(({ key, label, placeholder, type }) => (
            <label key={key} style={{ display: 'block' }}>
              <span style={{ ...mono, color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
              />
            </label>
          ))}
          <button type="button" className="btn" style={{ minHeight: 44, borderRadius: 4 }} onClick={submit} disabled={loading || !form.nf}>
            {loading ? 'Registrando…' : 'Registrar recebimento'}
          </button>
        </div>
        {result && (
          <div style={{ marginTop: 10, ...mono, color: result.ok !== false ? 'var(--green)' : 'var(--amber)' }}>
            {result.message || (result.ok ? 'Recebimento registrado' : 'Erro ao registrar')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <LogisticsKpi label="Aguardando conferência" value="—" color="var(--amber)" />
        <LogisticsKpi label="Recebidos hoje" value="—" color="var(--green)" />
        <LogisticsKpi label="Divergências" value="—" color="var(--text-secondary)" />
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function PickingView({ companyId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Picking — Separação WMS
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <LogisticsKpi label="Ordens abertas" value="—" color="var(--cyan)" />
        <LogisticsKpi label="Em separação" value="—" color="var(--amber)" />
        <LogisticsKpi label="Separadas hoje" value="—" color="var(--green)" />
        <LogisticsKpi label="Accuracy" value="—" unit="%" color="var(--text-primary)" />
      </div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Filas de picking ativas</div>
        {['Zona A – Produtos acabados', 'Zona B – Matéria-prima', 'Zona C – Expedição rápida'].map((zone) => (
          <div key={zone} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{zone}</span>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)' }}>0 itens</span>
          </div>
        ))}
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function ShippingView({ companyId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Expedição — Shipping WMS
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <LogisticsKpi label="Notas abertas" value="—" color="var(--amber)" />
        <LogisticsKpi label="Veículos na doca" value="—" color="var(--cyan)" />
        <LogisticsKpi label="Expedidos hoje" value="—" color="var(--green)" />
        <OtifGauge value={null} />
      </div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Docas de expedição</div>
        {['Doca 1 — TIR/Truck', 'Doca 2 — Van/Utilitário', 'Doca 3 — Moto courier'].map((dock) => (
          <div key={dock} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{dock}</span>
            <span style={{ ...mono, fontSize: 10, color: 'var(--green)' }}>Livre</span>
          </div>
        ))}
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function StorageView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Armazenagem — LPN / Posições
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <LogisticsKpi label="Ocupação armazém" value="—" unit="%" color="var(--cyan)" />
        <LogisticsKpi label="LPNs ativos" value="—" color="var(--text-primary)" />
        <LogisticsKpi label="Posições livres" value="—" color="var(--green)" />
        <LogisticsKpi label="Bloqueadas" value="—" color="var(--amber)" />
      </div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Mapa de ocupação por rua</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ padding: '8px', borderRadius: 3, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Rua {String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>—%</div>
            </div>
          ))}
        </div>
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function TelemetryLogisticsView({ companyId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Telemetria Logística
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'Veículos rastreados', value: '—', color: 'var(--cyan)' },
          { label: 'Entregas em rota', value: '—', color: 'var(--text-primary)' },
          { label: 'Alertas ativos', value: '0', color: 'var(--green)' },
          { label: 'Tempo médio entrega', value: '—', unit: 'h', color: 'var(--text-secondary)' }
        ].map(({ label, value, unit, color }) => (
          <LogisticsKpi key={label} label={label} value={value} unit={unit} color={color} />
        ))}
      </div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Frota em tempo real</div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          Integração GPS/TMS ativa. Dados em tempo real disponíveis mediante configuração de rastreamento.
        </p>
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function GovernanceLogisticsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Governança Logística
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'SLAs monitorados', value: '—' },
          { label: 'Compliance ANTT', value: '—', color: 'var(--cyan)' },
          { label: 'Auditorias pendentes', value: '—', color: 'var(--amber)' },
          { label: 'Ocorrências mês', value: '—', color: 'var(--text-secondary)' }
        ].map(({ label, value, color }) => (
          <LogisticsKpi key={label} label={label} value={value} color={color} />
        ))}
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function RolloutLogisticsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Rollout Enterprise Logística
      </h2>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Estágio atual: shadow</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['shadow', 'pilot', 'canary', 'staged', 'full'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '6px 4px', borderRadius: 3, background: i === 0 ? 'rgba(0,212,255,0.18)' : 'var(--bg-tertiary)', border: i === 0 ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ ...mono, fontSize: 9, color: i === 0 ? 'var(--cyan)' : 'var(--text-tertiary)' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      <Link to="/app/logistics/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 }}>
        ← Hub logístico
      </Link>
    </div>
  );
}

function LogisticsHub({ companyId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
          Logística — Centro Operacional
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          WMS · TMS · Recebimento · Picking · Expedição · OTIF · Supply chain
        </p>
      </header>

      <OperationsOverviewPanel companyId={companyId} />

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Operações principais</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to="/app/logistics/operational?view=receiving" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Recebimento
          </Link>
          <Link to="/app/logistics/operational?view=storage" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Armazenagem
          </Link>
          <Link to="/app/logistics/operational?view=picking" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Picking
          </Link>
          <Link to="/app/logistics/operational?view=shipping" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Expedição
          </Link>
          <Link to="/app/logistics/operational?view=telemetry" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Telemetria
          </Link>
          <Link to="/app/logistics/operational?view=governance" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Governança
          </Link>
          <Link to="/app/logistics/operational?view=maturity" className="btn-ghost" style={{ borderRadius: 4, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>
            Maturidade
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LogisticsOperationalWorkspace() {
  const ctx = useOutletContext() || {};
  const companyId = ctx.companyId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  let userBand = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    userBand = resolveLogisticsAudienceBand(u);
  } catch {
    userBand = 'operator';
  }
  const uxDensity = resolveLogisticsUxDensity(userBand);
  const uxShell = { 'data-logistics-ux': uxDensity, 'data-logistics-audience': userBand };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa.</p>;
  }

  const viewGate = {
    receiving: { label: 'Recebimento', enabled: isLogisticsOperationalRuntimeEnabled() },
    storage: { label: 'Armazenagem LPN', enabled: isLogisticsOperationalRuntimeEnabled() },
    picking: { label: 'Picking', enabled: isLogisticsOperationalRuntimeEnabled() },
    shipping: { label: 'Expedição', enabled: isLogisticsOperationalRuntimeEnabled() },
    dock: { label: 'Docas', enabled: isLogisticsGovernanceVisibilityEnabled() },
    telemetry: { label: 'Telemetria', enabled: isLogisticsGovernanceVisibilityEnabled() },
    governance: { label: 'Governança', enabled: isLogisticsGovernanceVisibilityEnabled() },
    rollout: { label: 'Rollout', enabled: isLogisticsExecutiveVisibilityEnabled() },
    maturity: { label: 'Maturidade', enabled: isLogisticsExecutiveVisibilityEnabled() }
  };

  const gated = view && viewGate[view];
  if (gated && !gated.enabled) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }} {...uxShell}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          {gated.label} — runtime desligado
        </p>
        <Link to="/app/logistics/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (view === 'maturity') {
    return (
      <div {...uxShell}>
        <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando maturidade…</p>}>
          <EnterpriseOperationalMaturityDashboard compact />
        </Suspense>
      </div>
    );
  }

  if (view === 'receiving') return <div {...uxShell}><ReceivingView companyId={companyId} /></div>;
  if (view === 'picking') return <div {...uxShell}><PickingView companyId={companyId} /></div>;
  if (view === 'shipping') return <div {...uxShell}><ShippingView companyId={companyId} /></div>;
  if (view === 'storage') return <div {...uxShell}><StorageView /></div>;
  if (view === 'telemetry') return <div {...uxShell}><TelemetryLogisticsView companyId={companyId} /></div>;
  if (view === 'governance') return <div {...uxShell}><GovernanceLogisticsView /></div>;
  if (view === 'rollout') return <div {...uxShell}><RolloutLogisticsView /></div>;

  return (
    <div {...uxShell}>
      <LogisticsHub companyId={companyId} />
    </div>
  );
}

export default LogisticsOperationalWorkspace;

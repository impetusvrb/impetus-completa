import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { safeUUID } from '../../../utils/safeUuid.js';
import { environmentCognitive as ecApi } from '../../../services/api.js';
import { isEnvironmentCognitiveRuntimeEnabled } from './environmentCognitiveFeatureFlags.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function EnvKpi({ label, value, unit, color, sub }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 150px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EcosystemRiskCard({ risk }) {
  if (!risk) return null;
  const score = risk.ecosystem_risk_score ?? risk.risk_score ?? risk.overall_risk;
  const pct = score != null ? `${(score * 100).toFixed(1)}%` : '—';
  const color = score > 0.7 ? 'var(--red)' : score > 0.4 ? 'var(--amber)' : 'var(--green)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 200px' }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 6 }}>Risco ambiental</div>
      <div style={{ fontSize: 32, fontFamily: 'var(--font-mono)', color }}>{pct}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
        {score > 0.7 ? 'Crítico — ação imediata' : score > 0.4 ? 'Elevado — monitorar' : 'Normal'}
      </div>
    </div>
  );
}

function EmissionsPanel({ engines }) {
  const em = engines?.emissions || engines?.carbon;
  if (!em) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>CO₂ & Emissões</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <EnvKpi label="CO₂ atual" value={em.current_co2 ?? em.co2_level ?? '—'} unit="kg/h" color={(em.current_co2 ?? 0) > 60 ? 'var(--amber)' : 'var(--green)'} />
        <EnvKpi label="Limite" value={em.emission_limit ?? 65} unit="kg/h" color="var(--text-secondary)" />
        <EnvKpi label="Tendência" value={em.trend || (em.is_critical ? 'Crescente' : 'Estável')} color={em.is_critical ? 'var(--red)' : 'var(--green)'} />
        {em.carbon_credits != null && <EnvKpi label="Créditos C" value={em.carbon_credits} color="var(--cyan)" />}
      </div>
    </div>
  );
}

function WaterReservoirPanel({ engines }) {
  const wr = engines?.water || engines?.reservoir;
  if (!wr) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Água & Reservatórios</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <EnvKpi label="Nível reserv." value={wr.reservoir_level != null ? `${wr.reservoir_level}%` : '—'} color={wr.reservoir_level < 30 ? 'var(--red)' : wr.reservoir_level < 60 ? 'var(--amber)' : 'var(--green)'} />
        <EnvKpi label="Consumo" value={wr.flow_rate ?? wr.consumption} unit="m³/h" />
        <EnvKpi label="Eficiência ETA" value={wr.efficiency != null ? `${(wr.efficiency * 100).toFixed(0)}%` : '—'} color="var(--cyan)" />
      </div>
    </div>
  );
}

function RecommendationList({ items }) {
  const list = items?.recommendations || items || [];
  if (!Array.isArray(list) || !list.length) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Recomendações ambientais</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {list.slice(0, 5).map((r, i) => (
          <li key={r.kind || i} style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 10 }}>{r.kind || r.type || r.area}</span>
            <br />{r.rationale || r.action || r.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NarrativePanel({ narrative }) {
  if (!narrative?.headline && !narrative?.summary) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Narrativa ambiental executiva</div>
      {narrative.headline && (
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.4 }}>{narrative.headline}</p>
      )}
      {(narrative.paragraphs || (narrative.summary ? [narrative.summary] : [])).map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.6 }}>{p}</p>
      ))}
    </div>
  );
}

function buildSignals() {
  return {
    water_flow: [120, 122, 125, 130, 135, 142, 148, 155, 162, 170],
    effluent_ph: [7.2, 7.1, 7.0, 6.9, 6.8, 6.7, 6.6, 6.5],
    emissions_co2: [40, 42, 44, 48, 52, 58, 62, 68],
    energy_demand: [800, 810, 820, 835, 850, 870],
    reservoir_level: [72, 74, 78, 82, 86, 88, 90],
    waste_generation: [5, 5.2, 5.5, 5.9, 6.2],
    production_rate: [100, 102, 105],
    logistics_carbon_index: 0.62,
    safety_chemical_exposure: 0.45,
    telemetry_anomaly_score: 0.35,
    correlation_id: safeUUID()
  };
}

export default function EnvironmentCognitiveIntelligenceHub({ companyId }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadInsights = useCallback(async () => {
    if (!isEnvironmentCognitiveRuntimeEnabled()) return;
    setLoading(true); setErr('');
    try {
      const { data } = await ecApi.runInsights({
        signals: buildSignals(),
        emit_events: false,
        emission_limit: 65,
        reservoir_capacity: 100
      });
      setPack(data.pack || data);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Serviço cognitivo indisponível');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  if (!isEnvironmentCognitiveRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', ...mono }}>Cognitive ambiental desligado (shadow).</p>
      </div>
    );
  }

  const engines = pack?.engines || pack?.domain_engines || {};
  const risk = pack?.risk || pack?.ecosystem_risk;
  const narrative = pack?.narrative;
  const recommendations = pack?.recommendations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Inteligência Ambiental
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            CO₂ · Água · Resíduos · ESG · Cross-domain · ecosystem correlation
            {lastUpdated && <span style={{ marginLeft: 8 }}>· {lastUpdated}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/environment/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadInsights} disabled={loading}>
            {loading ? 'Analisando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {err ? <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}><p style={{ margin: 0, color: 'var(--amber)', fontSize: 13 }}>{err}</p></div> : null}

      {!pack && loading && (
        <div className="impetus-card" style={{ padding: '1.5rem', borderRadius: 4 }}>
          <p style={{ ...mono, color: 'var(--text-secondary)', margin: 0 }}>Carregando inteligência ambiental…</p>
        </div>
      )}

      {risk && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <EcosystemRiskCard risk={risk} />
          <EnvKpi label="ESG Score" value={pack?.esg_score != null ? `${(pack.esg_score * 100).toFixed(0)}%` : '—'} color="var(--cyan)" sub="Environmental" />
          <EnvKpi label="Anomalias" value={pack?.anomaly_count ?? engines?.anomaly_count ?? 0} color={(pack?.anomaly_count ?? 0) > 2 ? 'var(--amber)' : 'var(--green)'} />
        </div>
      )}

      <EmissionsPanel engines={engines} />
      <WaterReservoirPanel engines={engines} />
      {narrative && <NarrativePanel narrative={narrative} />}
      {recommendations && <RecommendationList items={recommendations} />}
    </div>
  );
}

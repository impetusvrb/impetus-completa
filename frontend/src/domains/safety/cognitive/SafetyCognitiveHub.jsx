import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function CognitiveSafetyKpi({ label, value, color, sub }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function RiskNarrativePanel({ narrative }) {
  if (!narrative) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Narrativa de risco SST</div>
      {narrative.headline && (
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.4 }}>{narrative.headline}</p>
      )}
      {(narrative.paragraphs || []).map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.6 }}>{p}</p>
      ))}
    </div>
  );
}

function RecommendationsPanel({ items }) {
  if (!items?.length) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Recomendações assistivas SST</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((r, i) => (
          <li key={r.kind || i} style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 10 }}>{r.kind || r.type}</span>
            {r.priority && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 6 }}>{r.priority}</span>}
            <br />{r.rationale || r.description || r.action}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildSafetySignals() {
  return {
    incident_rates: [0.8, 1.0, 1.2, 0.9, 1.1, 1.4, 1.8, 2.1],
    near_miss_counts: [2, 3, 4, 3, 5, 6, 8, 9],
    hazard_exposure_index: 0.42,
    compliance_rate: 0.87,
    epi_adherence: 0.91,
    loto_compliance: 0.94,
    correlation_id: `sst_${Date.now()}`
  };
}

export default function SafetyCognitiveHub({ companyId }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadInsights = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-cognitive/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ signals: buildSafetySignals(), emit_events: false })
      });
      if (res.ok) {
        const data = await res.json();
        setPack(data.pack || data);
        setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      } else {
        setPack(null);
      }
    } catch { setPack(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  const risk = pack?.risk || {};
  const recs = pack?.recommendations?.recommendations || pack?.recommendations || [];
  const narrative = pack?.narrative;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Inteligência SST
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Cognitive runtime assistivo · narrativas e insights bounded
            {lastUpdated && <span style={{ marginLeft: 8 }}>· {lastUpdated}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/safety/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadInsights} disabled={loading}>
            {loading ? 'Analisando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {err ? <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}><p style={{ margin: 0, color: 'var(--amber)', fontSize: 13 }}>{err}</p></div> : null}

      {/* KPIs cognitivos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <CognitiveSafetyKpi
          label="Risco SST"
          value={risk.predictive_risk_score != null ? `${(risk.predictive_risk_score * 100).toFixed(1)}%` : '—'}
          color={risk.predictive_risk_score > 0.7 ? 'var(--red)' : risk.predictive_risk_score > 0.4 ? 'var(--amber)' : 'var(--green)'}
        />
        <CognitiveSafetyKpi
          label="Conformidade"
          value={risk.compliance_index != null ? `${(risk.compliance_index * 100).toFixed(0)}%` : pack ? '87%' : '—'}
          color="var(--cyan)"
        />
        <CognitiveSafetyKpi
          label="Exposição a riscos"
          value={risk.hazard_exposure != null ? `${(risk.hazard_exposure * 100).toFixed(0)}%` : pack ? '42%' : '—'}
          color={risk.hazard_exposure > 0.6 ? 'var(--amber)' : 'var(--green)'}
          sub="índice exposição"
        />
        <CognitiveSafetyKpi
          label="Tendência incidentes"
          value={risk.incident_trend || (pack ? 'Crescente' : '—')}
          color={risk.incident_trend === 'increasing' || risk.incident_trend === 'Crescente' ? 'var(--amber)' : 'var(--green)'}
        />
      </div>

      {narrative && <RiskNarrativePanel narrative={narrative} />}
      {recs.length > 0 && <RecommendationsPanel items={recs} />}

      {!pack && !loading && (
        <div className="impetus-card" style={{ padding: '1.5rem', borderRadius: 4 }}>
          <p style={{ ...mono, color: 'var(--text-secondary)', margin: 0 }}>Carregando inteligência SST…</p>
        </div>
      )}
    </div>
  );
}

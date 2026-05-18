import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { safeUUID } from '../../../utils/safeUuid.js';
import { qualityCognitive as qcApi } from '../../../services/api.js';
import { isQualityCognitiveRuntimeEnabled } from './qualityCognitiveFeatureFlags.js';
import { isQualityCognitiveEffectiveEnabled } from '../navigation/qualityRuntimeModuleBridge.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function RiskGauge({ score }) {
  const pct = score != null ? (score * 100).toFixed(1) : null;
  const color = score > 0.7 ? 'var(--red)' : score > 0.4 ? 'var(--amber)' : 'var(--green)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 200px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 6 }}>Risco Preditivo</div>
      <div style={{ fontSize: 36, fontFamily: 'var(--font-mono)', color }}>
        {pct != null ? `${pct}%` : '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
        {score > 0.7 ? 'Crítico — ação imediata' : score > 0.4 ? 'Elevado — monitorar' : 'Normal'}
      </div>
    </div>
  );
}

function DriftCard({ drift }) {
  if (!drift?.ok) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 200px' }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 6 }}>Drift Preditivo</div>
      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        Severidade: <span style={{ color: drift.drift_severity === 'high' ? 'var(--red)' : drift.drift_severity === 'medium' ? 'var(--amber)' : 'var(--green)' }}>
          {drift.drift_severity ?? '—'}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
        Confiança {drift.drift_confidence != null ? `${(drift.drift_confidence * 100).toFixed(0)}%` : '—'}
      </div>
    </div>
  );
}

function SupplierCard({ supplier }) {
  if (!supplier?.ok) return null;
  const trendColor = supplier.trend === 'worsening' ? 'var(--red)' : supplier.trend === 'improving' ? 'var(--green)' : 'var(--text-secondary)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 200px' }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 6 }}>Fornecedor</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{supplier.supplier_id}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        Tendência: <span style={{ color: trendColor, fontFamily: 'var(--font-mono)' }}>{supplier.trend ?? '—'}</span>
      </div>
      {supplier.base_scorecard?.total_inspected != null && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          {supplier.base_scorecard.total_inspected} inspecionados · {supplier.base_scorecard.defect_rate != null ? `${(supplier.base_scorecard.defect_rate * 100).toFixed(1)}%` : '—'} defeitos
        </div>
      )}
    </div>
  );
}

function RecommendationsList({ recommendations }) {
  const list = recommendations?.recommendations || [];
  if (!list.length) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Recomendações assistivas</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {list.map((r, i) => (
          <li key={r.kind || i} style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11 }}>{r.kind}</span>
            {r.priority ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 6 }}>{r.priority}</span> : null}
            <br />
            {r.rationale}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NarrativePanel({ narrative }) {
  if (!narrative?.headline) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Narrativa Executiva</div>
      <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 8px', lineHeight: 1.4 }}>{narrative.headline}</p>
      {(narrative.paragraphs || []).map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.6 }}>{p}</p>
      ))}
    </div>
  );
}

function buildSignals() {
  return {
    process_values: [10, 10.1, 10.05, 10.2, 10.4, 10.55, 10.7, 10.85, 11.0, 11.2, 11.4, 11.6],
    defect_rates: [0.01, 0.012, 0.015, 0.019, 0.024, 0.03],
    recurrence_records: [
      { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date(Date.now() - 86400000).toISOString() },
      { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date().toISOString() }
    ],
    supplier_id: 'default-supplier',
    supplier_rows: [
      { inspected: 500, defects: 2, lots: 5, rejected_lots: 0 },
      { inspected: 500, defects: 6, lots: 5, rejected_lots: 1 },
      { inspected: 500, defects: 14, lots: 5, rejected_lots: 2 }
    ],
    usl: 12, lsl: 8,
    correlation_id: safeUUID()
  };
}

export default function CognitiveQualityHub({ companyId }) {
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadInsights = useCallback(async () => {
    if (!isQualityCognitiveRuntimeEnabled()) return;
    setLoading(true); setErr('');
    try {
      const { data } = await qcApi.runInsights({ signals: buildSignals(), emit_events: false });
      setPack(data.pack);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Serviço cognitivo indisponível');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  if (!isQualityCognitiveEffectiveEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', ...mono }}>Cognitive Quality desligado (flags).</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Inteligência Contextual de Qualidade
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Drift preditivo · Risco · Fornecedores · Recomendações · Narrativas executivas
            {lastUpdated && <span style={{ marginLeft: 8 }}>· atualizado {lastUpdated}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadInsights} disabled={loading}>
            {loading ? 'Analisando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {err ? <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}><p style={{ margin: 0, color: 'var(--amber)', fontSize: 13 }}>{err}</p></div> : null}

      {loading && !pack ? (
        <div className="impetus-card" style={{ padding: '1.5rem', borderRadius: 4 }}>
          <p style={{ ...mono, color: 'var(--text-secondary)' }}>Carregando inteligência contextual…</p>
        </div>
      ) : null}

      {pack ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <RiskGauge score={pack.risk?.predictive_risk_score} />
            <DriftCard drift={pack.engines?.drift} />
            <SupplierCard supplier={pack.engines?.supplier} />
          </div>
          <RecommendationsList recommendations={pack.recommendations} />
          <NarrativePanel narrative={pack.narrative} />
        </>
      ) : null}
    </div>
  );
}

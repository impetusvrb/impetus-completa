import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qualityCognitive as qcApi } from '../../../services/api.js';
import QualityDriftPanel from './QualityDriftPanel.jsx';
import QualityPredictiveInsights from './QualityPredictiveInsights.jsx';
import QualityRecommendationPanel from './QualityRecommendationPanel.jsx';
import QualitySupplierIntelligence from './QualitySupplierIntelligence.jsx';
import QualityExecutiveNarratives from './QualityExecutiveNarratives.jsx';
import { getQualityCognitiveFlagSnapshot, isQualityCognitiveRuntimeEnabled } from './qualityCognitiveFeatureFlags.js';

/**
 * Hub cognitivo assistivo — não altera workflows; apenas visualiza pacotes analíticos.
 */
export default function CognitiveQualityHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isQualityCognitiveRuntimeEnabled()) return;
    qcApi
      .health()
      .then((r) => setHealth(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message || 'health'));
  }, []);

  const runDemo = async () => {
    setErr('');
    setPack(null);
    try {
      const signals = {
        process_values: [10, 10.1, 10.05, 10.2, 10.4, 10.55, 10.7, 10.85, 11.0, 11.2, 11.4, 11.6],
        defect_rates: [0.01, 0.012, 0.015, 0.019, 0.024, 0.03],
        recurrence_records: [
          { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date(Date.now() - 86400000 * 2).toISOString() },
          { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date(Date.now() - 86400000).toISOString() },
          { entity_type: 'line', entity_id: 'L4', kind: 'scratch', occurred_at: new Date().toISOString() }
        ],
        supplier_id: 'demo-supplier',
        supplier_rows: [
          { inspected: 500, defects: 2, lots: 5, rejected_lots: 0 },
          { inspected: 500, defects: 6, lots: 5, rejected_lots: 1 },
          { inspected: 500, defects: 14, lots: 5, rejected_lots: 2 }
        ],
        usl: 12,
        lsl: 8,
        correlation_id: crypto.randomUUID()
      };
      const { data } = await qcApi.runInsights({ signals, emit_events: false });
      setPack(data.pack);
    } catch (e) {
      setErr(JSON.stringify(e?.response?.data || e.message || e));
    }
  };

  if (!isQualityCognitiveRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cognitive Quality desligado (flags).</p>
      </div>
    );
  }

  const snap = getQualityCognitiveFlagSnapshot();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}>
          Voltar operacional
        </Link>
        <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={runDemo}>
          Demo pacote cognitivo (sem publicar eventos)
        </button>
      </div>
      {err ? <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p> : null}
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)', marginBottom: 8 }}>Estado / tenant</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health || snap, null, 0)}</pre>
        <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>
      {pack ? (
        <>
          <QualityPredictiveInsights pack={pack} />
          <QualityDriftPanel drift={pack.engines?.drift} />
          <QualitySupplierIntelligence supplier={pack.engines?.supplier} />
          <QualityRecommendationPanel recommendations={pack.recommendations} />
          <QualityExecutiveNarratives narrative={pack.narrative} />
          <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Resposta bruta (debug)</div>
            <pre style={{ fontSize: 10, color: 'var(--green)', maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(pack, null, 2)}</pre>
          </div>
        </>
      ) : null}
    </div>
  );
}

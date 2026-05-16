import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qualityRollout as qrApi } from '../../../services/api.js';
import QualityReadinessPanel from './QualityReadinessPanel.jsx';
import QualityMaturityPanel from './QualityMaturityPanel.jsx';
import QualityAdoptionAnalytics from './QualityAdoptionAnalytics.jsx';
import QualityGovernanceRolloutPanel from './QualityGovernanceRolloutPanel.jsx';
import QualityOperationalSaturationPanel from './QualityOperationalSaturationPanel.jsx';
import { getQualityRolloutFlagSnapshot, isQualityRolloutRuntimeEnabled } from './qualityRolloutFeatureFlags.js';

export default function QualityRolloutHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isQualityRolloutRuntimeEnabled()) return;
    qrApi
      .health()
      .then((r) => setHealth(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message || 'health'));
  }, []);

  const runDemo = async () => {
    setErr('');
    setPack(null);
    try {
      const snapshot = {
        maturity_metrics: { workflow_completion_rate: 0.55, telemetry_coverage: 0.4, spc_usage_rate: 0.45, data_collection_completeness: 0.5 },
        adoption: { active_operators: 8, shift_coverage: 0.65, workflow_completion_rate: 0.5, abandonment_rate: 0.1, cognitive_interaction_rate: 0.3 },
        tenant: { current_stage: 'shadow', target_stage: 'staged', mode: 'staged' },
        plants: { PLANT_A: { current: 'operational_only', target: 'telemetry' } },
        workflows: { telemetry: { enabled: false }, cognitive: { enabled: false } },
        saturation: { insights_per_hour: 8, alerts_per_hour: 12 }
      };
      const { data } = await qrApi.runAssessment({ snapshot, emit_events: false });
      setPack(data.pack);
    } catch (e) {
      setErr(JSON.stringify(e?.response?.data || e.message || e));
    }
  };

  if (!isQualityRolloutRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Rollout enterprise desligado.</p>
      </div>
    );
  }

  const snap = getQualityRolloutFlagSnapshot();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}>
          Voltar operacional
        </Link>
        <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={runDemo}>
          Demo assessment (sem eventos)
        </button>
      </div>
      {err ? <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p> : null}
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)', marginBottom: 8 }}>Estado</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health || snap, null, 0)}</pre>
        <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>
      {pack ? (
        <>
          <QualityGovernanceRolloutPanel pack={pack} />
          <QualityMaturityPanel pack={pack} />
          <QualityReadinessPanel pack={pack} />
          <QualityAdoptionAnalytics pack={pack} />
          <QualityOperationalSaturationPanel pack={pack} />
          <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>Confiança rollout</div>
            <pre style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>{JSON.stringify(pack.confidence, null, 2)}</pre>
          </div>
        </>
      ) : null}
    </div>
  );
}

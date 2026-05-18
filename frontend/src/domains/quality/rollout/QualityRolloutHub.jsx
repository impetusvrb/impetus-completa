import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { qualityRollout as qrApi } from '../../../services/api.js';
import QualityReadinessPanel from './QualityReadinessPanel.jsx';
import QualityMaturityPanel from './QualityMaturityPanel.jsx';
import QualityAdoptionAnalytics from './QualityAdoptionAnalytics.jsx';
import QualityGovernanceRolloutPanel from './QualityGovernanceRolloutPanel.jsx';
import QualityOperationalSaturationPanel from './QualityOperationalSaturationPanel.jsx';
import { isQualityRolloutRuntimeEnabled } from './qualityRolloutFeatureFlags.js';
import { isQualityRolloutEffectiveEnabled } from '../navigation/qualityRuntimeModuleBridge.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function RolloutStageBar({ current, stages }) {
  const allStages = stages || ['shadow', 'pilot', 'canary', 'staged', 'full'];
  const idx = allStages.indexOf(current);
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 10 }}>Estágio de rollout</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {allStages.map((s, i) => (
          <div key={s} style={{
            flex: 1, minWidth: 60, padding: '6px 8px', borderRadius: 3,
            background: i < idx ? 'rgba(0,255,136,0.12)' : i === idx ? 'rgba(0,212,255,0.18)' : 'var(--bg-tertiary)',
            border: i === idx ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div style={{ ...mono, color: i === idx ? 'var(--cyan)' : i < idx ? 'var(--green)' : 'var(--text-tertiary)', fontSize: 10 }}>
              {s}
            </div>
            {i === idx && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)', margin: '4px auto 0', boxShadow: '0 0 6px var(--cyan)' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function RolloutKpiCard({ label, value, sub, color }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const ASSESSMENT_SNAPSHOT = {
  maturity_metrics: { workflow_completion_rate: 0.55, telemetry_coverage: 0.4, spc_usage_rate: 0.45, data_collection_completeness: 0.5 },
  adoption: { active_operators: 8, shift_coverage: 0.65, workflow_completion_rate: 0.5, abandonment_rate: 0.1, cognitive_interaction_rate: 0.3 },
  tenant: { current_stage: 'shadow', target_stage: 'staged', mode: 'staged' },
  plants: { PLANT_A: { current: 'operational_only', target: 'telemetry' } },
  workflows: { telemetry: { enabled: false }, cognitive: { enabled: false } },
  saturation: { insights_per_hour: 8, alerts_per_hour: 12 }
};

export default function QualityRolloutHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAssessment = useCallback(async () => {
    if (!isQualityRolloutRuntimeEnabled()) return;
    setLoading(true); setErr('');
    try {
      const [hRes, aRes] = await Promise.allSettled([
        qrApi.health(),
        qrApi.runAssessment({ snapshot: ASSESSMENT_SNAPSHOT, emit_events: false })
      ]);
      if (hRes.status === 'fulfilled') setHealth(hRes.value.data);
      if (aRes.status === 'fulfilled') setPack(aRes.value.data.pack);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Assessment indisponível');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAssessment(); }, [loadAssessment]);

  if (!isQualityRolloutEffectiveEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', ...mono }}>Rollout enterprise desligado.</p>
      </div>
    );
  }

  const currentStage = pack?.tenant?.current_stage || pack?.stage || 'shadow';
  const readinessScore = pack?.readiness?.score ?? pack?.score;
  const adoptionRate = pack?.adoption?.adoption_rate ?? pack?.adoption_rate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Rollout Enterprise Quality
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Shadow → Pilot → Canary → Staged · rollback-safe · tenant {String(companyId).slice(0, 8)}…
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadAssessment} disabled={loading}>
            {loading ? 'Analisando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {err ? <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}><p style={{ margin: 0, color: 'var(--amber)', fontSize: 13 }}>{err}</p></div> : null}

      {/* Status do health */}
      {health && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <RolloutKpiCard label="Estado" value={health.ok ? 'Operacional' : 'Revisar'} color={health.ok ? 'var(--green)' : 'var(--amber)'} />
          <RolloutKpiCard label="Estágio atual" value={currentStage} color="var(--cyan)" />
          {readinessScore != null && (
            <RolloutKpiCard label="Prontidão" value={`${(readinessScore * 100).toFixed(0)}%`} color={readinessScore > 0.7 ? 'var(--green)' : 'var(--amber)'} />
          )}
          {adoptionRate != null && (
            <RolloutKpiCard label="Adoção" value={`${(adoptionRate * 100).toFixed(0)}%`} color="var(--text-primary)" />
          )}
        </div>
      )}

      <RolloutStageBar current={currentStage} />

      {pack ? (
        <>
          {pack.governance && <QualityGovernanceRolloutPanel pack={pack} />}
          {pack.maturity && <QualityMaturityPanel pack={pack} />}
          {pack.readiness && <QualityReadinessPanel pack={pack} />}
          {pack.adoption && <QualityAdoptionAnalytics pack={pack} />}
          {pack.saturation && <QualityOperationalSaturationPanel pack={pack} />}

          {pack.confidence && (
            <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
              <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Confiança de rollout</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {Object.entries(pack.confidence).map(([k, v]) => (
                  <div key={k} style={{ flex: '1 1 140px' }}>
                    <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: typeof v === 'number' && v > 0.7 ? 'var(--green)' : 'var(--amber)' }}>
                      {typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : String(v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        loading && (
          <div className="impetus-card" style={{ padding: '1.5rem', borderRadius: 4 }}>
            <p style={{ ...mono, color: 'var(--text-secondary)', margin: 0 }}>Carregando assessment de rollout…</p>
          </div>
        )
      )}
    </div>
  );
}

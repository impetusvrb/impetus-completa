import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qualityGovernance as qgApi } from '../../../services/api.js';
import {
  getQualityGovernanceFlagSnapshot,
  isQualityExecutiveDashboardsEnabled,
  isQualityGovernanceRuntimeEnabled
} from './qualityGovernanceFeatureFlags.js';

/**
 * Hub tático/executivo — separado do runtime operacional; densidade cognitiva limitada.
 */
export default function QualityGovernanceHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [tab, setTab] = useState('management');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isQualityGovernanceRuntimeEnabled()) return;
    qgApi
      .health()
      .then((r) => setHealth(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message || 'health'));
  }, []);

  if (!isQualityGovernanceRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Governança qualidade desligada.</p>
      </div>
    );
  }

  const snap = getQualityGovernanceFlagSnapshot();
  const showExec = isQualityExecutiveDashboardsEnabled();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Link
          to="/app/quality/operational"
          className="btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
        >
          Voltar operacional
        </Link>
        <button type="button" className={tab === 'management' ? 'btn-primary' : 'btn-ghost'} style={{ minHeight: 44, borderRadius: 4 }} onClick={() => setTab('management')}>
          Gestão
        </button>
        {showExec ? (
          <button type="button" className={tab === 'executive' ? 'btn-primary' : 'btn-ghost'} style={{ minHeight: 44, borderRadius: 4 }} onClick={() => setTab('executive')}>
            Executivo
          </button>
        ) : null}
      </div>

      {err ? (
        <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p>
      ) : null}

      <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)', marginBottom: 8 }}>Flags runtime</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health?.flags || snap, null, 0)}</pre>
        <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>

      {tab === 'management' ? <ManagementLayer companyId={companyId} /> : null}
      {tab === 'executive' && showExec ? <ExecutiveLayer companyId={companyId} /> : null}
    </div>
  );
}

function ManagementLayer({ companyId }) {
  const [result, setResult] = useState(null);

  const demoSpc = async () => {
    const subgroups = [
      [10.1, 10.2, 10.0, 10.3, 10.1],
      [10.2, 10.0, 10.1, 10.2, 10.0],
      [10.4, 10.9, 11.0, 10.8, 11.2]
    ];
    try {
      const { data } = await qgApi.screenSpc({ subgroups, correlation_id: crypto.randomUUID() });
      setResult(data);
    } catch (e) {
      setResult({ error: e?.response?.data || e.message });
    }
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
        Camada gestão — SPC assistivo
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8 }}>Demo com subgrupos sintéticos; não altera workflows nem aprova ações.</p>
      <button type="button" className="btn-ghost" style={{ minHeight: 48, borderRadius: 4 }} onClick={demoSpc}>
        Correr demo SPC (API)
      </button>
      {result ? (
        <pre style={{ marginTop: 10, fontSize: 11, color: 'var(--green)', whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}

function ExecutiveLayer() {
  const [story, setStory] = useState(null);

  const loadNarrative = async () => {
    try {
      const { data } = await qgApi.narrative({
        signals: {
          defect_counts: { dimensional: 12, cosmetic: 3 },
          trend_series: [1, 1.1, 1.2, 1.35, 1.5],
          context_detail: 'Demonstração bounded cognition.'
        },
        emit_insight_event: false
      });
      setStory(data?.story);
    } catch (e) {
      setStory({ error: e?.response?.data || e.message });
    }
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
        Camada executiva — narrativa
      </div>
      <button type="button" className="btn-ghost" style={{ minHeight: 48, borderRadius: 4 }} onClick={loadNarrative}>
        Gerar narrativa (determinística)
      </button>
      {story?.narrative ? (
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.45 }}>{story.narrative}</p>
      ) : null}
      {story?.error ? <p style={{ color: 'var(--amber)' }}>{String(story.error)}</p> : null}
    </div>
  );
}

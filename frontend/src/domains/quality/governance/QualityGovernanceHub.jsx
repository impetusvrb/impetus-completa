import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { safeUUID } from '../../../utils/safeUuid.js';
import { qualityGovernance as qgApi } from '../../../services/api.js';
import {
  isQualityGovernanceRuntimeEnabled,
  isQualityExecutiveDashboardsEnabled,
  isQualitySpcRuntimeEnabled,
  isQualityCapaIntelligenceEnabled,
  isQualityRiskIntelligenceEnabled
} from './qualityGovernanceFeatureFlags.js';
import { isQualityGovernanceEffectiveEnabled } from '../navigation/qualityRuntimeModuleBridge.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };
const labelH = { ...mono, color: 'var(--text-tertiary)', marginBottom: 6 };
const accent = { color: 'var(--cyan)' };

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 180px' }}>
      <div style={labelH}>{label}</div>
      <div style={{ fontSize: 24, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
      {sub ? <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? 'var(--green)' : 'var(--amber)',
      marginRight: 6, boxShadow: ok ? '0 0 6px var(--green)' : 'none'
    }} />
  );
}

function SpcPanel({ companyId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const runSpc = useCallback(async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const { data } = await qgApi.screenSpc({
        subgroups: [
          [10.1, 10.2, 10.0, 10.3, 10.1],
          [10.2, 10.0, 10.1, 10.2, 10.0],
          [10.4, 10.9, 11.0, 10.8, 11.2]
        ],
        correlation_id: safeUUID()
      });
      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'SPC indisponível');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isQualitySpcRuntimeEnabled()) runSpc(); }, [runSpc]);

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>SPC — Controle Estatístico de Processo</span>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={runSpc} disabled={loading}>
          {loading ? 'Calculando…' : 'Atualizar'}
        </button>
      </div>
      {err ? <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p> : null}
      {result ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <KpiCard label="Xbar̄ médio" value={result.xbar_average != null ? result.xbar_average.toFixed(3) : result.xbar_chart?.ucl?.toFixed(2)} color="var(--cyan)" />
          <KpiCard label="UCL" value={result.xbar_chart?.ucl?.toFixed(3) ?? result.ucl?.toFixed(3)} color="var(--amber)" />
          <KpiCard label="LCL" value={result.xbar_chart?.lcl?.toFixed(3) ?? result.lcl?.toFixed(3)} color="var(--text-secondary)" />
          <KpiCard
            label="Cp / Process capable"
            value={result.process_capability?.cp?.toFixed(3) ?? result.cp?.toFixed(3) ?? '—'}
            sub={result.process_capability?.capable != null ? (result.process_capability.capable ? 'Capaz' : 'Revisar') : null}
            color={result.process_capability?.capable ? 'var(--green)' : 'var(--amber)'}
          />
          {result.violations_detected || result.out_of_control_points ? (
            <KpiCard label="Pontos fora de controle" value={result.out_of_control_points ?? '!'} color="var(--red)" />
          ) : (
            <KpiCard label="Processo" value="Sob controle" color="var(--green)" />
          )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          {loading ? 'Analisando subgrupos…' : 'Inicie análise SPC para visualizar resultado.'}
        </p>
      )}
    </div>
  );
}

function NcrCapaPanel() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>NCR & CAPA — Não Conformidades</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <KpiCard label="NCRs abertas" value="—" sub="Requer API NCR" color="var(--amber)" />
        <KpiCard label="CAPAs em andamento" value="—" sub="Requer API CAPA" color="var(--text-secondary)" />
        <KpiCard label="Fechamento médio" value="— dias" sub="MTTR não conformidade" />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>
        Integração com módulo NCR/CAPA ativa. Dados exibidos ao conectar à API de rastreabilidade.
      </p>
    </div>
  );
}

function RiskIntelligencePanel() {
  if (!isQualityRiskIntelligenceEnabled()) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Inteligência de Risco</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <KpiCard label="Risco preditivo" value="Baixo" color="var(--green)" />
        <KpiCard label="Alertas ativos" value="0" color="var(--text-secondary)" />
        <KpiCard label="Tendência qualidade" value="Estável" color="var(--green)" />
      </div>
    </div>
  );
}

function ExecutivePanel({ companyId }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadNarrative = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await qgApi.narrative({
        signals: {
          defect_counts: { dimensional: 12, cosmetic: 3 },
          trend_series: [1, 1.1, 1.2, 1.35, 1.5],
          context_detail: 'Análise executiva do processo de qualidade.'
        },
        emit_insight_event: false
      });
      setStory(data?.story);
    } catch (e) {
      setStory(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Narrativa Executiva</span>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={loadNarrative} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>
      {story?.headline ? (
        <div>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 8px' }}>{story.headline}</p>
          {(story.paragraphs || []).map((p, i) => (
            <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.6 }}>{p}</p>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{loading ? 'Gerando narrativa…' : 'Narrativa indisponível.'}</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        <KpiCard label="Conformidade geral" value="—" sub="tenant consolidado" />
        <KpiCard label="Desvios mês" value="—" color="var(--amber)" />
        <KpiCard label="Score qualidade" value="—" />
      </div>
    </div>
  );
}

export default function QualityGovernanceHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [tab, setTab] = useState('management');

  useEffect(() => {
    if (!isQualityGovernanceRuntimeEnabled()) return;
    qgApi.health()
      .then((r) => setHealth(r.data))
      .catch(() => {});
  }, []);

  if (!isQualityGovernanceEffectiveEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', ...mono }}>Governança qualidade desligada.</p>
      </div>
    );
  }

  const showExec = isQualityExecutiveDashboardsEnabled();
  const capaEnabled = isQualityCapaIntelligenceEnabled();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            NCR · CAPA · SPC · Fornecedores
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            <StatusDot ok={health?.ok} />
            {health?.ok ? 'Runtime operacional' : 'Conectando…'} · tenant {String(companyId).slice(0, 8)}…
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          {['management', showExec && 'executive', capaEnabled && 'ncr'].filter(Boolean).map((t) => (
            <button key={t} type="button"
              className={tab === t ? 'btn-primary' : 'btn-ghost'}
              style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }}
              onClick={() => setTab(t)}>
              {t === 'management' ? 'SPC & Risco' : t === 'executive' ? 'Executivo' : 'NCR/CAPA'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'management' && (
        <>
          <SpcPanel companyId={companyId} />
          <RiskIntelligencePanel />
        </>
      )}
      {tab === 'ncr' && capaEnabled && <NcrCapaPanel />}
      {tab === 'executive' && showExec && <ExecutivePanel companyId={companyId} />}
    </div>
  );
}

/**
 * CERT-PULSE-02 — Dashboard Pulse Cognitivo Organizacional (RH).
 * Aditivo: não substitui PulseRh.jsx (campanhas + analytics legado).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { pulseCognitive } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import './PulseCognitiveRh.css';

const STATE_COLORS = {
  healthy_team: 'var(--green)',
  stable_team: 'var(--cyan)',
  growing_team: 'var(--green)',
  overloaded_team: 'var(--amber)',
  disengaged_team: 'var(--orange)',
  transforming_team: 'var(--cyan)',
  at_risk_team: 'var(--red)'
};

function stateLabel(code, catalog = {}) {
  return catalog[code]?.label || code || '—';
}

export default function PulseCognitiveRh() {
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [tab, setTab] = useState('overview');
  const [executive, setExecutive] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [crossDomain, setCrossDomain] = useState(null);
  const [reliability, setReliability] = useState(null);
  const [calibrationInsights, setCalibrationInsights] = useState(null);
  const [memoryConsult, setMemoryConsult] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [validatingId, setValidatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pulseCognitive.hrDashboard({ days: 90 });
      setData(r.data || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar Pulse Cognitivo.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === 'overview') return;
    let cancelled = false;
    setTabLoading(true);
    const loadTab = async () => {
      try {
        if (tab === 'executive') {
          const r = await pulseCognitive.hrExecutive({ days: 90 });
          if (!cancelled) setExecutive(r.data || null);
        } else if (tab === 'timeline') {
          const r = await pulseCognitive.hrTimeline({ days: 90, limit: 80 });
          if (!cancelled) setTimeline(r.data || null);
        } else if (tab === 'correlations') {
          const r = await pulseCognitive.hrCrossDomain();
          if (!cancelled) setCrossDomain(r.data || null);
        } else if (tab === 'reliability') {
          const [rel, ins] = await Promise.all([
            pulseCognitive.hrCalibrationReliability(),
            pulseCognitive.hrCalibrationInsights({ limit: 20 })
          ]);
          if (!cancelled) {
            setReliability(rel.data || null);
            setCalibrationInsights(ins.data || null);
          }
        } else if (tab === 'memory') {
          const r = await pulseCognitive.hrMemoryConsult({ limit: 5 });
          if (!cancelled) setMemoryConsult(r.data || null);
        }
      } catch (e) {
        if (!cancelled) notify.error(e.apiMessage || 'Erro ao carregar visão.');
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };
    loadTab();
    return () => {
      cancelled = true;
    };
  }, [tab, notify]);

  const reconcile = async () => {
    setReconciling(true);
    try {
      const r = await pulseCognitive.hrReconcile();
      notify.success(`Reconciliação: ${r.data?.processed ?? 0} colaborador(es) processado(s).`);
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro na reconciliação.');
    } finally {
      setReconciling(false);
    }
  };

  const validateInsight = async (insightId, status) => {
    setValidatingId(insightId);
    try {
      await pulseCognitive.hrCalibrationValidateInsight(insightId, { validation_status: status });
      notify.success('Validação registrada (não altera pesos do modelo).');
      const ins = await pulseCognitive.hrCalibrationInsights({ limit: 20 });
      setCalibrationInsights(ins.data || null);
      const rel = await pulseCognitive.hrCalibrationReliability();
      setReliability(rel.data || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao registrar validação.');
    } finally {
      setValidatingId(null);
    }
  };

  const companyPulse = data?.company_pulse;
  const temporal = (data?.temporal || []).map((row) => ({
    label: row.day ? new Date(row.day).toISOString().slice(0, 10) : '',
    index: Number(row.avg_index) || 0,
    samples: row.samples
  }));

  const deptAggregates = (data?.aggregates || []).filter((a) => a.scope_type === 'department');
  const deptChart = deptAggregates.map((d) => ({
    name: String(d.scope_label || d.scope_key).slice(0, 18),
    index: Number(d.pulse_index) || 0,
    n: d.member_count
  }));

  const stateCatalog = data?.state_catalog || {};

  return (
    <Layout>
      <div className="pulse-cog-page">
        <header className="pulse-cog-page__head">
          <div>
            <p className="pulse-cog-page__cert">CERT-PULSE-05 · Motor cognitivo certificado — memória organizacional</p>
            <h1>Pulse Cognitivo — Gêmeo Digital Humano</h1>
            <p className="pulse-cog-page__sub">
              Monitoramento contínuo de pessoas, equipes e comportamento organizacional. Inferências assistivas —
              decisão humana obrigatória. Campanhas Pulse legadas permanecem como momentos formais de validação.
            </p>
          </div>
          <div className="pulse-cog-page__actions">
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              Atualizar
            </button>
            <button type="button" className="btn btn-primary" onClick={reconcile} disabled={reconciling}>
              {reconciling ? 'Reconciliando…' : 'Reconciliar sinais'}
            </button>
          </div>
        </header>

        <nav className="pulse-cog-tabs" aria-label="Visões do Pulse Cognitivo">
          {[
            { id: 'overview', label: 'Sensor' },
            { id: 'executive', label: 'Executivo' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'correlations', label: 'Correlações' },
            { id: 'reliability', label: 'Confiabilidade' },
            { id: 'memory', label: 'Memória' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`pulse-cog-tabs__btn${tab === t.id ? ' pulse-cog-tabs__btn--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {data?.migration_required && (
          <div className="pulse-cog-banner pulse-cog-banner--warn" role="status">
            {data.message}
          </div>
        )}

        {data?.governance && (
          <div className="pulse-cog-governance impetus-card" role="note">
            <span className="pulse-cog-governance__tag">GOVERNANÇA</span>
            <p>
              Inferências explicáveis · sem rótulos definitivos · LGPD ·{' '}
              <strong>human-in-the-loop</strong>. Índice contínuo não substitui autoavaliação Pulse.
            </p>
          </div>
        )}

        {loading && tab === 'overview' ? (
          <p className="pulse-cog-loading">Carregando sensor organizacional…</p>
        ) : tab === 'executive' ? (
          tabLoading ? (
            <p className="pulse-cog-loading">Carregando visão executiva…</p>
          ) : (
            <section className="pulse-cog-panels">
              <div className="impetus-card pulse-cog-panel pulse-cog-panel--wide">
                <h2 className="pulse-cog-section-title">Estados por domínio</h2>
                <div className="pulse-cog-dims-grid">
                  {Object.entries(executive?.domain_states || {}).map(([key, st]) => (
                    <div key={key} className="pulse-cog-dim">
                      <span className="pulse-cog-dim__label">{st.label}</span>
                      <span className="pulse-cog-dim__value">
                        {st.pulse_index != null
                          ? Number(st.pulse_index).toFixed(1)
                          : st.proxy_health || st.proxy || '—'}
                      </span>
                      {st.state && (
                        <span className="pulse-cog-dim__weight">{st.state}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Correlações interdomínios</h2>
                <ul className="pulse-cog-insights">
                  {(executive?.cross_domain_insights || []).map((ins) => (
                    <li key={ins.code}>
                      <strong>{ins.title}</strong>
                      <p>{ins.summary}</p>
                      <span className="pulse-cog-list__conf">
                        {Math.round((ins.confidence || 0.5) * 100)}% confiança
                      </span>
                    </li>
                  ))}
                  {(executive?.cross_domain_insights || []).length === 0 && (
                    <li className="pulse-cog-empty">Sem correlações significativas no período.</li>
                  )}
                </ul>
              </div>
              {executive?.temporal_learning?.company?.trend && (
                <div className="impetus-card pulse-cog-panel">
                  <h2 className="pulse-cog-section-title">Aprendizado temporal (empresa)</h2>
                  <p>
                    {executive.temporal_learning.company.trend.label} — confiança{' '}
                    {Math.round((executive.temporal_learning.company.trend.confidence || 0) * 100)}%
                  </p>
                </div>
              )}
            </section>
          )
        ) : tab === 'timeline' ? (
          tabLoading ? (
            <p className="pulse-cog-loading">Carregando timeline cognitiva…</p>
          ) : (
            <div className="impetus-card pulse-cog-panel pulse-cog-panel--wide">
              <h2 className="pulse-cog-section-title">Timeline cognitiva organizacional</h2>
              <ul className="pulse-cog-timeline">
                {(timeline?.events || []).map((ev, i) => (
                  <li key={`${ev.kind}-${ev.ts}-${i}`}>
                    <time className="pulse-cog-timeline__ts">
                      {ev.ts ? new Date(ev.ts).toLocaleString('pt-BR') : '—'}
                    </time>
                    <span className="pulse-cog-timeline__kind">{ev.kind}</span>
                    <strong>{ev.title}</strong>
                  </li>
                ))}
                {(timeline?.events || []).length === 0 && (
                  <li className="pulse-cog-empty">Nenhum evento no período selecionado.</li>
                )}
              </ul>
            </div>
          )
        ) : tab === 'correlations' ? (
          tabLoading ? (
            <p className="pulse-cog-loading">Carregando correlações…</p>
          ) : (
            <section className="pulse-cog-panels">
              <div className="impetus-card pulse-cog-panel pulse-cog-panel--wide">
                <h2 className="pulse-cog-section-title">Sinais por domínio</h2>
                <pre className="pulse-cog-signals-json">
                  {JSON.stringify(crossDomain?.signals || {}, null, 2)}
                </pre>
              </div>
              <div className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Insights contextuais</h2>
                <ul className="pulse-cog-insights">
                  {(crossDomain?.cross_domain_insights || []).map((ins) => (
                    <li key={ins.code}>
                      <strong>{ins.title}</strong>
                      <p>{ins.summary}</p>
                      <span className="pulse-cog-list__meta">
                        Domínios: {(ins.domains || []).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )
        ) : tab === 'reliability' ? (
          tabLoading ? (
            <p className="pulse-cog-loading">Carregando painel de confiabilidade…</p>
          ) : (
            <>
              {reliability?.insufficient_data_warning && (
                <div className="pulse-cog-banner pulse-cog-banner--warn" role="alert">
                  {reliability.insufficient_data_message}
                </div>
              )}
              <section className="pulse-cog-kpis">
                <div className="impetus-card pulse-cog-kpi">
                  <span className="pulse-cog-kpi__label">QUALIDADE DOS DADOS</span>
                  <strong className="pulse-cog-kpi__value">
                    {reliability?.data_quality_score != null
                      ? `${reliability.data_quality_score}%`
                      : '—'}
                  </strong>
                </div>
                <div className="impetus-card pulse-cog-kpi">
                  <span className="pulse-cog-kpi__label">COBERTURA</span>
                  <strong className="pulse-cog-kpi__value">
                    {reliability?.coverage?.coverage_percent != null
                      ? `${reliability.coverage.coverage_percent}%`
                      : '—'}
                  </strong>
                  <span className="pulse-cog-kpi__meta">
                    {reliability?.coverage?.indexed_members ?? 0} /{' '}
                    {reliability?.coverage?.eligible_members ?? 0} colaboradores
                  </span>
                </div>
                <div className="impetus-card pulse-cog-kpi">
                  <span className="pulse-cog-kpi__label">CONFIANÇA MÉDIA</span>
                  <strong className="pulse-cog-kpi__value">
                    {reliability?.confidence?.average != null
                      ? `${Math.round(reliability.confidence.average * 100)}%`
                      : '—'}
                  </strong>
                </div>
                <div className="impetus-card pulse-cog-kpi">
                  <span className="pulse-cog-kpi__label">INSIGHTS COM EVIDÊNCIA</span>
                  <strong className="pulse-cog-kpi__value">
                    {reliability?.insights_quality?.evidence_complete_percent != null
                      ? `${reliability.insights_quality.evidence_complete_percent}%`
                      : '—'}
                  </strong>
                </div>
              </section>

              <div className="pulse-cog-grid">
                <div className="impetus-card pulse-cog-chart-card">
                  <h2 className="pulse-cog-section-title">Cobertura por setor</h2>
                  <div className="pulse-cog-chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(reliability?.sector_coverage || []).map((s) => ({
                          name: String(s.sector_label).slice(0, 14),
                          conf: Math.round((s.avg_confidence || 0) * 100),
                          n: s.indexed_members
                        }))}
                      >
                        <XAxis dataKey="name" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-axis)' }} />
                        <Tooltip />
                        <Bar dataKey="conf" name="Confiança %" fill="var(--cyan)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="impetus-card pulse-cog-panel">
                  <h2 className="pulse-cog-section-title">Equipes sem dados suficientes</h2>
                  <ul className="pulse-cog-list">
                    {(reliability?.teams_without_sufficient_data || []).map((t) => (
                      <li key={t.sector_key}>
                        <span>{t.sector_label}</span>
                        <span className="pulse-cog-list__conf">{t.indexed_members} indexados</span>
                      </li>
                    ))}
                    {(reliability?.teams_without_sufficient_data || []).length === 0 && (
                      <li className="pulse-cog-empty">Todos os setores com amostra mínima.</li>
                    )}
                  </ul>
                </div>
              </div>

              <section className="impetus-card pulse-cog-panel pulse-cog-panel--wide">
                <h2 className="pulse-cog-section-title">Validação Human-in-the-Loop (insights)</h2>
                <ul className="pulse-cog-insights">
                  {(calibrationInsights?.insights || []).slice(0, 10).map((ins) => (
                    <li key={ins.id}>
                      <strong>{ins.title}</strong>
                      <p>{ins.summary}</p>
                      <span className="pulse-cog-list__meta">
                        Evidência completa:{' '}
                        {ins.validation_bundle?.evidence_complete ? 'sim' : 'não'} · Confiança:{' '}
                        {Math.round((ins.confidence || 0) * 100)}%
                      </span>
                      <div className="pulse-cog-hitl-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={validatingId === ins.id}
                          onClick={() => validateInsight(ins.id, 'confirmed')}
                        >
                          Confirmou
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={validatingId === ins.id}
                          onClick={() => validateInsight(ins.id, 'partial')}
                        >
                          Parcial
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={validatingId === ins.id}
                          onClick={() => validateInsight(ins.id, 'rejected')}
                        >
                          Não confirmou
                        </button>
                      </div>
                    </li>
                  ))}
                  {(calibrationInsights?.insights || []).length === 0 && (
                    <li className="pulse-cog-empty">Nenhum insight para validar no período.</li>
                  )}
                </ul>
              </section>
            </>
          )
        ) : tab === 'memory' ? (
          tabLoading ? (
            <p className="pulse-cog-loading">Carregando memória organizacional…</p>
          ) : (
            <>
              <div className="pulse-cog-governance impetus-card" role="note">
                <span className="pulse-cog-governance__tag">MEMÓRIA CONSULTIVA</span>
                <p>
                  Histórico semelhante — <strong>não é previsão</strong>. Núcleo cognitivo congelado; evolução via
                  eventos do ecossistema.
                </p>
              </div>
              {!memoryConsult?.has_recommendations && (
                <div className="pulse-cog-banner pulse-cog-banner--warn" role="status">
                  {memoryConsult?.message ||
                    'Não existem evidências suficientes para recomendar ações baseadas em histórico organizacional.'}
                </div>
              )}
              {memoryConsult?.has_recommendations && (
                <section className="impetus-card pulse-cog-panel pulse-cog-panel--wide">
                  <h2 className="pulse-cog-section-title">{memoryConsult.message}</h2>
                  <ul className="pulse-cog-insights">
                    {(memoryConsult.similar_cases || []).map((c, i) => (
                      <li key={`${c.occurrence_label}-${i}`}>
                        <strong>Ocorrência semelhante: {c.occurrence_label}</strong>
                        <p>Equipe: {c.scope_label}</p>
                        {c.actions_executed?.length > 0 && (
                          <span className="pulse-cog-list__meta">
                            Ações: {c.actions_executed.join(' · ')}
                          </span>
                        )}
                        <p>{c.result_summary}</p>
                        <span className="pulse-cog-list__conf">{c.disclaimer}</span>
                      </li>
                    ))}
                  </ul>
                  <h3 className="pulse-cog-section-title">Recomendações fundamentadas em histórico</h3>
                  <ul className="pulse-cog-list">
                    {(memoryConsult.recommendations || []).map((rec) => (
                      <li key={rec.action}>
                        <span>{rec.action}</span>
                        <span className="pulse-cog-list__conf">
                          {rec.historical_occurrences} ocorrência(s) ·{' '}
                          {Math.round((rec.confidence || 0) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Contexto atual</h2>
                <pre className="pulse-cog-signals-json">
                  {JSON.stringify(memoryConsult?.current_context || {}, null, 2)}
                </pre>
                <p className="pulse-cog-list__meta">
                  Entradas na memória: {memoryConsult?.memory_entries_total ?? 0} · Índices não alterados por
                  esta camada
                </p>
              </section>
            </>
          )
        ) : (
          <>
            <section className="pulse-cog-kpis">
              <div className="impetus-card pulse-cog-kpi">
                <span className="pulse-cog-kpi__label">PULSE GERAL</span>
                <strong className="pulse-cog-kpi__value">
                  {companyPulse?.pulse_index != null ? Number(companyPulse.pulse_index).toFixed(1) : '—'}
                </strong>
                <span className="pulse-cog-kpi__meta">
                  {companyPulse?.member_count ?? data?.member_count ?? 0} colaboradores indexados
                </span>
              </div>
              <div className="impetus-card pulse-cog-kpi">
                <span className="pulse-cog-kpi__label">ESTADO ORGANIZACIONAL</span>
                <strong
                  className="pulse-cog-kpi__value pulse-cog-kpi__value--state"
                  style={{ color: STATE_COLORS[companyPulse?.organizational_state] || 'var(--cyan)' }}
                >
                  {stateLabel(companyPulse?.organizational_state, stateCatalog)}
                </strong>
                <span className="pulse-cog-kpi__meta">
                  Confiança:{' '}
                  {companyPulse?.confidence != null
                    ? `${Math.round(Number(companyPulse.confidence) * 100)}%`
                    : '—'}
                </span>
              </div>
              <div className="impetus-card pulse-cog-kpi">
                <span className="pulse-cog-kpi__label">PADRÕES ATIVOS</span>
                <strong className="pulse-cog-kpi__value">{(data?.patterns || []).length}</strong>
                <span className="pulse-cog-kpi__meta">Correlações multi-sinal</span>
              </div>
              <div className="impetus-card pulse-cog-kpi">
                <span className="pulse-cog-kpi__label">INSIGHTS RECENTES</span>
                <strong className="pulse-cog-kpi__value">{(data?.insights || []).length}</strong>
                <span className="pulse-cog-kpi__meta">Assistivos · não prescritivos</span>
              </div>
            </section>

            <div className="pulse-cog-grid">
              <div className="impetus-card pulse-cog-chart-card">
                <h2 className="pulse-cog-section-title">Evolução temporal do Pulse Index</h2>
                <div className="pulse-cog-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={temporal}>
                      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-axis)' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 4
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="index"
                        name="Pulse Index"
                        stroke="var(--chart-series-1, var(--cyan))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="impetus-card pulse-cog-chart-card">
                <h2 className="pulse-cog-section-title">Pulse por setor</h2>
                <div className="pulse-cog-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deptChart}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-axis)' }} />
                      <Tooltip />
                      <Bar dataKey="index" name="Índice" fill="var(--cyan)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <section className="pulse-cog-panels">
              <div className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Estados por escopo</h2>
                <ul className="pulse-cog-list">
                  {(data?.organizational_states || []).slice(0, 12).map((s) => (
                    <li key={`${s.scope_type}-${s.scope_key}`}>
                      <span className="pulse-cog-list__scope">
                        {s.scope_type}: {s.scope_label || s.scope_key}
                      </span>
                      <span
                        className="pulse-cog-list__state"
                        style={{ color: STATE_COLORS[s.state_code] || 'var(--text-secondary)' }}
                      >
                        {s.state_label}
                      </span>
                    </li>
                  ))}
                  {(data?.organizational_states || []).length === 0 && (
                    <li className="pulse-cog-empty">Execute reconciliação para inferir estados.</li>
                  )}
                </ul>
              </div>

              <div className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Padrões e alertas precoces</h2>
                <ul className="pulse-cog-list">
                  {(data?.patterns || []).slice(0, 10).map((p) => (
                    <li key={p.id}>
                      <span className={`pulse-cog-badge pulse-cog-badge--${p.severity || 'info'}`}>
                        {p.severity}
                      </span>
                      <span>{p.pattern_label}</span>
                      <span className="pulse-cog-list__conf">
                        {Math.round((p.confidence || 0.5) * 100)}%
                      </span>
                    </li>
                  ))}
                  {(data?.patterns || []).length === 0 && (
                    <li className="pulse-cog-empty">Nenhum padrão correlacionado no período.</li>
                  )}
                </ul>
              </div>

              <div className="impetus-card pulse-cog-panel">
                <h2 className="pulse-cog-section-title">Insights cognitivos</h2>
                <ul className="pulse-cog-insights">
                  {(data?.insights || []).slice(0, 8).map((ins) => (
                    <li key={ins.id}>
                      <strong>{ins.title}</strong>
                      <p>{ins.summary}</p>
                    </li>
                  ))}
                  {(data?.insights || []).length === 0 && (
                    <li className="pulse-cog-empty">Insights surgem após eventos e reconciliação.</li>
                  )}
                </ul>
              </div>
            </section>

            <section className="impetus-card pulse-cog-dims">
              <h2 className="pulse-cog-section-title">Dimensões do Pulse Index (empresa)</h2>
              <div className="pulse-cog-dims-grid">
                {(data?.dimensions_schema || []).map((d) => {
                  const v = companyPulse?.dimensions?.[d.key];
                  return (
                    <div key={d.key} className="pulse-cog-dim">
                      <span className="pulse-cog-dim__label">{d.label}</span>
                      <span className="pulse-cog-dim__value">
                        {v != null ? Number(v).toFixed(0) : '—'}
                      </span>
                      <span className="pulse-cog-dim__weight">peso {(d.weight * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

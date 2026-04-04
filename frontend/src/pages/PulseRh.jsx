/**
 * Impetus Pulse — visão RH (dados completos, disparo de ciclo, relatório IA, analytics).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { pulse } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { downloadPulseDiagnosticPdf } from '../utils/pulseReportPdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  CartesianGrid
} from 'recharts';
import './PulseRh.css';

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'temporal', label: 'Temporal' },
  { id: 'sector', label: 'Por setor' },
  { id: 'status', label: 'Status' },
  { id: 'individual', label: 'Individual (dispersão)' }
];

export default function PulseRh() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bucket, setBucket] = useState('month');
  const [shiftCode, setShiftCode] = useState('');
  const [teamLabel, setTeamLabel] = useState('');
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, analyticsRes] = await Promise.all([
        pulse.hrListEvaluations({ from: from || undefined, to: to || undefined, limit: 300 }),
        pulse.hrAnalytics({
          from: from || undefined,
          to: to || undefined,
          bucket,
          shift_code: shiftCode.trim() || undefined,
          team_label: teamLabel.trim() || undefined
        })
      ]);
      setRows(listRes.data?.evaluations || []);
      setAnalytics(analyticsRes.data?.analytics || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar dados Pulse.');
    } finally {
      setLoading(false);
    }
  }, [from, to, bucket, shiftCode, teamLabel, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const triggerAll = async () => {
    try {
      const r = await pulse.hrTrigger({ all_eligible: true });
      notify.success(`Ciclo disparado: ${r.data?.created || 0} avaliação(ões) criada(s).`);
      load();
    } catch (e) {
      notify.error(e.apiMessage || e.message || 'Erro ao disparar.');
    }
  };

  const genReport = async (row) => {
    try {
      const r = await pulse.hrReport(row.id);
      const rep = r.data?.report;
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulse_diagnostico_${row.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('Diagnóstico JSON descarregado.');
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao gerar relatório.');
    }
  };

  const genPdf = (row, report) => {
    try {
      const period =
        analytics?.filters?.from && analytics?.filters?.to
          ? `${analytics.filters.from} a ${analytics.filters.to}`
          : from && to
            ? `${from} a ${to}`
            : '';
      downloadPulseDiagnosticPdf(report, {
        filename: `pulse_diagnostico_${row.id}.pdf`,
        collaborator: row.user_name || '',
        period
      });
      notify.success('PDF gerado.');
    } catch (e) {
      notify.error(e.message || 'Erro ao gerar PDF.');
    }
  };

  const genReportAndPdf = async (row) => {
    try {
      const r = await pulse.hrReport(row.id);
      const rep = r.data?.report;
      genPdf(row, rep);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao gerar relatório.');
    }
  };

  const summary = analytics?.summary || {};
  const overviewBars = [
    { name: 'Eficiência', v: Number(summary.avg_efficiency) || 0 },
    { name: 'Confiança', v: Number(summary.avg_confidence) || 0 },
    { name: 'Proatividade', v: Number(summary.avg_proactivity) || 0 },
    { name: 'Sinergia', v: Number(summary.avg_synergy) || 0 }
  ];
  const radarData = overviewBars.map((b) => ({ subject: b.name, value: b.v }));

  const lineData = (analytics?.by_period || []).map((r) => ({
    label: r.label || (r.period_start ? new Date(r.period_start).toISOString().slice(0, 10) : ''),
    Eficiência: Number(r.avg_efficiency) || 0,
    Confiança: Number(r.avg_confidence) || 0,
    Proatividade: Number(r.avg_proactivity) || 0,
    Sinergia: Number(r.avg_synergy) || 0
  }));

  const deptData = (analytics?.by_department || []).map((d) => ({
    name: String(d.department || 'Sem setor').slice(0, 22),
    Eficiência: Number(d.avg_efficiency) || 0,
    Confiança: Number(d.avg_confidence) || 0,
    Proatividade: Number(d.avg_proactivity) || 0,
    Sinergia: Number(d.avg_synergy) || 0,
    n: d.n
  }));

  const statusData = (analytics?.by_status || []).map((s) => ({
    name: s.status || '—',
    n: Number(s.n) || 0
  }));

  const scatterData = (analytics?.scatter_points || [])
    .filter((p) => p.efficiency != null && p.synergy != null)
    .map((p) => ({
      name: p.user_name || '',
      efficiency: Number(p.efficiency),
      synergy: Number(p.synergy)
    }));

  return (
    <Layout>
      <div className="pulse-rh-page">
        <header className="pulse-rh-page__head">
          <h1>Impetus Pulse — Inteligência humana</h1>
          <p className="pulse-rh-page__sub">
            Acesso completo (RH): respostas individuais, percepção do líder e disparo de ciclos. Supervisores não veem as
            notas dos subordinados — apenas o complemento cego.
          </p>
        </header>

        <div className="pulse-rh-toolbar">
          <label>
            De{' '}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="form-input" />
          </label>
          <label>
            Até{' '}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="form-input" />
          </label>
          <label className="pulse-rh-toolbar__bucket">
            Agregação temporal{' '}
            <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="form-input">
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="quarter">Trimestre</option>
            </select>
          </label>
          <label>
            Turno{' '}
            <input
              type="text"
              value={shiftCode}
              onChange={(e) => setShiftCode(e.target.value)}
              placeholder="código"
              className="form-input pulse-rh-toolbar__short"
            />
          </label>
          <label>
            Equipa{' '}
            <input
              type="text"
              value={teamLabel}
              onChange={(e) => setTeamLabel(e.target.value)}
              placeholder="contém…"
              className="form-input pulse-rh-toolbar__med"
            />
          </label>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            Aplicar filtro
          </button>
          <button type="button" className="btn btn-primary" onClick={triggerAll}>
            Disparar ciclo (todos elegíveis)
          </button>
        </div>

        <section className="pulse-rh-analytics" aria-label="Analytics RH">
          <h2 className="pulse-rh-analytics__title">Analytics</h2>
          <div className="pulse-rh-analytics-tabs" role="tablist">
            {ANALYTICS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={analyticsTab === t.id}
                className={`pulse-rh-analytics-tab ${analyticsTab === t.id ? 'is-active' : ''}`}
                onClick={() => setAnalyticsTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="pulse-rh-analytics__loading">Carregando gráficos…</p>
          ) : !analytics ? (
            <p className="pulse-rh-empty">Sem dados de analytics.</p>
          ) : (
            <div className="pulse-rh-analytics-panels">
              {analyticsTab === 'overview' && (
                <div className="pulse-rh-analytics-grid">
                  <div className="pulse-rh-chart-card">
                    <h3>Médias globais (1–5)</h3>
                    <p className="pulse-rh-kpi">Amostras: {summary.n ?? 0}</p>
                    <div className="pulse-gestao-chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={overviewBars}>
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="v" name="Média" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="pulse-rh-chart-card">
                    <h3>Radar — quatro eixos</h3>
                    <div className="pulse-gestao-chart pulse-rh-radar">
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} />
                          <Radar
                            name="Média período"
                            dataKey="value"
                            stroke="#7c3aed"
                            fill="#7c3aed"
                            fillOpacity={0.35}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {analyticsTab === 'temporal' && (
                <div className="pulse-rh-chart-card">
                  <h3>Evolução por {bucket === 'week' ? 'semana' : bucket === 'quarter' ? 'trimestre' : 'mês'}</h3>
                  <div className="pulse-gestao-chart">
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Eficiência" stroke="#2563eb" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Confiança" stroke="#059669" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Proatividade" stroke="#d97706" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Sinergia" stroke="#7c3aed" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {analyticsTab === 'sector' && (
                <div className="pulse-rh-chart-card">
                  <h3>Médias por setor</h3>
                  <div className="pulse-gestao-chart">
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={deptData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Eficiência" fill="#2563eb" />
                        <Bar dataKey="Confiança" fill="#059669" />
                        <Bar dataKey="Proatividade" fill="#d97706" />
                        <Bar dataKey="Sinergia" fill="#7c3aed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="pulse-rh-hint">Barras agrupadas por setor (médias 1–5 por eixo).</p>
                </div>
              )}

              {analyticsTab === 'status' && (
                <div className="pulse-rh-chart-card">
                  <h3>Distribuição por status (criação no período)</h3>
                  <div className="pulse-gestao-chart">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={statusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="n" name="Quantidade" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {analyticsTab === 'individual' && (
                <div className="pulse-rh-chart-card">
                  <h3>Dispersão: eficiência × sinergia (até 200 pontos)</h3>
                  <div className="pulse-gestao-chart">
                    <ResponsiveContainer width="100%" height={360}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="efficiency" name="Eficiência" domain={[0, 5]} />
                        <YAxis type="number" dataKey="synergy" name="Sinergia" domain={[0, 5]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name) => [v, name]} />
                        <Scatter name="Colaboradores" data={scatterData} fill="#6366f1" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {loading ? (
          <p>Carregando tabela…</p>
        ) : (
          <div className="pulse-rh-table-wrap">
            <table className="pulse-rh-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Status</th>
                  <th>Auto (4 eixos)</th>
                  <th>Percepção líder</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.user_name || '—'}</td>
                    <td>{row.status}</td>
                    <td>
                      <code className="pulse-rh-code">{JSON.stringify(row.fixed_scores || {})}</code>
                    </td>
                    <td>{row.supervisor_perception ? `${String(row.supervisor_perception).slice(0, 80)}…` : '—'}</td>
                    <td className="pulse-rh-actions">
                      {row.status === 'completed' && (
                        <>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => genReport(row)}>
                            JSON
                          </button>
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => genReportAndPdf(row)}>
                            PDF
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="pulse-rh-empty">Nenhum registro no período.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}

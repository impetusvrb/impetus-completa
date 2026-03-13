/**
 * IMPETUS - Mapa de Vazamento Financeiro
 * CEO/Diretores: valores | Supervisores: alertas operacionais sem valores
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import {
  AlertTriangle, RefreshCw, ArrowLeft, DollarSign, TrendingDown,
  BarChart3, FileText, Zap, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './MapaVazamentoFinanceiro.css';

const HIDE = '—';

export default function MapaVazamentoFinanceiro() {
  const navigate = useNavigate();
  const [map, setMap] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [report, setReport] = useState(null);
  const [projected, setProjected] = useState(null);
  const [includeFinancial, setIncludeFinancial] = useState(true);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [mapRes, rankRes, alertsRes, reportRes, projRes] = await Promise.all([
        dashboard.financialLeakage.getMap(),
        dashboard.financialLeakage.getRanking(),
        dashboard.financialLeakage.getAlerts(10),
        dashboard.financialLeakage.getReport(),
        dashboard.financialLeakage.getProjectedImpact(30)
      ]);
      if (mapRes?.data?.ok) {
        setMap(mapRes.data.map || []);
        setIncludeFinancial(mapRes.data.include_financial ?? true);
      }
      if (rankRes?.data?.ok) setRanking(rankRes.data.ranking || []);
      if (alertsRes?.data?.ok) setAlerts(alertsRes.data.alerts || []);
      if (reportRes?.data?.ok) setReport(reportRes.data.report);
      if (projRes?.data?.ok) setProjected(projRes.data);
    } catch (e) {
      if (e?.response?.status === 403) setAccessDenied(true);
      console.warn('Mapa Vazamento load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (v) => (includeFinancial && v != null && v !== HIDE ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : v ?? HIDE);

  if (accessDenied) {
    return (
      <Layout>
        <div className="mapa-vazamento mv-forbidden">
          <div className="mv-forbidden-card">
            <AlertTriangle size={48} />
            <h2>Acesso restrito</h2>
            <p>O Mapa de Vazamento Financeiro é voltado para CEO, Diretores e Supervisores.</p>
            <button className="mv-btn" onClick={() => navigate('/app')}>
              <ArrowLeft size={18} /> Voltar ao Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const barData = ranking.slice(0, 8).map((r) => ({
    name: r.leak_label?.slice(0, 20) || r.leak_type,
    valor: includeFinancial ? (r.impact_30d || 0) : (r.rank ? 1 : 0)
  }));

  return (
    <Layout>
      <div className="mapa-vazamento">
        <header className="mv-header">
          <div className="mv-title">
            <Zap size={28} />
            <div>
              <h1>Mapa de Vazamento Financeiro</h1>
              <span className="mv-subtitle">
                {includeFinancial ? 'Detecção de perdas · Impacto financeiro estimado' : 'Alertas operacionais · Sem valores monetários'}
              </span>
            </div>
          </div>
          <button className="mv-refresh" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={18} /> Atualizar
          </button>
        </header>

        {!includeFinancial && (
          <div className="mv-banner-operational">
            <AlertTriangle size={20} />
            <span>Você visualiza apenas alertas operacionais. Valores financeiros são restritos a CEO e Diretores.</span>
          </div>
        )}

        {/* Principais perdas */}
        <section className="mv-main-losses">
          <h3><TrendingDown size={20} /> Principais perdas detectadas</h3>
          {loading ? (
            <div className="mv-loading">Carregando...</div>
          ) : map.length === 0 ? (
            <div className="mv-empty">Nenhuma perda operacional detectada no período. O sistema analisa paradas, retrabalho, consumo e eventos automaticamente.</div>
          ) : (
            <div className="mv-loss-cards">
              {map.slice(0, 6).map((m, i) => (
                <div key={`${m.leak_type}-${m.line_identifier || i}`} className="mv-loss-card">
                  <div className="mv-loss-label">{m.leak_label}</div>
                  <div className="mv-loss-desc">{m.description}</div>
                  {m.sector && <span className="mv-loss-sector">{m.sector}</span>}
                  {m.line_identifier && <span className="mv-loss-line">Linha: {m.line_identifier}</span>}
                  <div className="mv-loss-impact">
                    Impacto estimado mensal: <strong>{fmt(m.impact_30d)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ranking */}
        <section className="mv-ranking">
          <h3><BarChart3 size={20} /> Ranking de perdas operacionais</h3>
          {loading ? (
            <div className="mv-loading">Carregando...</div>
          ) : ranking.length === 0 ? (
            <div className="mv-empty">Sem dados para ranking.</div>
          ) : (
            <>
              <ol className="mv-rank-list">
                {ranking.map((r) => (
                  <li key={r.leak_type}>
                    <span className="mv-rank-num">{r.rank}º</span>
                    <span className="mv-rank-label">{r.leak_label}</span>
                    <span className="mv-rank-sector">{r.sector}</span>
                    <span className="mv-rank-impact">{fmt(r.impact_30d)}</span>
                  </li>
                ))}
              </ol>
              {includeFinancial && barData.some((d) => d.valor > 0) && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `R$${v / 1000}k` : `R$${v}`)} />
                    <Tooltip formatter={(v) => (includeFinancial ? `R$ ${Number(v).toLocaleString('pt-BR')}` : '-')} />
                    <Bar dataKey="valor" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </section>

        {/* Alertas e Relatório */}
        <div className="mv-grid-2">
          <section className="mv-alerts">
            <h3><AlertTriangle size={20} /> Alertas de vazamento</h3>
            {alerts.length === 0 ? (
              <p className="mv-empty">Nenhum alerta recente.</p>
            ) : (
              <ul className="mv-alert-list">
                {alerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="mv-alert-item">
                    <strong>{a.title}</strong>
                    <span>{a.description}</span>
                    {includeFinancial && a.impact_30d_formatted !== HIDE && (
                      <small>Impacto 30 dias: {a.impact_30d_formatted}</small>
                    )}
                    {a.possible_cause && <small>Causa possível: {a.possible_cause}</small>}
                    {a.suggestion && <span className="mv-alert-suggestion">Sugestão: {a.suggestion}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mv-report">
            <h3><FileText size={20} /> Relatório da IA</h3>
            {report ? (
              <div className="mv-report-content">
                {report.main_cause && (
                  <div className="mv-report-main">
                    <strong>Maior causa de perda:</strong> {report.main_cause}
                    {includeFinancial && report.main_cause_impact_formatted !== HIDE && (
                      <div>Impacto estimado: {report.main_cause_impact_formatted}</div>
                    )}
                  </div>
                )}
                {report.possible_cause && <p><strong>Causa possível:</strong> {report.possible_cause}</p>}
                {report.ai_suggestion && <p className="mv-report-suggestion">{report.ai_suggestion}</p>}
              </div>
            ) : (
              <div className="mv-empty">Gerando relatório...</div>
            )}
          </section>
        </div>

        {/* Projeção e integração Previsão */}
        <section className="mv-projection">
          <h3><DollarSign size={20} /> Projeção de impacto</h3>
          {projected ? (
            <div className="mv-proj-content">
              <div className="mv-proj-val">{projected.projected_impact_formatted || projected.message}</div>
              <p className="mv-proj-msg">{projected.message}</p>
              <button className="mv-link-previsao" onClick={() => navigate('/app/centro-previsao-operacional')}>
                Ver Centro de Previsão Operacional <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="mv-empty">Carregando projeção...</div>
          )}
        </section>
      </div>
    </Layout>
  );
}

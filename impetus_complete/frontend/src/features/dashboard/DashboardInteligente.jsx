/**
 * DASHBOARD INTELIGENTE ADAPTATIVO
 * Layout fixo para todos - 6 blocos
 * Conteúdo personalizado por área, cargo e setor
 */
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import MetricCard from '../../components/MetricCard';
import TrendChart from '../../components/TrendChart';
import MonitoredPointsChart from '../../components/MonitoredPointsChart';
import InsightsList from '../../components/InsightsList';
import RecentInteractions from '../../components/RecentInteractions';
import { SmartSummaryModal, useSmartSummary } from '../smartSummary';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useDashboardVisibility } from '../../hooks/useDashboardVisibility';
import { MessageSquare, Brain, MapPin, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import PLCAlertsPanel from './components/PLCAlertsPanel';
import KPIRequest from './components/KPIRequest';
import CommunicationPanel from './components/CommunicationPanel';
import './DashboardInteligente.css';

export default function DashboardInteligente() {
  const { sections, userContext } = useDashboardVisibility();
  const [kpiWidgets, setKpiWidgets] = useState([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const { log } = useActivityLog();

  const { data: summaryRes } = useCachedFetch('dashboard:summary', () => dashboard.getSummary(), { ttlMs: 2 * 60 * 1000 });
  const { data: trendRes } = useCachedFetch('dashboard:trend:6', () => dashboard.getTrend(6), { ttlMs: 5 * 60 * 1000 });
  const { data: insightsRes } = useCachedFetch('dashboard:insights', () => dashboard.getInsights(), { ttlMs: 60 * 1000 });
  const { data: interactionsRes } = useCachedFetch('dashboard:interactions:5', () => dashboard.getRecentInteractions(5), { ttlMs: 60 * 1000 });

  useEffect(() => { if (summaryRes?.summary) setSummary(summaryRes.summary); }, [summaryRes]);
  useEffect(() => { if (trendRes?.trend) setTrendData(trendRes.trend); }, [trendRes]);
  useEffect(() => { if (insightsRes?.insights) setInsights(insightsRes.insights); }, [insightsRes]);
  useEffect(() => { if (interactionsRes?.interactions) setInteractions(interactionsRes.interactions); }, [interactionsRes]);
  useEffect(() => { log('view', 'dashboard_inteligente', null, { area: userContext?.area }); }, []);

  const smartSummary = useSmartSummary(true);
  useEffect(() => { smartSummary.fetchAndShow(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const areaLabel = userContext?.area || 'Colaborador';

  return (
    <Layout>
      {sections.smart_summary && (
        <SmartSummaryModal
          isOpen={smartSummary.showModal}
          onClose={smartSummary.closeModal}
          summary={smartSummary.summary}
          periodo={smartSummary.periodo}
          loading={smartSummary.loading}
        />
      )}
      <div className="dashboard-inteligente">
        <header className="dashboard-inteligente__header">
          <h1>Dashboard</h1>
          <p className="dashboard-inteligente__area">
            Visão para {areaLabel}
          </p>
        </header>

        {/* Bloco 1: Resumo Geral - via Smart Summary modal (abre ao carregar) */}
        {sections.smart_summary && (
          <section className="dashboard-inteligente__block block-resumo">
            <h2><BarChart3 size={20} /> Resumo Geral</h2>
            <p className="block-desc">Resumo diário/semanal gerado por IA</p>
            <button type="button" className="btn btn-secondary" onClick={smartSummary.fetchAndShow}>
              Ver resumo completo
            </button>
          </section>
        )}

        {/* Bloco 2: Indicadores */}
        <section className="dashboard-inteligente__block block-indicadores">
          <h2><TrendingUp size={20} /> Indicadores</h2>
          {sections.kpi_request && (userContext?.hierarchy_level ?? 5) <= 2 && (
            <div className="block-kpi-request">
              <KPIRequest
                onSubmit={(s) => { setKpiLoading(true); setTimeout(() => { setKpiWidgets([{ id: 1, titulo: s, valor: '-', tendencia: 0 }]); setKpiLoading(false); }, 600); }}
                loading={kpiLoading}
              />
              {kpiWidgets.length > 0 && (
                <div className="kpi-widgets-preview">
                  {kpiWidgets.map((k) => (
                    <div key={k.id} className="kpi-widget">{k.titulo}: {k.valor}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="dashboard-inteligente__metrics">
            {sections.operational_interactions && (
              <MetricCard
                icon={MessageSquare}
                title="Interações Operacionais"
                value={summary?.operational_interactions?.total ?? 0}
                growth={summary?.operational_interactions?.growth_percentage}
                color="blue"
              />
            )}
            {sections.ai_insights && (
              <MetricCard
                icon={Brain}
                title="Insights IA"
                value={summary?.ai_insights?.total ?? 0}
                growth={summary?.ai_insights?.growth_percentage}
                color="teal"
              />
            )}
            {sections.monitored_points && (
              <MetricCard
                icon={MapPin}
                title="Pontos Monitorados"
                value={summary?.monitored_points?.total ?? 0}
                color="purple"
              />
            )}
            {sections.proposals && (
              <MetricCard
                icon={TrendingUp}
                title="Propostas Pró-Ação"
                value={summary?.proposals?.total ?? 0}
                color="blue"
              />
            )}
          </div>
        </section>

        {/* Bloco 3: Alertas */}
        {sections.plc_alerts && (
          <section className="dashboard-inteligente__block block-alertas">
            <h2><AlertTriangle size={20} /> Alertas</h2>
            <PLCAlertsPanel />
          </section>
        )}

        {/* Bloco 4: Tendências */}
        {sections.trend_chart && (
          <section className="dashboard-inteligente__block block-tendencias">
            <h2><TrendingUp size={20} /> Tendências</h2>
            <div className="block-chart">
              <TrendChart data={trendData} />
            </div>
            {sections.points_chart && (
              <div className="block-chart-sm">
                <MonitoredPointsChart />
              </div>
            )}
          </section>
        )}

        {/* Bloco 5: Interações */}
        {(sections.recent_interactions || sections.communication_panel) && (
          <section className="dashboard-inteligente__block block-interacoes">
            <h2><MessageSquare size={20} /> Interações</h2>
            {sections.communication_panel && (userContext?.hierarchy_level ?? 5) <= 2 && (
              <CommunicationPanel />
            )}
            {sections.recent_interactions && (
              <RecentInteractions interactions={interactions} />
            )}
          </section>
        )}

        {/* Bloco 6: Insights IA */}
        {sections.insights_list && (
          <section className="dashboard-inteligente__block block-insights">
            <h2><Brain size={20} /> Insights IA</h2>
            <InsightsList insights={insights} />
          </section>
        )}

        {!(sections.operational_interactions || sections.ai_insights || sections.plc_alerts || sections.trend_chart || sections.recent_interactions || sections.insights_list) && (
          <div className="dashboard-inteligente__empty">
            <p>Nenhuma informação configurada. Entre em contato com o Diretor.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

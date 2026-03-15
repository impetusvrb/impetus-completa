/**
 * REGISTRO DE WIDGETS - Mapeamento id -> componente
 * Design preservado - mesmos estilos do dashboard atual
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Brain, MapPin, TrendingUp, AlertTriangle, Target, ChevronRight, MessageSquare } from 'lucide-react';
import MetricCard from '../../../components/MetricCard';
import TrendChart from '../../../components/TrendChart';
import MonitoredPointsChart from '../../../components/MonitoredPointsChart';
import InsightsList from '../../../components/InsightsList';
import RecentInteractions from '../../../components/RecentInteractions';
import PLCAlertsPanel from '../components/PLCAlertsPanel';
import CentralAIPanel from '../components/CentralAIPanel';
import IndustryMap from '../components/IndustryMap';
import { useCachedFetch } from '../../../hooks/useCachedFetch';
import { dashboard } from '../../../services/api';

function WidgetSmartSummary({ onSettingsChange }) {
  const navigate = useNavigate();
  return (
    <section className="dashboard-inteligente__block block-resumo">
      <h2><BarChart3 size={20} /> Resumo Inteligente</h2>
      <p className="block-desc">Resumo diário/semanal gerado por IA</p>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/chatbot')}>
        Ver resumo completo
      </button>
    </section>
  );
}

function WidgetIndicators({ trackInteraction }) {
  const navigate = useNavigate();
  const userId = (() => { try { return JSON.parse(localStorage.getItem('impetus_user') || '{}')?.id || 'anon'; } catch { return 'anon'; } })();
  const { data: kpisRes } = useCachedFetch(`dashboard:kpis:${userId}`, () => dashboard.getKPIs(), { ttlMs: 2 * 60 * 1000 });
  const kpis = kpisRes?.kpis || [];
  const handleClick = (k) => {
    if (trackInteraction) trackInteraction('click_kpi', 'kpi', k.id || k.key, { title: k.title });
    if (k.route) navigate(k.route);
  };
  const icons = { MessageSquare, Brain, MapPin, TrendingUp, AlertTriangle, Target };
  return (
    <section className="dashboard-inteligente__block block-indicadores">
      <h2><TrendingUp size={20} /> Indicadores</h2>
      <div className="dashboard-inteligente__metrics">
        {kpis.length > 0 ? kpis.map((k) => {
          const Icon = icons[k.icon_key || k.icon] || TrendingUp;
          return (
            <MetricCard
              key={k.id}
              icon={Icon}
              title={k.title}
              value={typeof k.value === 'number' ? k.value : k.value}
              growth={k.growth}
              color={k.color || 'blue'}
              onClick={k.route ? () => handleClick(k) : undefined}
            />
          );
        }) : (
          <p className="block-desc">Carregando indicadores...</p>
        )}
      </div>
    </section>
  );
}

function WidgetTrendChart() {
  const { data: trendRes } = useCachedFetch('dashboard:trend:6', () => dashboard.getTrend(6), { ttlMs: 5 * 60 * 1000 });
  const trendData = trendRes?.trend || [];
  return (
    <section className="dashboard-inteligente__block block-tendencias">
      <h2><TrendingUp size={20} /> Tendências</h2>
      <div className="block-chart">
        <TrendChart data={trendData} />
      </div>
      <div className="block-chart-sm">
        <MonitoredPointsChart />
      </div>
    </section>
  );
}

function WidgetRecentInteractions() {
  const navigate = useNavigate();
  const { data } = useCachedFetch('dashboard:interactions:10', () => dashboard.getRecentInteractions(10), { ttlMs: 60 * 1000 });
  const interactions = data?.interactions || [];
  return (
    <section className="dashboard-inteligente__block block-interacoes">
      <h2><MessageSquare size={20} /> Interações</h2>
      <RecentInteractions interactions={interactions} onInteractionClick={() => navigate('/app/operacional')} />
    </section>
  );
}

function WidgetInsightsList() {
  const navigate = useNavigate();
  const { data } = useCachedFetch('dashboard:insights', () => dashboard.getInsights(), { ttlMs: 60 * 1000 });
  const insights = data?.insights || [];
  return (
    <section className="dashboard-inteligente__block block-insights">
      <h2><Brain size={20} /> Insights IA</h2>
      <InsightsList insights={insights} onInsightClick={() => navigate('/app/chatbot')} />
    </section>
  );
}

function WidgetAlertsPanel() {
  return (
    <section className="dashboard-inteligente__block block-alertas">
      <h2><AlertTriangle size={20} /> Alertas</h2>
      <PLCAlertsPanel />
    </section>
  );
}

function WidgetCenterCard({ label, route, icon: Icon }) {
  const navigate = useNavigate();
  return (
    <section className="dashboard-inteligente__block">
      <h2>{Icon ? <Icon size={20} /> : null} {label}</h2>
      <p className="block-desc">Acesso ao centro completo para análise e simulação.</p>
      <button type="button" className="btn btn-secondary" onClick={() => navigate(route)}>
        Abrir {label} <ChevronRight size={16} />
      </button>
    </section>
  );
}

export const WIDGET_COMPONENTS = {
  smart_summary: WidgetSmartSummary,
  indicators: WidgetIndicators,
  trend_chart: WidgetTrendChart,
  recent_interactions: WidgetRecentInteractions,
  insights_list: WidgetInsightsList,
  alerts_panel: WidgetAlertsPanel,
  plc_alerts: WidgetAlertsPanel,
  industrial_map: IndustryMap,
  center_predictions: () => <WidgetCenterCard label="Centro de Previsão" route="/app/centro-previsao-operacional" icon={TrendingUp} />,
  operational_brain: () => <WidgetCenterCard label="Cérebro Operacional" route="/app/cerebro-operacional" icon={Brain} />,
  cost_center: () => <WidgetCenterCard label="Centro de Custos" route="/app/centro-custos-industriais" icon={Target} />,
  leak_map: () => <WidgetCenterCard label="Mapa de Vazamentos" route="/app/mapa-vazamento-financeiro" icon={MapPin} />,
  maintenance_cards: () => <WidgetCenterCard label="Indicadores Técnicos" route="/app" icon={BarChart3} />,
  central_ai: function WidgetCentralAI({ payload }) {
    const data = payload?.central_ai;
    if (!data) return null;
    return (
      <section className="dashboard-inteligente__block block-central-ai">
        <h2><Brain size={20} /> IA Central</h2>
        <CentralAIPanel data={data} />
      </section>
    );
  }
};

/**
 * DASHBOARD GERENCIAL
 * Para gerentes e diretores: KPIs personalizáveis via IA, comunicação direta
 */
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import MetricCard from '../../components/MetricCard';
import { SmartSummaryModal, useSmartSummary } from '../smartSummary';
import { useActivityLog } from '../../hooks/useActivityLog';
import KPIRequest from './components/KPIRequest';
import CommunicationPanel from './components/CommunicationPanel';
import PLCAlertsPanel from './components/PLCAlertsPanel';
import { MessageSquare, Brain, TrendingUp, Gauge } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { useDashboardVisibility } from '../../hooks/useDashboardVisibility';
import './DashboardGerencial.css';

export default function DashboardGerencial() {
  const { sections } = useDashboardVisibility();
  const [kpiSolicitado, setKpiSolicitado] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiWidgets, setKpiWidgets] = useState([]);

  const { data: summaryRes } = useCachedFetch('dashboard:summary', () => dashboard.getSummary(), { ttlMs: 2 * 60 * 1000 });
  const summary = summaryRes?.summary;

  const smartSummary = useSmartSummary(true);
  const { log } = useActivityLog();
  useEffect(() => {
    smartSummary.fetchAndShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    log('view', 'dashboard_gerencial', null, {});
  }, []);

  const handleKPIRequest = (solicitacao) => {
    log('request', 'dashboard', null, { kpi_requested: solicitacao });
    setKpiSolicitado(solicitacao);
    setKpiLoading(true);
    // Simula resposta da IA - em produção, chamar endpoint que gera widgets
    setTimeout(() => {
      setKpiWidgets([
        { id: 1, titulo: 'OEE Linha 1', valor: '78,5%', tendencia: 2 },
        { id: 2, titulo: 'Paradas (30 dias)', valor: '12', tendencia: -5 },
        { id: 3, titulo: 'Produtividade', valor: '94%', tendencia: 1 },
      ]);
      setKpiLoading(false);
    }, 800);
  };

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
      <div className="dashboard-gerencial">
        <header className="dashboard-gerencial__header">
          <h1 className="dashboard-gerencial__titulo">Dashboard Gerencial</h1>
          <p className="dashboard-gerencial__subtitulo">
            KPIs personalizáveis · Comunicação com setores, usuários e IA
          </p>
        </header>

        {sections.plc_alerts && <PLCAlertsPanel />}

        {sections.kpi_request && (
          <KPIRequest onSubmit={handleKPIRequest} loading={kpiLoading} />
        )}

        {(kpiSolicitado || kpiWidgets.length > 0) && sections.kpi_request && (
          <section className="dashboard-gerencial__kpis">
            <h3>Resultados solicitados</h3>
            <div className="dashboard-gerencial__kpis-grid">
              {kpiWidgets.map((k) => (
                <div key={k.id} className="kpi-widget">
                  <h4>{k.titulo}</h4>
                  <div className="kpi-widget__valor">{k.valor}</div>
                  {k.tendencia != null && (
                    <span className={k.tendencia >= 0 ? 'kpi-widget__pos' : 'kpi-widget__neg'}>
                      {k.tendencia >= 0 ? '+' : ''}{k.tendencia}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="dashboard-gerencial__grid">
          {(sections.operational_interactions || sections.ai_insights || sections.proposals || sections.monitored_points) && (
            <div className="dashboard-gerencial__metrics">
              <h3>Visão Geral</h3>
              <div className="metrics-grid">
                {sections.operational_interactions && (
                  <MetricCard
                    icon={MessageSquare}
                    title="Interações"
                    value={summary?.operational_interactions?.total || 25634}
                    growth={summary?.operational_interactions?.growth_percentage || 95}
                    color="blue"
                  />
                )}
                {sections.ai_insights && (
                  <MetricCard
                    icon={Brain}
                    title="Insights IA"
                    value={summary?.ai_insights?.total || 4887}
                    growth={summary?.ai_insights?.growth_percentage || 8}
                    color="teal"
                  />
                )}
                {sections.proposals && (
                  <MetricCard
                    icon={TrendingUp}
                    title="Propostas Pró-Ação"
                    value={summary?.proposals?.total || 156}
                    color="purple"
                  />
                )}
                {sections.monitored_points && (
                  <MetricCard
                    icon={Gauge}
                    title="Pontos Monitorados"
                    value={summary?.monitored_points?.total || 482}
                    color="blue"
                  />
                )}
              </div>
            </div>
          )}

          {sections.communication_panel && (
            <div className="dashboard-gerencial__comm">
              <CommunicationPanel />
            </div>
          )}

          {!(sections.operational_interactions || sections.ai_insights || sections.proposals || sections.monitored_points || sections.plc_alerts || sections.kpi_request || sections.communication_panel) && (
            <div className="dashboard-empty-visibility">
              <p>Nenhuma informação configurada para exibição. Entre em contato com o Diretor para personalizar sua visão do dashboard.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

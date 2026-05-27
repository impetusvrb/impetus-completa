/**
 * DASHBOARD INTELIGENTE ADAPTATIVO
 * Layout fixo para todos - 6 blocos
 * Conteúdo personalizado por área, cargo e setor
 *
 * D15 — Sections Source Resolution:
 *   VITE_IMPETUS_DASHBOARD_SECTIONS_SOURCE=legacy  → visibilidade local (useDashboardVisibility)
 *   VITE_IMPETUS_DASHBOARD_SECTIONS_SOURCE=backend → backend é source-of-truth (dashboardPayload.sections)
 *   Rollback: mudar flag para "legacy" — sem alterar código.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import MetricCard from '../../components/MetricCard';
import TrendChart from '../../components/TrendChart';
import InsightsList from '../../components/InsightsList';
import RecentInteractions from '../../components/RecentInteractions';
import { SmartSummaryModal, useSmartSummary } from '../smartSummary';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useDashboardVisibility } from '../../hooks/useDashboardVisibility';
import { useDashboardMe } from '../../hooks/useDashboardMe';
import {
  resolveDashboardSections,
  getDashboardSectionsSource,
} from '../../policyEngine/safeMinimalPolicy';
import { MessageSquare, Brain, MapPin, TrendingUp, AlertTriangle, BarChart3, Target, Users, Activity, Zap, Settings2 } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import PLCAlertsPanel from './components/PLCAlertsPanel';
import CentralAIPanel from './components/CentralAIPanel';
import KPIRequest from './components/KPIRequest';
import DashboardCustomizerModal from './components/DashboardCustomizerModal';
import './DashboardInteligente.css';

export default function DashboardInteligente({ embed = false }) {
  const navigate = useNavigate();
  const { sections: legacyVisibility, userContext } = useDashboardVisibility();
  const { payload: dashboardPayload, trackInteraction, refetch } = useDashboardMe({ enabled: true });

  // ─── D15 — Resolução unificada de sections ──────────────────────────────────
  // Com flag "legacy": usa useDashboardVisibility (comportamento anterior byte-a-byte).
  // Com flag "backend": usa dashboardPayload.sections (source-of-truth governado).
  // Deny-first absoluto: se ambos forem inválidos → SAFE_MINIMAL_SECTIONS.
  const sectionsSource = getDashboardSectionsSource();
  const sections = useMemo(() => {
    const resolved = resolveDashboardSections({
      backendSections: dashboardPayload?.sections ?? null,
      legacyVisibility,
      source: sectionsSource,
    });
    if (sectionsSource === 'backend') {
      console.info('[Dashboard] Sections source: backend');
    }
    return resolved;
  }, [dashboardPayload?.sections, legacyVisibility, sectionsSource]);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [kpiWidgets, setKpiWidgets] = useState([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const { log } = useActivityLog();

  const { data: summaryRes } = useCachedFetch('dashboard:summary', () => dashboard.getSummary(), { ttlMs: 2 * 60 * 1000 });
  const { data: trendRes, loading: trendLoading } = useCachedFetch('dashboard:trend:6', () => dashboard.getTrend(6), { ttlMs: 5 * 60 * 1000 });
  const { data: insightsRes, loading: insightsLoading } = useCachedFetch('dashboard:insights', () => dashboard.getInsights(), { ttlMs: 60 * 1000 });
  const { data: interactionsRes, loading: interactionsLoading } = useCachedFetch('dashboard:interactions:10', () => dashboard.getRecentInteractions(10), { ttlMs: 60 * 1000 });
  const userId = (() => { try { return JSON.parse(localStorage.getItem('impetus_user') || '{}')?.id || 'anon'; } catch { return 'anon'; } })();
  const { data: kpisRes, loading: kpisLoading, error: kpisError } = useCachedFetch(`dashboard:kpis:${userId}`, () => dashboard.getKPIs(), { ttlMs: 2 * 60 * 1000 });

  useEffect(() => { if (summaryRes?.summary) setSummary(summaryRes.summary); }, [summaryRes]);
  useEffect(() => {
    if (!trendRes) return;
    const raw = trendRes?.data ?? trendRes?.trend ?? trendRes;
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    setTrendData(
      arr.map((d) => ({
        month: d.label || d.periodo || d.mes || d.name || '-',
        interactions: d.valor ?? d.total ?? d.count ?? d.interactions ?? 0
      }))
    );
  }, [trendRes]);
  useEffect(() => { if (insightsRes?.insights) setInsights(insightsRes.insights); }, [insightsRes]);
  useEffect(() => { if (interactionsRes?.interactions) setInteractions(interactionsRes.interactions); }, [interactionsRes]);
  useEffect(() => { log('view', 'dashboard_inteligente', null, { area: userContext?.area }); }, []);

  const kpisFromApi = (kpisRes?.kpis || []).filter((k) => k != null && typeof k === 'object');
  const kpisFromMe = (dashboardPayload?.kpis || []).filter((k) => k != null && typeof k === 'object');
  const kpis = kpisFromApi.length > 0 ? kpisFromApi : kpisFromMe;
  const kpisPending = kpisLoading && kpis.length === 0 && !kpisError;
  const KPI_ICONS = { message: MessageSquare, brain: Brain, map: MapPin, trending: TrendingUp, alert: AlertTriangle, target: Target, users: Users, activity: Activity, zap: Zap };

  const smartSummary = useSmartSummary(true);
  useEffect(() => { smartSummary.fetchAndShow(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const areaLabel =
    dashboardPayload?.profile_label ||
    dashboardPayload?.functional_area_label ||
    userContext?.area ||
    userContext?.role_label ||
    'sua área';

  const handleKpiClick = (k) => {
    trackInteraction('click_kpi', 'kpi', k.id || k.key, { title: k.title });
    if (k.route) navigate(k.route);
  };

  const content = (
    <>
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
          <div>
            <h1>Dashboard</h1>
            <p className="dashboard-inteligente__area">
              Visão para {areaLabel}
            </p>
          </div>
          {!embed && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setCustomizerOpen(true)}
              title="Personalizar painel"
            >
              <Settings2 size={20} />
            </button>
          )}
        </header>
        {customizerOpen && (
          <DashboardCustomizerModal
            isOpen={customizerOpen}
            onClose={() => setCustomizerOpen(false)}
            payload={dashboardPayload}
            onSaved={refetch}
          />
        )}

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

        {/* Bloco 2: Indicadores dinâmicos personalizados */}
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
              {kpis.length > 0 ? (
                kpis.map((k) => {
                  const Icon = KPI_ICONS[k.icon_key || k.icon] || TrendingUp;
                  return (
                    <MetricCard
                      key={k.id}
                      icon={Icon}
                      title={k.title}
                      value={typeof k.value === 'number' ? k.value : k.value}
                      growth={k.growth}
                      color={k.color || 'blue'}
                      onClick={k.route ? () => handleKpiClick(k) : undefined}
                    />
                  );
                })
              ) : kpisError ? (
                <p className="block-desc">Indicadores temporariamente indisponíveis. Atualize a página em instantes.</p>
              ) : !kpisPending && kpis.length === 0 ? (
                <p className="block-desc">Nenhum indicador disponível para seu perfil.</p>
              ) : (
                <p className="block-desc">Carregando indicadores personalizados...</p>
              )}
            </div>
          </section>

          {/* Bloco IA Central - Dados agregados de todos os setores */}
          {dashboardPayload?.central_ai && (
            <section className="dashboard-inteligente__block block-central-ai">
              <h2><Brain size={20} /> IA Central</h2>
              <CentralAIPanel data={dashboardPayload.central_ai} />
            </section>
          )}

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
                {trendLoading && trendData.length === 0 ? (
                  <p className="block-desc">Carregando tendências...</p>
                ) : (
                  <TrendChart data={trendData} />
                )}
              </div>
            </section>
          )}

          {/* Bloco 5: Interações */}
          {sections.recent_interactions && (
            <section className="dashboard-inteligente__block block-interacoes">
              <h2><MessageSquare size={20} /> Interações</h2>
              {interactionsLoading && interactions.length === 0 ? (
                <p className="block-desc">Carregando interações...</p>
              ) : (
                <RecentInteractions interactions={interactions} onInteractionClick={() => navigate('/app')} />
              )}
            </section>
          )}

          {/* Bloco 6: Insights IA */}
          {sections.insights_list && (
            <section className="dashboard-inteligente__block block-insights">
              <h2><Brain size={20} /> Insights IA</h2>
              {insightsLoading && insights.length === 0 ? (
                <p className="block-desc">Carregando insights...</p>
              ) : (
                <InsightsList insights={insights} onInsightClick={() => navigate('/app/chatbot')} />
              )}
            </section>
          )}
        </div>
    </>
  );

  if (embed) return content;
  return <Layout>{content}</Layout>;
  }

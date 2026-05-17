/**
 * Centro de Comando Industrial — Prompt v3 completo.
 * Grid 4 colunas; gráficos, indicadores, relatórios, diagramas; tudo IA onde aplicável.
 * Suporta layout personalizado por perfil (API /dashboard/personalizado) ou fallback por cargo.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Layout from '../../../components/Layout';
import { getLayoutPorCargo } from './LayoutPorCargo';
import { dashboard } from '../../../services/api';
import useDashboardContext from '../contextAdapter/useDashboardContext';
import WidgetKpiCards from './WidgetKpiCards';
import WidgetResumoExecutivo from './WidgetResumoExecutivo';
import WidgetAlertas from './WidgetAlertas';
import WidgetGraficoTendencia from './WidgetGraficoTendencia';
import WidgetPergunteIA from './WidgetPergunteIA';
import WidgetRelatorioIA from './WidgetRelatorioIA';
import WidgetGraficoProducaoDemanda from './WidgetGraficoProducaoDemanda';
import WidgetGraficoCustosSetor from './WidgetGraficoCustosSetor';
import WidgetGraficoMargem from './WidgetGraficoMargem';
import WidgetIndicadoresExecutivos from './WidgetIndicadoresExecutivos';
import WidgetCentroPrevisao from './WidgetCentroPrevisao';
import WidgetCentroCustos from './WidgetCentroCustos';
import WidgetMapaVazamentos from './WidgetMapaVazamentos';
import WidgetPerformance from './WidgetPerformance';
import WidgetGargalos from './WidgetGargalos';
import WidgetDesperdicio from './WidgetDesperdicio';
import WidgetInsightsIA from './WidgetInsightsIA';
import WidgetDiagramaIndustrial from './WidgetDiagramaIndustrial';
import WidgetManutencao from './WidgetManutencao';
import WidgetQualidade from './WidgetQualidade';
import WidgetEstoque from './WidgetEstoque';
import WidgetLogistica from './WidgetLogistica';
import WidgetOperacoes from './WidgetOperacoes';
import WidgetEnergia from './WidgetEnergia';
import WidgetRastreabilidade from './WidgetRastreabilidade';
import WidgetReceitas from './WidgetReceitas';
import LiveDashboardUnifiedPanel from '../components/LiveDashboardUnifiedPanel';
import ModuleErrorBoundary from '../../../components/ModuleErrorBoundary';
import { canAccessLiveDashboardUser, isHrDashboardLayout } from '../../../utils/roleUtils';
import LiveSurfacePanel from './LiveSurfacePanel';
import './CentroComando.css';

const WIDGET_COMPONENTS = {
  resumo_executivo: WidgetResumoExecutivo,
  kpi_cards: WidgetKpiCards,
  alertas: WidgetAlertas,
  grafico_tendencia: WidgetGraficoTendencia,
  pergunte_ia: WidgetPergunteIA,
  relatorio_ia: WidgetRelatorioIA,
  grafico_producao_demanda: WidgetGraficoProducaoDemanda,
  grafico_custos_setor: WidgetGraficoCustosSetor,
  grafico_margem: WidgetGraficoMargem,
  indicadores_executivos: WidgetIndicadoresExecutivos,
  centro_previsao: WidgetCentroPrevisao,
  centro_custos: WidgetCentroCustos,
  mapa_vazamentos: WidgetMapaVazamentos,
  performance: WidgetPerformance,
  gargalos: WidgetGargalos,
  desperdicio: WidgetDesperdicio,
  insights_ia: WidgetInsightsIA,
  diagrama_industrial: WidgetDiagramaIndustrial,
  manutencao: WidgetManutencao,
  qualidade: WidgetQualidade,
  estoque: WidgetEstoque,
  logistica: WidgetLogistica,
  operacoes: WidgetOperacoes,
  energia: WidgetEnergia,
  rastreabilidade: WidgetRastreabilidade,
  receitas: WidgetReceitas
};

function getWidgetComponent(id) {
  return WIDGET_COMPONENTS[id] || null;
}

export default function CentroComando() {
  // Lido uma única vez (stable ref) — localStorage não muda durante a sessão.
  const user = useMemo(() => {
    try {
      const s = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_user') : null;
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }, []);
  const role = user?.role ?? '';
  const department = user?.functional_area ?? user?.area ?? '';
  const dashboardProfile = user?.dashboard_profile ?? '';

  const [liveSurface, setLiveSurface] = useState(null);
  const layoutTrackSig = useRef('');

  // DashboardContextAdapter: prefere engine_v2 → personalizado → LayoutPorCargo (fallback).
  // Mantém compatibilidade total com o fluxo anterior.
  const { context: dashboardCtx } = useDashboardContext({ legacyLayoutFn: getLayoutPorCargo });

  useEffect(() => {
    dashboard.getLiveSurface()
      .then((r) => {
        if (r?.data?.ok && r?.data?.surface) setLiveSurface(r.data.surface);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('impetus_token');
    if (!token) return undefined;

    const streamUrl = `/api/dashboard/live-surface/stream?token=${encodeURIComponent(token)}`;
    const sse = new EventSource(streamUrl);

    sse.addEventListener('surface', (evt) => {
      try {
        const parsed = JSON.parse(evt.data || '{}');
        if (parsed?.ok && parsed?.surface) setLiveSurface(parsed.surface);
      } catch {
        // ignora payload invalido
      }
    });

    sse.onerror = () => {
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, []);

  const widgets = useMemo(() => (Array.isArray(dashboardCtx?.widgets) ? dashboardCtx.widgets : []), [dashboardCtx]);

  useEffect(() => {
    if (!widgets?.length || !user?.id || !user?.company_id) return;
    const source = dashboardCtx.source;
    const sig = `${source}:${widgets.map((w) => w.id).join(',')}`;
    if (layoutTrackSig.current === sig) return;
    layoutTrackSig.current = sig;
    dashboard.trackInteraction('centro_comando_layout', 'dashboard_layout', dashboardProfile || role, {
      source,
      engine: dashboardCtx.engine,
      trace_id: dashboardCtx.trace_id,
      widget_count: widgets.length,
      is_contextual: dashboardCtx.is_contextual
    }).catch(() => {});
  // user é estável (useMemo com deps []); role/dashboardProfile são strings
  // derivadas de user — incluídos para correctness mas não causam instabilidade.
  }, [widgets, dashboardCtx, user, role, dashboardProfile]);

  const titulo = dashboardCtx?.perfil?.titulo || 'Centro de Comando';
  const subtitulo = dashboardCtx?.perfil?.subtitulo || `Visão para ${role ? role.replace(/_/g, ' ') : 'colaborador'}`;
  const smartQuestions = Array.isArray(dashboardCtx?.assistente_ia?.exemplos_perguntas)
    ? dashboardCtx.assistente_ia.exemplos_perguntas
    : [];
  const fallbackMessages = Array.isArray(dashboardCtx?.assistente_ia?.mensagens_fallback)
    ? dashboardCtx.assistente_ia.mensagens_fallback
    : [];
  const hrDashboard = isHrDashboardLayout(user);
  const iaWidgetTitle = hrDashboard ? 'Assistente de Pessoas' : 'Cérebro Operacional';
  const iaExampleHints =
    smartQuestions.length > 0
      ? smartQuestions
      : hrDashboard
        ? [
            'Como está o clima da equipe neste mês?',
            'Quais setores têm mais alertas de RH abertos?'
          ]
        : [];

  const showUnifiedLive = canAccessLiveDashboardUser(user);

  return (
    <Layout>
      <div className="cc">
        {showUnifiedLive && (
          <ModuleErrorBoundary moduleName="Painel vivo">
            <LiveDashboardUnifiedPanel variant="exec" />
          </ModuleErrorBoundary>
        )}
        <header className="cc__header">
          <h1 className="cc__title">{titulo}</h1>
          <p className="cc__subtitle">{subtitulo}</p>
          {(smartQuestions.length > 0 || fallbackMessages.length > 0) && (
            <div className="cc__context-panel">
              {smartQuestions.length > 0 && (
                <p className="cc__context-line">
                  Perguntas inteligentes: {smartQuestions.slice(0, 2).join(' | ')}
                </p>
              )}
              {fallbackMessages.length > 0 && (
                <p className="cc__context-line cc__context-line--muted">
                  {fallbackMessages[0]}
                </p>
              )}
            </div>
          )}
        </header>
        {/*
          Phase 8 — Composição híbrida CentroComando.
          Antes: liveSurface OR Grid (LiveSurface escondia totalmente o grid
          executivo, fazendo desaparecer Centro de Custos / Mapa de
          Vazamento / Centro de Previsão para CFO e widgets executivos para
          CEO sempre que o backend devolvia qualquer bloco live).
          Agora: liveSurface (no topo, se existir) + Grid (sempre).
          Sem qualquer alteração de CSS, spacing, animações, tokens, DS.
        */}
        {liveSurface?.blocks?.length ? (
          <LiveSurfacePanel surface={liveSurface} />
        ) : null}
        <div className="cc__grid">
          {widgets.map((w) => {
            const Component = getWidgetComponent(w.id);
            if (!Component) return null;
            const span = w.position?.width === 2 ? 2 : 1;
            return (
              <div
                key={w.id}
                className="cc__cell"
                style={{ gridColumn: `span ${span}` }}
              >
                {w.id === 'pergunte_ia' ? (
                  <WidgetPergunteIA title={iaWidgetTitle} exampleHints={iaExampleHints} />
                ) : (
                  <Component />
                )}
              </div>
            );
          })}
        </div>
        {!hrDashboard && (
        <footer className="ticker">
          <div className="ticker-label">// LIVE</div>
          <div className="ticker-items">
            <div className="ticker-item">PROD/H <span className="val-green">— un</span></div>
            <div className="ticker-item">ENERGIA <span className="val-amber">— kWh</span></div>
            <div className="ticker-item">TURNO <span>1</span></div>
            <div className="ticker-item">OPERADORES <span>— ativos</span></div>
            <div className="ticker-item">QUALIDADE <span className="val-green">—% aprovação</span></div>
            <div className="ticker-item">UPTIME <span className="val-green">—%</span></div>
          </div>
        </footer>
        )}
      </div>
    </Layout>
  );
}

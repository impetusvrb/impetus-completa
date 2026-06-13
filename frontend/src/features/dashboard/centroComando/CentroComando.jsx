/**
 * Centro de Comando Industrial — Prompt v3 completo.
 * Grid 4 colunas; gráficos, indicadores, relatórios, diagramas; tudo IA onde aplicável.
 * Suporta layout personalizado por perfil (API /dashboard/personalizado) ou fallback por cargo.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Layout from '../../../components/Layout';
import { getLayoutPorCargoFromUser } from './LayoutPorCargo';
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
import WidgetGraficoClimaEquipe from './WidgetGraficoClimaEquipe';
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
import WidgetAIOIQueue from './WidgetAIOIQueue';
import WidgetAIOIRuntime from './WidgetAIOIRuntime';
import WidgetAIOIGovernance from './WidgetAIOIGovernance';
import WidgetAIOIScale from './WidgetAIOIScale';
import LiveDashboardUnifiedPanel from '../components/LiveDashboardUnifiedPanel';
import ModuleErrorBoundary from '../../../components/ModuleErrorBoundary';
import { canAccessLiveDashboardUser, isHrDashboardLayout } from '../../../utils/roleUtils';
import LiveSurfacePanel from './LiveSurfacePanel';
import CentroComandoCommandHeader from './CentroComandoCommandHeader';
import CentroComandoHeroKpis from './CentroComandoHeroKpis';
import { CognitivePulseProvider } from './cognitiveEcosystem/CognitivePulseContext';
import CognitivePresenceShell from './cognitiveEcosystem/CognitivePresenceShell';
import CognitiveEcosystemBand from './cognitiveEcosystem/CognitiveEcosystemBand';
import { CognitiveOmniHeader } from './cognitiveEcosystem/CognitiveOmniPresence';
import AdaptiveOperationalShell from './cognitiveEcosystem/AdaptiveOperationalShell';
import CognitiveLiveTicker from './cognitiveEcosystem/CognitiveLiveTicker';
import { CognitiveOmniRail } from './cognitiveEcosystem/CognitiveOmniPresence';
import StructuralIdentityBanner from './StructuralIdentityBanner';
import './CentroComando.css';

/** Painel lateral cognitivo — IA, alertas, insights (ordem fixa de leitura). */
const SIDEBAR_WIDGET_IDS = ['alertas', 'insights_ia', 'pergunte_ia', 'relatorio_ia'];
const SIDEBAR_WIDGET_SET = new Set(SIDEBAR_WIDGET_IDS);

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
  grafico_clima_equipe: WidgetGraficoClimaEquipe,
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
  receitas: WidgetReceitas,
  aioi_queue:    WidgetAIOIQueue,
  aioi_runtime:  WidgetAIOIRuntime,
  aioi_governance: WidgetAIOIGovernance,
  aioi_scale: WidgetAIOIScale
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
  const [warRoomMode, setWarRoomMode] = useState('normal');
  const [cognitiveExpanded, setCognitiveExpanded] = useState(false);
  const layoutTrackSig = useRef('');

  // DashboardContextAdapter: prefere engine_v2 → personalizado → LayoutPorCargo (fallback).
  // Mantém compatibilidade total com o fluxo anterior.
  const { context: dashboardCtx, raw: dashboardRaw } = useDashboardContext({
    legacyLayoutFn: getLayoutPorCargoFromUser
  });
  const mePayload = dashboardRaw?.me;

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
  const structuralLine = useMemo(() => {
    try {
      const raw = localStorage.getItem('impetus_user');
      const u = raw ? JSON.parse(raw) : {};
      const sp = u.structural_profile;
      if (!sp?.cargo && !sp?.departamento) return null;
      const axis = sp.eixo_primario ? String(sp.eixo_primario).replace('eixo_', '') : '';
      return `Painel para: ${sp.cargo || role}${sp.departamento ? ` · ${sp.departamento}` : ''}${axis ? ` · foco ${axis}` : ''}`;
    } catch {
      return null;
    }
  }, [role]);
  const subtitulo =
    structuralLine || dashboardCtx?.perfil?.subtitulo || `Visão para ${role ? role.replace(/_/g, ' ') : 'colaborador'}`;
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

  const { mainWidgets, sidebarWidgets } = useMemo(() => {
    const main = [];
    const side = [];
    const sideBuckets = Object.fromEntries(SIDEBAR_WIDGET_IDS.map((id) => [id, null]));
    for (const w of widgets) {
      if (SIDEBAR_WIDGET_SET.has(w.id)) {
        sideBuckets[w.id] = w;
      } else {
        main.push(w);
      }
    }
    const orderedSide = SIDEBAR_WIDGET_IDS.map((id) => sideBuckets[id]).filter(Boolean);
    return { mainWidgets: main, sidebarWidgets: orderedSide };
  }, [widgets]);

  const renderWidget = (w) => {
    const Component = getWidgetComponent(w.id);
    if (!Component) return null;
    const span = w.position?.width === 2 ? 2 : 1;
    return (
      <div key={w.id} className="cc__cell cc__cell--alive" style={{ gridColumn: `span ${span}` }}>
        {w.id === 'pergunte_ia' ? (
          <WidgetPergunteIA title={iaWidgetTitle} exampleHints={iaExampleHints} />
        ) : (
          <Component />
        )}
      </div>
    );
  };

  return (
    <Layout>
      <CognitivePulseProvider>
      <CognitivePresenceShell warRoomMode={warRoomMode} onModeChange={setWarRoomMode}>
      <div
        className={`cc cc--premium cc--mode-${warRoomMode} cc--cognitive-alive`}
        data-cognitive-alive="true"
      >
        {showUnifiedLive && (
          <ModuleErrorBoundary moduleName="Painel vivo">
            <LiveDashboardUnifiedPanel variant="exec" />
          </ModuleErrorBoundary>
        )}

        <CentroComandoCommandHeader
          user={user}
          titulo={titulo}
          subtitulo={subtitulo}
          dashboardCtx={dashboardCtx}
          hrDashboard={hrDashboard}
          liveSurfaceActive={!!liveSurface?.blocks?.length}
        />
        <StructuralIdentityBanner
          structuralProfile={mePayload?.structural_profile || user?.structural_profile}
          moduleGovernance={mePayload?.module_access_governance}
        />
        <CognitiveOmniHeader />

        <CentroComandoHeroKpis hrDashboard={hrDashboard} />

        {(smartQuestions.length > 0 || fallbackMessages.length > 0) && (
          <div className="cc__context-panel cc__context-panel--inline">
            {smartQuestions.length > 0 && (
              <p className="cc__context-line">
                <span className="cc__context-tag">IA</span>
                {smartQuestions.slice(0, 3).join(' · ')}
              </p>
            )}
            {fallbackMessages.length > 0 && (
              <p className="cc__context-line cc__context-line--muted">{fallbackMessages[0]}</p>
            )}
          </div>
        )}
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

        <AdaptiveOperationalShell mainWidgets={mainWidgets}>
        <div className="cc__body">
          <div className="cc__main">
            <div className="cc__section-label">
              <span>// CENTRO OPERACIONAL</span>
              <span className="cc__section-meta">
                {mainWidgets.length} módulos · motor {dashboardCtx?.source || 'contextual'}
              </span>
            </div>
            <div className="cc__grid cc__grid--main cc__grid--alive">
              {mainWidgets.map(renderWidget)}
            </div>
          </div>

          {sidebarWidgets.length > 0 && (
            <aside className="cc__rail cc__rail--alive" aria-label="Painel cognitivo IA">
              <div className="cc__section-label cc__section-label--rail">
                <span>// COGNITIVO</span>
                <span className="cc__section-meta">IA · alertas · insights</span>
              </div>
              <CognitiveOmniRail />
              <div className="cc__rail-stack">
                {sidebarWidgets.map(renderWidget)}
              </div>
            </aside>
          )}
        </div>
        </AdaptiveOperationalShell>

        <div className="cc__cognitive-collapsible">
          <button
            type="button"
            className="cc__cognitive-toggle"
            onClick={() => setCognitiveExpanded((v) => !v)}
            aria-expanded={cognitiveExpanded}
          >
            <span className="cc__cognitive-toggle-label">
              {cognitiveExpanded ? '▼' : '▶'} Ecossistema cognitivo vivo
            </span>
            <span className="cc__cognitive-toggle-hint">
              {cognitiveExpanded ? 'recolher camada avançada' : 'expandir radar, timeline e presença organizacional'}
            </span>
          </button>
          {cognitiveExpanded && (
            <ModuleErrorBoundary moduleName="Ecossistema cognitivo">
              <CognitiveEcosystemBand onModeChange={setWarRoomMode} />
            </ModuleErrorBoundary>
          )}
        </div>

        {!hrDashboard && <CognitiveLiveTicker />}
      </div>
      </CognitivePresenceShell>
      </CognitivePulseProvider>
    </Layout>
  );
}

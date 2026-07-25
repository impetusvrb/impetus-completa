/**
 * Centro de Comando Industrial — Prompt v3 completo.
 * Grid 4 colunas; gráficos, indicadores, relatórios, diagramas; tudo IA onde aplicável.
 * Suporta layout personalizado por perfil (API /dashboard/personalizado) ou fallback por cargo.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Layout from '../../../components/Layout';
import { dashboard } from '../../../services/api';
import { useDashboardBoot } from '../../../runtimeBoot/DashboardBootContext';
import { getLayoutPorCargoFromUser } from './LayoutPorCargo';
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
import CognitiveCollapsibleSection from './cognitiveEcosystem/CognitiveCollapsibleSection';
import CognitiveMobileStripSlot from './cognitiveEcosystem/CognitiveMobileStripSlot';
import CognitiveDesktopStripSlot from './cognitiveEcosystem/CognitiveDesktopStripSlot';
import CognitiveOmniPresence from './cognitiveEcosystem/CognitiveOmniPresence';
import useViewportTier from './cognitiveEcosystem/useViewportTier';
import { CognitiveOmniHeader } from './cognitiveEcosystem/CognitiveOmniPresence';
import AdaptiveOperationalShell from './cognitiveEcosystem/AdaptiveOperationalShell';
import CognitiveLiveTicker from './cognitiveEcosystem/CognitiveLiveTicker';
import { CognitiveOmniRail } from './cognitiveEcosystem/CognitiveOmniPresence';
import StructuralIdentityBanner from './StructuralIdentityBanner';
import QualityNativeCockpitPromotion from './QualityNativeCockpitPromotion';
import LogisticsNativeCockpitPromotion from './LogisticsNativeCockpitPromotion';
import PpapNativeCockpitPromotion from './PpapNativeCockpitPromotion';
import MsaNativeCockpitPromotion from './MsaNativeCockpitPromotion';
import IshikawaNativeCockpitPromotion from './IshikawaNativeCockpitPromotion';
import WmsOperationalCcExposure from './WmsOperationalCcExposure';
import SupplyNativeCockpitPromotion from './SupplyNativeCockpitPromotion';
import {
  resolveSpecializedCockpitRuntime,
  resolveLogisticsCockpitRuntime,
  resolvePpapCockpitRuntime,
  resolveMsaCockpitRuntime,
  resolveIshikawaCockpitRuntime,
  resolveSupplyCockpitRuntime
} from '../../../cognitiveRuntime/cockpit/specializedCockpitResolver.js';
import {
  QUALITY_PLACEHOLDER_WIDGET_IDS,
  shouldSuppressPlaceholderWidgets
} from '../../../cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js';
import {
  LOGISTICS_PLACEHOLDER_WIDGET_IDS,
  shouldSuppressLogisticsPlaceholderWidgets
} from '../../../cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js';
import {
  PPAP_PLACEHOLDER_WIDGET_IDS,
  shouldSuppressPpapPlaceholderWidgets
} from '../../../cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js';
import {
  MSA_PLACEHOLDER_WIDGET_IDS,
  shouldSuppressMsaPlaceholderWidgets
} from '../../../cognitiveRuntime/cockpit/msaNativeCockpitRegistry.js';
import {
  ISHIKAWA_PLACEHOLDER_WIDGET_IDS,
  shouldSuppressIshikawaPlaceholderWidgets
} from '../../../cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js';
import { shouldSuppressSupplyPlaceholderWidgets } from '../../../cognitiveRuntime/cockpit/supplyNativeCockpitRegistry.js';
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
  const [continuityRefreshMount, setContinuityRefreshMount] = useState(null);
  const layoutTrackSig = useRef('');
  const viewportTier = useViewportTier();

  // DashboardContextAdapter: prefere engine_v2 → personalizado → LayoutPorCargo (fallback).
  // Mantém compatibilidade total com o fluxo anterior.
  const { context: dashboardCtx, raw: dashboardRaw } = useDashboardContext({
    legacyLayoutFn: getLayoutPorCargoFromUser
  });
  const mePayload = dashboardRaw?.me;
  const { phase: bootPhase } = useDashboardBoot();

  useEffect(() => {
    if (bootPhase < 2) return undefined;
    let cancelled = false;

    const loadSurface = () => {
      dashboard.getLiveSurface()
        .then((r) => {
          if (cancelled) return;
          if (r?.data?.ok && r?.data?.surface) setLiveSurface(r.data.surface);
        })
        .catch(() => {
          // INC-004: manter last-known-good; erros de rede não devem apagar o painel.
        });
    };

    loadSurface();
    // Refresh REST periódico (ex-SSE). O endpoint /live-surface/stream requer
    // token em querystring, incompatível com o hardening enterprise em vigor
    // (IMPETUS_ALLOW_TOKEN_IN_QUERY=false). O polling REST usa Authorization
    // Bearer via interceptor e cobre o mesmo caso de uso.
    const id = setInterval(loadSurface, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bootPhase]);

  const widgets = useMemo(() => (Array.isArray(dashboardCtx?.widgets) ? dashboardCtx.widgets : []), [dashboardCtx]);

  const qualityNativeCockpit = useMemo(
    () => resolveSpecializedCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const logisticsNativeCockpit = useMemo(
    () => resolveLogisticsCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const ppapNativeCockpit = useMemo(
    () => resolvePpapCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const msaNativeCockpit = useMemo(
    () => resolveMsaCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const ishikawaNativeCockpit = useMemo(
    () => resolveIshikawaCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const supplyNativeCockpit = useMemo(
    () => resolveSupplyCockpitRuntime(mePayload || {}),
    [mePayload]
  );
  const qualityNativeActive = shouldSuppressPlaceholderWidgets(qualityNativeCockpit?.runtime);
  const logisticsNativeActive = shouldSuppressLogisticsPlaceholderWidgets(logisticsNativeCockpit?.runtime);
  const ppapNativeActive = shouldSuppressPpapPlaceholderWidgets(ppapNativeCockpit?.runtime);
  const msaNativeActive = shouldSuppressMsaPlaceholderWidgets(msaNativeCockpit?.runtime);
  const ishikawaNativeActive = shouldSuppressIshikawaPlaceholderWidgets(ishikawaNativeCockpit?.runtime);
  const supplyNativeActive = shouldSuppressSupplyPlaceholderWidgets(supplyNativeCockpit?.runtime);
  const qualityPlaceholderSet = useMemo(() => new Set(QUALITY_PLACEHOLDER_WIDGET_IDS), []);
  const logisticsPlaceholderSet = useMemo(() => new Set(LOGISTICS_PLACEHOLDER_WIDGET_IDS), []);
  const ppapPlaceholderSet = useMemo(() => new Set(PPAP_PLACEHOLDER_WIDGET_IDS), []);
  const msaPlaceholderSet = useMemo(() => new Set(MSA_PLACEHOLDER_WIDGET_IDS), []);
  const ishikawaPlaceholderSet = useMemo(() => new Set(ISHIKAWA_PLACEHOLDER_WIDGET_IDS), []);

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
  const execContinuityLayout = viewportTier.isDesktop && showUnifiedLive;

  const { mainWidgets, sidebarWidgets } = useMemo(() => {
    const main = [];
    const side = [];
    const sideBuckets = Object.fromEntries(SIDEBAR_WIDGET_IDS.map((id) => [id, null]));
    for (const w of widgets) {
      if (qualityNativeActive && qualityPlaceholderSet.has(w.id)) continue;
      if (logisticsNativeActive && logisticsPlaceholderSet.has(w.id)) continue;
      if (ppapNativeActive && ppapPlaceholderSet.has(w.id)) continue;
      if (msaNativeActive && msaPlaceholderSet.has(w.id)) continue;
      if (ishikawaNativeActive && ishikawaPlaceholderSet.has(w.id)) continue;
      if (w.collapsed_generic === true || w.visible === false) continue;
      if (SIDEBAR_WIDGET_SET.has(w.id)) {
        sideBuckets[w.id] = w;
      } else {
        main.push(w);
      }
    }
    const orderedSide = SIDEBAR_WIDGET_IDS.map((id) => sideBuckets[id]).filter(Boolean);
    return { mainWidgets: main, sidebarWidgets: orderedSide };
  }, [widgets, qualityNativeActive, qualityPlaceholderSet, logisticsNativeActive, logisticsPlaceholderSet, ppapNativeActive, ppapPlaceholderSet, msaNativeActive, msaPlaceholderSet, ishikawaNativeActive, ishikawaPlaceholderSet]);

  const renderWidget = (w) => {
    const Component = getWidgetComponent(w.id);
    if (!Component) return null;
    const span = w.position?.width === 2 ? 2 : 1;
    return (
      <div key={w.id} className="cc__cell cc__cell--alive" data-whisper-focus-surface style={{ gridColumn: `span ${span}` }}>
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
      <CognitivePresenceShell
        warRoomMode={warRoomMode}
        onModeChange={setWarRoomMode}
        suppressOmniPresence
      >
      <div
        className={`cc cc--premium cc--mode-${warRoomMode} cc--cognitive-alive`}
        data-cognitive-alive="true"
      >
        {/* INC-012/013R: core no topo; omni como sibling independente (normal flow) */}
        <div className="cc-top-cognitive-presence" aria-label="Presença cognitiva IMPETUS">
          <CognitiveMobileStripSlot />
          <CognitiveDesktopStripSlot />
        </div>

        {/* INC-015: continuidade horizontal desktop (omni + mensagem + Atualizar) */}
        {execContinuityLayout ? (
          <div className="cc-cognitive-continuity-row">
            <CognitiveOmniPresence scrollPersistence />
            <div ref={setContinuityRefreshMount} className="cc-cognitive-continuity-action" />
          </div>
        ) : (
          <CognitiveOmniPresence scrollPersistence={false} />
        )}

        {showUnifiedLive && (
          <ModuleErrorBoundary moduleName="Painel vivo">
            <LiveDashboardUnifiedPanel
              variant="exec"
              execContinuityLayout={execContinuityLayout}
              refreshMountEl={continuityRefreshMount}
            />
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
                {qualityNativeActive
                  ? `quality_native · ${qualityNativeCockpit?.centers?.length ?? 0} centers`
                  : logisticsNativeActive
                    ? `logistics_native · ${logisticsNativeCockpit?.centers?.length ?? 0} centers`
                    : ppapNativeActive
                      ? `ppap_native · ${ppapNativeCockpit?.centers?.length ?? 0} centers`
                      : msaNativeActive
                        ? `msa_native · ${msaNativeCockpit?.centers?.length ?? 0} centers`
                        : ishikawaNativeActive
                          ? `ishikawa_native · ${ishikawaNativeCockpit?.centers?.length ?? 0} centers`
                          : supplyNativeActive
                            ? `supply_native · ${supplyNativeCockpit?.centers?.length ?? 0} centers`
                            : `${mainWidgets.length} módulos · motor ${dashboardCtx?.source || 'contextual'}`}
              </span>
            </div>
            <div className="cc__grid cc__grid--main cc__grid--alive">
              {qualityNativeActive ? (
                <ModuleErrorBoundary moduleName="Qualidade Z.23">
                  <QualityNativeCockpitPromotion
                    centers={qualityNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={qualityNativeCockpit?.runtime}
                  />
                </ModuleErrorBoundary>
              ) : null}
              {logisticsNativeActive ? (
                <ModuleErrorBoundary moduleName="Logística Z.23">
                  <LogisticsNativeCockpitPromotion
                    centers={logisticsNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={logisticsNativeCockpit?.runtime}
                    signalLoader={mePayload?.logistics_signal_loader}
                  />
                </ModuleErrorBoundary>
              ) : null}
              <WmsOperationalCcExposure />
              {ppapNativeActive ? (
                <ModuleErrorBoundary moduleName="PPAP Z.23">
                  <PpapNativeCockpitPromotion
                    centers={ppapNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={ppapNativeCockpit?.runtime}
                    signalLoader={mePayload?.ppap_signal_loader}
                  />
                </ModuleErrorBoundary>
              ) : null}
              {msaNativeActive ? (
                <ModuleErrorBoundary moduleName="MSA Z.23">
                  <MsaNativeCockpitPromotion
                    centers={msaNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={msaNativeCockpit?.runtime}
                    signalLoader={mePayload?.msa_signal_loader}
                  />
                </ModuleErrorBoundary>
              ) : null}
              {ishikawaNativeActive ? (
                <ModuleErrorBoundary moduleName="Ishikawa Z.23">
                  <IshikawaNativeCockpitPromotion
                    centers={ishikawaNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={ishikawaNativeCockpit?.runtime}
                    signalLoader={mePayload?.ishikawa_signal_loader}
                  />
                </ModuleErrorBoundary>
              ) : null}
              {supplyNativeActive ? (
                <ModuleErrorBoundary moduleName="Supply Z.23">
                  <SupplyNativeCockpitPromotion
                    centers={supplyNativeCockpit?.centers || []}
                    runtime={supplyNativeCockpit?.runtime}
                    signalLoader={mePayload?.supply_signal_loader}
                  />
                </ModuleErrorBoundary>
              ) : null}
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

        <CognitiveCollapsibleSection onModeChange={setWarRoomMode} />

        {!hrDashboard && <CognitiveLiveTicker />}
      </div>
      </CognitivePresenceShell>
      </CognitivePulseProvider>
    </Layout>
  );
}

/**
 * useDashboardContext — hook React que entrega o contexto canónico de
 * dashboard ao componente, aplicando o `dashboardContextAdapter`.
 *
 * Estratégia de fetch:
 *   1. `/dashboard/me`         → captura `engine_v2` (Phase 2) se presente
 *   2. `/dashboard/personalizado` → fallback Motor B legado
 *   3. `getLayoutPorCargo`     → fallback Motor A no frontend
 *
 * Retorno (estável entre renders):
 *   { context, loading, error, refetch }
 *
 * NOTAS:
 *   - Não modifica o LayoutPorCargo. O legado é injectado por parâmetro.
 *   - Não substitui `useVisibleModules` — apenas o conteúdo do dashboard
 *     contextual.
 *   - Telemetria: emite evento `dashboard.trackInteraction` com a `source`
 *     escolhida (engine_v2 / personalizado_api / layout_fallback) para
 *     alimentar a Divergence Intelligence.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dashboard } from '../../../services/api';
import { fetchDashboardMeShared } from '../../../runtimeBoot/dashboardMeSharedStore';
import { useDashboardBoot } from '../../../runtimeBoot/DashboardBootContext';
import { buildDashboardContext, SOURCE } from './dashboardContextAdapter';
import { enrichContextWithAdaptiveOrchestration } from '../../../cognitiveRuntime/adaptive/adaptiveOrchestrationRuntime';
import { enrichContextWithGovernanceLearning } from '../../../cognitiveRuntime/learning/governanceLearningRuntime';

function _readUserFromStorage() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_user') : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * @param {{ legacyLayoutFn?: Function }} [options]
 *   - legacyLayoutFn: função de fallback (Motor A). Tipicamente
 *     `getLayoutPorCargo` de `LayoutPorCargo.js`. Se omitido, o fallback
 *     final é vazio (empty-state).
 */
export default function useDashboardContext(options) {
  const legacyLayoutFn = options && options.legacyLayoutFn;
  const { phase } = useDashboardBoot();
  const [meData, setMeData] = useState(null);
  const [personalizadoData, setPersonalizadoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastSourceRef = useRef(null);
  const meLoadedRef = useRef(false);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetchDashboardMeShared();
      const me = r?.data || null;
      setMeData(me);
      return me;
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('[useDashboardContext] /dashboard/me falhou:', err?.message || err);
      return null;
    }
  }, []);

  const fetchPersonalizado = useCallback(async () => {
    try {
      const r2 = await dashboard.getPersonalizado();
      const perso = r2?.data?.ok ? r2.data : null;
      setPersonalizadoData(perso);
      return perso;
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('[useDashboardContext] /dashboard/personalizado falhou:', err?.message || err);
      return null;
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const me = await fetchMe();
    const perso = phase >= 2 ? await fetchPersonalizado() : null;
    setLoading(false);
    if (!me && !perso) setError(new Error('No dashboard data available'));
  }, [fetchMe, fetchPersonalizado, phase]);

  useEffect(() => {
    if (meLoadedRef.current) return undefined;
    meLoadedRef.current = true;
    let alive = true;
    (async () => {
      setLoading(true);
      const me = await fetchMe();
      if (!alive) return;
      if (!me) setError(new Error('No dashboard data available'));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fetchMe]);

  useEffect(() => {
    if (phase < 2) return undefined;
    let alive = true;
    (async () => {
      await fetchPersonalizado();
      if (!alive) return;
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [phase, fetchPersonalizado]);

  // useMemo garante estabilidade referencial: buildDashboardContext só é
  // recalculado quando meData / personalizadoData mudam (ambos são state),
  // evitando que o useEffect de telemetria dispare em todo render.
  const context = useMemo(() => {
    const user = _readUserFromStorage();
    const structuralComplete =
      meData?.module_access_governance?.structural_complete === true ||
      meData?.structural_profile?.structural_complete === true;

    const ctx = enrichContextWithAdaptiveOrchestration(
      buildDashboardContext({
      executiveCognitiveRuntime: meData?.executive_cognitive_runtime || null,
      executiveCenters: meData?.executive_cognitive_centers || null,
      executiveDecisionSupport: meData?.executive_decision_support || null,
      environmentalCognitiveRuntime: meData?.environmental_cognitive_runtime || null,
      environmentalCenters: meData?.environmental_cognitive_centers || null,
      environmentalDecisionSupport: meData?.environmental_decision_support || null,
      maintenanceCognitiveRuntime: meData?.maintenance_cognitive_runtime || null,
      maintenanceCenters: meData?.maintenance_cognitive_centers || null,
      maintenanceDecisionSupport: meData?.maintenance_decision_support || null,
      productionCognitiveRuntime: meData?.production_cognitive_runtime || null,
      productionCenters: meData?.production_cognitive_centers || null,
      productionDecisionSupport: meData?.production_decision_support || null,
      hrCognitiveRuntime: meData?.hr_cognitive_runtime || null,
      hrCenters: meData?.hr_cognitive_centers || null,
      sstCognitiveRuntime: meData?.sst_cognitive_runtime || null,
      safetyCenters: meData?.safety_cognitive_centers || null,
      specializedCockpitRuntime: meData?.specialized_cockpit_runtime || null,
      qualityCenters: meData?.quality_cognitive_centers || null,
      decisionSupport:
        meData?.executive_decision_support ||
        meData?.environmental_decision_support ||
        meData?.maintenance_decision_support ||
        meData?.production_decision_support ||
        meData?.hr_decision_support ||
        meData?.safety_decision_support ||
        meData?.quality_decision_support ||
        null,
      multiDomainFoundation: meData?.multi_domain_foundation || null,
      cognitiveBlocks: meData?.cognitive_blocks || null,
      cognitiveRenderPromotion: meData?.cognitive_render_promotion || null,
      widgetsPromoted: meData?.widgets_promoted || null,
      engineV2: meData?.engine_v2 || null,
      personalizado: personalizadoData,
      legacyLayoutFn: legacyLayoutFn || null,
      structuralComplete,
      user: {
        ...user,
        structural_profile: meData?.structural_profile || user.structural_profile
      }
    }),
      meData
    );
    return enrichContextWithGovernanceLearning(ctx, meData);
  // legacyLayoutFn é uma função estática (getLayoutPorCargo), não precisa entrar
  // nos deps do memo — mas meData e personalizadoData sim, pois são state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meData, personalizadoData]);

  // Telemetria: regista a fonte escolhida apenas quando muda (evita loop).
  useEffect(() => {
    if (loading) return;
    const sig = `${context.source}|${context.engine || ''}|${context.widgets.length}`;
    if (lastSourceRef.current === sig) return;
    lastSourceRef.current = sig;
    try {
      dashboard.trackInteraction(
        'dashboard_context_resolved',
        'dashboard_context',
        context.source,
        {
          engine: context.engine,
          trace_id: context.trace_id,
          widget_count: context.widgets.length,
          is_contextual: context.is_contextual,
          source: context.source
        }
      ).catch(() => { /* silent */ });
    } catch { /* silent */ }
  }, [loading, context]);

  return {
    context,
    loading,
    error,
    refetch: fetchAll,
    raw: { me: meData, personalizado: personalizadoData }
  };
}

export { SOURCE };

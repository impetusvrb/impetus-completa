/**
 * DashboardContextAdapter — Phase 3
 *
 * Adapta as três fontes possíveis de dashboard num único contexto canónico
 * que a UI consome, sem precisar saber qual motor o gerou.
 *
 * Ordem de prioridade (mais inteligente primeiro):
 *   1. engine_v2.payload                (Motor B; vem de /dashboard/me)
 *   2. personalizado.layout             (Motor B legado; vem de /dashboard/personalizado)
 *   3. getLayoutPorCargo(role, area)    (Motor A; fallback interno)
 *
 * IMPORTANTE — princípios:
 *   - PURO: sem hooks, sem efeitos colaterais. Hook React vive em
 *     `useDashboardContext.js`.
 *   - ADITIVO: nenhum dos modos legados é removido. Esta camada
 *     prefere o mais contextual quando disponível.
 *   - DECLARATIVO: a saída é sempre `{ widgets, perfil, assistente_ia,
 *     explainability, source }`. A UI nunca olha para `role` outra vez.
 *   - OBSERVÁVEL: cada decisão expõe `source`, `engine`, `trace_id` para
 *     telemetria.
 */

const SOURCE = Object.freeze({
  ENGINE_V2: 'engine_v2',
  PERSONALIZADO: 'personalizado_api',
  LAYOUT_FALLBACK: 'layout_fallback',
  EMPTY: 'empty'
});

function _coerceWidget(w, idx) {
  if (!w) return null;
  const id = w.id || w.widget_id || w.key;
  if (!id) return null;
  const position = w.position
    ? {
        row: Number.isFinite(w.position.row) ? w.position.row : Math.floor(idx / 4),
        col: Number.isFinite(w.position.col) ? w.position.col : idx % 4,
        width: Number.isFinite(w.position.width) ? w.position.width : 1
      }
    : { row: Math.floor(idx / 2), col: (idx % 2) * 2, width: 2 };
  return {
    id,
    label: w.label || w.title || id,
    position,
    axes: Array.isArray(w.axes) ? w.axes.slice() : [],
    score: typeof w.score === 'number' ? w.score : null,
    rationale: w.rationale || (w.v2 && w.v2.rationale) || null,
    category: w.category || (w.v2 && w.v2.category) || null,
    capabilities_required: Array.isArray(w.capabilities_required) ? w.capabilities_required.slice() : [],
    raw: w
  };
}

/**
 * @typedef {Object} DashboardContext
 * @property {string} source                   `engine_v2`|`personalizado_api`|`layout_fallback`|`empty`
 * @property {'A'|'B'|'A_with_B_shadow'|'B_with_A_shadow'|null} engine
 * @property {string|null} trace_id
 * @property {Array<{id:string,label:string,position:object,axes:string[]}>} widgets
 * @property {Object} perfil                   { titulo, subtitulo }
 * @property {Object} assistente_ia            { especialidade, exemplos_perguntas, mensagens_fallback, alertas_contextuais }
 * @property {Object|null} identity            ContextualIdentity (se disponível)
 * @property {Object|null} explainability      explanation completa (se disponível)
 * @property {boolean} is_contextual           true só quando origem é Motor B
 */

/**
 * @param {Object} args
 * @param {Object|null} args.engineV2          payload `engine_v2` recebido de /dashboard/me (Phase 2)
 * @param {Object|null} args.personalizado     payload de /dashboard/personalizado
 * @param {Function|null} args.legacyLayoutFn  função de fallback compatível com `getLayoutPorCargo`
 * @param {{ role?:string, functional_area?:string, area?:string, dashboard_profile?:string }} args.user
 * @returns {DashboardContext}
 */
function buildDashboardContext(args) {
  const engineV2 = args && args.engineV2;
  const personalizado = args && args.personalizado;
  const legacyLayoutFn = args && args.legacyLayoutFn;
  const user = (args && args.user) || {};

  // 1. Engine V2 (preferido)
  if (engineV2 && engineV2.payload && Array.isArray(engineV2.payload.layout?.widgets)) {
    const p = engineV2.payload;
    const widgets = p.layout.widgets.map(_coerceWidget).filter(Boolean);
    if (widgets.length > 0) {
      return {
        source: SOURCE.ENGINE_V2,
        engine: engineV2.engine || 'B',
        trace_id: engineV2.trace_id || null,
        widgets,
        perfil: {
          titulo: p.perfil?.titulo_dashboard || 'Centro de Comando',
          subtitulo: p.perfil?.subtitulo || ''
        },
        assistente_ia: {
          especialidade: p.assistente_ia?.especialidade || null,
          exemplos_perguntas: Array.isArray(p.assistente_ia?.exemplos_perguntas) ? p.assistente_ia.exemplos_perguntas : [],
          alertas_contextuais: Array.isArray(p.assistente_ia?.alertas_contextuais) ? p.assistente_ia.alertas_contextuais : [],
          mensagens_fallback: Array.isArray(p.assistente_ia?.mensagens_fallback) ? p.assistente_ia.mensagens_fallback : []
        },
        identity: p.identity || null,
        explainability: p.explainability || null,
        diff_summary: engineV2.diff_summary || null,
        is_contextual: true
      };
    }
  }

  // 2. /dashboard/personalizado (Motor B legado, sem explainability)
  if (personalizado && Array.isArray(personalizado.layout) && personalizado.layout.length > 0) {
    const widgets = personalizado.layout.map(_coerceWidget).filter(Boolean);
    if (widgets.length > 0) {
      return {
        source: SOURCE.PERSONALIZADO,
        engine: 'B',
        trace_id: null,
        widgets,
        perfil: {
          titulo: personalizado.perfil?.titulo_dashboard || 'Centro de Comando',
          subtitulo: personalizado.perfil?.subtitulo || ''
        },
        assistente_ia: {
          especialidade: personalizado.assistente_ia?.especialidade || null,
          exemplos_perguntas: Array.isArray(personalizado.assistente_ia?.exemplos_perguntas)
            ? personalizado.assistente_ia.exemplos_perguntas
            : [],
          alertas_contextuais: Array.isArray(personalizado.assistente_ia?.alertas_contextuais)
            ? personalizado.assistente_ia.alertas_contextuais
            : [],
          mensagens_fallback: Array.isArray(personalizado.assistente_ia?.mensagens_fallback)
            ? personalizado.assistente_ia.mensagens_fallback
            : []
        },
        identity: null,
        explainability: null,
        diff_summary: null,
        is_contextual: true
      };
    }
  }

  // 3. Fallback: getLayoutPorCargo (Motor A, frontend)
  if (typeof legacyLayoutFn === 'function') {
    try {
      const role = user.role || '';
      const dept = user.functional_area || user.area || '';
      const dp = user.dashboard_profile || '';
      const layout = legacyLayoutFn(role, dept, dp, user.job_title || user.cargo || '');
      if (Array.isArray(layout) && layout.length > 0) {
        const widgets = layout.map(_coerceWidget).filter(Boolean);
        return {
          source: SOURCE.LAYOUT_FALLBACK,
          engine: 'A',
          trace_id: null,
          widgets,
          perfil: {
            titulo: 'Centro de Comando Industrial',
            subtitulo: `Visão para ${role ? role.replace(/_/g, ' ') : 'colaborador'}`
          },
          assistente_ia: {
            especialidade: null,
            exemplos_perguntas: [],
            alertas_contextuais: [],
            mensagens_fallback: []
          },
          identity: null,
          explainability: null,
          diff_summary: null,
          is_contextual: false
        };
      }
    } catch (_) { /* swallow */ }
  }

  // 4. Vazio (UI deve mostrar empty-state, sem crashar)
  return {
    source: SOURCE.EMPTY,
    engine: null,
    trace_id: null,
    widgets: [],
    perfil: { titulo: 'Centro de Comando', subtitulo: '' },
    assistente_ia: { especialidade: null, exemplos_perguntas: [], alertas_contextuais: [], mensagens_fallback: [] },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: false
  };
}

export { SOURCE, buildDashboardContext };
export default buildDashboardContext;

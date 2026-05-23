/**
 * DashboardContextAdapter — Phase 3
 *
 * Adapta as três fontes possíveis de dashboard num único contexto canónico
 * que a UI consome, sem precisar saber qual motor o gerou.
 *
 * Ordem de prioridade:
 *   Com Base Estrutural completa (cargo + dept + setor):
 *     1. personalizado.layout           (perfil do utilizador)
 *     2. engine_v2.payload
 *     3. getLayoutPorCargo
 *     4. cognitive_render_promotion (só se nada acima)
 *   Sem estrutura completa:
 *     1. cognitive_render_promotion (Z.22)
 *     2. engine_v2
 *     3. personalizado
 *     4. layout fallback
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
  SPECIALIZED_COCKPIT: 'specialized_cockpit_runtime',
  MULTI_DOMAIN_FOUNDATION: 'multi_domain_foundation',
  COGNITIVE_RENDER_PROMOTION: 'cognitive_render_promotion',
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
 * @param {Object|null} args.cognitiveRenderPromotion  Z.22 `cognitive_render_promotion` de /dashboard/me
 * @param {Object|null} args.engineV2          payload `engine_v2` recebido de /dashboard/me (Phase 2)
 * @param {Object|null} args.personalizado     payload de /dashboard/personalizado
 * @param {Function|null} args.legacyLayoutFn  função de fallback compatível com `getLayoutPorCargo`
 * @param {{ role?:string, functional_area?:string, area?:string, dashboard_profile?:string }} args.user
 * @returns {DashboardContext}
 */
function _buildFromPersonalizado(personalizado) {
  if (!personalizado || !Array.isArray(personalizado.layout) || personalizado.layout.length === 0) {
    return null;
  }
  const widgets = personalizado.layout.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;
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

/**
 * Z.27 — Executive Strategic Boardroom consolidado.
 */
function _buildFromExecutiveCockpit(
  executiveCognitiveRuntime,
  widgetsPromoted,
  executiveCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    executiveCognitiveRuntime?.consolidation_applied !== true ||
    executiveCognitiveRuntime?.cockpit_mode !== 'executive_boardroom' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(executiveCenters) && executiveCenters.length) {
    const bySlot = new Map();
    for (const c of executiveCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions =
    decisionSupport?.contextual_questions ||
    executiveCognitiveRuntime?.executive_contextual_questions ||
    [];

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: executiveCognitiveRuntime?.phase || 'Z.27',
    widgets,
    perfil: {
      titulo: 'Executive Strategic Boardroom',
      subtitulo: `Boardroom cognitivo · agregação ${executiveCognitiveRuntime.aggregation_readiness || '—'}`
    },
    assistente_ia: {
      especialidade: 'executive_strategic',
      exemplos_perguntas: Array.isArray(questions) ? questions : [],
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    executive_cognitive_runtime: executiveCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: executiveCognitiveRuntime.executive_cognitive_health || null
  };
}

/**
 * P1 — cockpit environmental-native consolidado.
 */
function _buildFromEnvironmentalCockpit(
  environmentalCognitiveRuntime,
  widgetsPromoted,
  environmentalCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    environmentalCognitiveRuntime?.consolidation_applied !== true ||
    environmentalCognitiveRuntime?.cockpit_mode !== 'environmental_native' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(environmentalCenters) && environmentalCenters.length) {
    const bySlot = new Map();
    for (const c of environmentalCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions =
    decisionSupport?.contextual_questions ||
    environmentalCognitiveRuntime?.environmental_contextual_questions ||
    [];

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: environmentalCognitiveRuntime?.phase || 'P1-ENV',
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Meio Ambiente',
      subtitulo: `Cockpit environmental-native · compliance ${environmentalCognitiveRuntime.telemetry_readiness || '—'}`
    },
    assistente_ia: {
      especialidade: 'ambiental_regulatorio',
      exemplos_perguntas: Array.isArray(questions) ? questions : [],
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    environmental_cognitive_runtime: environmentalCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: environmentalCognitiveRuntime.environmental_cognitive_health || null
  };
}

/**
 * Z.M1 — cockpit maintenance-native (reliability & machine cognition).
 */
function _buildFromMaintenanceCockpit(
  maintenanceCognitiveRuntime,
  widgetsPromoted,
  maintenanceCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    maintenanceCognitiveRuntime?.consolidation_applied !== true ||
    maintenanceCognitiveRuntime?.cockpit_mode !== 'maintenance_native' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(maintenanceCenters) && maintenanceCenters.length) {
    const bySlot = new Map();
    for (const c of maintenanceCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions =
    maintenanceCognitiveRuntime?.maintenance_contextual_questions ||
    decisionSupport?.recommendations ||
    [];

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: maintenanceCognitiveRuntime?.phase || 'Z.M1',
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Confiabilidade & Manutenção',
      subtitulo: `Cockpit maintenance-native · telemetria ${maintenanceCognitiveRuntime.telemetry_readiness || '—'}`
    },
    assistente_ia: {
      especialidade: 'manutencao_confiabilidade',
      exemplos_perguntas: Array.isArray(questions) ? questions.map((q) => q.q || q) : [],
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    maintenance_cognitive_runtime: maintenanceCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: maintenanceCognitiveRuntime.maintenance_cognitive_health || null
  };
}

/**
 * Z.P0 — cockpit production-native consolidado.
 */
function _buildFromProductionCockpit(
  productionCognitiveRuntime,
  widgetsPromoted,
  productionCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    productionCognitiveRuntime?.consolidation_applied !== true ||
    productionCognitiveRuntime?.cockpit_mode !== 'production_native' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(productionCenters) && productionCenters.length) {
    const bySlot = new Map();
    for (const c of productionCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions =
    decisionSupport?.contextual_questions ||
    productionCognitiveRuntime?.production_contextual_questions ||
    [];
  const health = productionCognitiveRuntime.production_cognitive_health || null;

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: productionCognitiveRuntime?.phase || 'Z.P0',
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Produção Industrial',
      subtitulo: `Cockpit production-native · telemetria ${productionCognitiveRuntime.telemetry_readiness || '—'}`
    },
    assistente_ia: {
      especialidade: 'producao_operacional',
      exemplos_perguntas: Array.isArray(questions) ? questions : [],
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    production_cognitive_runtime: productionCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: health
  };
}

/**
 * Z.26 — cockpit RH people-native consolidado.
 */
function _buildFromHrCockpit(
  hrCognitiveRuntime,
  widgetsPromoted,
  hrCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    hrCognitiveRuntime?.consolidation_applied !== true ||
    hrCognitiveRuntime?.cockpit_mode !== 'hr_native' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(hrCenters) && hrCenters.length) {
    const bySlot = new Map();
    for (const c of hrCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions = (decisionSupport?.questions || []).map((q) => q.text).filter(Boolean);
  const health = hrCognitiveRuntime.hr_cognitive_health || null;
  const specRatio = hrCognitiveRuntime.specialization_ratio ?? 0;

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: hrCognitiveRuntime?.phase || 'Z.26',
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Recursos Humanos',
      subtitulo: `Cockpit people-native · especialização ${Math.round(specRatio * 100)}%`
    },
    assistente_ia: {
      especialidade: 'recursos_humanos_operacional',
      exemplos_perguntas: questions,
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    hr_cognitive_runtime: hrCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: health
  };
}

/**
 * Z.25 — cockpit safety-native consolidado.
 */
function _buildFromSafetyCockpit(
  sstCognitiveRuntime,
  widgetsPromoted,
  safetyCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    sstCognitiveRuntime?.consolidation_applied !== true ||
    sstCognitiveRuntime?.cockpit_mode !== 'safety_native' ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(safetyCenters) && safetyCenters.length) {
    const bySlot = new Map();
    for (const c of safetyCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const questions = (decisionSupport?.questions || []).map((q) => q.text).filter(Boolean);
  const health = sstCognitiveRuntime.safety_cognitive_health || null;
  const specRatio = sstCognitiveRuntime.specialization_ratio ?? 0;

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: sstCognitiveRuntime?.phase || 'Z.25',
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Segurança do Trabalho',
      subtitulo: `Cockpit safety-native · especialização ${Math.round(specRatio * 100)}%`
    },
    assistente_ia: {
      especialidade: 'seguranca_operacional',
      exemplos_perguntas: questions,
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    sst_cognitive_runtime: sstCognitiveRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: health
  };
}

/**
 * Z.23 + Z.24 — cockpit quality-native consolidado com metadata multi-domínio.
 */
function _buildFromSpecializedCockpit(
  specializedCockpitRuntime,
  widgetsPromoted,
  qualityCenters,
  decisionSupport,
  multiDomainFoundation,
  cognitiveBlocks
) {
  if (
    specializedCockpitRuntime?.consolidation_applied !== true ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }

  let widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;

  if (Array.isArray(qualityCenters) && qualityCenters.length) {
    const bySlot = new Map();
    for (const c of qualityCenters) {
      if (c.render_slot) bySlot.set(c.render_slot, c);
    }
    widgets = widgets.map((w) => {
      const center = bySlot.get(w.id);
      if (!center) return w;
      return {
        ...w,
        raw: {
          ...(w.raw || {}),
          cognitive_center_id: center.center_id,
          cognitive_center_metrics: center.metrics,
          cognitive_center_summary: center.summary,
          cognitive_layer: center.layer
        }
      };
    });
  }

  const blockHints = (cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [])
    .slice(0, 4)
    .map((b) => b.label || b.block_id)
    .filter(Boolean);

  const questions = (decisionSupport?.questions || []).map((q) => q.text).filter(Boolean);

  const domainLabel = multiDomainFoundation?.domain_label || 'Qualidade';
  const specRatio = specializedCockpitRuntime.specialized_ratio ?? 0;
  const health = specializedCockpitRuntime.cognitive_health || multiDomainFoundation?.multi_domain_cognitive_health;

  return {
    source: SOURCE.SPECIALIZED_COCKPIT,
    engine: 'B',
    trace_id: multiDomainFoundation?.phase || specializedCockpitRuntime?.phase || 'Z.23',
    widgets,
    perfil: {
      titulo: `Centro de Comando — ${domainLabel}`,
      subtitulo: `Cockpit cognitivo nativo · especialização ${Math.round(specRatio * 100)}% · orquestração Z.24`
    },
    assistente_ia: {
      especialidade: 'qualidade_operacional',
      exemplos_perguntas: questions.length ? questions : blockHints,
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    specialized_cockpit_runtime: specializedCockpitRuntime,
    multi_domain_foundation: multiDomainFoundation?.foundation_active ? multiDomainFoundation : null,
    cognitive_blocks: cognitiveBlocks || multiDomainFoundation?.cognitive_blocks || [],
    cockpit_cognitive_health: health || null
  };
}

function _buildFromCognitivePromotion(cognitiveRenderPromotion, widgetsPromoted) {
  if (
    cognitiveRenderPromotion?.render_active !== true ||
    cognitiveRenderPromotion?.promotion_applied !== true ||
    !Array.isArray(widgetsPromoted) ||
    widgetsPromoted.length === 0
  ) {
    return null;
  }
  const widgets = widgetsPromoted.map(_coerceWidget).filter(Boolean);
  if (!widgets.length) return null;
  return {
    source: SOURCE.COGNITIVE_RENDER_PROMOTION,
    engine: 'B',
    trace_id: cognitiveRenderPromotion?.rollback_snapshot?.rollback_token || null,
    widgets,
    perfil: {
      titulo: 'Centro de Comando — Qualidade',
      subtitulo: 'Cockpit cognitivo especializado (promoção controlada Z.22)'
    },
    assistente_ia: {
      especialidade: 'qualidade_operacional',
      exemplos_perguntas: [],
      alertas_contextuais: [],
      mensagens_fallback: []
    },
    identity: null,
    explainability: null,
    diff_summary: null,
    is_contextual: true,
    render_promotion: cognitiveRenderPromotion || { promotion_applied: true }
  };
}

function buildDashboardContext(args) {
  const executiveCognitiveRuntime = args && args.executiveCognitiveRuntime;
  const executiveCenters = args && args.executiveCenters;
  const environmentalCognitiveRuntime = args && args.environmentalCognitiveRuntime;
  const environmentalCenters = args && args.environmentalCenters;
  const maintenanceCognitiveRuntime = args && args.maintenanceCognitiveRuntime;
  const maintenanceCenters = args && args.maintenanceCenters;
  const productionCognitiveRuntime = args && args.productionCognitiveRuntime;
  const productionCenters = args && args.productionCenters;
  const hrCognitiveRuntime = args && args.hrCognitiveRuntime;
  const hrCenters = args && args.hrCenters;
  const sstCognitiveRuntime = args && args.sstCognitiveRuntime;
  const safetyCenters = args && args.safetyCenters;
  const specializedCockpitRuntime = args && args.specializedCockpitRuntime;
  const qualityCenters = args && args.qualityCenters;
  const decisionSupport = args && args.decisionSupport;
  const cognitiveRenderPromotion = args && args.cognitiveRenderPromotion;
  const engineV2 = args && args.engineV2;
  const personalizado = args && args.personalizado;
  const legacyLayoutFn = args && args.legacyLayoutFn;
  const user = (args && args.user) || {};
  const structuralComplete = args?.structuralComplete === true;
  const widgetsPromoted = args && args.widgetsPromoted;
  const multiDomainFoundation = args && args.multiDomainFoundation;
  const cognitiveBlocks = args && args.cognitiveBlocks;

  const executiveCtx = _buildFromExecutiveCockpit(
    executiveCognitiveRuntime,
    widgetsPromoted,
    executiveCenters,
    args?.executiveDecisionSupport || decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (executiveCtx) return executiveCtx;

  const environmentalCtx = _buildFromEnvironmentalCockpit(
    environmentalCognitiveRuntime,
    widgetsPromoted,
    environmentalCenters,
    args?.environmentalDecisionSupport || decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (environmentalCtx) return environmentalCtx;

  const maintenanceCtx = _buildFromMaintenanceCockpit(
    maintenanceCognitiveRuntime,
    widgetsPromoted,
    maintenanceCenters,
    args?.maintenanceDecisionSupport || decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (maintenanceCtx) return maintenanceCtx;

  const productionCtx = _buildFromProductionCockpit(
    productionCognitiveRuntime,
    widgetsPromoted,
    productionCenters,
    args?.productionDecisionSupport || decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (productionCtx) return productionCtx;

  const hrCtx = _buildFromHrCockpit(
    hrCognitiveRuntime,
    widgetsPromoted,
    hrCenters,
    decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (hrCtx) return hrCtx;

  const safetyCtx = _buildFromSafetyCockpit(
    sstCognitiveRuntime,
    widgetsPromoted,
    safetyCenters,
    decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (safetyCtx) return safetyCtx;

  const consolidatedCtx = _buildFromSpecializedCockpit(
    specializedCockpitRuntime,
    widgetsPromoted,
    qualityCenters,
    decisionSupport,
    multiDomainFoundation,
    cognitiveBlocks
  );
  if (consolidatedCtx) return consolidatedCtx;

  if (structuralComplete) {
    const persoCtx = _buildFromPersonalizado(personalizado);
    if (persoCtx) return persoCtx;
  }

  if (!structuralComplete) {
    const promoCtx = _buildFromCognitivePromotion(cognitiveRenderPromotion, widgetsPromoted);
    if (promoCtx) return promoCtx;
  }

  // 1. Engine V2 (preferido quando sem personalizado estrutural)
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

  const persoFallback = _buildFromPersonalizado(personalizado);
  if (persoFallback) return persoFallback;

  const promoFallback = _buildFromCognitivePromotion(cognitiveRenderPromotion, widgetsPromoted);
  if (promoFallback) return promoFallback;

  // 3. Fallback: getLayoutPorCargo (Motor A, frontend)
  if (typeof legacyLayoutFn === 'function') {
    try {
      const role = user.role || '';
      const dept = user.functional_area || user.department || user.area || '';
      const dp = user.dashboard_profile || '';
      const layout =
        legacyLayoutFn.length === 1
          ? legacyLayoutFn(user)
          : legacyLayoutFn(
              role,
              dept,
              dp,
              user.job_title || user.cargo || '',
              user.hr_responsibilities || user.descricao || ''
            );
      if (Array.isArray(layout) && layout.length > 0) {
        const widgets = layout.map(_coerceWidget).filter(Boolean);
        return {
          source: SOURCE.LAYOUT_FALLBACK,
          engine: 'A',
          trace_id: null,
          widgets,
          perfil: {
            titulo: user.structural_profile?.eixo_primario?.includes('humano')
              ? 'Centro de Comando — Pessoas'
              : 'Centro de Comando Industrial',
            subtitulo:
              user.structural_profile?.cargo && user.structural_profile?.departamento
                ? `${user.structural_profile.cargo} · ${user.structural_profile.departamento}`
                : `Visão para ${role ? role.replace(/_/g, ' ') : 'colaborador'}`
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

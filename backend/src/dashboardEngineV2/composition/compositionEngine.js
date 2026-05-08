'use strict';

/**
 * Composition Engine V2 — orquestra o fluxo unificado por eixos.
 *
 *   user → identity (derivada) → axes_priority → widgets (com capabilities)
 *        → layout (grid 4-col) → explainability → resposta normalizada
 *
 * Sem chamadas a DB. Sem efeitos colaterais. Determinístico para o mesmo
 * input. Compatível com o frontend (`layout.widgets` com row/col/width).
 */

const crypto = require('crypto');
const { buildContextualIdentity } = require('../identity/identityResolver');
const { selectWidgets } = require('./widgetSelector');
const { getPolicyFor } = require('./granularityPolicy');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');
const learningHooks = require('../learning/learningHooks');

// Reusa builders existentes do Motor B (mesma forma que o
// `dashboardPersonalizationEngine`).
const { buildSmartQuestions } = require('../../services/dashboardInsightBuilder');
const { buildContextualAlerts } = require('../../services/dashboardAlertBuilder');
const { buildFallbackMessages } = require('../../services/dashboardFallbackBuilder');

const TAMANHO_TO_SPAN = Object.freeze({ pequeno: 1, medio: 1, grande: 2, full: 2 });

function _gridLayout(modulos) {
  const layout = [];
  let row = 0;
  let col = 0;
  const cols = 4;
  const sorted = (modulos || []).slice().sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
  for (const m of sorted) {
    const width = TAMANHO_TO_SPAN[m.tamanho] || 1;
    if (col + width > cols) {
      col = 0;
      row += 1;
    }
    layout.push({
      id: m.id,
      label: m.label || m.contexto || m.id,
      position: { row, col, width },
      // metadados aditivos (ignorados pelo frontend antigo)
      v2: {
        axes: m.axes || [],
        score: m.score ?? null,
        category: m.category ?? null,
        rationale: m.rationale ?? null
      }
    });
    col += width;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }
  return layout;
}

function _generateTraceId(seed) {
  const base = `${Date.now()}_${seed || ''}_${crypto.randomBytes(4).toString('hex')}`;
  return crypto.createHash('sha1').update(base).digest('hex').slice(0, 16);
}

function _humanRationale(identity, axes, top) {
  const fn = identity?.function_type || 'execucao';
  const area = identity?.area || 'sem area';
  const primary = identity?.primary_axis || axes[0] || 'eixo_operacional';
  const sample = (top || []).slice(0, 3).map((w) => w.id).join(', ');
  return `Função=${fn} | Área=${area} | Eixo primário=${primary} | Top=${sample || 'nenhum'}`;
}

/**
 * Compõe um dashboard V2 completo a partir do utilizador autenticado.
 *
 * @param {object} user req.user típico
 * @param {object} [opts]
 * @param {string} [opts.traceId]    propagar trace_id entre camadas
 * @returns {object} NormalizedDashboard (forma documentada no README do V2)
 */
function composeDashboardV2(user, opts) {
  const traceId = (opts && opts.traceId) || _generateTraceId(user?.id);
  const identity = buildContextualIdentity(user);

  // Phase 3 — políticas declarativas: ajustam capabilities e produzem
  // listas allow/deny de widgets antes da selecção. Não substitui
  // capabilities já derivadas; só aumenta ou nega.
  const policyResult = applyPolicies({ identity, user });
  const policyIdentity = policyResult.identity || identity;

  let selection = selectWidgets(policyIdentity);
  // Aplicar deny de políticas sobre o resultado da selecção (camada extra
  // de segurança — políticas têm sempre a última palavra).
  const policyDeniedSet = new Set(policyResult.denied_widgets || []);
  if (policyDeniedSet.size > 0 && Array.isArray(selection.widgets)) {
    const removedByPolicy = [];
    selection = {
      ...selection,
      widgets: selection.widgets.filter((w) => {
        if (policyDeniedSet.has(w.id)) {
          removedByPolicy.push({ id: w.id, reason: 'policy_deny' });
          return false;
        }
        return true;
      }),
      denied: [...selection.denied, ...removedByPolicy.map((r) => ({ id: r.id, reason: r.reason }))]
    };
    // re-numerar posicao após remoção
    selection.widgets.forEach((w, idx) => { w.posicao = idx + 1; });
  }
  const fnPolicy = getPolicyFor(policyIdentity.function_type);

  // Hooks de aprendizagem (default = noop). Não bloqueia a composição.
  try {
    learningHooks.notifyIdentityResolved({ identity: policyIdentity, user });
    learningHooks.notifyPolicyAudit({ audit_trail: policyResult.audit_trail, identity: policyIdentity });
    learningHooks.notifyWidgetSelection({ selection, identity: policyIdentity, user });
  } catch (_) { /* silent */ }

  const layout = _gridLayout(selection.widgets);

  // Sinais para o frontend de personalization (mesmo contrato de
  // `liveDashboardService.personalization`).
  const personalization = {
    profile_code: `${identity.function_type}__${identity.area || 'unspecified'}`,
    profile_label: _profileLabelFor(identity),
    functional_area: identity.area || null,
    role: identity.role_raw || null,
    role_normalized: identity.role_normalized || null,
    function_type: identity.function_type,
    hierarchy_level: identity.hierarchy_level,
    job_title: identity.job_title_text,
    department_name: identity.department_text,
    scope_level: identity.scope,
    primary_axis: identity.primary_axis,
    axes_priority: identity.axes_priority,
    capabilities: identity.capabilities,
    data_sufficiency: 'full',
    gaps: [],
    user_message: _userMessage(identity)
  };

  const assistente_ia = {
    especialidade: identity.primary_axis,
    exemplos_perguntas: buildSmartQuestions({ primary_axis: identity.primary_axis }),
    alertas_contextuais: buildContextualAlerts({ primary_axis: identity.primary_axis, responsibilities: [] }),
    mensagens_fallback: buildFallbackMessages({ primary_axis: identity.primary_axis })
  };

  return {
    engine: 'B',
    trace_id: traceId,
    identity: policyIdentity,
    perfil: {
      cargo: identity.job_title_text || identity.role_normalized || 'colaborador',
      nivel: String(identity.hierarchy_level ?? '5'),
      departamento: identity.department_text || identity.area || 'geral',
      titulo_dashboard: 'Painel Vivo',
      subtitulo: `Contexto detectado: ${(identity.primary_axis || '').replace('eixo_', '')} | função ${identity.function_type}`,
      eixos_ativos: identity.axes_priority
    },
    modulos: selection.widgets.map((w) => ({
      id: w.id,
      posicao: w.posicao,
      tamanho: w.tamanho,
      prioridade: w.prioridade,
      contexto: w.contexto
    })),
    layout: { widgets: layout },
    layout_rules_version: 'v2',
    assistente_ia,
    personalization,
    explainability: {
      trace_id: traceId,
      function_type: policyIdentity.function_type,
      function_policy: {
        data_depth: fnPolicy.data_depth,
        max_widgets: fnPolicy.max_widgets,
        granularity: fnPolicy.granularity
      },
      area: policyIdentity.area,
      area_source: policyIdentity.sources?.area,
      function_source: policyIdentity.sources?.function,
      axes_priority: policyIdentity.axes_priority,
      primary_axis: policyIdentity.primary_axis,
      capabilities: policyIdentity.capabilities,
      capabilities_denied: policyIdentity.capabilities_denied || [],
      capabilities_implicit: policyIdentity.sources?.capabilities?.implicit || [],
      capabilities_from_permissions: policyIdentity.sources?.capabilities?.from_permissions || [],
      policy_audit: policyResult.audit_trail,
      policy_allowed_widgets: policyResult.allowed_widgets,
      policy_denied_widgets: policyResult.denied_widgets,
      widgets_selected: selection.widgets.map((w) => ({
        id: w.id,
        score: w.score,
        axes: w.axes,
        axis_overlap: w.axis_overlap,
        axis_priority_bonus: w.axis_priority_bonus,
        min_priority: w.min_priority,
        category: w.category,
        granularity_bias: w.granularity_bias,
        capabilities_required: w.capabilities_required,
        rationale: w.rationale
      })),
      widgets_denied: selection.denied,
      diagnostics: selection.diagnostics,
      identity_trace: identity.trace,
      rationale_human: _humanRationale(identity, identity.axes_priority, selection.widgets)
    }
  };
}

function _profileLabelFor(identity) {
  const fn = identity?.function_type || 'execucao';
  const a = identity?.area || 'geral';
  const fnLabel = {
    decisao_estrategica: 'Decisão estratégica',
    analise: 'Análise',
    supervisao: 'Supervisão',
    execucao: 'Execução',
    governanca: 'Governança'
  }[fn] || fn;
  const aLabel = {
    finance: 'Financeiro',
    operations: 'Operações',
    industrial: 'Industrial',
    production: 'Produção',
    maintenance: 'Manutenção',
    quality: 'Qualidade',
    hr: 'RH',
    pcp: 'PCP',
    admin: 'Administração'
  }[a] || a;
  return `${fnLabel} · ${aLabel}`;
}

function _userMessage(identity) {
  const fn = identity?.function_type || 'execucao';
  if (fn === 'decisao_estrategica') {
    return 'Painel estratégico alinhado ao seu cargo, função e prioridade de eixos.';
  }
  if (fn === 'analise') {
    return 'Painel analítico com profundidade detalhada para investigação de padrões.';
  }
  if (fn === 'supervisao') {
    return 'Painel operacional para acompanhamento da execução em tempo quase real.';
  }
  if (fn === 'governanca') {
    return 'Painel transversal de auditoria e conformidade.';
  }
  return 'Painel objectivo focado em tarefas e alertas do seu turno.';
}

module.exports = { composeDashboardV2 };

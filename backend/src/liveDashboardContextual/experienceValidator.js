'use strict';

/**
 * ContextualExperienceValidator
 *
 * Valida que a experiência contextual entregue (Motor B sob contrato legacy)
 * é coerente para a função/área/hierarquia/capabilities/policies do
 * utilizador. NÃO bloqueia a renderização — só produz um veredicto que o
 * `promotionGuard` usa para decidir se promove ou cai para Motor A.
 *
 * Saída canónica:
 *   {
 *     ok: boolean,
 *     score: 0..100,         // confiança na experiência contextual
 *     issues: [{ severity, kind, detail }],
 *     critical_widget_missing: boolean,
 *     excess_information: boolean,
 *     hierarchy_breach: boolean,
 *     policy_breach: boolean
 *   }
 */

const { buildContextualIdentity } = require('../dashboardEngineV2/identity/identityResolver');
const { applyPolicies } = require('../dashboardEngineV2/policies/dashboardPolicyEngine');

// Widgets críticos por função+área. Não é hardcode organizacional —
// é o "esqueleto mínimo de coerência" derivado das policies já existentes
// (`policies/policyCatalog.js`). Fonte ajustável.
const CRITICAL_WIDGETS_BY_FUNCTION_AREA = Object.freeze({
  decisao_estrategica: {
    finance:     ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'indicadores_executivos'],
    industrial:  ['operacoes', 'gargalos', 'manutencao', 'desperdicio', 'alertas'],
    operations:  ['operacoes', 'alertas', 'desperdicio'],
    production:  ['operacoes', 'qualidade', 'gargalos'],
    maintenance: ['manutencao', 'mapa_vazamentos', 'alertas'],
    quality:     ['qualidade', 'desperdicio'],
    hr:          ['performance', 'insights_ia'],
    admin:       ['indicadores_executivos', 'resumo_executivo'],
    _default:    ['indicadores_executivos']
  },
  analise: {
    finance:     ['centro_custos', 'grafico_custos_setor'],
    operations:  ['operacoes', 'grafico_tendencia'],
    industrial:  ['operacoes', 'manutencao'],
    quality:     ['qualidade'],
    _default:    ['grafico_tendencia']
  },
  supervisao: {
    production:  ['operacoes', 'alertas', 'kpi_cards'],
    operations:  ['operacoes', 'alertas'],
    maintenance: ['manutencao', 'alertas'],
    safety:      ['alertas', 'manutencao'],
    _default:    ['operacoes', 'alertas']
  },
  execucao: {
    production:  ['operacoes', 'kpi_cards'],
    maintenance: ['manutencao'],
    _default:    ['kpi_cards']
  },
  governanca: {
    _default:    ['relatorio_ia']
  }
});

const FORBIDDEN_FOR_FUNCTION = Object.freeze({
  execucao: ['indicadores_executivos', 'resumo_executivo', 'centro_custos', 'grafico_custos_setor', 'mapa_vazamentos', 'grafico_margem'],
  supervisao: ['grafico_margem']
});

const MAX_WIDGETS_BY_FUNCTION = Object.freeze({
  decisao_estrategica: 14,
  analise: 12,
  supervisao: 10,
  execucao: 8,
  governanca: 12
});

function _criticalsFor(identity) {
  const fn = identity.function_type || 'execucao';
  const area = identity.area || '_default';
  const map = CRITICAL_WIDGETS_BY_FUNCTION_AREA[fn] || {};
  return new Set(map[area] || map._default || []);
}

function _forbiddenFor(identity) {
  return new Set(FORBIDDEN_FOR_FUNCTION[identity.function_type] || []);
}

/**
 * Valida a experiência produzida pelo Motor B.
 *
 * @param {object} args
 * @param {object} args.user
 * @param {Array<{id:string}>} args.widgets    widgets que serão entregues
 * @param {object} [args.identity]             identidade já calculada (cache)
 * @returns {object} veredicto
 */
function validateExperience({ user, widgets, identity }) {
  const issues = [];
  const out = {
    ok: true,
    score: 100,
    issues,
    critical_widget_missing: false,
    excess_information: false,
    hierarchy_breach: false,
    policy_breach: false
  };
  if (!user || !Array.isArray(widgets)) {
    out.ok = false;
    out.score = 0;
    issues.push({ severity: 'high', kind: 'invalid_input', detail: 'user/widgets ausentes' });
    return out;
  }

  const ident = identity || buildContextualIdentity(user);
  const { identity: postPolicies } = applyPolicies({ identity: ident, user });
  const wIds = new Set(widgets.map((w) => (typeof w === 'string' ? w : w?.id)).filter(Boolean));

  // 1. Críticos presentes
  const crits = _criticalsFor(postPolicies);
  const missingCrits = [...crits].filter((c) => !wIds.has(c));
  if (missingCrits.length > 0) {
    // Tolerância: se pelo menos 1 widget da área está presente, "minimal coverage"
    const hasAny = [...crits].some((c) => wIds.has(c));
    if (!hasAny) {
      out.critical_widget_missing = true;
      issues.push({
        severity: 'high',
        kind: 'critical_widgets_missing',
        detail: `nenhum dos widgets críticos para ${postPolicies.function_type}/${postPolicies.area} presente`,
        missing: [...crits]
      });
      out.score -= 35;
    } else if (missingCrits.length === crits.size) {
      issues.push({
        severity: 'medium', kind: 'critical_widgets_partial',
        detail: 'cobertura parcial dos widgets críticos', missing: missingCrits
      });
      out.score -= 15;
    } else {
      issues.push({
        severity: 'low', kind: 'critical_widgets_partial',
        detail: 'alguns widgets críticos ausentes (ainda dentro do aceitável)',
        missing: missingCrits
      });
      out.score -= 5;
    }
  }

  // 2. Proibidos por função (LGPD/policy implicit)
  const forbidden = _forbiddenFor(postPolicies);
  const present_forbidden = [...wIds].filter((w) => forbidden.has(w));
  if (present_forbidden.length > 0) {
    out.policy_breach = true;
    issues.push({
      severity: 'high', kind: 'forbidden_widgets_present',
      detail: 'widgets proibidos para a função foram entregues',
      forbidden: present_forbidden
    });
    out.score -= 30;
  }

  // 3. Excesso de informação
  const max = MAX_WIDGETS_BY_FUNCTION[postPolicies.function_type] || 14;
  if (widgets.length > max) {
    out.excess_information = true;
    issues.push({
      severity: 'medium', kind: 'too_many_widgets',
      detail: `${widgets.length} widgets entregues — máx para ${postPolicies.function_type} é ${max}`
    });
    out.score -= 10;
  }

  // 4. Hierarquia: hl=5 (colaborador) com widgets executivos
  const hl = Number(postPolicies.hierarchy_level);
  if (Number.isFinite(hl) && hl >= 5) {
    const exec = [...wIds].filter((w) => ['indicadores_executivos', 'resumo_executivo', 'centro_custos'].includes(w));
    if (exec.length > 0) {
      out.hierarchy_breach = true;
      issues.push({
        severity: 'high', kind: 'hierarchy_widget_breach',
        detail: 'colaborador (hl=5) recebeu widgets executivos', widgets: exec
      });
      out.score -= 20;
    }
  }

  // 5. Capability: widgets que requerem view:financial sem capability
  const caps = new Set(postPolicies.capabilities || []);
  const FINANCIAL_WIDGETS = new Set(['centro_custos', 'mapa_vazamentos', 'grafico_custos_setor', 'desperdicio', 'centro_previsao']);
  const finPresent = [...wIds].filter((w) => FINANCIAL_WIDGETS.has(w));
  if (finPresent.length > 0 && !caps.has('view:financial')) {
    out.policy_breach = true;
    issues.push({
      severity: 'high', kind: 'capability_breach',
      detail: 'widgets financeiros entregues sem view:financial', widgets: finPresent
    });
    out.score -= 25;
  }

  // 6. Mínimo viável — pelo menos 1 widget
  if (widgets.length === 0) {
    out.ok = false;
    issues.push({ severity: 'high', kind: 'empty_layout', detail: 'nenhum widget entregue' });
    out.score = 0;
  }

  // 7. Confidence cap
  out.score = Math.max(0, Math.min(100, out.score));
  out.ok = out.score >= 50 && !out.critical_widget_missing && !out.policy_breach;
  return out;
}

module.exports = {
  validateExperience,
  CRITICAL_WIDGETS_BY_FUNCTION_AREA,
  FORBIDDEN_FOR_FUNCTION,
  MAX_WIDGETS_BY_FUNCTION
};

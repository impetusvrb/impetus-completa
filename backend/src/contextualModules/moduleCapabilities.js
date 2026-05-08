'use strict';

/**
 * Module Capabilities (Phase 6, Part 3)
 * -------------------------------------
 * Extensão das capabilities canónicas com namespace `view:module:*`.
 * Esta camada é ADITIVA — nada do Motor A nem do Motor B widget-level
 * depende dela. Serve para:
 *
 *   1) explainability: rationale humano de "porque é que este utilizador
 *      vê o módulo X";
 *   2) policies: futuras regras declarativas do tipo "negar
 *      view:module:cost_center a hr/execucao";
 *   3) governance: auditar consistência (capabilityConsistencyAnalyzer
 *      passa a ver módulos também).
 *
 * Convenção dos ids: `view:module:<module_id>`.
 */

const registry = require('./moduleRegistry');

/** Aliases legíveis para as capabilities de módulo de alto nível. */
const MODULE_CAPABILITY_ALIASES = Object.freeze({
  'view:financial_dashboard': 'view:module:financial_intelligence',
  'view:loss_analysis': 'view:module:losses_map',
  'view:operational_map': 'view:module:cerebro_operacional',
  'view:maintenance_center': 'view:module:manuia',
  'view:quality_audit': 'view:module:quality_intelligence',
  'view:environmental_control': 'view:module:anomaly_detection',
  'view:people_intelligence': 'view:module:hr_intelligence',
  'view:cost_center': 'view:module:cost_center',
  'view:audit': 'view:module:audit',
  'view:admin': 'view:module:admin'
});

/**
 * Regras declarativas (function_type × area) → module ids extra desbloqueados.
 * Uma regra é aditiva (nunca remove).
 */
const RULES = Object.freeze([
  // CFO / diretor financeiro
  { match: { function_type: 'decisao_estrategica', area: 'finance' }, unlock: ['financial_intelligence', 'losses_map', 'cost_center', 'cerebro_operacional', 'insights', 'centro_operacoes_industrial', 'centro_previsao_operacional', 'manuia', 'hr_intelligence', 'anomaly_detection', 'audit'] },
  { match: { function_type: 'governanca', area: 'finance' }, unlock: ['financial_intelligence', 'losses_map', 'cost_center', 'audit', 'insights'] },
  // Diretor industrial
  { match: { function_type: 'decisao_estrategica', area: 'industrial' }, unlock: ['cerebro_operacional', 'centro_operacoes_industrial', 'manuia', 'insights', 'losses_map', 'anomaly_detection', 'quality_intelligence'] },
  { match: { function_type: 'decisao_estrategica', area: 'operations' }, unlock: ['cerebro_operacional', 'centro_operacoes_industrial', 'insights', 'losses_map', 'anomaly_detection', 'manuia'] },
  // Supervisor produção
  { match: { function_type: 'supervisao', area: 'production' }, unlock: ['centro_operacoes_industrial', 'quality_intelligence', 'manuia'] },
  { match: { function_type: 'supervisao', area: 'industrial' }, unlock: ['centro_operacoes_industrial', 'manuia'] },
  { match: { function_type: 'supervisao', area: 'operations' }, unlock: ['centro_operacoes_industrial', 'manuia'] },
  // Operador
  { match: { function_type: 'execucao', area: 'maintenance' }, unlock: ['manuia'] },
  { match: { function_type: 'execucao', area: 'production' }, unlock: ['operational'] },
  { match: { function_type: 'execucao', area: 'quality' }, unlock: ['quality_intelligence'] },
  // RH BP — pulse_rh é sempre prioridade (definido como universal no registry)
  { match: { function_type: 'analise', area: 'hr' }, unlock: ['hr_intelligence', 'pulse_rh', 'pulse_gestao'] },
  { match: { function_type: 'decisao_estrategica', area: 'hr' }, unlock: ['hr_intelligence', 'pulse_rh', 'pulse_gestao', 'audit'] },
  { match: { function_type: 'governanca', area: 'hr' }, unlock: ['hr_intelligence', 'pulse_rh', 'audit'] },
  // Segurança do trabalho
  { match: { function_type: 'supervisao', area: 'operations', primary_axis: 'eixo_seguranca' }, unlock: ['anomaly_detection', 'cerebro_operacional'] },
  // Auditor
  { match: { function_type: 'governanca' }, unlock: ['audit'] }
]);

function _matches(ruleMatch, ctx) {
  for (const k of Object.keys(ruleMatch || {})) {
    const expected = ruleMatch[k];
    const actual = ctx[k];
    if (expected !== undefined && expected !== null) {
      if (Array.isArray(expected)) {
        if (!expected.includes(actual)) return false;
      } else if (expected !== actual) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calcula capabilities de módulo extra para uma identidade.
 * @param {object} args { function_type, area, axes_priority, capabilities }
 * @returns {{ module_capabilities: string[], unlocked_modules: string[], rationale: object[] }}
 */
function deriveModuleCapabilities(args) {
  const ctx = {
    function_type: args?.function_type || null,
    area: args?.area || null,
    primary_axis: Array.isArray(args?.axes_priority) ? args.axes_priority[0] || null : null
  };
  const out = new Set();
  const unlocked = new Set();
  const rationale = [];

  // CEO/admin curto-circuitado: tem implícito '*' nas capabilities,
  // logo todos os módulos do registry (a função-resolução já trata).
  const caps = new Set(args?.capabilities || []);
  const isAdminLike = caps.has('act:configure') && caps.has('view:strategic') && caps.has('view:audit');
  if (isAdminLike) {
    for (const m of registry.getAllModules()) {
      if (m.required_capabilities && m.required_capabilities.length === 0) continue;
      unlocked.add(m.module_id);
      out.add(`view:module:${m.module_id}`);
    }
    rationale.push({ rule: 'admin_universal', unlocked: Array.from(unlocked) });
  }

  for (const rule of RULES) {
    if (!_matches(rule.match, ctx)) continue;
    for (const id of rule.unlock || []) {
      const mod = registry.getModule(id);
      if (!mod) continue;
      unlocked.add(id);
      out.add(`view:module:${id}`);
    }
    rationale.push({ rule: rule.match, unlock: rule.unlock.slice() });
  }

  // Universals sempre adicionam o seu cap-id (descritivo).
  for (const m of registry.getAllModules()) {
    if (m.universal === true) {
      unlocked.add(m.module_id);
      out.add(`view:module:${m.module_id}`);
    }
  }

  return {
    module_capabilities: Array.from(out).sort(),
    unlocked_modules: Array.from(unlocked).sort(),
    rationale
  };
}

/** Resolve um alias humano (ex.: `view:financial_dashboard`) para a forma canónica. */
function resolveAlias(cap) {
  return MODULE_CAPABILITY_ALIASES[cap] || cap;
}

module.exports = {
  MODULE_CAPABILITY_ALIASES,
  RULES,
  deriveModuleCapabilities,
  resolveAlias
};

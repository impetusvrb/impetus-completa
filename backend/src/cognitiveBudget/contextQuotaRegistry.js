'use strict';

/**
 * WAVE 4 — quotas de contexto por persona, tenant, domain, module.
 */

const PERSONA_BUDGETS = Object.freeze({
  operator: 4000,
  supervisor: 6000,
  manager: 8000,
  director: 12000,
  executive: 12000,
  default: 8000
});

const DOMAIN_BUDGETS = Object.freeze({
  operational: 8000,
  quality: 6000,
  safety: 6000,
  environment: 6000,
  logistics: 6000,
  finance: 5000,
  maintenance: 7000,
  cognitive: 5000,
  default: 8000
});

const MODULE_BUDGETS = Object.freeze({
  dashboard_chat: 10000,
  chat: 10000,
  council: 15000,
  voice_input: 6000,
  environmental: 7000,
  default: 8000
});

function normalizePersona(raw) {
  const t = String(raw || '').toLowerCase();
  if (t.includes('director') || t.includes('executiv') || t.includes('ceo')) return 'director';
  if (t.includes('supervisor')) return 'supervisor';
  if (t.includes('operator') || t.includes('operador')) return 'operator';
  if (t.includes('manager') || t.includes('gerente')) return 'manager';
  return 'default';
}

function resolveQuotas(ctx) {
  const persona = normalizePersona(ctx.persona || ctx.dashboard_profile);
  const domain = String(ctx.domain || 'operational').toLowerCase();
  const moduleName = String(ctx.module || 'dashboard_chat').toLowerCase();

  const personaTokens = PERSONA_BUDGETS[persona] || PERSONA_BUDGETS.default;
  const domainTokens = DOMAIN_BUDGETS[domain] || DOMAIN_BUDGETS.default;
  const moduleTokens = MODULE_BUDGETS[moduleName] || MODULE_BUDGETS.default;

  const effective = Math.min(personaTokens, domainTokens, moduleTokens);

  return {
    persona,
    domain,
    module: moduleName,
    limits: { persona: personaTokens, domain: domainTokens, module: moduleTokens },
    effective_token_budget: effective
  };
}

module.exports = {
  PERSONA_BUDGETS,
  DOMAIN_BUDGETS,
  MODULE_BUDGETS,
  normalizePersona,
  resolveQuotas
};

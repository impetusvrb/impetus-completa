'use strict';

const flags = require('./sz4FeatureFlags');

const OPERATIONAL_SIGNAL_RE = Object.freeze([
  /\b(relat[oó]rio|entregar|prazo|deadline|amanh[aã]|hoje|urgente|parada|falha|tarefa|pendente|confirmar|ok\b|vou preparar|comprometo)\b/i,
  /\b\d{1,2}\s*h(?:oras?)?\b/i,
  /\b(perdas|produ[cç][aã]o|manuten[cç][aã]o|qualidade|nc|os\b)\b/i
]);

const EXCLUDED_SENSITIVE_RE = Object.freeze([
  /\b(sal[aá]rio|demiss[aã]o|cpf|rg\b|biometria)\b/i
]);

function shouldObserveMessage(content = '', ctx = {}) {
  if (!flags.isObservationEnabled()) {
    return { observe: false, reason: 'observation_disabled' };
  }
  const text = String(content || '').trim();
  if (text.length < 4) return { observe: false, reason: 'too_short' };
  if (text.length > 8000) return { observe: false, reason: 'too_long' };

  for (const re of EXCLUDED_SENSITIVE_RE) {
    if (re.test(text)) return { observe: false, reason: 'sensitive_excluded' };
  }

  let relevance = 0;
  for (const re of OPERATIONAL_SIGNAL_RE) {
    if (re.test(text)) relevance += 1;
  }

  const workflowBound = !!ctx.conversationId || !!ctx.thread_id;
  const critical = /\b(urgente|cr[ií]tico|parada|emerg[eê]ncia)\b/i.test(text);

  if (critical) relevance += 2;
  if (workflowBound) relevance += 1;
  if (ctx.sourceType === 'chat_interno' || ctx.sourceType === 'chat_impetus') relevance += 1;

  const threshold = ctx.force_observe ? 0 : 1;
  return {
    observe: relevance >= threshold,
    relevance_score: Math.min(1, relevance / 4),
    priority: critical ? 'high' : relevance >= 2 ? 'medium' : 'low',
    reason: relevance >= threshold ? 'contextual_relevance' : 'below_threshold'
  };
}

function observationScopeForUser(user = {}) {
  return {
    tenant_id: user.company_id || null,
    actor_id: user.id || null,
    role: user.role || null,
    hierarchy_level: user.hierarchy_level ?? null,
    department_id: user.department_id || null
  };
}

module.exports = {
  shouldObserveMessage,
  observationScopeForUser,
  OPERATIONAL_SIGNAL_RE,
  EXCLUDED_SENSITIVE_RE
};

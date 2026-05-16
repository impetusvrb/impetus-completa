'use strict';

/**
 * WAVE 4 — aiContextBudgetService (orquestra quotas e truncagem).
 */

const flags = require('./cognitiveBudgetFlags');
const quotas = require('./contextQuotaRegistry');
const tokenGov = require('./tokenGovernanceService');
const saturation = require('./saturationProtectionService');

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 4);
}

/**
 * @param {object} ctx — { persona, domain, module, company_id, text }
 */
async function resolveBudget(ctx) {
  if (!flags.isContextBudgetEnabled()) {
    return { enabled: false, budget_tokens: null, reason: 'budget_disabled' };
  }

  const q = quotas.resolveQuotas(ctx);
  let budget = q.effective_token_budget;

  if (ctx.company_id) {
    const remaining = tokenGov.getTenantRemainingTokens(ctx.company_id);
    if (remaining != null && remaining < budget) {
      budget = Math.max(500, remaining);
    }
  }

  if (flags.isSaturationProtectionEnabled()) {
    budget = saturation.adjustBudgetForPressure(budget, ctx);
  }

  return {
    enabled: true,
    budget_tokens: budget,
    quotas: q,
    tenant_remaining: ctx.company_id ? tokenGov.getTenantRemainingTokens(ctx.company_id) : null
  };
}

/**
 * Trunca texto preservando cabeçalhos markdown.
 */
function truncateToTokenBudget(text, budgetTokens) {
  const est = estimateTokens(text);
  if (est <= budgetTokens) {
    return { text, truncated: false, tokens_before: est, tokens_after: est };
  }

  const maxChars = budgetTokens * 4;
  const head = String(text).slice(0, Math.floor(maxChars * 0.85));
  const tail = '\n\n[... contexto truncado por budget IMPETUS — prioridade a factos recentes ...]';
  const out = head + tail;
  const after = estimateTokens(out);
  return { text: out, truncated: true, tokens_before: est, tokens_after: after };
}

/**
 * @param {string} text
 * @param {object} ctx
 */
async function applyBudgetToText(text, ctx) {
  const budget = await resolveBudget(ctx);
  if (!budget.enabled) {
    return { text, applied: false, budget };
  }

  if (ctx.company_id) {
    const est = estimateTokens(text);
    const quotaCheck = tokenGov.recordTenantUsage(ctx.company_id, est, { dry_run: true });
    if (!quotaCheck.allowed && flags.isTokenGovernanceEnforce()) {
      return {
        text: '## CONTEXTO OPERACIONAL\nQuota diária de tokens atingida. Responda apenas com informação da mensagem actual.',
        applied: true,
        budget,
        quota_exceeded: true
      };
    }
  }

  const truncated = truncateToTokenBudget(text, budget.budget_tokens);
  if (ctx.company_id && truncated.truncated) {
    tokenGov.recordTenantUsage(ctx.company_id, truncated.tokens_after, { dry_run: false });
  }

  return {
    text: truncated.text,
    applied: truncated.truncated || false,
    budget,
    tokens_before: truncated.tokens_before,
    tokens_after: truncated.tokens_after
  };
}

module.exports = {
  estimateTokens,
  resolveBudget,
  truncateToTokenBudget,
  applyBudgetToText
};

'use strict';

/**
 * WAVE 4 — pipeline seguro para blocos de contexto (não substitui memory binding).
 */

const flags = require('./cognitiveBudgetFlags');
const budget = require('./aiContextBudgetService');
const summarizer = require('./summarizationEngine');
const autoloop = require('./aiAutoloopGuard');

/**
 * Aplica budget/summarização a um bloco de memória operacional.
 * Com flags OFF devolve o bloco original inalterado.
 *
 * @param {object} opts
 * @param {string} opts.block
 * @param {object} [opts.meta]
 * @param {string} opts.companyId
 * @param {string} [opts.userId]
 * @param {string} [opts.persona]
 * @param {string} [opts.domain]
 * @param {string} [opts.module]
 * @param {string} [opts.conversationId]
 */
async function applyMemoryBlockBudget(opts) {
  const block = opts && opts.block != null ? String(opts.block) : '';
  if (!block) return { block: null, applied: false };

  if (!flags.isContextBudgetEnabled()) {
    return { block, applied: false, reason: 'budget_disabled' };
  }

  const ctx = {
    company_id: opts.companyId,
    user_id: opts.userId,
    persona: opts.persona,
    domain: opts.domain || 'operational',
    module: opts.module || 'dashboard_chat',
    conversation_id: opts.conversationId
  };

  const loopCheck = autoloop.checkInvocation(ctx);
  if (!loopCheck.allowed) {
    return {
      block: '## CONTEXTO OPERACIONAL\nInvocação bloqueada por protecção anti-loop. Use apenas a mensagem actual do utilizador.',
      applied: true,
      autoloop_blocked: true,
      loop: loopCheck
    };
  }

  let workingBlock = block;
  let summarization = null;

  if (flags.isSummarizerEnabled()) {
    summarization = await summarizer.summarizeContextBlock(block, ctx, { mode: 'active' });
    if (summarization.ok && summarization.block) {
      workingBlock = summarization.block;
    }
  } else {
    const budgeted = await budget.applyBudgetToText(block, ctx);
    workingBlock = budgeted.text;
    return {
      block: workingBlock,
      applied: budgeted.applied,
      budget: budgeted.budget,
      tokens_before: budgeted.tokens_before,
      tokens_after: budgeted.tokens_after,
      summarization: null,
      loop: loopCheck
    };
  }

  const finalBudget = await budget.applyBudgetToText(workingBlock, ctx);

  return {
    block: finalBudget.text,
    applied: true,
    budget: finalBudget.budget,
    summarization,
    tokens_before: summarization?.contract?.output?.tokens_before,
    tokens_after: finalBudget.tokens_after,
    loop: loopCheck,
    meta: opts.meta || {}
  };
}

module.exports = {
  applyMemoryBlockBudget
};

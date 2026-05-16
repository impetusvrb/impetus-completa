'use strict';

/**
 * WAVE 4 — summarization engine base (extractiva, low-overhead).
 */

const flags = require('./cognitiveBudgetFlags');
const { buildSummarizationContract } = require('./cognitiveBudgetContracts');
const { compressBlockToFacts } = require('./factCompressionLayer');
const budget = require('./aiContextBudgetService');

/**
 * @param {string} block
 * @param {object} ctx
 * @param {{ mode?: 'passive'|'active' }} [opts]
 */
async function summarizeContextBlock(block, ctx, opts = {}) {
  const mode = opts.mode || (flags.isSummarizerEnabled() ? 'active' : 'passive');
  const tokensBefore = budget.estimateTokens(block);

  if (!flags.isSummarizerEnabled() && mode === 'active') {
    return {
      ok: true,
      skipped: true,
      reason: 'summarizer_disabled',
      block,
      contract: null
    };
  }

  const compressed = compressBlockToFacts(block);
  let summaryText = compressed.compressed_text;

  if (mode === 'passive' && !flags.isSummarizerEnabled()) {
    return {
      ok: true,
      mode: 'passive',
      block,
      contract: buildSummarizationContract({
        input_ref: 'memory_binding_block',
        mode: 'passive',
        summary: '',
        facts: compressed.facts,
        tokens_before: tokensBefore,
        tokens_after: tokensBefore
      })
    };
  }

  const budgeted = await budget.applyBudgetToText(summaryText, ctx);
  summaryText = budgeted.text;

  const contract = buildSummarizationContract({
    input_ref: 'memory_binding_block',
    mode,
    summary: summaryText.split('\n').slice(0, 5).join('\n'),
    facts: compressed.facts,
    tokens_before: tokensBefore,
    tokens_after: budget.estimateTokens(summaryText)
  });

  const guardSuffix =
    '\n\n[Summarization WAVE4] Factos com fonte explícita; não extrapolar além do listado.';

  return {
    ok: true,
    mode,
    block: summaryText + guardSuffix,
    contract,
    fact_count: compressed.fact_count,
    tokens_saved: Math.max(0, tokensBefore - contract.output.tokens_after)
  };
}

module.exports = {
  summarizeContextBlock
};

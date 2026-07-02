'use strict';

const db = require('../../db');

const CUSTO_REAL_POR_UNIDADE = {
  voz: 0.00006,
  chat: 0.000025,
  claude: 0.000015,
  gemini: 0.000005,
  avatar: 0.5,
  tts: 0.00018,
  analise: 0.000015,
  conteudo: 0.000015,
  openai_embed: 0.00001,
  akool: 0.02,
  outro: 0.00001
};

async function getCreditsPerUnit(companyId, servico) {
  const nexusWallet = require('../nexusWalletService');
  if (typeof nexusWallet.getCreditsPerUnit === 'function') {
    return nexusWallet.getCreditsPerUnit(companyId, servico);
  }
  const s = String(servico || 'outro').toLowerCase();
  const r1 = await db.query(
    `SELECT credits_per_unit FROM nexus_wallet_company_rates WHERE company_id = $1 AND servico = $2`,
    [companyId, s]
  );
  if (r1.rows[0]) return Number(r1.rows[0].credits_per_unit);
  const r2 = await db.query(`SELECT credits_per_unit FROM nexus_wallet_global_rates WHERE servico = $1`, [s]);
  if (r2.rows[0]) return Number(r2.rows[0].credits_per_unit);
  return 1;
}

/**
 * Calcula créditos e preço BRL estimado para um evento de consumo.
 */
async function calculateCharge(companyId, usage = {}) {
  const service = String(usage.service || usage.servico || 'outro').toLowerCase();
  const inputTokens = Math.max(0, Number(usage.inputTokens ?? usage.input_tokens ?? 0) || 0);
  const outputTokens = Math.max(0, Number(usage.outputTokens ?? usage.output_tokens ?? 0) || 0);
  const cachedTokens = Math.max(0, Number(usage.cachedTokens ?? usage.cached_tokens ?? 0) || 0);
  const quantidade = Math.max(
    0,
    Number(usage.quantidade ?? usage.quantity ?? inputTokens + outputTokens) || 0
  );

  const rate = await getCreditsPerUnit(companyId, service);
  const credits = rate * quantidade;
  const unitBrl = CUSTO_REAL_POR_UNIDADE[service] ?? CUSTO_REAL_POR_UNIDADE.outro;
  const priceBrl = unitBrl * quantidade;

  return {
    service,
    inputTokens,
    outputTokens,
    cachedTokens,
    quantidade,
    credits,
    priceBrl,
    rate
  };
}

module.exports = { calculateCharge, CUSTO_REAL_POR_UNIDADE };

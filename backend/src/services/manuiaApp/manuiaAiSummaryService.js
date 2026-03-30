/**
 * Resumos para notificações — heurística por defeito; LLM curto opcional (MANUIA_NOTIFICATION_LLM=true).
 * Dados enviados ao modelo: apenas campos já autorizados ao contexto (sem PII extra).
 */
'use strict';

const OpenAI = require('openai');

function buildNotificationCopy({ title, machineName, sector, riskPct, suggestion, workOrderCode }) {
  const lines = [];
  if (machineName) lines.push(String(machineName));
  if (sector) lines.push(`Setor: ${sector}`);
  if (riskPct != null) lines.push(`Risco estimado: ${Math.round(Number(riskPct))}%`);
  if (suggestion) lines.push(`Sugestão: ${suggestion}`);
  if (workOrderCode) lines.push(`OS vinculada: ${workOrderCode}`);
  return {
    title: title || 'Alerta operacional',
    body: lines.filter(Boolean).join('\n')
  };
}

function llmEnabled() {
  return (
    String(process.env.MANUIA_NOTIFICATION_LLM || '').toLowerCase() === 'true' &&
    !!(process.env.OPENAI_API_KEY || '').trim()
  );
}

function maxTokens() {
  const n = parseInt(process.env.MANUIA_NOTIFICATION_LLM_MAX_TOKENS || '120', 10);
  return Math.min(Math.max(n, 32), 200);
}

/**
 * @param {object} input — mesmo que buildNotificationCopy
 * @param {object} [ctx] — { companyId } para logs (nunca vai no prompt com dados sensíveis)
 */
async function buildNotificationCopyAsync(input, ctx = {}) {
  const heuristic = buildNotificationCopy(input || {});

  if (!llmEnabled()) {
    return { ...heuristic, source: 'heuristic' };
  }

  const safePayload = {
    title: input?.title || heuristic.title,
    machineName: input?.machineName || null,
    sector: input?.sector || null,
    riskPct: input?.riskPct != null ? Number(input.riskPct) : null,
    suggestion: input?.suggestion ? String(input.suggestion).slice(0, 500) : null,
    workOrderCode: input?.workOrderCode || null
  };

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.MANUIA_NOTIFICATION_LLM_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      max_tokens: maxTokens(),
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'És um assistente industrial em português (Brasil). Gera um título curto (máx. 80 caracteres) e um corpo (máx. 280 caracteres) para uma notificação push. Usa apenas os dados fornecidos; não inventes equipamentos, valores ou pessoas. Se faltar informação, sê genérico.'
        },
        {
          role: 'user',
          content: `Dados JSON (não incluir dados fora disto):\n${JSON.stringify(safePayload)}`
        }
      ]
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    const lines = text.split('\n').filter(Boolean);
    let titleOut = heuristic.title;
    let bodyOut = heuristic.body;
    if (lines.length >= 1) titleOut = lines[0].slice(0, 80);
    if (lines.length >= 2) bodyOut = lines.slice(1).join('\n').slice(0, 280);
    else if (lines.length === 1 && lines[0].length > 80) bodyOut = lines[0].slice(80, 360);

    if (ctx.companyId) {
      /* eslint-disable no-console */
      console.log('[MANUIA_NOTIFICATION_LLM]', { companyId: ctx.companyId, model });
    }

    return { title: titleOut, body: bodyOut || heuristic.body, source: 'llm' };
  } catch (e) {
    console.warn('[MANUIA_NOTIFICATION_LLM]', e?.message || e);
    return { ...heuristic, source: 'heuristic_fallback', error: e.message };
  }
}

module.exports = {
  buildNotificationCopy,
  buildNotificationCopyAsync
};

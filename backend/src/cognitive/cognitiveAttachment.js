'use strict';

/**
 * Camada cognitiva — overlay event-pipeline.
 *
 * Não confundir com o `cognitiveAttachment` do `services/cognitiveAttachmentIngress.js`,
 * que é o anexo *environmental* validado por allowlist e injectado no conselho.
 *
 * Esta função é uma sonda de leitura: chama o pipeline event-driven (com `traceId`)
 * e devolve um snapshot leve `{ cognitive: { traceId, intent, summary, entities,
 * confidence, metadata } }` para enriquecer o `context` antes do orquestrador.
 *
 * Comportamento de segurança:
 *   - Sem `IMPETUS_EVENT_PIPELINE_ENABLED=true` → devolve `null` (no-op total).
 *   - Falha do pipeline → devolve `null` + log estruturado (nunca propaga excepção).
 *   - Debug opcional via `IMPETUS_COGNITIVE_DEBUG=true` → emite linha NDJSON
 *     `[COGNITIVE_DEBUG]` com `execMs` (custo zero quando desligado: `Date.now()`
 *     só é invocado se `debugEnabled`).
 */

const eventPipeline = require('../eventPipeline/processEvent');

async function cognitiveAttachment(input, context) {
  if (process.env.IMPETUS_EVENT_PIPELINE_ENABLED !== 'true') {
    return null;
  }

  const debugEnabled = process.env.IMPETUS_COGNITIVE_DEBUG === 'true';
  const t0 = debugEnabled ? Date.now() : null;

  try {
    const snapshot = await eventPipeline(input, context);

    if (debugEnabled) {
      console.log(
        JSON.stringify({
          event: '[COGNITIVE_DEBUG]',
          traceId: context?.traceId ?? null,
          execMs: Date.now() - t0,
          hasResult: !!snapshot,
          intent: snapshot?.intent ?? null,
          confidence: snapshot?.confidence ?? null
        })
      );
    }

    return { cognitive: snapshot };
  } catch (err) {
    console.error('[COGNITIVE_ATTACHMENT_FAIL]', {
      error: err?.message ?? 'unknown',
      traceId: context?.traceId ?? null
    });
    return null;
  }
}

module.exports = cognitiveAttachment;
module.exports.cognitiveAttachment = cognitiveAttachment;

'use strict';

/**
 * AIOI-P0.3 — Classification Consumer
 *
 * Orquestra o fluxo completo de classificação de um lote do aioi_outbox:
 *
 *   aioi_outbox (pending)
 *     ↓ pickBatch (FOR UPDATE SKIP LOCKED)
 *   aioi_outbox (processing)
 *     ↓ fetchIoe
 *   industrial_operational_events (open)
 *     ↓ classifyIoe (metadados apenas — sem IA)
 *     ↓ transitionIoeToTriaged (open → triaged)
 *     ↓ markDelivered
 *   aioi_outbox (delivered)
 *
 * Em caso de erro:
 *   markFailedOrRetry → aioi_outbox (pending | failed)
 *
 * PROIBIÇÕES ABSOLUTAS (AIOI_SOVEREIGNTY_MAP.md):
 *   ✗ Chamar actionRuntimeOrchestrator
 *   ✗ Chamar workflowOrchestrator
 *   ✗ Recalcular priority (computePriorityScore)
 *   ✗ Recalcular Truth
 *   ✗ Chamar Learning Engine
 *   ✗ Iniciar workflow automático
 *   ✗ Tomar decisão operacional
 *
 * O consumer APENAS classifica e transiciona estado.
 */

const outboxConsumer = require('./aioiOutboxConsumerService');
const classificationMapper = require('./aioiClassificationMapper');
const metrics = require('./aioiConsumerMetrics');

const LAYER = 'AIOI_CLASSIFICATION_CONSUMER';

// ---------------------------------------------------------------------------
// Processamento de uma única entrada de outbox
// ---------------------------------------------------------------------------

/**
 * Processa uma única entrada de outbox do tipo 'classification'.
 * Fluxo: fetch IOE → classify → transition IOE → mark delivered
 *
 * @param {object} outboxEntry — linha do aioi_outbox
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
async function _processEntry(outboxEntry) {
  const companyId  = outboxEntry.company_id;
  const outboxId   = outboxEntry.id;
  const ioeId      = outboxEntry.ioe_id;
  const attempts   = outboxEntry.attempts || 0;
  const startMs    = Date.now();

  // -------------------------------------------------------------------------
  // 1. Buscar IOE associado
  // -------------------------------------------------------------------------
  const ioe = await outboxConsumer.fetchIoe(companyId, ioeId);

  if (!ioe) {
    // IOE não encontrado (possível race condition ou dados corrompidos)
    console.warn(`[${LAYER}] IOE não encontrado para outbox`, { outbox_id: outboxId, ioe_id: ioeId });
    await outboxConsumer.markFailedOrRetry({
      companyId,
      outboxId,
      currentAttempts: attempts,
      errorMessage: `IOE ${ioeId} não encontrado`
    });
    metrics.recordRetry(companyId, outboxId, attempts + 1);
    return { ok: false, error: 'ioe_not_found' };
  }

  // -------------------------------------------------------------------------
  // 2. Verificar se IOE já foi classificado (idempotência)
  // -------------------------------------------------------------------------
  if (classificationMapper.isAlreadyClassified(ioe)) {
    console.info(`[${LAYER}] IOE já classificado — marcar delivered sem reprocessar`, {
      outbox_id: outboxId,
      ioe_id:    ioeId,
      ioe_status: ioe.status
    });
    await outboxConsumer.markDelivered({ companyId, outboxId });
    metrics.recordDelivered(companyId, outboxId);
    return { ok: true, skipped: true };
  }

  // -------------------------------------------------------------------------
  // 3. Classificar IOE (sem IA, sem cálculo soberano)
  // -------------------------------------------------------------------------
  let classificationResult;
  try {
    classificationResult = classificationMapper.classifyIoe(ioe);
  } catch (classErr) {
    console.error(`[${LAYER}] Erro na classificação`, {
      outbox_id: outboxId,
      ioe_id:    ioeId,
      error:     classErr.message
    });
    const retryResult = await outboxConsumer.markFailedOrRetry({
      companyId,
      outboxId,
      currentAttempts: attempts,
      errorMessage: `Classification error: ${classErr.message}`
    });
    if (retryResult.new_status === 'failed') {
      metrics.recordFailed(companyId, outboxId, classErr.message);
    } else {
      metrics.recordRetry(companyId, outboxId, attempts + 1);
    }
    return { ok: false, error: classErr.message };
  }

  // -------------------------------------------------------------------------
  // 4. Transicionar IOE: open → triaged
  // -------------------------------------------------------------------------
  const transitionResult = await outboxConsumer.transitionIoeToTriaged({
    companyId,
    ioeId,
    resolvedCategory:       classificationResult.resolved_category,
    classificationConfidence: classificationResult.classification_confidence
  });

  if (!transitionResult.ok) {
    const retryResult = await outboxConsumer.markFailedOrRetry({
      companyId,
      outboxId,
      currentAttempts: attempts,
      errorMessage: transitionResult.error || 'transition_failed'
    });
    if (retryResult.new_status === 'failed') {
      metrics.recordFailed(companyId, outboxId, transitionResult.error);
    } else {
      metrics.recordRetry(companyId, outboxId, attempts + 1);
    }
    return { ok: false, error: transitionResult.error };
  }

  // -------------------------------------------------------------------------
  // 5. Marcar outbox como delivered
  // -------------------------------------------------------------------------
  const deliveredResult = await outboxConsumer.markDelivered({ companyId, outboxId });

  const elapsedMs = Date.now() - startMs;

  if (deliveredResult.ok) {
    metrics.recordClassified(companyId, ioeId, elapsedMs);
    metrics.recordDelivered(companyId, outboxId);

    console.info(`[${LAYER}] Classificação concluída`, {
      outbox_id:               outboxId,
      ioe_id:                  ioeId,
      company_id:              companyId,
      resolved_category:       classificationResult.resolved_category,
      urgency:                 classificationResult.urgency,
      classification_confidence: classificationResult.classification_confidence,
      classification_basis:    classificationResult.classification_basis,
      ioe_transitioned:        transitionResult.updated,
      elapsed_ms:              elapsedMs
    });
    return { ok: true };
  } else {
    // markDelivered falhou — retry
    const retryResult = await outboxConsumer.markFailedOrRetry({
      companyId,
      outboxId,
      currentAttempts: attempts,
      errorMessage: deliveredResult.error || 'mark_delivered_failed'
    });
    if (retryResult.new_status === 'failed') {
      metrics.recordFailed(companyId, outboxId, deliveredResult.error);
    } else {
      metrics.recordRetry(companyId, outboxId, attempts + 1);
    }
    return { ok: false, error: deliveredResult.error };
  }
}

// ---------------------------------------------------------------------------
// Processamento de lote
// ---------------------------------------------------------------------------

/**
 * Processa um lote de entradas do aioi_outbox para um tenant.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.batchSize=10]
 * @returns {Promise<{
 *   processed: number,
 *   delivered: number,
 *   skipped: number,
 *   failed: number,
 *   errors: string[]
 * }>}
 */
async function processBatch({ companyId, batchSize = 10 }) {
  if (!companyId) {
    console.error(`[${LAYER}] companyId obrigatório`);
    return { processed: 0, delivered: 0, skipped: 0, failed: 0, errors: ['companyId ausente'] };
  }

  // -------------------------------------------------------------------------
  // Pegar lote (pending → processing via FOR UPDATE SKIP LOCKED)
  // -------------------------------------------------------------------------
  let batchRows;
  try {
    const pickResult = await outboxConsumer.pickBatch({ companyId, consumerType: 'classification', batchSize });
    batchRows = pickResult.rows;
  } catch (err) {
    console.error(`[${LAYER}] Erro ao pegar lote`, { company_id: companyId, error: err.message });
    return { processed: 0, delivered: 0, skipped: 0, failed: 0, errors: [err.message] };
  }

  if (!batchRows.length) {
    return { processed: 0, delivered: 0, skipped: 0, failed: 0, errors: [] };
  }

  console.info(`[${LAYER}] Lote picked`, { company_id: companyId, batch_size: batchRows.length });

  // -------------------------------------------------------------------------
  // Processar cada entrada sequencialmente (sem paralelismo para evitar contention)
  // -------------------------------------------------------------------------
  let delivered = 0;
  let skipped   = 0;
  let failed    = 0;
  const errors  = [];

  for (const entry of batchRows) {
    metrics.recordPicked(companyId);

    try {
      const result = await _processEntry(entry);
      if (result.ok && result.skipped) {
        skipped++;
      } else if (result.ok) {
        delivered++;
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    } catch (entryErr) {
      failed++;
      errors.push(entryErr.message);
      console.error(`[${LAYER}] Erro não capturado em entry`, {
        outbox_id:  entry.id,
        company_id: companyId,
        error:      entryErr.message
      });
      // Tentar marcar como retry sem propagar exceção
      await outboxConsumer.markFailedOrRetry({
        companyId,
        outboxId:        entry.id,
        currentAttempts: entry.attempts || 0,
        errorMessage:    entryErr.message
      }).catch(() => {});
    }
  }

  return {
    processed: batchRows.length,
    delivered,
    skipped,
    failed,
    errors
  };
}

module.exports = {
  processBatch,
  _processEntry
};

/**
 * Fila offline qualidade — dedupe por idempotency_key, ordenação por enqueuedAt.
 */
import { get, set, del, keys } from 'idb-keyval';
import { isQualityOfflineRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';

const Q_PREFIX = 'impetus:quality_op:queue:v1:';

function entryKey(companyId, id) {
  return `${Q_PREFIX}${companyId}:entry:${id}`;
}

function indexKey(companyId) {
  return `${Q_PREFIX}${companyId}:index`;
}

/**
 * @param {{ companyId: string, kind: string, body: object, idempotencyKey: string, correlationId?: string }} item
 */
export async function qualityEnqueueMutation(item) {
  if (!isQualityOfflineRuntimeEnabled()) return null;
  const { companyId, kind, body, idempotencyKey, correlationId } = item;
  if (!companyId || !kind || !idempotencyKey) return null;

  const existingIndex = (await get(indexKey(companyId))) || [];
  const dedupe = existingIndex.find((e) => e.idempotencyKey === idempotencyKey);
  if (dedupe) return dedupe.id;

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry = {
    id,
    kind,
    body,
    idempotencyKey,
    correlationId: correlationId || crypto.randomUUID(),
    enqueuedAt: new Date().toISOString(),
    retries: 0
  };
  await set(entryKey(companyId, id), entry);
  const next = [...existingIndex, { id, idempotencyKey, enqueuedAt: entry.enqueuedAt }];
  next.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
  await set(indexKey(companyId), next);
  return id;
}

export async function qualityListQueue(companyId) {
  if (!isQualityOfflineRuntimeEnabled()) return [];
  const index = (await get(indexKey(companyId))) || [];
  const out = [];
  for (const item of index) {
    const row = await get(entryKey(companyId, item.id));
    if (row) out.push(row);
  }
  return out.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

export async function qualityDequeue(companyId, id) {
  if (!isQualityOfflineRuntimeEnabled()) return;
  await del(entryKey(companyId, id));
  const index = (await get(indexKey(companyId))) || [];
  await set(
    indexKey(companyId),
    index.filter((x) => x.id !== id)
  );
}

export async function qualityIncrementRetry(companyId, id) {
  if (!isQualityOfflineRuntimeEnabled()) return;
  const row = await get(entryKey(companyId, id));
  if (!row) return;
  await set(entryKey(companyId, id), { ...row, retries: (row.retries || 0) + 1 });
}

/** @param {(entry: object) => Promise<boolean>} sendFn — retorna true se ACK servidor */
export async function qualityDrainQueue(companyId, sendFn) {
  if (!isQualityOfflineRuntimeEnabled()) return { sent: 0, failed: 0 };
  const list = await qualityListQueue(companyId);
  let sent = 0;
  let failed = 0;
  for (const entry of list) {
    try {
      const ok = await sendFn(entry);
      if (ok) {
        await qualityDequeue(companyId, entry.id);
        sent += 1;
      } else {
        await qualityIncrementRetry(companyId, entry.id);
        failed += 1;
      }
    } catch {
      await qualityIncrementRetry(companyId, entry.id);
      failed += 1;
    }
  }
  return { sent, failed };
}

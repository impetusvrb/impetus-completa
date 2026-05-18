import { safeUUID } from '../../../utils/safeUuid.js';
import { get, set, del } from 'idb-keyval';
import { isEnvironmentOfflineRuntimeEnabled } from '../operational-runtime/environmentOperationalFeatureFlags.js';

const Q_PREFIX = 'impetus:environment_op:queue:v1:';

function entryKey(companyId, id) {
  return `${Q_PREFIX}${companyId}:entry:${id}`;
}

function indexKey(companyId) {
  return `${Q_PREFIX}${companyId}:index`;
}

export async function environmentEnqueueMutation(item) {
  if (!isEnvironmentOfflineRuntimeEnabled()) return null;
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
    correlationId: correlationId || safeUUID(),
    enqueuedAt: new Date().toISOString(),
    retries: 0
  };
  await set(entryKey(companyId, id), entry);
  const next = [...existingIndex, { id, idempotencyKey, enqueuedAt: entry.enqueuedAt }];
  next.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
  await set(indexKey(companyId), next);
  return id;
}

export async function environmentListQueue(companyId) {
  if (!isEnvironmentOfflineRuntimeEnabled()) return [];
  const index = (await get(indexKey(companyId))) || [];
  const out = [];
  for (const item of index) {
    const row = await get(entryKey(companyId, item.id));
    if (row) out.push(row);
  }
  return out.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

export async function environmentDequeue(companyId, id) {
  await del(entryKey(companyId, id));
  const index = (await get(indexKey(companyId))) || [];
  await set(
    indexKey(companyId),
    index.filter((x) => x.id !== id)
  );
}

export async function environmentIncrementRetry(companyId, id) {
  const row = await get(entryKey(companyId, id));
  if (!row) return;
  await set(entryKey(companyId, id), { ...row, retries: (row.retries || 0) + 1 });
}

export async function environmentDrainQueue(companyId, sendFn) {
  if (!isEnvironmentOfflineRuntimeEnabled()) return { sent: 0, failed: 0 };
  const list = await environmentListQueue(companyId);
  let sent = 0;
  let failed = 0;
  for (const entry of list) {
    try {
      const ok = await sendFn(entry);
      if (ok) {
        await environmentDequeue(companyId, entry.id);
        sent += 1;
      } else {
        await environmentIncrementRetry(companyId, entry.id);
        failed += 1;
      }
    } catch {
      await environmentIncrementRetry(companyId, entry.id);
      failed += 1;
    }
  }
  return { sent, failed };
}

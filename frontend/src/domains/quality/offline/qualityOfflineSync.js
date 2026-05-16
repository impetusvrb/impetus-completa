/**
 * Sincronização offline qualidade — backoff exponencial + correlação preservada.
 */
import { qualityDrainQueue, qualityListQueue } from './qualityOfflineQueue.js';
import { isQualityOfflineRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';
import { qualityOperational } from '../../../services/api.js';

const MAX_BACKOFF_MS = 30000;

function backoffMs(retries) {
  return Math.min(MAX_BACKOFF_MS, 400 * 2 ** Math.min(10, retries || 0));
}

export async function syncQualityOfflineQueue(companyId) {
  if (!isQualityOfflineRuntimeEnabled()) return { skipped: true };
  return qualityDrainQueue(companyId, async (entry) => {
    const wait = backoffMs(entry.retries);
    if (wait > 400) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
    if (entry.kind === 'quality.event') {
      try {
        const res = await qualityOperational.publishEvent(entry.body);
        return res?.status >= 200 && res?.status < 300;
      } catch {
        return false;
      }
    }
    return false;
  });
}

export async function qualityOfflineQueueDepth(companyId) {
  const list = await qualityListQueue(companyId);
  return list.length;
}

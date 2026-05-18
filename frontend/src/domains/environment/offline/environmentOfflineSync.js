import { environmentDrainQueue, environmentListQueue } from './environmentOfflineQueue.js';
import { isEnvironmentOfflineRuntimeEnabled } from '../operational-runtime/environmentOperationalFeatureFlags.js';
import { environmentOperational } from '../../../services/api.js';

function backoffMs(retries) {
  return Math.min(30000, 400 * 2 ** (retries || 0));
}

export async function syncEnvironmentOfflineQueue(companyId) {
  if (!isEnvironmentOfflineRuntimeEnabled()) return { skipped: true };
  return environmentDrainQueue(companyId, async (entry) => {
    const wait = backoffMs(entry.retries);
    if (wait > 400) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
    if (entry.kind === 'environment.event') {
      try {
        const res = await environmentOperational.publishEvent(entry.body);
        return res?.status >= 200 && res?.status < 300;
      } catch {
        return false;
      }
    }
    return false;
  });
}

export async function environmentOfflineQueueDepth(companyId) {
  const list = await environmentListQueue(companyId);
  return list.length;
}

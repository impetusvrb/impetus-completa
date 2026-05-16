/**
 * WAVE 6 — Offline Queue Base (idb-keyval).
 * Fila de mutações offline para sincronizar quando o utilizador voltar a estar online.
 * Flag: VITE_OFFLINE_QUEUE_ENABLED (default false).
 */

import { get, set, update, del, keys } from 'idb-keyval';

const OFFLINE_QUEUE_ENABLED = import.meta.env.VITE_OFFLINE_QUEUE_ENABLED === 'true';
const STORE_PREFIX = 'impetus:offline_queue:';

/** @typedef {{ id: string, url: string, method: string, body: unknown, enqueuedAt: string, retries: number }} OfflineEntry */

function queueKey(id) {
  return `${STORE_PREFIX}${id}`;
}

/**
 * Adiciona uma mutação à fila offline.
 * @param {{ url: string, method: string, body?: unknown }} request
 * @returns {Promise<string>} id da entrada
 */
export async function enqueueOffline(request) {
  if (!OFFLINE_QUEUE_ENABLED) return null;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  /** @type {OfflineEntry} */
  const entry = {
    id,
    url: request.url,
    method: String(request.method || 'POST').toUpperCase(),
    body: request.body ?? null,
    enqueuedAt: new Date().toISOString(),
    retries: 0
  };
  await set(queueKey(id), entry);
  return id;
}

/**
 * Retorna todas as entradas da fila offline.
 * @returns {Promise<OfflineEntry[]>}
 */
export async function listOfflineQueue() {
  if (!OFFLINE_QUEUE_ENABLED) return [];
  const allKeys = await keys();
  const queueKeys = allKeys.filter((k) => String(k).startsWith(STORE_PREFIX));
  const entries = await Promise.all(queueKeys.map((k) => get(k)));
  return entries.filter(Boolean).sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

/**
 * Remove uma entrada da fila pelo id.
 * @param {string} id
 */
export async function dequeueOffline(id) {
  if (!OFFLINE_QUEUE_ENABLED) return;
  await del(queueKey(id));
}

/**
 * Incrementa o contador de tentativas de uma entrada.
 * @param {string} id
 */
export async function incrementOfflineRetry(id) {
  if (!OFFLINE_QUEUE_ENABLED) return;
  await update(queueKey(id), (entry) => (entry ? { ...entry, retries: (entry.retries || 0) + 1 } : entry));
}

/**
 * Drena a fila, enviando cada mutação offline via fetch.
 * Retorna { sent, failed }.
 */
export async function drainOfflineQueue() {
  if (!OFFLINE_QUEUE_ENABLED) return { sent: 0, failed: 0 };
  const entries = await listOfflineQueue();
  let sent = 0;
  let failed = 0;
  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: entry.body != null ? JSON.stringify(entry.body) : undefined,
        credentials: 'same-origin'
      });
      if (res.ok) {
        await dequeueOffline(entry.id);
        sent += 1;
      } else {
        await incrementOfflineRetry(entry.id);
        failed += 1;
      }
    } catch {
      await incrementOfflineRetry(entry.id);
      failed += 1;
    }
  }
  return { sent, failed };
}

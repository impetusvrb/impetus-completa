/**
 * WAVE 6 — Workflow State Manager (frontend).
 * Rastreia workflows activos pelo workflow_id propagado do backend (WAVE 2).
 * Leve, in-memory, sem dependência de Redux ou Zustand.
 */

/** @typedef {{ id: string, type: string, status: 'running'|'done'|'error', startedAt: string, updatedAt: string, meta?: unknown }} WorkflowEntry */

/** @type {Map<string, WorkflowEntry>} */
const _workflows = new Map();

/** @type {Set<(workflows: WorkflowEntry[]) => void>} */
const _listeners = new Set();

function _notify() {
  const snapshot = Array.from(_workflows.values());
  _listeners.forEach((fn) => {
    try { fn(snapshot); } catch { /* ignore */ }
  });
}

/**
 * Regista um workflow activo.
 * @param {{ id: string, type: string, meta?: unknown }} params
 */
export function startWorkflow({ id, type, meta = null }) {
  _workflows.set(id, {
    id,
    type: String(type || 'unknown'),
    status: 'running',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meta
  });
  _notify();
}

/**
 * Atualiza o estado de um workflow existente.
 * @param {string} id
 * @param {'done'|'error'} status
 * @param {unknown} [meta]
 */
export function updateWorkflow(id, status, meta) {
  const existing = _workflows.get(id);
  if (!existing) return;
  _workflows.set(id, {
    ...existing,
    status: String(status || 'done'),
    updatedAt: new Date().toISOString(),
    ...(meta !== undefined ? { meta } : {})
  });
  _notify();
}

/**
 * Remove um workflow da memória.
 * @param {string} id
 */
export function removeWorkflow(id) {
  _workflows.delete(id);
  _notify();
}

/** Retorna snapshot dos workflows activos. */
export function getWorkflows() {
  return Array.from(_workflows.values());
}

/** Retorna contagem de workflows em estado 'running'. */
export function getRunningCount() {
  let count = 0;
  for (const w of _workflows.values()) {
    if (w.status === 'running') count += 1;
  }
  return count;
}

/**
 * Subscreve a mudanças de estado de workflows.
 * @param {(workflows: WorkflowEntry[]) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeWorkflows(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

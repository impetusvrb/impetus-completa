/**
 * AIOI-P6.6 — Executive Session Service (UI EXPERIENCE ONLY · READ ONLY)
 *
 * Persistência sessionStorage — escopo sessão executiva. Sem P6.3 / P6.2 / P6.1 writes.
 */

export const EXECUTIVE_SESSION_STORAGE_KEY = 'aioi.executive.session';

export const CERTIFIED_EXECUTIVE_SESSION_MODULES = [
  'executive_cockpit',
  'decision_visualization',
  'interface_intelligence',
  'executive_reports'
];

const VALID_MODULES = new Set(CERTIFIED_EXECUTIVE_SESSION_MODULES);

/**
 * @returns {{
 *   session_active: boolean,
 *   last_module: string|null,
 *   last_visit: string|null,
 *   preferences_loaded: boolean
 * }}
 */
export function getDefaultExecutiveSession() {
  return {
    session_active: true,
    last_module: null,
    last_visit: null,
    preferences_loaded: true
  };
}

/**
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function createExecutiveSession(preferencesLoaded = true) {
  return {
    session_active: true,
    last_module: null,
    last_visit: null,
    preferences_loaded: preferencesLoaded === true
  };
}

/**
 * @param {unknown} raw
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function normalizeExecutiveSession(raw) {
  const defaults = getDefaultExecutiveSession();
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }

  const source = /** @type {Record<string, unknown>} */ (raw);
  const lastModule =
    typeof source.last_module === 'string' && VALID_MODULES.has(source.last_module)
      ? source.last_module
      : source.last_module === null
        ? null
        : defaults.last_module;

  const lastVisit =
    typeof source.last_visit === 'string' || source.last_visit === null
      ? source.last_visit
      : defaults.last_visit;

  return {
    session_active:
      typeof source.session_active === 'boolean' ? source.session_active : defaults.session_active,
    last_module: lastModule,
    last_visit: lastVisit,
    preferences_loaded:
      typeof source.preferences_loaded === 'boolean'
        ? source.preferences_loaded
        : defaults.preferences_loaded
  };
}

/**
 * @returns {{ getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }}
 */
export function createMemorySessionStorage() {
  const store = Object.create(null);
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
}

/**
 * @param {{ getItem?: (k: string) => string|null, setItem?: (k: string, v: string) => void, removeItem?: (k: string) => void } | null | undefined} [storage]
 */
export function resolveSessionStorage(storage) {
  if (storage && typeof storage.getItem === 'function') {
    return storage;
  }
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage;
  }
  return createMemorySessionStorage();
}

/**
 * @param {{ getItem?: (k: string) => string|null } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function loadExecutiveSession(storage) {
  const resolved = resolveSessionStorage(storage);
  try {
    const raw = resolved.getItem(EXECUTIVE_SESSION_STORAGE_KEY);
    if (!raw) {
      return getDefaultExecutiveSession();
    }
    return normalizeExecutiveSession(JSON.parse(raw));
  } catch {
    return getDefaultExecutiveSession();
  }
}

/**
 * @param {ReturnType<getDefaultExecutiveSession>} session
 * @param {{ setItem?: (k: string, v: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function saveExecutiveSession(session, storage) {
  const resolved = resolveSessionStorage(storage);
  const normalized = normalizeExecutiveSession(session);
  resolved.setItem(EXECUTIVE_SESSION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/**
 * @param {{ removeItem?: (k: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function resetExecutiveSession(storage) {
  const resolved = resolveSessionStorage(storage);
  resolved.removeItem(EXECUTIVE_SESSION_STORAGE_KEY);
  return getDefaultExecutiveSession();
}

/**
 * @param {ReturnType<getDefaultExecutiveSession>} session
 * @param {string} moduleId
 * @returns {ReturnType<getDefaultExecutiveSession>}
 */
export function recordExecutiveModuleVisit(session, moduleId) {
  if (!VALID_MODULES.has(moduleId)) {
    return normalizeExecutiveSession(session);
  }
  return normalizeExecutiveSession({
    ...session,
    session_active: true,
    last_module: moduleId,
    last_visit: new Date().toISOString()
  });
}

/**
 * @param {ReturnType<getDefaultExecutiveSession>} session
 * @param {boolean} [preferencesLoaded]
 * @returns {{
 *   session_active: boolean,
 *   last_module: string|null,
 *   last_visit: string|null,
 *   preferences_loaded: boolean
 * }}
 */
export function buildSessionMetadata(session, preferencesLoaded = true) {
  const normalized = normalizeExecutiveSession(session);
  return {
    session_active: normalized.session_active,
    last_module: normalized.last_module,
    last_visit: normalized.last_visit,
    preferences_loaded: preferencesLoaded === true
  };
}

/**
 * @param {ReturnType<getDefaultExecutiveSession>} session
 * @param {boolean} [preferencesLoaded]
 */
export function buildSessionRecoveryInfo(session, preferencesLoaded = true) {
  const metadata = buildSessionMetadata(session, preferencesLoaded);
  return {
    last_module: metadata.last_module,
    last_visit: metadata.last_visit,
    preferences_loaded: metadata.preferences_loaded
  };
}

export default getDefaultExecutiveSession;

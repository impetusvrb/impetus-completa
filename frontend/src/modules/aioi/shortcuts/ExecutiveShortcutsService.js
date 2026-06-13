/**
 * AIOI-P6.8 — Executive Shortcuts Service (UI EXPERIENCE ONLY)
 *
 * Persistência localStorage — atalhos executivos certificados. Sem P6.3 / P6.2 / P6.1.
 */

export const EXECUTIVE_SHORTCUTS_STORAGE_KEY = 'aioi.executive.shortcuts';

export const CERTIFIED_EXECUTIVE_SHORTCUT_MODULES = [
  'executive_cockpit',
  'decision_visualization',
  'interface_intelligence',
  'executive_reports'
];

const VALID_MODULES = new Set(CERTIFIED_EXECUTIVE_SHORTCUT_MODULES);

/**
 * @returns {{
 *   shortcuts_ready: boolean,
 *   shortcuts_count: number,
 *   shortcuts: string[]
 * }}
 */
export function getDefaultExecutiveShortcutsModel() {
  return {
    shortcuts_ready: true,
    shortcuts_count: 0,
    shortcuts: []
  };
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeShortcutsList(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !VALID_MODULES.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.push(item);
  }
  return result;
}

/**
 * @param {unknown} raw
 * @returns {ReturnType<getDefaultExecutiveShortcutsModel>}
 */
export function normalizeExecutiveShortcutsModel(raw) {
  const defaults = getDefaultExecutiveShortcutsModel();
  if (!raw || typeof raw !== 'object') {
    return { ...defaults, shortcuts: [] };
  }

  const source = /** @type {Record<string, unknown>} */ (raw);
  const shortcuts = normalizeShortcutsList(source.shortcuts);

  return {
    shortcuts_ready:
      typeof source.shortcuts_ready === 'boolean' ? source.shortcuts_ready : defaults.shortcuts_ready,
    shortcuts_count: shortcuts.length,
    shortcuts
  };
}

/**
 * @returns {{ getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }}
 */
export function createMemoryShortcutsStorage() {
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
export function resolveShortcutsStorage(storage) {
  if (storage && typeof storage.getItem === 'function') {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return createMemoryShortcutsStorage();
}

/**
 * @param {{ getItem?: (k: string) => string|null } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveShortcutsModel>}
 */
export function loadExecutiveShortcuts(storage) {
  const resolved = resolveShortcutsStorage(storage);
  try {
    const raw = resolved.getItem(EXECUTIVE_SHORTCUTS_STORAGE_KEY);
    if (!raw) {
      return getDefaultExecutiveShortcutsModel();
    }
    return normalizeExecutiveShortcutsModel(JSON.parse(raw));
  } catch {
    return getDefaultExecutiveShortcutsModel();
  }
}

/**
 * @param {ReturnType<getDefaultExecutiveShortcutsModel>} model
 * @param {{ setItem?: (k: string, v: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveShortcutsModel>}
 */
export function saveExecutiveShortcuts(model, storage) {
  const resolved = resolveShortcutsStorage(storage);
  const normalized = normalizeExecutiveShortcutsModel(model);
  resolved.setItem(EXECUTIVE_SHORTCUTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/**
 * @param {{ removeItem?: (k: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveShortcutsModel>}
 */
export function resetExecutiveShortcuts(storage) {
  const resolved = resolveShortcutsStorage(storage);
  resolved.removeItem(EXECUTIVE_SHORTCUTS_STORAGE_KEY);
  return getDefaultExecutiveShortcutsModel();
}

/**
 * @param {string[]} shortcuts
 * @returns {string[]}
 */
export function listShortcuts(shortcuts) {
  return normalizeShortcutsList(shortcuts);
}

/**
 * @param {string[]} shortcuts
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isShortcut(shortcuts, moduleId) {
  return listShortcuts(shortcuts).includes(moduleId);
}

/**
 * @param {string[]} shortcuts
 * @param {string} moduleId
 * @returns {string[]}
 */
export function addShortcut(shortcuts, moduleId) {
  if (!VALID_MODULES.has(moduleId)) {
    return listShortcuts(shortcuts);
  }
  const current = listShortcuts(shortcuts);
  if (current.includes(moduleId)) {
    return current;
  }
  return [...current, moduleId];
}

/**
 * @param {string[]} shortcuts
 * @param {string} moduleId
 * @returns {string[]}
 */
export function removeShortcut(shortcuts, moduleId) {
  return listShortcuts(shortcuts).filter((id) => id !== moduleId);
}

/**
 * @param {string[]} shortcuts
 * @returns {ReturnType<getDefaultExecutiveShortcutsModel>}
 */
export function buildShortcutsMetadata(shortcuts) {
  const list = listShortcuts(shortcuts);
  return {
    shortcuts_ready: true,
    shortcuts_count: list.length,
    shortcuts: list
  };
}

export default getDefaultExecutiveShortcutsModel;

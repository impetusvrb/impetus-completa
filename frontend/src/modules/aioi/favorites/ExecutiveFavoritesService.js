/**
 * AIOI-P6.7 — Executive Favorites Service (UI EXPERIENCE ONLY)
 *
 * Persistência localStorage — atalhos pessoais certificados. Sem P6.3 / P6.2 / P6.1.
 */

export const EXECUTIVE_FAVORITES_STORAGE_KEY = 'aioi.executive.favorites';

export const CERTIFIED_EXECUTIVE_FAVORITE_MODULES = [
  'executive_cockpit',
  'decision_visualization',
  'interface_intelligence',
  'executive_reports'
];

const VALID_MODULES = new Set(CERTIFIED_EXECUTIVE_FAVORITE_MODULES);

/**
 * @returns {{
 *   favorites_count: number,
 *   favorites_ready: boolean,
 *   favorites: string[]
 * }}
 */
export function getDefaultExecutiveFavoritesModel() {
  return {
    favorites_count: 0,
    favorites_ready: true,
    favorites: []
  };
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeFavoritesList(raw) {
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
 * @returns {ReturnType<getDefaultExecutiveFavoritesModel>}
 */
export function normalizeExecutiveFavoritesModel(raw) {
  const defaults = getDefaultExecutiveFavoritesModel();
  if (!raw || typeof raw !== 'object') {
    return { ...defaults, favorites: [] };
  }

  const source = /** @type {Record<string, unknown>} */ (raw);
  const favorites = normalizeFavoritesList(source.favorites);

  return {
    favorites_count: favorites.length,
    favorites_ready:
      typeof source.favorites_ready === 'boolean' ? source.favorites_ready : defaults.favorites_ready,
    favorites
  };
}

/**
 * @returns {{ getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }}
 */
export function createMemoryFavoritesStorage() {
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
export function resolveFavoritesStorage(storage) {
  if (storage && typeof storage.getItem === 'function') {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return createMemoryFavoritesStorage();
}

/**
 * @param {{ getItem?: (k: string) => string|null } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveFavoritesModel>}
 */
export function loadExecutiveFavorites(storage) {
  const resolved = resolveFavoritesStorage(storage);
  try {
    const raw = resolved.getItem(EXECUTIVE_FAVORITES_STORAGE_KEY);
    if (!raw) {
      return getDefaultExecutiveFavoritesModel();
    }
    return normalizeExecutiveFavoritesModel(JSON.parse(raw));
  } catch {
    return getDefaultExecutiveFavoritesModel();
  }
}

/**
 * @param {ReturnType<getDefaultExecutiveFavoritesModel>} model
 * @param {{ setItem?: (k: string, v: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveFavoritesModel>}
 */
export function saveExecutiveFavorites(model, storage) {
  const resolved = resolveFavoritesStorage(storage);
  const normalized = normalizeExecutiveFavoritesModel(model);
  resolved.setItem(EXECUTIVE_FAVORITES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/**
 * @param {{ removeItem?: (k: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveFavoritesModel>}
 */
export function resetExecutiveFavorites(storage) {
  const resolved = resolveFavoritesStorage(storage);
  resolved.removeItem(EXECUTIVE_FAVORITES_STORAGE_KEY);
  return getDefaultExecutiveFavoritesModel();
}

/**
 * @param {string[]} favorites
 * @returns {string[]}
 */
export function listFavorites(favorites) {
  return normalizeFavoritesList(favorites);
}

/**
 * @param {string[]} favorites
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isFavorite(favorites, moduleId) {
  return listFavorites(favorites).includes(moduleId);
}

/**
 * @param {string[]} favorites
 * @param {string} moduleId
 * @returns {string[]}
 */
export function addFavorite(favorites, moduleId) {
  if (!VALID_MODULES.has(moduleId)) {
    return listFavorites(favorites);
  }
  const current = listFavorites(favorites);
  if (current.includes(moduleId)) {
    return current;
  }
  return [...current, moduleId];
}

/**
 * @param {string[]} favorites
 * @param {string} moduleId
 * @returns {string[]}
 */
export function removeFavorite(favorites, moduleId) {
  return listFavorites(favorites).filter((id) => id !== moduleId);
}

/**
 * @param {string[]} favorites
 * @returns {ReturnType<getDefaultExecutiveFavoritesModel>}
 */
export function buildFavoritesMetadata(favorites) {
  const list = listFavorites(favorites);
  return {
    favorites_count: list.length,
    favorites_ready: true,
    favorites: list
  };
}

export default getDefaultExecutiveFavoritesModel;

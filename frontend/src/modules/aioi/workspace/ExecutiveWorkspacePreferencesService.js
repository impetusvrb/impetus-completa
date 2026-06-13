/**
 * AIOI-P6.5 — Executive Workspace Preferences Service (UI EXPERIENCE ONLY)
 *
 * Persistência local — escopo limitado ao Workspace. Sem P6.3 / P6.2 / P6.1.
 */

export const EXECUTIVE_WORKSPACE_PREFERENCES_STORAGE_KEY = 'aioi.executive.workspace.preferences';

export const WORKSPACE_LAYOUT_PREFERENCES = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  EXPANDED: 'expanded'
};

export const EXECUTIVE_DENSITY_PREFERENCES = {
  COMFORTABLE: 'comfortable',
  COMPACT: 'compact',
  EXECUTIVE: 'executive'
};

export const DEFAULT_LANDING_PREFERENCES = {
  EXECUTIVE_OVERVIEW: 'executive-overview',
  OPERATIONS: 'operations',
  GOVERNANCE: 'governance',
  INTELLIGENCE: 'intelligence',
  WORKSPACE: 'workspace'
};

export const INDICATOR_VISIBILITY_KEYS = {
  WORKSPACE_STATUS: 'workspaceStatus',
  NAVIGATION_STATUS: 'navigationStatus',
  GOVERNANCE_STATUS: 'governanceStatus',
  CERTIFICATION_STATUS: 'certificationStatus'
};

const VALID_LAYOUTS = new Set(Object.values(WORKSPACE_LAYOUT_PREFERENCES));
const VALID_DENSITIES = new Set(Object.values(EXECUTIVE_DENSITY_PREFERENCES));
const VALID_LANDINGS = new Set(Object.values(DEFAULT_LANDING_PREFERENCES));

/**
 * @returns {import('./ExecutiveWorkspacePreferencesService.js').ExecutiveWorkspacePreferences}
 */
export function getDefaultExecutiveWorkspacePreferences() {
  return {
    layout: WORKSPACE_LAYOUT_PREFERENCES.STANDARD,
    density: EXECUTIVE_DENSITY_PREFERENCES.COMFORTABLE,
    defaultLanding: DEFAULT_LANDING_PREFERENCES.WORKSPACE,
    indicatorVisibility: {
      workspaceStatus: true,
      navigationStatus: true,
      governanceStatus: true,
      certificationStatus: true
    }
  };
}

/**
 * @param {unknown} raw
 * @returns {ReturnType<getDefaultExecutiveWorkspacePreferences>}
 */
export function normalizeExecutiveWorkspacePreferences(raw) {
  const defaults = getDefaultExecutiveWorkspacePreferences();
  if (!raw || typeof raw !== 'object') {
    return { ...defaults, indicatorVisibility: { ...defaults.indicatorVisibility } };
  }

  const source = /** @type {Record<string, unknown>} */ (raw);
  const layout = VALID_LAYOUTS.has(/** @type {string} */ (source.layout))
    ? source.layout
    : defaults.layout;
  const density = VALID_DENSITIES.has(/** @type {string} */ (source.density))
    ? source.density
    : defaults.density;
  const defaultLanding = VALID_LANDINGS.has(/** @type {string} */ (source.defaultLanding))
    ? source.defaultLanding
    : defaults.defaultLanding;

  const visibilitySource =
    source.indicatorVisibility && typeof source.indicatorVisibility === 'object'
      ? /** @type {Record<string, unknown>} */ (source.indicatorVisibility)
      : {};

  const indicatorVisibility = {
    workspaceStatus:
      typeof visibilitySource.workspaceStatus === 'boolean'
        ? visibilitySource.workspaceStatus
        : defaults.indicatorVisibility.workspaceStatus,
    navigationStatus:
      typeof visibilitySource.navigationStatus === 'boolean'
        ? visibilitySource.navigationStatus
        : defaults.indicatorVisibility.navigationStatus,
    governanceStatus:
      typeof visibilitySource.governanceStatus === 'boolean'
        ? visibilitySource.governanceStatus
        : defaults.indicatorVisibility.governanceStatus,
    certificationStatus:
      typeof visibilitySource.certificationStatus === 'boolean'
        ? visibilitySource.certificationStatus
        : defaults.indicatorVisibility.certificationStatus
  };

  return { layout, density, defaultLanding, indicatorVisibility };
}

/**
 * @returns {{ getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }}
 */
export function createMemoryStorage() {
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
export function resolvePreferencesStorage(storage) {
  if (storage && typeof storage.getItem === 'function') {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return createMemoryStorage();
}

/**
 * @param {{ getItem?: (k: string) => string|null } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveWorkspacePreferences>}
 */
export function loadExecutiveWorkspacePreferences(storage) {
  const resolved = resolvePreferencesStorage(storage);
  try {
    const raw = resolved.getItem(EXECUTIVE_WORKSPACE_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return getDefaultExecutiveWorkspacePreferences();
    }
    return normalizeExecutiveWorkspacePreferences(JSON.parse(raw));
  } catch {
    return getDefaultExecutiveWorkspacePreferences();
  }
}

/**
 * @param {ReturnType<getDefaultExecutiveWorkspacePreferences>} preferences
 * @param {{ setItem?: (k: string, v: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveWorkspacePreferences>}
 */
export function saveExecutiveWorkspacePreferences(preferences, storage) {
  const resolved = resolvePreferencesStorage(storage);
  const normalized = normalizeExecutiveWorkspacePreferences(preferences);
  resolved.setItem(
    EXECUTIVE_WORKSPACE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}

/**
 * @param {{ removeItem?: (k: string) => void, setItem?: (k: string, v: string) => void } | null | undefined} [storage]
 * @returns {ReturnType<getDefaultExecutiveWorkspacePreferences>}
 */
export function resetExecutiveWorkspacePreferences(storage) {
  const resolved = resolvePreferencesStorage(storage);
  const defaults = getDefaultExecutiveWorkspacePreferences();
  resolved.removeItem(EXECUTIVE_WORKSPACE_PREFERENCES_STORAGE_KEY);
  return defaults;
}

/**
 * @param {ReturnType<getDefaultExecutiveWorkspacePreferences> | null | undefined} preferences
 */
export function getIndicatorVisibility(preferences) {
  const normalized = normalizeExecutiveWorkspacePreferences(preferences);
  return normalized.indicatorVisibility;
}

/**
 * @param {ReturnType<getDefaultExecutiveWorkspacePreferences> | null | undefined} preferences
 */
export function resolveWorkspacePresentation(preferences) {
  const normalized = normalizeExecutiveWorkspacePreferences(preferences);
  return {
    layout: normalized.layout,
    density: normalized.density,
    defaultLanding: normalized.defaultLanding,
    layoutClass: `layout-${normalized.layout}`,
    densityClass: `density-${normalized.density}`
  };
}

export default getDefaultExecutiveWorkspacePreferences;

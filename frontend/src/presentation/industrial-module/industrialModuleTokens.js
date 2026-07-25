/**
 * OPM-001A — Tokens partilhados do Industrial Operational Module Standard.
 */
export const INDUSTRIAL_MODULE_PHASE = 'OPM-001A';

export const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export const TOOLBAR_ACTIONS = Object.freeze({
  search: 'search',
  refresh: 'refresh',
  export: 'export',
  filters: 'filters',
  columns: 'columns',
  preferences: 'preferences',
  history: 'history',
  help: 'help',
  ai: 'ai'
});

export const MODULE_STATES = Object.freeze({
  loading: 'loading',
  empty: 'empty',
  error: 'error',
  permission_denied: 'permission_denied',
  offline: 'offline',
  read_only: 'read_only',
  syncing: 'syncing',
  updating: 'updating',
  partial_data: 'partial_data',
  integration_unavailable: 'integration_unavailable',
  data_loaded: 'data_loaded'
});

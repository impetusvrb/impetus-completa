/**
 * Política mínima segura — espelho do backend (Fase E).
 * Usada em fail-safe do hook de visibilidade; nunca expande privilégios.
 */

export const SAFE_MINIMAL_SECTIONS = Object.freeze({
  operational_interactions: false,
  ai_insights: false,
  monitored_points: false,
  proposals: false,
  trend_chart: false,
  points_chart: false,
  insights_list: false,
  recent_interactions: false,
  smart_summary: false,
  plc_alerts: false,
  kpi_request: false,
  communication_panel: false
});

export const DEFAULT_SECTIONS_OPEN = {
  operational_interactions: true,
  ai_insights: true,
  monitored_points: false,
  proposals: true,
  trend_chart: true,
  points_chart: false,
  insights_list: true,
  recent_interactions: true,
  smart_summary: true,
  plc_alerts: true,
  kpi_request: true,
  communication_panel: true
};

export function isFailsafeGovernanceEnabled() {
  const v = import.meta.env?.VITE_IMPETUS_FAILSAFE_GOVERNANCE;
  if (v === undefined || v === '') return true;
  return String(v).toLowerCase() === 'on' || v === '1';
}

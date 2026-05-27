/**
 * Política mínima segura — espelho do backend (Fase E).
 * Usada em fail-safe do hook de visibilidade; nunca expande privilégios.
 *
 * D15 — Sections Source Resolution:
 *   VITE_IMPETUS_DASHBOARD_SECTIONS_SOURCE=legacy  → useDashboardVisibility (comportamento anterior)
 *   VITE_IMPETUS_DASHBOARD_SECTIONS_SOURCE=backend → dashboardPayload.sections (source-of-truth)
 *
 * @see backend/src/routes/dashboard.js GET /dashboard/me — entrega sections governadas
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
  if (v === undefined || v === '') return false;
  return String(v).toLowerCase() === 'on' || v === '1';
}

// ─── D15 — Sections Source Resolution ─────────────────────────────────────────

/**
 * Retorna a fonte de autoridade para sections do dashboard.
 *   'backend' → backend (dashboardPayload.sections) é source-of-truth
 *   'legacy'  → useDashboardVisibility é source-of-truth (comportamento anterior)
 */
export function getDashboardSectionsSource() {
  const v = String(import.meta.env?.VITE_IMPETUS_DASHBOARD_SECTIONS_SOURCE || '').trim().toLowerCase();
  if (v === 'backend') return 'backend';
  return 'legacy';
}

/**
 * Resolve as sections efetivas do dashboard de forma determinística e deny-first.
 *
 * Lógica de resolução:
 *   1. Se source === 'backend' E backendSections é um objeto válido com pelo menos 1 key:
 *      → usa backendSections (source-of-truth governado pelo backend)
 *   2. Se source === 'legacy' OU backendSections inválido:
 *      → usa legacyVisibility (useDashboardVisibility — comportamento anterior)
 *   3. Se ambos forem inválidos:
 *      → SAFE_MINIMAL_SECTIONS (deny-first absoluto — nunca abre tudo)
 *
 * @param {{ backendSections: object|null, legacyVisibility: object|null, source: string }} opts
 * @returns {object} sections efetivas com todas as keys do modelo de visibilidade
 */
export function resolveDashboardSections({ backendSections, legacyVisibility, source }) {
  if (source === 'backend') {
    if (backendSections && typeof backendSections === 'object' && Object.keys(backendSections).length > 0) {
      return backendSections;
    }
    console.warn('[IMPETUS_D15]', JSON.stringify({
      event: 'sections_source_backend_invalid',
      timestamp: new Date().toISOString(),
      reason: 'backendSections null or empty, falling back to deny-first',
      fallback: 'SAFE_MINIMAL_SECTIONS',
    }));
    return { ...SAFE_MINIMAL_SECTIONS };
  }

  if (legacyVisibility && typeof legacyVisibility === 'object' && Object.keys(legacyVisibility).length > 0) {
    return legacyVisibility;
  }

  return { ...SAFE_MINIMAL_SECTIONS };
}

// ─── Wave A.2 — Cognitive Visibility Sovereign ────────────────────────────────

/**
 * Retorna true se a governança cognitiva soberana estiver ativa.
 * Quando ativa, TODAS as superfícies de UI (não apenas o dashboard principal)
 * respeitam as `sections` soberanas do backend como fonte única de autoridade.
 */
export function isCognitiveVisibilitySovereign() {
  const v = String(import.meta.env?.VITE_IMPETUS_COGNITIVE_VISIBILITY_SOVEREIGN || '').trim().toLowerCase();
  return v === 'on' || v === '1' || v === 'true';
}

/**
 * Resolver unificado de visibilidade cognitiva — reutilizável em qualquer superfície.
 *
 * Verifica se uma feature/seção específica está autorizada pelas sections soberanas.
 * Puro, determinístico, sem side effects, sem chamadas remotas.
 *
 * Regras (deny-first absoluto):
 *   1. Se `sections` é null/undefined/não-objeto → DENY (fallback)
 *   2. Se a flag VITE_IMPETUS_COGNITIVE_VISIBILITY_SOVEREIGN=off → retorna `fallback` (legacy)
 *   3. Se a flag está on → verifica `sections[feature]`
 *   4. Se `sections[feature]` é undefined → DENY (chave ausente = negado)
 *   5. Se `sections[feature]` é boolean → retorna o valor
 *
 * @param {{ sections: object|null, feature: string, context?: string, fallback?: boolean }} opts
 * @returns {{ allowed: boolean, source: string, feature: string, context: string|null }}
 */
export function resolveCognitiveVisibility({ sections, feature, context = null, fallback = false }) {
  const sovereign = isCognitiveVisibilitySovereign();

  if (!sovereign) {
    return {
      allowed: fallback,
      source: 'legacy_bypass',
      feature,
      context,
    };
  }

  if (!sections || typeof sections !== 'object') {
    return {
      allowed: false,
      source: 'deny_first_no_sections',
      feature,
      context,
    };
  }

  const value = sections[feature];
  if (value === undefined) {
    return {
      allowed: false,
      source: 'deny_first_key_absent',
      feature,
      context,
    };
  }

  return {
    allowed: !!value,
    source: 'sovereign_sections',
    feature,
    context,
  };
}

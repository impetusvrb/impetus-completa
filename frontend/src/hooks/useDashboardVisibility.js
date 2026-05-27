/**
 * Hook para obter seções visíveis + contexto organizacional
 * Personalização por área, cargo e setor (Dashboard Inteligente Adaptativo)
 *
 * Governança de fallback (Wave A.1 — T1.A.1):
 *   VITE_IMPETUS_FAILSAFE_GOVERNANCE=off  → fail-open legacy (comportamento histórico preservado)
 *   VITE_IMPETUS_FAILSAFE_GOVERNANCE=on   → deny-first governado (SAFE_MINIMAL_SECTIONS)
 *
 * A transição é controlada por feature flag — default OFF preserva total retrocompatibilidade
 * com Motor A, Engine V2 e Runtime Z.
 *
 * @see frontend/src/policyEngine/safeMinimalPolicy.js — fonte de verdade das políticas
 */
import { useState, useEffect, useRef } from 'react';
import { dashboard } from '../services/api';
import {
  SAFE_MINIMAL_SECTIONS,
  DEFAULT_SECTIONS_OPEN,
  isFailsafeGovernanceEnabled,
} from '../policyEngine/safeMinimalPolicy';

// ─── Observabilidade estruturada ───────────────────────────────────────────────
/**
 * Emite evento de observabilidade de visibilidade com logging estruturado.
 * Preparado para integração futura com OpenTelemetry / rollout observability.
 *
 * Eventos de degradação (WARN): visibility_api_failure, visibility_fallback_triggered,
 *   visibility_deny_mode_enabled, visibility_runtime_mismatch.
 * Eventos informativos (INFO): visibility_sections_loaded.
 */
function _logVisibilityEvent(event, meta = {}) {
  const entry = {
    runtime: 'useDashboardVisibility',
    event,
    timestamp: new Date().toISOString(),
    failsafe_governance_enabled: isFailsafeGovernanceEnabled(),
    ...meta,
  };
  const degradationEvents = new Set([
    'visibility_api_failure',
    'visibility_fallback_triggered',
    'visibility_deny_mode_enabled',
    'visibility_runtime_mismatch',
    'modules_hidden_by_failsafe',
  ]);
  if (degradationEvents.has(event)) {
    console.warn('[IMPETUS_VISIBILITY]', JSON.stringify(entry));
  } else {
    console.info('[IMPETUS_VISIBILITY]', JSON.stringify(entry));
  }
}

// ─── Estado inicial governado ─────────────────────────────────────────────────
/**
 * Estado inicial das seções baseado na política de governança ativa.
 * Com flag ON: inicia em SAFE_MINIMAL_SECTIONS até a API confirmar — deny-first.
 * Com flag OFF: inicia em DEFAULT_SECTIONS_OPEN — fail-open legacy (histórico).
 *
 * DEFAULT_SECTIONS_OPEN é semanticamente idêntico ao ALL_TRUE anterior,
 * garantindo retrocompatibilidade byte-a-byte quando a flag está desligada.
 */
function _getInitialSections() {
  return isFailsafeGovernanceEnabled()
    ? { ...SAFE_MINIMAL_SECTIONS }
    : { ...DEFAULT_SECTIONS_OPEN };
}

export function useDashboardVisibility() {
  const [sections, setSections] = useState(_getInitialSections);
  const [userContext, setUserContext] = useState(null);
  const [languageInstruction, setLanguageInstruction] = useState('');
  const [focus, setFocus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failsafe, setFailsafe] = useState(false);
  // Telemetria de governança: contador de fallbacks nesta sessão de página.
  // Exposto para dashboards internos e OpenTelemetry futuro.
  const [_fallbackCount, setFallbackCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const denyFirst = isFailsafeGovernanceEnabled();

    dashboard
      .getVisibility()
      .then((r) => {
        if (!isMountedRef.current) return;
        const data = r.data;
        const backendFailsafe = !!data?.failsafe;
        setFailsafe(backendFailsafe);

        // Backend sinalizou failsafe (SAFE_MINIMAL_EXPOSURE) — respeitar deny-first
        // independentemente da flag local. O backend é autoridade de governança.
        if (backendFailsafe && denyFirst) {
          setSections({ ...SAFE_MINIMAL_SECTIONS });
          _logVisibilityEvent('visibility_deny_mode_enabled', {
            reason: 'backend_failsafe_signal',
            source: 'api_response',
          });
          return;
        }

        if (data?.sections && typeof data.sections === 'object') {
          const merged = { ...DEFAULT_SECTIONS_OPEN, ...data.sections };
          const anyOn = Object.values(merged).some(Boolean);
          setSections(anyOn ? merged : { ...DEFAULT_SECTIONS_OPEN });
          _logVisibilityEvent('visibility_sections_loaded', {
            sections_keys: Object.keys(data.sections).length,
            any_on: anyOn,
            backend_failsafe: backendFailsafe,
            deny_first_active: denyFirst,
          });
        }
        if (data?.userContext) setUserContext(data.userContext);
        if (data?.languageInstruction) setLanguageInstruction(data.languageInstruction);
        if (Array.isArray(data?.focus)) setFocus(data.focus);
      })
      .catch((err) => {
        if (!isMountedRef.current) return;

        const errorMeta = {
          error: err?.message || 'unknown',
          http_status: err?.response?.status ?? null,
          deny_first_active: denyFirst,
        };

        _logVisibilityEvent('visibility_api_failure', errorMeta);

        if (denyFirst) {
          // ── Deny-first governado ──────────────────────────────────────────
          // Exposição mínima segura — sem módulos cognitivos privilegiados,
          // sem executive cockpit, sem runtime avançado.
          setSections({ ...SAFE_MINIMAL_SECTIONS });
          setFailsafe(true);
          setFallbackCount((c) => c + 1);

          const hiddenCount = Object.values(SAFE_MINIMAL_SECTIONS).filter((v) => !v).length;
          _logVisibilityEvent('visibility_fallback_triggered', {
            ...errorMeta,
            fallback_policy: 'SAFE_MINIMAL_SECTIONS',
          });
          _logVisibilityEvent('visibility_deny_mode_enabled', {
            reason: 'api_failure',
            fallback_policy: 'SAFE_MINIMAL_SECTIONS',
          });
          _logVisibilityEvent('modules_hidden_by_failsafe', {
            hidden_count: hiddenCount,
            total_sections: Object.keys(SAFE_MINIMAL_SECTIONS).length,
          });
        } else {
          // ── Fail-open legacy (flag OFF) ───────────────────────────────────
          // Comportamento histórico preservado byte-a-byte para retrocompatibilidade.
          setSections({ ...DEFAULT_SECTIONS_OPEN });
          setFailsafe(false);
          _logVisibilityEvent('visibility_fallback_triggered', {
            ...errorMeta,
            fallback_policy: 'DEFAULT_SECTIONS_OPEN_LEGACY',
          });
        }
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    sections,
    userContext,
    languageInstruction,
    focus,
    loading,
    failsafe,
    // Telemetria de governança — para observabilidade interna e OpenTelemetry futuro
    _fallbackCount,
  };
}

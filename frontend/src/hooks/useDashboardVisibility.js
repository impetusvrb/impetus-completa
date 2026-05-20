/**
 * Hook para obter seções visíveis + contexto organizacional
 * Personalização por área, cargo e setor (Dashboard Inteligente Adaptativo)
 *
 * Fase E: fail-open substituído por SAFE_MINIMAL_SECTIONS quando failsafe ativo.
 */
import { useState, useEffect, useRef } from 'react';
import { dashboard } from '../services/api';
import {
  DEFAULT_SECTIONS_OPEN,
  SAFE_MINIMAL_SECTIONS,
  isFailsafeGovernanceEnabled
} from '../policyEngine/safeMinimalPolicy';

export function useDashboardVisibility() {
  const [sections, setSections] = useState(() =>
    isFailsafeGovernanceEnabled() ? { ...SAFE_MINIMAL_SECTIONS } : { ...DEFAULT_SECTIONS_OPEN }
  );
  const [userContext, setUserContext] = useState(null);
  const [languageInstruction, setLanguageInstruction] = useState('');
  const [focus, setFocus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failsafe, setFailsafe] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    dashboard
      .getVisibility()
      .then((r) => {
        if (!isMountedRef.current) return;
        const data = r.data;
        setFailsafe(false);
        if (data?.sections && typeof data.sections === 'object') {
          setSections({ ...DEFAULT_SECTIONS_OPEN, ...data.sections });
        } else if (data?.failsafe) {
          setSections({ ...SAFE_MINIMAL_SECTIONS });
          setFailsafe(true);
        }
        if (data?.userContext) setUserContext(data.userContext);
        if (data?.languageInstruction) setLanguageInstruction(data.languageInstruction);
        if (Array.isArray(data?.focus)) setFocus(data.focus);
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        if (isFailsafeGovernanceEnabled()) {
          setSections({ ...SAFE_MINIMAL_SECTIONS });
          setFailsafe(true);
          if (typeof console !== 'undefined') {
            console.warn(
              JSON.stringify({
                event: 'COGNITIVE_FAILSAFE_TRIGGERED',
                phase: 'frontend_visibility_hook',
                ts: new Date().toISO() 
              })
            );
          }
        }
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { sections, userContext, languageInstruction, focus, loading, failsafe };
}

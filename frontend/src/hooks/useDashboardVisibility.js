/**
 * Hook para obter seções visíveis + contexto organizacional
 * Personalização por área, cargo e setor (Dashboard Inteligente Adaptativo)
 *
 * Em falha de rede/API: fail-open (secções abertas) para não deixar o dashboard vazio.
 */
import { useState, useEffect, useRef } from 'react';
import { dashboard } from '../services/api';

const ALL_TRUE = {
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

export function useDashboardVisibility() {
  const [sections, setSections] = useState(() => ({ ...ALL_TRUE }));
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
        setFailsafe(!!data?.failsafe);
        if (data?.sections && typeof data.sections === 'object') {
          const merged = { ...ALL_TRUE, ...data.sections };
          const anyOn = Object.values(merged).some(Boolean);
          setSections(anyOn ? merged : { ...ALL_TRUE });
        }
        if (data?.userContext) setUserContext(data.userContext);
        if (data?.languageInstruction) setLanguageInstruction(data.languageInstruction);
        if (Array.isArray(data?.focus)) setFocus(data.focus);
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setSections({ ...ALL_TRUE });
        setFailsafe(false);
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

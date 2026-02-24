/**
 * Hook para obter seções visíveis + contexto organizacional
 * Personalização por área, cargo e setor (Dashboard Inteligente Adaptativo)
 */
import { useState, useEffect, useRef } from 'react';
import { dashboard } from '../services/api';

const ALL_TRUE = {
  operational_interactions: true,
  ai_insights: true,
  monitored_points: true,
  proposals: true,
  trend_chart: true,
  points_chart: true,
  insights_list: true,
  recent_interactions: true,
  smart_summary: true,
  plc_alerts: true,
  kpi_request: true,
  communication_panel: true
};

export function useDashboardVisibility() {
  const [sections, setSections] = useState(ALL_TRUE);
  const [userContext, setUserContext] = useState(null);
  const [languageInstruction, setLanguageInstruction] = useState('');
  const [focus, setFocus] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    dashboard
      .getVisibility()
      .then((r) => {
        if (!isMountedRef.current) return;
        const data = r.data;
        if (data?.sections && typeof data.sections === 'object') {
          setSections({ ...ALL_TRUE, ...data.sections });
        }
        if (data?.userContext) setUserContext(data.userContext);
        if (data?.languageInstruction) setLanguageInstruction(data.languageInstruction);
        if (Array.isArray(data?.focus)) setFocus(data.focus);
      })
      .catch(() => {
        if (isMountedRef.current) setSections(ALL_TRUE);
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { sections, userContext, languageInstruction, focus, loading };
}

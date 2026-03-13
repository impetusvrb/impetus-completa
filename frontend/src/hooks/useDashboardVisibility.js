import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';

export function useDashboardVisibility() {
  const [sections, setSections] = useState({
    smart_summary: true,
    kpi_request: true,
    plc_alerts: true,
    trend_chart: true,
    points_chart: true,
    recent_interactions: true,
    insights_list: true,
  });
  const [userContext, setUserContext] = useState(null);

  const fetchVisibility = useCallback(async () => {
    try {
      const r = await dashboard.getVisibility();
      if (r?.data?.sections) setSections(r.data.sections);
      const u = await dashboard.getUserContext();
      if (u?.data) setUserContext(u.data);
    } catch {
      // Fallback: manter defaults
    }
  }, []);

  useEffect(() => { fetchVisibility(); }, [fetchVisibility]);

  return { sections, userContext };
}

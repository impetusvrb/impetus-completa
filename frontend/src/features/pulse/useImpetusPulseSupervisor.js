import { useCallback, useEffect, useRef, useState } from 'react';
import { pulse } from '../../services/api';
import { useDashboardBoot } from '../../runtimeBoot/DashboardBootContext';

const POLL_MS = 120000;

export function useImpetusPulseSupervisor() {
  const { phase } = useDashboardBoot();
  const [pending, setPending] = useState([]);
  const timer = useRef(null);

  const poll = useCallback(async () => {
    try {
      const token = localStorage.getItem('impetus_token');
      if (!token) return;
      const r = await pulse.getSupervisorPending();
      setPending(r.data?.pending || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (phase < 3) return undefined;
    poll();
    timer.current = setInterval(poll, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll, phase]);

  return { pending, refresh: poll };
}

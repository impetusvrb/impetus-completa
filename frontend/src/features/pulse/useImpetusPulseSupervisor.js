import { useCallback, useEffect, useRef, useState } from 'react';
import { pulse } from '../../services/api';

const POLL_MS = 120000;

export function useImpetusPulseSupervisor() {
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
    poll();
    timer.current = setInterval(poll, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  return { pending, refresh: poll };
}

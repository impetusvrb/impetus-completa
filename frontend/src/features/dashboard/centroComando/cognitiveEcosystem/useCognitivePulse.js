import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../../../../services/api';

const POLL_MS = 8000;

export default function useCognitivePulse() {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    return dashboard
      .getCognitivePulse()
      .then((r) => {
        const data = r?.data;
        if (data?.ok) {
          setPulse(data);
          setError(null);
        }
      })
      .catch((e) => {
        setError(e?.message || 'Pulso indisponível');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { pulse, loading, error, refresh };
}

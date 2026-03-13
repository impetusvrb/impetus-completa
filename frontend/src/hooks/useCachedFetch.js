import { useState, useEffect, useCallback } from 'react';

const cache = new Map();

export function useCachedFetch(key, fetcher, { ttlMs = 60000 } = {}) {
  const [data, setData] = useState(null);

  const fetch = useCallback(async () => {
    const cached = cache.get(key);
    if (cached && cached.exp > Date.now()) {
      setData(cached.data);
      return cached.data;
    }
    try {
      const res = await fetcher();
      const parsed = res?.data ?? res;
      cache.set(key, { data: parsed, exp: Date.now() + ttlMs });
      setData(parsed);
      return parsed;
    } catch {
      setData(null);
      return null;
    }
  }, [key, fetcher, ttlMs]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, refetch: fetch };
}

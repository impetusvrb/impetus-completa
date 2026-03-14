/**
 * HOOK useCachedFetch - FASE 4
 * Cache em memória para dados da API (LRU, evita memory leak)
 * Proteção contra setState após unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Cache global LRU: limite de entradas, remove as mais antigas
const MAX_CACHE_ENTRIES = 100;
const DEFAULT_TTL = 2 * 60 * 1000; // 2 min
const cache = new Map();
const cacheKeys = []; // Ordem de acesso para LRU

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    const i = cacheKeys.indexOf(key);
    if (i >= 0) cacheKeys.splice(i, 1);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttlMs = DEFAULT_TTL) {
  // LRU: remover entradas antigas se exceder limite
  while (cache.size >= MAX_CACHE_ENTRIES && cacheKeys.length > 0) {
    const oldest = cacheKeys.shift();
    cache.delete(oldest);
  }

  const i = cacheKeys.indexOf(key);
  if (i >= 0) cacheKeys.splice(i, 1);
  cacheKeys.push(key);

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * Hook para buscar dados com cache em memória
 * @param {string} cacheKey - Chave única do cache
 * @param {Function} fetchFn - Função async que retorna os dados (ex: () => api.get('/x'))
 * @param {Object} options - { ttlMs, enabled }
 * @returns { { data, loading, error, refetch } }
 */
export function useCachedFetch(cacheKey, fetchFn, options = {}) {
  const { ttlMs = DEFAULT_TTL, enabled = true } = options;
  const [data, setData] = useState(() => getCached(cacheKey));
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    const cached = forceRefresh ? null : getCached(cacheKey);
    if (cached && !forceRefresh) {
      if (isMountedRef.current) {
        setData(cached);
        setLoading(false);
      }
      return;
    }
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchFn();
      const value = result?.data ?? result;
      setCached(cacheKey, value, ttlMs);
      if (isMountedRef.current) {
        setData(value);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        if (cached) setData(cached);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchFn, ttlMs, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

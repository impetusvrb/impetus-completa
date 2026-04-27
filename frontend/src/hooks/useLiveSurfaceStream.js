import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, dashboard } from '../services/api';

function buildLiveSurfaceStreamUrl(token) {
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  if (API_URL === '/api') {
    return `/api/dashboard/live-surface/stream${q}`;
  }
  const base = API_URL.endsWith('/api') ? API_URL : `${String(API_URL).replace(/\/$/, '')}/api`;
  return `${base}/dashboard/live-surface/stream${q}`;
}

function readToken() {
  try {
    return localStorage.getItem('impetus_token') || '';
  } catch {
    return '';
  }
}

/**
 * Superfície dinâmica: tenta SSE (`/dashboard/live-surface/stream`); em falha, faz polling de `getLiveSurface`.
 * @param {{ enabled?: boolean, pollMs?: number }} opts
 */
export function useLiveSurfaceStream({ enabled = true, pollMs = 20000 } = {}) {
  const [surface, setSurface] = useState(null);
  const [sseActive, setSseActive] = useState(false);
  const pollTimerRef = useRef(null);
  const esRef = useRef(null);
  const sseLoggedRef = useRef(false);
  const liveConnectedRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchSurface = useCallback(async () => {
    try {
      const { data } = await dashboard.getLiveSurface();
      if (data && data.ok && data.surface) {
        setSurface(data.surface);
        if (!liveConnectedRef.current) {
          liveConnectedRef.current = true;
          console.info('[LIVE_SURFACE_CONNECTED]');
        }
      }
    } catch (e) {
      console.warn('[LIVE_SURFACE_POLL]', e && e.message ? e.message : e);
    }
  }, []);

  const startPoll = useCallback(() => {
    clearPoll();
    pollTimerRef.current = window.setInterval(() => {
      fetchSurface();
    }, pollMs);
  }, [clearPoll, fetchSurface, pollMs]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    fetchSurface();

    const token = readToken();
    const url = buildLiveSurfaceStreamUrl(token);
    let es = null;

    try {
      es = new EventSource(url);
      esRef.current = es;
    } catch (e) {
      console.warn('[SSE_STREAM_UNAVAILABLE]', e && e.message ? e.message : e);
      startPoll();
      return () => {
        cancelled = true;
        clearPoll();
      };
    }

    es.addEventListener('surface', (ev) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse(ev.data);
        if (payload && payload.ok && payload.surface) {
          setSurface(payload.surface);
          setSseActive(true);
          clearPoll();
          if (!sseLoggedRef.current) {
            sseLoggedRef.current = true;
            console.info('[SSE_STREAM_ACTIVE]');
          }
        }
      } catch (_) {
        /* ignora frame inválido */
      }
    });

    es.addEventListener('error', () => {
      if (cancelled) return;
      setSseActive(false);
      try {
        es.close();
      } catch (_) {
        /* ignore */
      }
      esRef.current = null;
      startPoll();
    });

    return () => {
      cancelled = true;
      clearPoll();
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch (_) {
          /* ignore */
        }
        esRef.current = null;
      }
    };
  }, [enabled, fetchSurface, startPoll, clearPoll]);

  return { surface, sseActive, refresh: fetchSurface };
}

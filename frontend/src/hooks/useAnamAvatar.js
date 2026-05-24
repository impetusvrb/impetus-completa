/**
 * Stream Anam no círculo vazio (#impetus-anam-avatar-slot).
 * Sessão única via anamSessionSingleton (anti duplicata / concurrency limit).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireAnamStream,
  releaseAnamStream,
  stopAnamStreamNow,
  isAnamSessionActive,
  ANAM_STREAM_READY_EVENT,
  ClientError
} from '../services/anamSessionSingleton';

const ANAM_FLAG = String(import.meta.env.VITE_ANAM_AVATAR_ENABLED ?? 'true')
  .trim()
  .toLowerCase();
const ANAM_UI_ENABLED =
  ANAM_FLAG !== 'false' && ANAM_FLAG !== '0' && ANAM_FLAG !== 'off';

const PUBLIC_CONFIG_TTL_MS = 120_000;
let publicConfigCache = { at: 0, result: null };

function apiRoot() {
  const raw = String(import.meta.env.VITE_API_URL || '/api').trim();
  if (!raw || raw === '/api') {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/api`;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
  }
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/${raw.replace(/^\//, '')}`;
}

function messageForHttpStatus(status, bodyText = '') {
  if (status === 429) {
    if (/concurrent|concurrency|paralel/i.test(bodyText)) {
      return 'Limite de 1 sessão Anam em paralelo. Feche outras abas do Impetus ou aguarde ~1 minuto.';
    }
    if (/anam|ANAM|Anam Lab/i.test(bodyText)) {
      return 'Limite da API Anam (429). Aguarde 2–3 minutos e tente de novo.';
    }
    return 'Muitas requisições ao servidor (429). Aguarde ~1 minuto e abra o painel de voz novamente.';
  }
  if (status === 503) {
    return 'Anam não configurado no servidor (ANAM_API_KEY em backend/.env). Reinicie o backend após configurar.';
  }
  if (status === 401 || status === 403) {
    return 'Sessão expirada — saia e entre de novo no Impetus.';
  }
  return `Anam indisponível (HTTP ${status}).`;
}

async function fetchAnamServerReady({ force = false } = {}) {
  const now = Date.now();
  if (!force && publicConfigCache.result && now - publicConfigCache.at < PUBLIC_CONFIG_TTL_MS) {
    return publicConfigCache.result;
  }

  const url = `${apiRoot()}/anam/public-config`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const ct = String(res.headers.get('content-type') || '');
    let body = null;
    if (ct.includes('application/json')) {
      body = await res.json().catch(() => null);
    }
    if (!res.ok) {
      const reason = messageForHttpStatus(res.status, body?.error || '');
      console.warn('[anam] public-config HTTP', res.status, url);
      const result = { ok: false, reason, status: res.status };
      publicConfigCache = { at: now, result };
      return result;
    }
    if (!body) {
      const result = { ok: false, reason: 'resposta inválida (HTML em vez de JSON)' };
      publicConfigCache = { at: now, result };
      return result;
    }
    if (body?.enabled) {
      const result = { ok: true };
      publicConfigCache = { at: now, result };
      return result;
    }
    const result = {
      ok: false,
      reason: body?.reason || 'ANAM_API_KEY ausente no backend/.env'
    };
    publicConfigCache = { at: now, result };
    return result;
  } catch (err) {
    console.warn('[anam] public-config fetch failed', url, err);
    return { ok: false, reason: err?.message || 'rede' };
  }
}

function isConcurrencyError(err) {
  const code = err?.code || '';
  const msg = `${err?.message || ''} ${err?.details?.cause || ''}`;
  return (
    code === 'CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED' ||
    /concurrent|concurrency|paralel|outra aba/i.test(msg)
  );
}

function formatAnamClientError(err) {
  const code = err?.code || '';
  if (code === 'CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED') {
    return 'Limite de 1 sessão Anam em paralelo. Feche outras abas ou aguarde a sessão anterior encerrar (~1 min).';
  }
  if (code === 'CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED') {
    return 'Limite de uso Anam atingido. Aguarde ou atualize o plano no Anam Lab.';
  }

  const cause =
    err?.details?.cause ||
    err?.cause ||
    (typeof err?.details === 'string' ? err.details : '') ||
    '';
  const base = String(err?.message || 'Falha ao ligar stream Anam.');
  if (/concurrent|concurrency/i.test(base) || /concurrent|concurrency/i.test(String(cause))) {
    return 'Limite de 1 sessão Anam em paralelo. Evite abrir o painel de voz em duas abas ao mesmo tempo.';
  }
  if (/persona.*not found/i.test(String(cause)) || /persona.*not found/i.test(base)) {
    return 'Persona Anam não encontrada nesta conta. Atualize ANAM_PERSONA_ID no backend/.env (Anam Lab → Personas).';
  }
  if (base === 'Unknown error when starting session' && cause) {
    return `Anam: ${cause}`;
  }
  if (cause && !base.includes(cause)) {
    return `${base} (${cause})`;
  }
  return base;
}

async function waitForMount(ref, maxMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (ref.current) return ref.current;
    await new Promise((r) => setTimeout(r, 40));
  }
  return null;
}

export function useAnamAvatar({ active = false, onError = null, onReady = null } = {}) {
  const slotRef = useRef(null);
  const acquiredRef = useRef(false);
  const connectGenRef = useRef(0);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  const [streaming, setStreaming] = useState(false);
  const [configured, setConfigured] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    onErrorRef.current = onError;
    onReadyRef.current = onReady;
  }, [onError, onReady]);

  const refreshConfig = useCallback(async (opts = {}) => {
    if (!ANAM_UI_ENABLED) {
      setConfigured(false);
      return { ok: false, reason: 'UI desligada' };
    }
    const result = await fetchAnamServerReady(opts);
    setConfigured(result.ok);
    return result;
  }, []);

  useEffect(() => {
    if (!ANAM_UI_ENABLED) return undefined;
    void refreshConfig();
    return undefined;
  }, [refreshConfig]);

  useEffect(() => {
    if (!ANAM_UI_ENABLED || !active) {
      return undefined;
    }

    const gen = ++connectGenRef.current;
    let cancelled = false;
    acquiredRef.current = true;

    const markStreaming = () => {
      setStreaming(true);
      setStatus('streaming');
      onReadyRef.current?.();
    };

    const onStreamReady = () => {
      if (!cancelled) markStreaming();
    };
    window.addEventListener(ANAM_STREAM_READY_EVENT, onStreamReady);

    const run = async () => {
      const insecure = typeof window !== 'undefined' && !window.isSecureContext;
      if (insecure) {
        onErrorRef.current?.(
          'Aviso: sem HTTPS o microfone/WebRTC podem falhar. Para produção, use SSL no servidor.'
        );
      }

      setStatus('checking');
      const cfg = await refreshConfig();
      if (cancelled || gen !== connectGenRef.current) return;

      if (!cfg.ok) {
        setStatus('unconfigured');
        onErrorRef.current?.(cfg.reason || 'Anam indisponível no servidor.');
        return;
      }

      setStatus('connecting');
      const mount = await waitForMount(slotRef);
      if (cancelled || gen !== connectGenRef.current) return;
      if (!mount) {
        setStatus('error');
        onErrorRef.current?.('Área do avatar não montada. Feche e abra o painel novamente.');
        return;
      }

      const tryConnect = async () => {
        await acquireAnamStream({ mountEl: mount });
        if (isAnamSessionActive()) {
          markStreaming();
          return;
        }
        for (let i = 0; i < 40; i += 1) {
          await new Promise((r) => setTimeout(r, 250));
          if (isAnamSessionActive()) {
            markStreaming();
            return;
          }
        }
        throw new Error('Stream Anam não ficou ativo. Recarregue a página (Ctrl+F5).');
      };

      try {
        try {
          await tryConnect();
        } catch (firstErr) {
          if (!isConcurrencyError(firstErr) || cancelled || gen !== connectGenRef.current) {
            throw firstErr;
          }
          setStatus('connecting');
          onErrorRef.current?.('A libertar sessão Anam anterior… aguarde alguns segundos.');
          await stopAnamStreamNow().catch(() => {});
          await new Promise((r) => setTimeout(r, 6_000));
          if (cancelled || gen !== connectGenRef.current) return;
          await tryConnect();
        }
      } catch (err) {
        if (isConcurrencyError(err)) {
          await stopAnamStreamNow().catch(() => {});
        }
        if (isAnamSessionActive()) {
          markStreaming();
          return;
        }
        if (gen !== connectGenRef.current) return;
        const httpStatus = err?.response?.status;
        const apiCode = err?.response?.data?.code;
        let msg;
        if (err instanceof ClientError || err?.code?.startsWith?.('CLIENT_ERROR_CODE_')) {
          msg = formatAnamClientError(err);
        } else {
          msg =
            err?.response?.data?.error ||
            err?.response?.data?.details?.message ||
            err?.message ||
            'Falha ao ligar stream Anam.';
          if (httpStatus === 429 || apiCode === 'ANAM_RATE_LIMIT') {
            msg =
              err?.response?.data?.error ||
              'Limite da API Anam (429). Aguarde 2–3 minutos antes de abrir o painel de voz de novo.';
          } else if (httpStatus === 401 || httpStatus === 403) {
            msg = 'Sessão expirada — saia e entre de novo no Impetus.';
          } else if (httpStatus) {
            msg = messageForHttpStatus(httpStatus, msg);
          } else {
            msg = formatAnamClientError(err);
          }
        }
        setStatus('error');
        onErrorRef.current?.(msg);
      }
    };

    void run();

    const connectWatchdog = setTimeout(() => {
      if (cancelled || gen !== connectGenRef.current) return;
      if (isAnamSessionActive()) {
        markStreaming();
        return;
      }
      setStatus('error');
      onErrorRef.current?.(
        'Ligação Anam demorou demais. Feche o painel, aguarde 10s e abra de novo (uma só aba).'
      );
    }, 32_000);

    return () => {
      cancelled = true;
      clearTimeout(connectWatchdog);
      window.removeEventListener(ANAM_STREAM_READY_EVENT, onStreamReady);
    };
  }, [active, refreshConfig]);

  useEffect(() => {
    if (!ANAM_UI_ENABLED) return undefined;
    if (!active) {
      setStatus('idle');
      setStreaming(false);
      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseAnamStream();
      }
      return undefined;
    }
    const sync = () => {
      if (isAnamSessionActive()) {
        setStreaming(true);
        setStatus((prev) => (prev === 'error' || prev === 'unconfigured' ? prev : 'streaming'));
      }
    };
    sync();
    const iv = setInterval(sync, 700);
    return () => clearInterval(iv);
  }, [active]);

  return {
    slotRef,
    streaming,
    status,
    enabled: ANAM_UI_ENABLED && configured === true,
    configured
  };
}

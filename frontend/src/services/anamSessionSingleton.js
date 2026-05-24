/**
 * Uma única sessão Anam por aba — evita "Concurrency limit reached".
 * Estado em window.__impetusAnamG sobrevive a HMR do Vite.
 */
import { createClient, ClientError, AnamEvent } from '@anam-ai/js-sdk';
import { anam } from './api';
import {
  buildAnamOpeningLine,
  getAnamSessionContextPayload
} from '../utils/anamGreeting';
import { wireAnamPanelBridge, unwireAnamPanelBridge } from './anamPanelBridge';

const SHARED_VIDEO_ID = 'impetus-anam-shared-video';
const SHARED_AUDIO_ID = 'impetus-anam-shared-audio';
const UNMOUNT_GRACE_MS = 800;
const TAB_LOCK_KEY = 'impetus_anam_tab_lock';
const TAB_LOCK_TTL_MS = 12_000;
const CONCURRENCY_WAITS_MS = [2_000, 5_000, 8_000, 12_000];
const CONNECT_TIMEOUT_MS = 45_000;

export const ANAM_STREAM_READY_EVENT = 'impetus-anam-stream-ready';

function notifyAnamStreamReady() {
  if (typeof window === 'undefined') return;
  window.__impetusAnamConnected = true;
  window.dispatchEvent(new CustomEvent(ANAM_STREAM_READY_EVENT));
}

let connectMutex = Promise.resolve();

function getTabId() {
  if (typeof window === 'undefined') return 'ssr';
  if (!window.__impetusAnamTabId) {
    window.__impetusAnamTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return window.__impetusAnamTabId;
}

function getState() {
  if (typeof window === 'undefined') {
    return {
      client: null,
      videoEl: null,
      consumers: 0,
      connectPromise: null,
      graceTimer: null,
      stopTimer: null,
      greetingTimer: null,
      streaming: false,
      stopInFlight: null,
      openingTalkDone: false
    };
  }
  if (!window.__impetusAnamG) {
    window.__impetusAnamG = {
      client: null,
      videoEl: null,
      consumers: 0,
      connectPromise: null,
      graceTimer: null,
      stopTimer: null,
      streaming: false,
      stopInFlight: null,
      openingTalkDone: false
    };
  }
  return window.__impetusAnamG;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clearTimers(g) {
  if (g.graceTimer) {
    clearTimeout(g.graceTimer);
    g.graceTimer = null;
  }
  if (g.stopTimer) {
    clearTimeout(g.stopTimer);
    g.stopTimer = null;
  }
  if (g.openingTalkTimer) {
    clearTimeout(g.openingTalkTimer);
    g.openingTalkTimer = null;
  }
  if (g.openingTalkFallbackTimer) {
    clearTimeout(g.openingTalkFallbackTimer);
    g.openingTalkFallbackTimer = null;
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

function runConnectExclusive(fn) {
  const run = connectMutex.then(() => fn());
  connectMutex = run.catch(() => {});
  return run;
}

function tryAcquireTabLock() {
  if (typeof window === 'undefined') return { ok: true };
  const tabId = getTabId();
  const now = Date.now();
  try {
    const raw = localStorage.getItem(TAB_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      const stale = now - (lock.at || 0) >= TAB_LOCK_TTL_MS;
      const otherTab = lock.tabId && lock.tabId !== tabId;
      if (otherTab && !stale) {
        /* Após refresh o tabId muda — não bloquear; a API Anam trata concorrência. */
        console.warn('[anam] lock de outra sessão; a assumir ligação nesta aba.');
        localStorage.removeItem(TAB_LOCK_KEY);
      } else if (stale) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    }
    localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ tabId, at: now }));
    return { ok: true };
  } catch (_) {
    return { ok: true };
  }
}

function releaseTabLock() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TAB_LOCK_KEY);
    if (!raw) return;
    const lock = JSON.parse(raw);
    if (lock.tabId === getTabId()) {
      localStorage.removeItem(TAB_LOCK_KEY);
    }
  } catch (_) {}
}

function styleAnamVideoEl(el) {
  el.className = 'voice-avatar-external-slot__anam-video';
  el.autoplay = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', 'true');
  el.muted = false;
  el.defaultMuted = false;
}

function ensureSharedVideo(g) {
  let el = document.getElementById(SHARED_VIDEO_ID);
  if (!el) {
    el = document.createElement('video');
    el.id = SHARED_VIDEO_ID;
    styleAnamVideoEl(el);
    g.videoEl = el;
  } else {
    g.videoEl = el;
    styleAnamVideoEl(el);
  }
  return el;
}

function ensureSharedAudio(g) {
  let el = document.getElementById(SHARED_AUDIO_ID);
  if (!el) {
    el = document.createElement('audio');
    el.id = SHARED_AUDIO_ID;
    el.autoplay = true;
    el.setAttribute('playsinline', '');
    g.audioEl = el;
  } else {
    g.audioEl = el;
  }
  return el;
}

function mergeAnamStreams(g) {
  const ms = new MediaStream();
  if (g.pendingVideoStream) {
    g.pendingVideoStream.getVideoTracks().forEach((t) => ms.addTrack(t));
  }
  if (g.pendingAudioStream) {
    g.pendingAudioStream.getAudioTracks().forEach((t) => ms.addTrack(t));
  }
  return ms.getTracks().length ? ms : null;
}

async function playVideoElement(video) {
  if (!video) return;
  try {
    await video.play();
  } catch (_) {
    try {
      video.muted = true;
      await video.play();
      video.muted = false;
    } catch (e2) {
      console.warn('[anam] video.play', e2?.message || e2);
    }
  }
}

function bindAnamMediaToDom(g) {
  const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
  if (!video) return;

  const merged = mergeAnamStreams(g);
  if (merged) {
    video.srcObject = merged;
    void playVideoElement(video);
    return;
  }

  if (g.pendingVideoStream) {
    video.srcObject = g.pendingVideoStream;
    void playVideoElement(video);
  }
}

function bindVideoStream(stream, g) {
  if (!stream) return;
  g.pendingVideoStream = stream;
  bindAnamMediaToDom(g);
  notifyAnamStreamReady();
}

function bindAudioStream(stream, g) {
  if (!stream) return;
  g.pendingAudioStream = stream;

  const audio = ensureSharedAudio(g);
  audio.srcObject = stream;
  void audio.play().catch(() => {});

  bindAnamMediaToDom(g);
}

function resolveAnamMountEl(g, mountEl) {
  return (
    mountEl ||
    g.lastMountEl ||
    (typeof document !== 'undefined'
      ? document.querySelector('[data-anam-mount="true"]')
      : null)
  );
}

async function waitForVideoInDocument(g, mountEl, maxMs = 10_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const target = resolveAnamMountEl(g, mountEl);
    if (target) g.lastMountEl = target;
    mountVideoTo(g, target);
    const el = document.getElementById(SHARED_VIDEO_ID);
    if (el?.isConnected) {
      g.videoEl = el;
      return el;
    }
    await sleep(60);
  }
  throw new Error(
    'Elemento de vídeo Anam não encontrado no DOM. Feche o painel, aguarde 2s e abra de novo.'
  );
}

function mountVideoTo(g, mountEl) {
  const video = ensureSharedVideo(g);
  const audio = ensureSharedAudio(g);

  if (mountEl) {
    mountEl.style.position = 'relative';
    if (video.parentElement !== mountEl && !mountEl.contains(video)) {
      mountEl.appendChild(video);
    }
    if (audio.parentElement !== mountEl && !mountEl.contains(audio)) {
      audio.style.cssText =
        'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
      mountEl.appendChild(audio);
    }
  }

  bindAnamMediaToDom(g);
  return video;
}

async function prepareServerSlot() {
  try {
    await anam.prepareSession();
  } catch (_) {
    /* opcional */
  }
}

async function ensureStoppedBeforeConnect(g) {
  if (g.streaming && g.client) return;
  if (g.stopInFlight) {
    await Promise.race([g.stopInFlight.catch(() => {}), sleep(8_000)]);
  }
  if (g.connectPromise) {
    await Promise.race([g.connectPromise.catch(() => {}), sleep(12_000)]);
  }
  if (g.client || g.streaming) {
    await stopAnamStreamNow();
    await prepareServerSlot();
    await sleep(600);
  }
}

function attachSessionContext(client) {
  if (!client?.addContext) return;
  const ctx = getAnamSessionContextPayload();
  const period =
    ctx.localHour >= 5 && ctx.localHour < 12
      ? 'manhã'
      : ctx.localHour >= 12 && ctx.localHour < 18
        ? 'tarde'
        : 'noite';
  try {
    const first = String(ctx.userDisplayName || '').trim().split(/\s+/)[0] || 'utilizador';
    client.addContext(
      `Utilizador: ${ctx.userDisplayName || first}; tratar por ${first}. Hora local ${ctx.localHour}h (${ctx.timezone}); período ${period}. Saudação já dita pelo sistema. Silêncio até o utilizador falar; proibido Olá, impulsionar ou novo cumprimento.`
    );
  } catch (_) {}
}

/** Única saudação: frase IMPETUS exata via talk() (skipGreeting no token). */
function scheduleOpeningTalk(client, g) {
  if (!client || g.openingTalkDone) return;

  const line = g.expectedOpeningLine || buildAnamOpeningLine();
  if (!line) return;

  let speakInFlight = false;

  const speakOnce = async () => {
    if (g.openingTalkDone || speakInFlight || g.client !== client) return;
    speakInFlight = true;
    try {
      if (typeof client.isStreaming === 'function' && !client.isStreaming()) return;
      try {
        client.interruptPersona?.();
      } catch (_) {}
      await sleep(400);
      if (g.openingTalkDone || g.client !== client) return;
      await client.talk(line);
      g.openingTalkDone = true;
      attachSessionContext(client);
    } catch (e) {
      console.warn('[anam] saudação talk', e?.message || e);
    } finally {
      speakInFlight = false;
    }
  };

  const armSpeak = (delayMs) => {
    if (g.openingTalkTimer) clearTimeout(g.openingTalkTimer);
    g.openingTalkTimer = setTimeout(() => {
      g.openingTalkTimer = null;
      void speakOnce();
    }, delayMs);
  };

  if (typeof client.addListener !== 'function') {
    armSpeak(900);
    return;
  }

  const onReady = () => {
    client.removeListener(AnamEvent.SESSION_READY, onReady);
    armSpeak(700);
  };
  client.addListener(AnamEvent.SESSION_READY, onReady);
  g.openingTalkFallbackTimer = setTimeout(() => {
    g.openingTalkFallbackTimer = null;
    if (!g.openingTalkDone && g.client === client) void speakOnce();
  }, 2800);
}

function attachStreamReadyListeners(client, g) {
  if (!client?.addListener || g.streamReadyListenerAttached) return;

  const onVideoStream = (stream) => bindVideoStream(stream, g);
  const onAudioStream = (stream) => bindAudioStream(stream, g);
  const onVideoPlay = () => notifyAnamStreamReady();
  const onReady = () => {
    bindAnamMediaToDom(g);
    notifyAnamStreamReady();
  };

  client.addListener(AnamEvent.VIDEO_STREAM_STARTED, onVideoStream);
  client.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStream);
  client.addListener(AnamEvent.VIDEO_PLAY_STARTED, onVideoPlay);
  client.addListener(AnamEvent.SESSION_READY, onReady);

  if (g.mediaFrameTimer) clearInterval(g.mediaFrameTimer);
  g.mediaFrameTimer = setInterval(() => {
    const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
    if (!video) return;
    if (g.pendingVideoStream && (!video.srcObject || video.videoWidth === 0)) {
      bindAnamMediaToDom(g);
    }
    if (video.videoWidth > 0) {
      notifyAnamStreamReady();
    }
  }, 800);

  g.streamReadyListenerAttached = true;
  g.streamReadyCleanup = () => {
    if (g.mediaFrameTimer) {
      clearInterval(g.mediaFrameTimer);
      g.mediaFrameTimer = null;
    }
    try {
      client.removeListener(AnamEvent.VIDEO_STREAM_STARTED, onVideoStream);
      client.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStream);
      client.removeListener(AnamEvent.VIDEO_PLAY_STARTED, onVideoPlay);
      client.removeListener(AnamEvent.SESSION_READY, onReady);
    } catch (_) {}
    g.streamReadyListenerAttached = false;
  };
}

async function connectOnceInternal(g) {
  g.openingTalkDone = false;
  g.userHasSpoken = false;
  g.sessionStartedAt = Date.now();
  g.expectedOpeningLine = buildAnamOpeningLine();
  const tokenRes = await anam.createSessionToken(getAnamSessionContextPayload());
  const sessionToken = tokenRes.data?.sessionToken;
  if (!sessionToken) {
    throw new Error('Sem sessionToken — faça login novamente.');
  }

  const client = createClient(sessionToken, { disableInputAudio: false });
  g.client = client;
  attachStreamReadyListeners(client, g);

  const connectWork = async () => {
    const v = await waitForVideoInDocument(g, g.lastMountEl);
    if (!document.getElementById(v.id)) {
      throw new Error(`StreamingClient: video element with id ${v.id} not found`);
    }
    await client.streamToVideoElement(v.id);
    g.streaming = true;
    notifyAnamStreamReady();
    wireAnamPanelBridge(client, g);
    scheduleOpeningTalk(client, g);
    return client;
  };

  try {
    return await Promise.race([
      connectWork(),
      sleep(CONNECT_TIMEOUT_MS).then(() => {
        throw new Error('Ligação Anam expirou (45s). Verifique rede, microfone e feche outras abas.');
      })
    ]);
  } catch (err) {
    try {
      await client.stopStreaming?.();
    } catch (_) {}
    g.client = null;
    g.streaming = false;
    window.__impetusAnamConnected = false;
    throw err;
  }
}

async function connectWithRetry(g) {
  if (g.streaming && g.client) {
    return g.client;
  }

  return runConnectExclusive(async () => {
    if (g.streaming && g.client) {
      return g.client;
    }
    if (g.connectPromise) {
      return g.connectPromise;
    }

    g.connectPromise = (async () => {
      await ensureStoppedBeforeConnect(g);

      let lastErr;
      for (let attempt = 0; attempt < CONCURRENCY_WAITS_MS.length; attempt += 1) {
        try {
          return await connectOnceInternal(g);
        } catch (err) {
          lastErr = err;
          if (!isConcurrencyError(err)) {
            throw err;
          }
          await stopAnamStreamNow();
          await prepareServerSlot();
          const waitMs = CONCURRENCY_WAITS_MS[attempt] || 12_000;
          await sleep(waitMs);
        }
      }
      throw lastErr;
    })();

    try {
      return await g.connectPromise;
    } finally {
      g.connectPromise = null;
    }
  });
}

/**
 * @param {{ mountEl: HTMLElement }} opts
 */
export async function acquireAnamStream({ mountEl }) {
  const g = getState();
  if (mountEl) g.lastMountEl = mountEl;
  tryAcquireTabLock();

  const openingThisVisit = g.consumers === 0;
  g.consumers += 1;
  clearTimers(g);

  if (g.streaming && g.client) {
    await waitForVideoInDocument(g, mountEl);
    bindAnamMediaToDom(g);
    wireAnamPanelBridge(g.client, g);
    notifyAnamStreamReady();
    /* Sem nova saudação ao reabrir overlay na mesma sessão */
    return { reused: true, videoId: SHARED_VIDEO_ID };
  }

  await connectWithRetry(g);
  return { reused: false, videoId: SHARED_VIDEO_ID };
}

export function releaseAnamStream() {
  const g = getState();
  g.consumers = Math.max(0, g.consumers - 1);
  if (g.consumers > 0) return;

  clearTimers(g);
  g.graceTimer = setTimeout(() => {
    g.graceTimer = null;
    if (g.consumers > 0) return;
    void stopAnamStreamNow();
  }, UNMOUNT_GRACE_MS);
}

export async function stopAnamStreamNow() {
  const g = getState();
  if (g.stopInFlight) {
    return g.stopInFlight;
  }

  g.stopInFlight = (async () => {
    clearTimers(g);
    g.consumers = 0;
    g.connectPromise = null;
    g.streaming = false;
  window.__impetusAnamConnected = false;
  g.openingTalkDone = false;
  unwireAnamPanelBridge(g);
  if (g.streamReadyCleanup) g.streamReadyCleanup();
  releaseTabLock();

    const client = g.client;
    g.client = null;
    if (client) {
      try {
        await client.stopStreaming?.();
      } catch (_) {}
    }

    const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
    if (video) {
      try {
        video.pause();
        video.srcObject = null;
      } catch (_) {}
      /* Mantém <video> no DOM (React) — não remover */
    }
    g.videoEl = video || null;
    g.pendingVideoStream = null;
    g.pendingAudioStream = null;

    const audio = g.audioEl || document.getElementById(SHARED_AUDIO_ID);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch (_) {}
    }
    g.audioEl = audio || null;

    await prepareServerSlot();
  })();

  try {
    await g.stopInFlight;
  } finally {
    g.stopInFlight = null;
  }
}

export function isAnamSessionActive() {
  const g = getState();
  return Boolean(g.streaming && g.client);
}

export { ClientError, SHARED_VIDEO_ID };

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(TAB_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (Date.now() - (lock.at || 0) > TAB_LOCK_TTL_MS) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    }
  } catch (_) {}

  window.addEventListener('beforeunload', () => {
    void stopAnamStreamNow();
  });

  window.addEventListener('impetus-logout', () => {
    void stopAnamStreamNow();
  });

  window.addEventListener('storage', (ev) => {
    if (ev.key === 'impetus_token' && !ev.newValue) {
      void stopAnamStreamNow();
    }
  });
}

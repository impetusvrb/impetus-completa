/**
 * Provider global da voz (Jarvis):
 * - Motor de voz único (useVoiceEngine)
 * - Overlay imersivo sempre disponível
 * - Botão flutuante global (alertas / speaking)
 * - Polling de alertas por voz (fora do AIChatPage)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardBoot } from '../runtimeBoot/DashboardBootContext';
import { useLocation } from 'react-router-dom';
import { ImpetusVoiceContext } from './ImpetusVoiceContext';
import { useVoiceEngine } from '../hooks/useVoiceEngine';
import { dashboard } from '../services/api';
import { handleVoiceAlert } from '../services/voiceAlertManager';
import ImpetusVoiceOverlay from '../components/ImpetusVoiceOverlay';
import ImpetusFloatButton from '../components/ImpetusFloatButton';
import { useRealtimePresenceBridge } from '../realtimePresence/useRealtimePresenceBridge';
import { useAnamAvatar } from '../hooks/useAnamAvatar';
import { isTransientOperationalMessage } from '../components/voiceOverlayStatusUtils';
import { VOICE_SESSION_CLOSE_EVENT } from './voiceSessionCloseIntent';
import { useNotification } from '../context/NotificationContext';
import {
  registerAnamPanelCommandHandler,
  registerVoicePanelMetaHandler
} from '../features/smartPanel/smartPanelEvents';
import { executePanelVoiceMeta, executePanelVoiceMetaWithMeta } from '../features/smartPanel/panelVoiceMetaExecutor';
import { registerPanelMetaDirectHandler } from '../features/smartPanel/smartPanelEvents';
import { markVoiceUserInitiated } from '../utils/defaultAppEntry';
import {
  beginWakeCooldown,
  isInWakeCooldown,
  scheduleWakeWordAfterCooldown
} from './voiceWakeCooldown';

export default function ImpetusVoiceProvider({ children }) {
  const wakeRestartTimerRef = useRef(null);

  const clearScheduledWakeRestart = useCallback(() => {
    if (wakeRestartTimerRef.current) {
      clearTimeout(wakeRestartTimerRef.current);
      wakeRestartTimerRef.current = null;
    }
  }, []);

  const scheduleWakeRestart = useCallback(
    (startFn, extraDelayMs = 0) => {
      clearScheduledWakeRestart();
      wakeRestartTimerRef.current = scheduleWakeWordAfterCooldown(startFn, extraDelayMs);
    },
    [clearScheduledWakeRestart]
  );

  const notify = useNotification();
  const location = useLocation();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [anamAlert, setAnamAlert] = useState(null);
  const [alertMinPriority, setAlertMinPriority] = useState('P2');
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(true);
  const alertsSeenRef = useRef(new Set());
  const voiceHistoryRef = useRef([]); // últimos turnos para contexto do LLM no modo voz
  const hasToken = useMemo(
    () => !!localStorage.getItem('impetus_token'),
    [location.pathname, location.key]
  );
  /** Com token: «Ok Impetus» em todo o software, exceto login/recuperação de senha e telas de licença. */
  const voiceExcludedPath = (p) => {
    const path = String(p || '');
    if (path === '/' || path === '') return true;
    if (path.startsWith('/forgot-password') || path.startsWith('/reset-password')) return true;
    if (path === '/license-expired' || path === '/subscription-expired') return true;
    return false;
  };
  const voiceEnabled = hasToken && !voiceExcludedPath(location.pathname);

  /** «Ok Impetus» depende da Web Speech API → só em HTTPS ou localhost. */
  const wakePhraseIssue = useMemo(() => {
    if (typeof window === 'undefined') return 'no-speech-api';
    if (!window.isSecureContext) return 'insecure';
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return 'no-speech-api';
    return null;
  }, []);
  const wakePhraseAvailable = wakePhraseIssue === null;

  const chatRound = useCallback(async (text) => {
    const history = voiceHistoryRef.current.slice(-12);
    const t = String(text || '');
    const tl = t.toLowerCase();
    const inferSentimentContext = () => {
      const urgent =
        /\b(urgente|agora|imediato|parar|pare|desligar|sair|stop|travou|travado|falhou|erro|falhou|risco|perigo|socorro|chama)\b/i.test(tl);
      const negative =
        /\b(não|erro|falhou|falha|ruim|péssimo|medo|assustado|parou|parada|quebrou|quebra|travou)\b/i.test(tl);
      const positive =
        /\b(obrigado|perfeito|funcionou|consegui|bom|ótimo|melhorou|sucesso)\b/i.test(tl);

      let sentiment = 'neutro';
      if (urgent) sentiment = 'urgente';
      else if (positive) sentiment = 'positivo';
      else if (negative) sentiment = 'negativo';

      return { sentiment };
    };

    const sentimentContext = inferSentimentContext();
    let panelContext = '';
    try {
      panelContext = String(sessionStorage.getItem('impetus_voice_last_panel_context') || '').trim();
    } catch (_) {
      panelContext = '';
    }
    const r = await dashboard.chat(text, history, {
      voiceMode: true,
      sentimentContext,
      panelContext
    });
    const reply =
      r.data?.ok && r.data?.reply ? r.data.reply : r.data?.fallback || 'Resposta temporariamente indisponível.';
    // atualiza histórico interno do modo voz (não interfere no chat UI)
    const next = [
      ...history,
      { role: 'user', content: String(text || '').slice(0, 2000) },
      { role: 'assistant', content: String(reply || '').slice(0, 2000) }
    ];
    voiceHistoryRef.current = next.slice(-14);
    return { reply, sentimentContext };
  }, []);

  const onSensitiveBlock = useCallback(() => {
    setOverlayOpen(true);
  }, []);

  const {
    voiceState,
    voiceBadge,
    ttsUi,
    videoLipSyncRef,
    toggleVoice: engineToggleVoice,
    speakText,
    speakNaturalReply,
    stopSpeaking,
    stopVoiceCapture,
    setAlertsEnabled,
    setVoicePrefs,
    startWakeWord,
    stopWakeWord,
    forceCleanupAudioSession
  } = useVoiceEngine({
    chatRound,
    onSensitiveBlock
  });

  const voiceStateRef = useRef(voiceState);
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  /** Evita reiniciar o intervalo de alertas quando callbacks do motor de voz mudam de identidade (causava rajadas de GET). */
  const speakNaturalReplyRef = useRef(speakNaturalReply);
  const stopSpeakingRef = useRef(stopSpeaking);
  const stopVoiceCaptureRef = useRef(stopVoiceCapture);
  const alertMinPriorityRef = useRef(alertMinPriority);
  speakNaturalReplyRef.current = speakNaturalReply;
  stopSpeakingRef.current = stopSpeaking;
  stopVoiceCaptureRef.current = stopVoiceCapture;
  alertMinPriorityRef.current = alertMinPriority;

  const startWakeWordRef = useRef(startWakeWord);
  const stopWakeWordRef = useRef(stopWakeWord);
  useEffect(() => {
    startWakeWordRef.current = startWakeWord;
    stopWakeWordRef.current = stopWakeWord;
  }, [startWakeWord, stopWakeWord]);

  const presenceBridgeEnabled =
    voiceEnabled && (overlayOpen || voiceState.isContinuous || voiceState.status !== 'idle');

  /** Presença Realtime: só frase final do utilizador (fase processing), não parciais em tempo real. */
  const presenceTranscript =
    voiceState.status === 'processing'
      ? String(voiceState.voicePanelUserText || '').trim()
      : '';

  const presenceBridge = useRealtimePresenceBridge({
    voiceStatus: voiceState.status,
    pathname: location.pathname,
    currentTranscript: presenceTranscript,
    debounceMs: 320,
    enabled: presenceBridgeEnabled
  });

  const anamActive = overlayOpen && voiceEnabled;
  const anamMetaRef = useRef({ status: 'idle', configured: null });

  const onAnamError = useCallback((msg) => {
    const text = String(msg || '').trim();
    if (!text || isTransientOperationalMessage(text)) {
      setAnamAlert(null);
      return;
    }
    const { status: st, configured: cfg } = anamMetaRef.current;
    if (st === 'unconfigured' || cfg === false) {
      setAnamAlert(null);
      return;
    }
    setAnamAlert(text || 'Avatar Anam indisponível.');
  }, []);
  const onAnamReady = useCallback(() => {
    setAnamAlert(null);
  }, []);
  const retryAnamConnection = useCallback(() => {
    setAnamAlert(null);
    setOverlayOpen(false);
    window.setTimeout(() => setOverlayOpen(true), 320);
  }, []);
  const {
    slotRef: anamSlotRef,
    enabled: anamEnabled,
    streaming: anamStreaming,
    status: anamStatus,
    configured: anamConfigured
  } = useAnamAvatar({
    active: anamActive,
    onError: onAnamError,
    onReady: onAnamReady
  });

  useEffect(() => {
    anamMetaRef.current = { status: anamStatus, configured: anamConfigured };
  }, [anamStatus, anamConfigured]);

  const anamAuditDisabled =
    typeof window !== 'undefined' && sessionStorage.getItem('impetus-anam-audit-disabled') === '1';

  useEffect(() => {
    if (!overlayOpen) setAnamAlert(null);
  }, [overlayOpen]);

  /** Handler de PDF/chat/impressão sempre ativo com voz — mesmo com overlay fechado. */
  useEffect(() => {
    if (!voiceEnabled) {
      registerVoicePanelMetaHandler(null);
      registerPanelMetaDirectHandler(null);
      return;
    }
    const handler = (text) => executePanelVoiceMeta(text, { notify });
    registerVoicePanelMetaHandler(handler);
    registerPanelMetaDirectHandler((meta) => executePanelVoiceMetaWithMeta(meta, { notify }));
    return () => {
      registerVoicePanelMetaHandler(null);
      registerPanelMetaDirectHandler(null);
    };
  }, [voiceEnabled, notify]);

  // Preferências (voz/velocidade + alertas) — onda 3 do boot
  const { phase: bootPhase } = useDashboardBoot();
  useEffect(() => {
    if (!voiceEnabled || bootPhase < 3) return;
    dashboard
      .getVoicePreferences()
      .then((r) => {
        const d = r.data;
        if (!d?.ok) return;
        setAlertsEnabled(d.alerts_enabled !== false);
        setAlertMinPriority(d.alert_min_priority || 'P2');
        setAutoSpeakResponses(d.auto_speak_responses !== false);
        setVoicePrefs({
          voice_id: d.voice_id,
          speed: d.speed,
          alerts_enabled: d.alerts_enabled
        });
      })
      .catch(() => {});
  }, [setAlertsEnabled, setVoicePrefs, voiceEnabled, bootPhase]);

  // Ao detectar wake word, abre presença (float/overlay) imediatamente
  useEffect(() => {
    if (!voiceEnabled) return;
    const onWake = () => {
      markVoiceUserInitiated();
      setOverlayOpen(true);
    };
    window.addEventListener('impetus-wake-toast', onWake);
    return () => window.removeEventListener('impetus-wake-toast', onWake);
  }, [voiceEnabled]);

  // Escuta «Ok Impetus» — só em contexto seguro; deps estáveis para não conflitar com Realtime.
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) {
      stopWakeWordRef.current();
      clearScheduledWakeRestart();
      return;
    }
    if (isInWakeCooldown()) {
      scheduleWakeRestart(() => startWakeWordRef.current(), 0);
      return () => clearScheduledWakeRestart();
    }
    const t = setTimeout(() => startWakeWordRef.current(), 500);
    return () => {
      clearTimeout(t);
      stopWakeWordRef.current();
      clearScheduledWakeRestart();
    };
  }, [voiceEnabled, wakePhraseAvailable, scheduleWakeRestart, clearScheduledWakeRestart]);

  // Wake word volta após sair do contínuo — cooldown P0 (4s) evita loop mobile
  const prevContinuousRef = useRef(false);
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) return;
    if (prevContinuousRef.current && !voiceState.isContinuous) {
      scheduleWakeRestart(() => startWakeWordRef.current(), 0);
      prevContinuousRef.current = voiceState.isContinuous;
      return () => clearScheduledWakeRestart();
    }
    prevContinuousRef.current = voiceState.isContinuous;
  }, [voiceEnabled, wakePhraseAvailable, voiceState.isContinuous, scheduleWakeRestart, clearScheduledWakeRestart]);

  // Ao voltar ao separador, o browser costuma parar o SpeechRecognition — religa após cooldown.
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) return;
    let t = null;
    const onVis = () => {
      if (document.hidden) return;
      if (voiceStateRef.current.isContinuous) return;
      if (isInWakeCooldown()) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        if (isInWakeCooldown()) return;
        try {
          startWakeWordRef.current();
        } catch (_) {}
      }, 450);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (t) clearTimeout(t);
    };
  }, [voiceEnabled, wakePhraseAvailable]);

  const openOverlayActionRef = useRef(async () => {});
  useEffect(() => {
    openOverlayActionRef.current = async () => {
      markVoiceUserInitiated();
      setOverlayOpen(true);
      if (!voiceStateRef.current.isContinuous) {
        await engineToggleVoice();
      }
    };
  }, [engineToggleVoice]);

  useEffect(() => {
    if (!voiceEnabled) return;
    const onKey = (e) => {
      if (!e.altKey || !e.shiftKey) return;
      if (String(e.key).toLowerCase() !== 'v') return;
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      void openOverlayActionRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [voiceEnabled]);

  // Alertas por voz global (em qualquer módulo)
  useEffect(() => {
    if (!voiceEnabled) return;
    if (!voiceState.alertsEnabled) return;
    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const r = await dashboard.operationalBrain.getAlerts({ limit: 15 });
        const list = r.data?.alerts || r.data?.items || [];
        for (const a of list) {
          const id = a.id ?? a.alert_id;
          if (!id || alertsSeenRef.current.has(id)) continue;
          alertsSeenRef.current.add(id);
          const priority =
            a.priority || (a.severity === 'critical' ? 'P1' : a.severity === 'high' ? 'P2' : 'P3');
          await handleVoiceAlert(
            { ...a, priority },
            {
              alertsEnabled: voiceStateRef.current.alertsEnabled,
              alertMinPriority: alertMinPriorityRef.current,
              speakText: (msg, meta) => {
                if (voiceStateRef.current.isRealtimeMode) return Promise.resolve();
                return speakNaturalReplyRef.current(msg, meta);
              },
              stopSpeaking: () => stopSpeakingRef.current(),
              stopVoiceCapture: () => stopVoiceCaptureRef.current(),
              formatAlert: async (alert) => {
                try {
                  const fr = await dashboard.formatVoiceAlert(alert);
                  return fr.data?.message || '';
                } catch (_) {
                  return '';
                }
              }
            }
          );
          // P0-3: alertas por voz não abrem overlay nem iniciam ANAM
        }
      } catch (_) {}
    };
    const iv = setInterval(tick, 95000);
    tick();
    return () => clearInterval(iv);
  }, [voiceEnabled, voiceState.alertsEnabled]);

  // Overlay só reabre em modo contínuo se o utilizador abriu a IA ao vivo (não ao entrar no app)
  useEffect(() => {
    if (!voiceEnabled || !voiceState.isContinuous) return;
    try {
      if (sessionStorage.getItem('impetus_voice_user_initiated') !== '1') return;
    } catch (_) {
      return;
    }
    setOverlayOpen(true);
  }, [voiceState.isContinuous, voiceEnabled]);

  const closeLiveSession = useCallback(() => {
    clearScheduledWakeRestart();
    try {
      stopWakeWordRef.current?.();
    } catch (_) {}
    beginWakeCooldown();
    try {
      stopSpeaking();
    } catch (_) {}
    try {
      forceCleanupAudioSession();
    } catch (_) {}
    try {
      if (voiceStateRef.current.isContinuous) {
        void engineToggleVoice();
      }
    } catch (_) {}
    try {
      stopVoiceCapture();
    } catch (_) {}
    setOverlayOpen(false);
    void import('../services/anamSessionSingleton').then((m) => m.stopAnamStreamNow?.()).catch(() => {});
    scheduleWakeRestart(() => startWakeWordRef.current(), 0);
  }, [engineToggleVoice, forceCleanupAudioSession, scheduleWakeRestart, stopSpeaking, stopVoiceCapture]);

  /** Após login: não manter overlay Anam/Realtime aberto — utilizador entra no dashboard ou IA texto. */
  useEffect(() => {
    if (!voiceEnabled) return;
    let shouldReset = false;
    try {
      shouldReset = sessionStorage.getItem('impetus_reset_voice_on_entry') === '1';
    } catch (_) {}
    if (!shouldReset) return;
    try {
      sessionStorage.removeItem('impetus_reset_voice_on_entry');
    } catch (_) {}
    setOverlayOpen(false);
    if (voiceStateRef.current.isContinuous) {
      void closeLiveSession();
    } else {
      try {
        stopSpeaking();
      } catch (_) {}
      try {
        stopVoiceCapture();
      } catch (_) {}
      void import('../services/anamSessionSingleton').then((m) => m.stopAnamStreamNow?.()).catch(() => {});
    }
  }, [voiceEnabled, location.pathname, closeLiveSession, stopSpeaking, stopVoiceCapture]);

  useEffect(() => {
    if (!voiceEnabled) return undefined;
    const onSessionClose = () => closeLiveSession();
    window.addEventListener(VOICE_SESSION_CLOSE_EVENT, onSessionClose);
    return () => window.removeEventListener(VOICE_SESSION_CLOSE_EVENT, onSessionClose);
  }, [voiceEnabled, closeLiveSession]);

  // Ao sair de rota autenticada, garante cleanup visual e de captura.
  useEffect(() => {
    if (voiceEnabled) return;
    setOverlayOpen(false);
    try {
      stopSpeaking();
    } catch (_) {}
    try {
      stopVoiceCapture();
    } catch (_) {}
  }, [voiceEnabled, stopSpeaking, stopVoiceCapture]);

  const floatVisible = voiceEnabled; // visível apenas em rotas autenticadas
  const floatPulse = voiceState.status === 'speaking' || voiceState.status === 'processing';

  const ctxValue = useMemo(
    () => ({
      voiceState,
      voiceBadge,
      ttsUi,
      overlayOpen,
      voiceEnabled,
      wakePhraseAvailable,
      wakePhraseIssue,
      /** Abre o painel e liga microfone/Realtime se ainda não estiver em modo contínuo (sidebar / atalhos). */
      openOverlay: async () => {
        markVoiceUserInitiated();
        setOverlayOpen(true);
        if (!voiceStateRef.current.isContinuous) {
          await engineToggleVoice();
        }
      },
      closeOverlay: closeLiveSession,
      toggleVoice: async () => {
        markVoiceUserInitiated();
        setOverlayOpen(true);
        return engineToggleVoice();
      },
      speakNaturalReply,
      speakText,
      stopSpeaking,
      stopVoiceCapture,
      autoSpeakResponses,
      alertMinPriority,
      setAlertMinPriority: async (p) => {
        const v = p || 'P2';
        setAlertMinPriority(v);
        try {
          await dashboard.putVoicePreferences({ alert_min_priority: v });
        } catch (_) {}
      },
      setAutoSpeakResponses: async (v) => {
        setAutoSpeakResponses(!!v);
        try {
          await dashboard.putVoicePreferences({ auto_speak_responses: !!v });
        } catch (_) {}
      },
      setAlertsEnabled: async (v) => {
        setAlertsEnabled(!!v);
        try {
          await dashboard.putVoicePreferences({ alerts_enabled: !!v });
        } catch (_) {}
      },
      realtimePresence: presenceBridge
    }),
    [
      alertMinPriority,
      autoSpeakResponses,
      overlayOpen,
      setAlertsEnabled,
      speakNaturalReply,
      speakText,
      stopSpeaking,
      stopVoiceCapture,
      closeLiveSession,
      engineToggleVoice,
      ttsUi,
      voiceBadge,
      voiceState,
      voiceEnabled,
      wakePhraseAvailable,
      wakePhraseIssue,
      presenceBridge
    ]
  );

  return (
    <ImpetusVoiceContext.Provider value={ctxValue}>
      {children}
      <ImpetusVoiceOverlay
        open={overlayOpen}
        status={voiceState.status}
        bargeInFlash={voiceState.bargeInFlash}
        realtimeMode={voiceState.isRealtimeMode}
        anamSlotRef={anamSlotRef}
        anamStreaming={anamAuditDisabled ? false : anamStreaming}
        anamEnabled={anamAuditDisabled ? false : anamEnabled}
        anamConfigured={anamAuditDisabled ? false : anamConfigured}
        anamAlert={anamAuditDisabled ? null : anamAlert}
        anamStatus={anamAuditDisabled ? 'unconfigured' : anamStatus}
        presenceExpression={presenceBridge.enabled ? presenceBridge.expressionLabel : null}
        presencePerceptionState={presenceBridge.enabled ? presenceBridge.perception?.perception_state : null}
        presenceAkoolReady={presenceBridge.enabled ? presenceBridge.akoolConfigured : false}
        onClose={closeLiveSession}
        onRetryConnection={retryAnamConnection}
      />
      <ImpetusFloatButton
        visible={false}
        pulse={floatPulse}
        label="Abrir Impetus (voz)"
        onClick={() => setOverlayOpen(true)}
      />
    </ImpetusVoiceContext.Provider>
  );
}


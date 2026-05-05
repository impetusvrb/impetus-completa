/**
 * Provider global da voz (Jarvis):
 * - Motor de voz único (useVoiceEngine)
 * - Overlay imersivo sempre disponível
 * - Botão flutuante global (alertas / speaking)
 * - Polling de alertas por voz (fora do AIChatPage)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ImpetusVoiceContext } from './ImpetusVoiceContext';
import { useVoiceEngine } from '../hooks/useVoiceEngine';
import { dashboard } from '../services/api';
import { handleVoiceAlert } from '../services/voiceAlertManager';
import ImpetusVoiceOverlay from '../components/ImpetusVoiceOverlay';
import ImpetusFloatButton from '../components/ImpetusFloatButton';
import { useRealtimePresenceBridge } from '../realtimePresence/useRealtimePresenceBridge';

export default function ImpetusVoiceProvider({ children }) {
  const location = useLocation();
  const [overlayOpen, setOverlayOpen] = useState(false);
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
    stopWakeWord
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

  // Preferências (voz/velocidade + alertas)
  useEffect(() => {
    if (!voiceEnabled) return;
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
  }, [setAlertsEnabled, setVoicePrefs, voiceEnabled]);

  // Ao detectar wake word, abre presença (float/overlay) imediatamente
  useEffect(() => {
    if (!voiceEnabled) return;
    const onWake = () => {
      setOverlayOpen(true);
    };
    window.addEventListener('impetus-wake-toast', onWake);
    return () => window.removeEventListener('impetus-wake-toast', onWake);
  }, [voiceEnabled]);

  // Escuta «Ok Impetus» — só em contexto seguro; deps estáveis para não conflitar com Realtime.
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) {
      stopWakeWordRef.current();
      return;
    }
    const t = setTimeout(() => startWakeWordRef.current(), 500);
    return () => {
      clearTimeout(t);
      stopWakeWordRef.current();
    };
  }, [voiceEnabled, wakePhraseAvailable]);

  // Wake word volta após sair do contínuo
  const prevContinuousRef = useRef(false);
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) return;
    if (prevContinuousRef.current && !voiceState.isContinuous) {
      const t = setTimeout(() => startWakeWordRef.current(), 800);
      prevContinuousRef.current = voiceState.isContinuous;
      return () => clearTimeout(t);
    }
    prevContinuousRef.current = voiceState.isContinuous;
  }, [voiceEnabled, wakePhraseAvailable, voiceState.isContinuous]);

  // Ao voltar ao separador, o browser costuma parar o SpeechRecognition — religa o wake se não estiver em modo contínuo.
  useEffect(() => {
    if (!voiceEnabled || !wakePhraseAvailable) return;
    let t = null;
    const onVis = () => {
      if (document.hidden) return;
      if (voiceStateRef.current.isContinuous) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
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
          // quando falar alerta, deixa “presença” visível
          setOverlayOpen(true);
        }
      } catch (_) {}
    };
    const iv = setInterval(tick, 95000);
    tick();
    return () => clearInterval(iv);
  }, [voiceEnabled, voiceState.alertsEnabled]);

  // Overlay abre automaticamente quando o modo voz está ligado
  useEffect(() => {
    if (!voiceEnabled) return;
    if (voiceState.isContinuous) setOverlayOpen(true);
  }, [voiceState.isContinuous, voiceEnabled]);

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
        setOverlayOpen(true);
        if (!voiceStateRef.current.isContinuous) {
          await engineToggleVoice();
        }
      },
      closeOverlay: () => setOverlayOpen(false),
      toggleVoice: async () => {
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
        mouthState={ttsUi?.mouthState}
        videoLipSyncRef={videoLipSyncRef}
        didAvatarVideoUrl={voiceState.didAvatarVideoUrl}
        didAvatarReplay={voiceState.didAvatarReplay}
        realtimeMode={voiceState.isRealtimeMode}
        presenceExpression={presenceBridge.enabled ? presenceBridge.expressionLabel : null}
        presencePerceptionState={presenceBridge.enabled ? presenceBridge.perception?.perception_state : null}
        presenceAkoolReady={presenceBridge.enabled ? presenceBridge.akoolConfigured : false}
        onClose={() => {
          try {
            stopSpeaking();
          } catch (_) {}
          // Desliga o modo contínuo antes de stopVoiceCapture para toggleVoice ver continuousRef === true
          try {
            if (voiceState.isContinuous) engineToggleVoice();
          } catch (_) {}
          try {
            stopVoiceCapture();
          } catch (_) {}
          setOverlayOpen(false);
        }}
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


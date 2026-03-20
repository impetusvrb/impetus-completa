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

export default function ImpetusVoiceProvider({ children }) {
  const location = useLocation();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [alertMinPriority, setAlertMinPriority] = useState('P2');
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(true);
  const alertsSeenRef = useRef(new Set());
  const voiceHistoryRef = useRef([]); // últimos turnos para contexto do LLM no modo voz
  const hasToken = !!localStorage.getItem('impetus_token');
  const isVoiceRoute =
    location.pathname.startsWith('/app') ||
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/m');
  const voiceEnabled = hasToken && isVoiceRoute;

  const chatRound = useCallback(async (text) => {
    const history = voiceHistoryRef.current.slice(-6);
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
    const r = await dashboard.chat(text, history, { voiceMode: true, sentimentContext });
    const reply =
      r.data?.ok && r.data?.reply ? r.data.reply : r.data?.fallback || 'Resposta temporariamente indisponível.';
    // atualiza histórico interno do modo voz (não interfere no chat UI)
    const next = [
      ...history,
      { role: 'user', content: String(text || '').slice(0, 2000) },
      { role: 'assistant', content: String(reply || '').slice(0, 2000) }
    ];
    voiceHistoryRef.current = next.slice(-10);
    return reply;
  }, []);

  const {
    voiceState,
    voiceBadge,
    ttsUi,
    toggleVoice,
    speakText,
    speakNaturalReply,
    stopSpeaking,
    stopVoiceCapture,
    setAlertsEnabled,
    setVoicePrefs,
    startWakeWord
  } = useVoiceEngine({
    chatRound,
    onSensitiveBlock: () => {
      setOverlayOpen(true);
    }
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

  // Wake word volta após sair do contínuo
  const prevContinuousRef = useRef(false);
  useEffect(() => {
    if (!voiceEnabled) return;
    if (prevContinuousRef.current && !voiceState.isContinuous && localStorage.getItem('impetus_mic_granted')) {
      const t = setTimeout(() => startWakeWord(), 800);
      prevContinuousRef.current = voiceState.isContinuous;
      return () => clearTimeout(t);
    }
    prevContinuousRef.current = voiceState.isContinuous;
  }, [voiceState.isContinuous, startWakeWord, voiceEnabled]);

  // Alertas por voz global (em qualquer módulo)
  useEffect(() => {
    if (!voiceEnabled) return;
    if (!voiceState.alertsEnabled) return;
    const tick = async () => {
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
              alertsEnabled: voiceState.alertsEnabled,
              alertMinPriority,
              speakText: (msg) => speakNaturalReply(msg),
              stopSpeaking,
              stopVoiceCapture,
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
  }, [voiceState.alertsEnabled, alertMinPriority, speakNaturalReply, stopSpeaking, stopVoiceCapture, voiceEnabled]);

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
      openOverlay: () => setOverlayOpen(true),
      closeOverlay: () => setOverlayOpen(false),
      toggleVoice: async () => {
        setOverlayOpen(true);
        return toggleVoice();
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
      }
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
      toggleVoice,
      ttsUi,
      voiceBadge,
      voiceState
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
        onClose={() => {
          try {
            stopSpeaking();
          } catch (_) {}
          try {
            stopVoiceCapture();
          } catch (_) {}
          try {
            if (voiceState.isContinuous) toggleVoice();
          } catch (_) {}
          setOverlayOpen(false);
        }}
      />
      <ImpetusFloatButton
        visible={floatVisible}
        pulse={floatPulse}
        label="Abrir Impetus (voz)"
        onClick={() => setOverlayOpen(true)}
      />
    </ImpetusVoiceContext.Provider>
  );
}


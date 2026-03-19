/**
 * Provider global da voz (Jarvis):
 * - Motor de voz único (useVoiceEngine)
 * - Overlay imersivo sempre disponível
 * - Botão flutuante global (alertas / speaking)
 * - Polling de alertas por voz (fora do AIChatPage)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImpetusVoiceContext } from './ImpetusVoiceContext';
import { useVoiceEngine } from '../hooks/useVoiceEngine';
import { dashboard } from '../services/api';
import { handleVoiceAlert } from '../services/voiceAlertManager';
import ImpetusVoiceOverlay from '../components/ImpetusVoiceOverlay';
import ImpetusFloatButton from '../components/ImpetusFloatButton';

export default function ImpetusVoiceProvider({ children }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [alertMinPriority, setAlertMinPriority] = useState('P2');
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(true);
  const alertsSeenRef = useRef(new Set());
  const voiceHistoryRef = useRef([]); // últimos turnos para contexto do LLM no modo voz

  const chatRound = useCallback(async (text) => {
    const history = voiceHistoryRef.current.slice(-6);
    const r = await dashboard.chat(text, history, { voiceMode: true });
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
  }, [setAlertsEnabled, setVoicePrefs]);

  // Ao detectar wake word, abre presença (float/overlay) imediatamente
  useEffect(() => {
    const onWake = () => {
      setOverlayOpen(true);
    };
    window.addEventListener('impetus-wake-toast', onWake);
    return () => window.removeEventListener('impetus-wake-toast', onWake);
  }, []);

  // Wake word volta após sair do contínuo
  const prevContinuousRef = useRef(false);
  useEffect(() => {
    if (prevContinuousRef.current && !voiceState.isContinuous && localStorage.getItem('impetus_mic_granted')) {
      const t = setTimeout(() => startWakeWord(), 800);
      prevContinuousRef.current = voiceState.isContinuous;
      return () => clearTimeout(t);
    }
    prevContinuousRef.current = voiceState.isContinuous;
  }, [voiceState.isContinuous, startWakeWord]);

  // Alertas por voz global (em qualquer módulo)
  useEffect(() => {
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
  }, [voiceState.alertsEnabled, alertMinPriority, speakNaturalReply, stopSpeaking, stopVoiceCapture]);

  // Overlay abre automaticamente quando o modo voz está ligado
  useEffect(() => {
    if (voiceState.isContinuous) setOverlayOpen(true);
  }, [voiceState.isContinuous]);

  const floatVisible = true; // sempre visível (standby), como “assistente ativa”
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
        mouthState={ttsUi?.mouthState}
        speechText={ttsUi?.speechText}
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


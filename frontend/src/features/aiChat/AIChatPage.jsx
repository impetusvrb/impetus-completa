/**
 * Chat Impetus — Multimodal; voz centralizada em useVoiceEngine (sem SpeechSynthesis).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Send, User, Mic, Paperclip, Image, Camera, X } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useVoiceEngine } from '../../hooks/useVoiceEngine';
import { handleVoiceAlert } from '../../services/voiceAlertManager';
import impetusIaAvatar from '../../assets/impetus-ia-avatar.png';
import './AIChatPage.css';

export default function AIChatPage() {
  const location = useLocation();
  const initialFromState = location.state?.initialMessage || '';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialFromState);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sensitiveModal, setSensitiveModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingFileContext, setPendingFileContext] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [wakeToast, setWakeToast] = useState('');
  const [alertMinPriority, setAlertMinPriority] = useState('P2');
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const alertsSeenRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { log } = useActivityLog();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const chatRound = useCallback(async (text) => {
    const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
    const uid = Date.now();
    setMessages((m) => [...m, { id: 'uv-' + uid, role: 'user', content: text }]);
    try {
      const r = await dashboard.chat(text, history, { voiceMode: true });
      const reply =
        r.data?.ok && r.data?.reply
          ? r.data.reply
          : r.data?.fallback || 'Resposta temporariamente indisponível.';
      setMessages((m) => [...m, { id: 'va-' + uid, role: 'assistant', content: reply }]);
      return reply;
    } catch (e) {
      if (e.response?.data?.code === 'SENSITIVE_CONTENT') {
        setPendingMessage({ text, history });
        setSensitiveModal(true);
        setMessages((m) => m.slice(0, -1));
        const err = new Error('sensitive');
        err.__sensitive = true;
        throw err;
      }
      const errMsg =
        e.apiMessage || e.response?.data?.fallback || e.response?.data?.error || 'Erro de conexão.';
      setMessages((m) => [...m, { id: 'va-' + uid, role: 'assistant', content: errMsg }]);
      return errMsg;
    }
  }, []);

  const {
    voiceState,
    voiceBadge,
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
    onSensitiveBlock: () => {}
  });

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

  useEffect(() => {
    const onWake = (ev) => {
      setWakeToast(ev.detail?.text || 'Estou ouvindo…');
      setTimeout(() => setWakeToast(''), 2200);
    };
    window.addEventListener('impetus-wake-toast', onWake);
    return () => window.removeEventListener('impetus-wake-toast', onWake);
  }, []);

  const prevContinuousRef = useRef(false);
  useEffect(() => {
    if (prevContinuousRef.current && !voiceState.isContinuous && localStorage.getItem('impetus_mic_granted')) {
      const t = setTimeout(() => startWakeWord(), 800);
      prevContinuousRef.current = voiceState.isContinuous;
      return () => clearTimeout(t);
    }
    prevContinuousRef.current = voiceState.isContinuous;
  }, [voiceState.isContinuous, startWakeWord]);

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
          const priority = a.priority || (a.severity === 'critical' ? 'P1' : a.severity === 'high' ? 'P2' : 'P3');
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
        }
      } catch (_) {}
    };
    const iv = setInterval(tick, 95000);
    tick();
    return () => clearInterval(iv);
  }, [voiceState.alertsEnabled, alertMinPriority, speakText, stopSpeaking, stopVoiceCapture]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const r = await dashboard.getSmartSummary();
        const userName = JSON.parse(localStorage.getItem('impetus_user') || '{}').name || 'Usuário';
        if (r.data?.ok && r.data?.summary) {
          const greeting = `${userName}, segue seu resumo:\n\n`;
          setMessages([
            {
              id: 'ai-summary',
              role: 'assistant',
              content: greeting + r.data.summary
            }
          ]);
        } else {
          setMessages([
            {
              id: 'ai-greeting',
              role: 'assistant',
              content: `Olá, ${userName}! Não há resumo disponível no momento. Em que posso ajudar?`
            }
          ]);
        }
        log('view', 'ai_chat', null, { loaded_summary: true });
      } catch (e) {
        setMessages([
          {
            id: 'ai-error',
            role: 'assistant',
            content: 'Resumo temporariamente indisponível. Em que posso ajudar?'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const hasMultimodalContent = pendingImage || pendingFileContext;
  const canSend = (input.trim() || hasMultimodalContent) && !sending;

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !hasMultimodalContent) || sending) return;

    const displayContent = text || (pendingImage ? '[Imagem enviada]' : '[Arquivo enviado]');
    const historyBeforeUser = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
    const userMsg = { id: Date.now(), role: 'user', content: displayContent, hasImage: !!pendingImage };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    const imgToSend = pendingImage;
    const fileCtxToSend = pendingFileContext;
    setPendingImage(null);
    setPendingFileContext(null);
    setSending(true);

    if (voiceState.isContinuous) stopSpeaking();

    try {
      let r;
      if (imgToSend || fileCtxToSend) {
        r = await dashboard.chatMultimodal({
          message: text || 'Analise o conteúdo anexado.',
          history: historyBeforeUser,
          imageBase64: imgToSend || undefined,
          fileContext: fileCtxToSend || undefined
        });
      } else {
        r = await dashboard.chat(text, historyBeforeUser, {
          voiceMode: voiceState.isContinuous
        });
      }
      const reply =
        r.data?.ok && r.data?.reply
          ? r.data.reply
          : r.data?.fallback || 'Resposta temporariamente indisponível. Tente novamente.';
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: reply }]);
      if (autoSpeakResponses && voiceState.isContinuous) {
        await speakNaturalReply(reply);
      }
    } catch (e) {
      if (e.response?.data?.code === 'SENSITIVE_CONTENT') {
        setPendingMessage({ text, history: historyBeforeUser });
        setSensitiveModal(true);
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setSending(false);
        return;
      }
      const errMsg =
        e.apiMessage || e.response?.data?.fallback || e.response?.data?.error;
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            errMsg ||
            'Parece que houve um problema de conexão. Verifique sua rede e tente novamente.'
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await dashboard.uploadChatFile(fd);
      if (r.data?.type === 'image') {
        setPendingImage(r.data.imageBase64);
      } else if (r.data?.fileContext) {
        setPendingFileContext(r.data.fileContext);
      }
    } catch (err) {
      setUploadError(err?.response?.data?.error || 'Erro ao enviar arquivo');
    }
    e.target.value = '';
  };

  const handleImageSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result?.split(',')[1] || reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVerifyAndSend = async () => {
    if (!verifyPassword) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const { auth } = await import('../../services/api');
      const r = await auth.verifyPassword(verifyPassword);
      if (r.data?.ok) {
        setSensitiveModal(false);
        setVerifyPassword('');
        const { text, history } = pendingMessage;
        setPendingMessage(null);
        setSending(true);
        const { dashboard: dash } = await import('../../services/api');
        const r2 = await dash.chatWithHeader(
          text,
          history,
          { 'x-password-verified': 'true' },
          { voiceMode: voiceState.isContinuous }
        );
        const reply = r2.data?.ok && r2.data?.reply
          ? r2.data.reply
          : r2.data?.fallback || 'Resposta temporariamente indisponível.';
        setMessages((m) => [
          ...m,
          { id: Date.now(), role: 'user', content: text },
          { id: Date.now() + 1, role: 'assistant', content: reply }
        ]);
        if (autoSpeakResponses && voiceState.isContinuous) await speakNaturalReply(reply);
        setSending(false);
      } else {
        setVerifyError('Senha incorreta. Tente novamente.');
      }
    } catch {
      setVerifyError('Erro ao verificar senha.');
    }
    setVerifying(false);
  };

  const micStatusClass =
    voiceState.status === 'listening'
      ? 'ai-chat-mic-icon--listening'
      : voiceState.status === 'processing'
        ? 'ai-chat-mic-icon--processing'
        : voiceState.status === 'speaking'
          ? 'ai-chat-mic-icon--speaking'
          : 'ai-chat-mic-icon--idle';

  return (
    <Layout>
      <div className="ai-chat-page">
        <header className="ai-chat-header">
          <img
            src={impetusIaAvatar}
            alt="Impetus IA"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #1E90FF',
              boxShadow: '0 0 12px rgba(30,144,255,0.4)'
            }}
          />
          <div style={{ flex: 1 }}>
            <h1>Impetus</h1>
            <p className="ai-chat-header-tag">Assistente industrial • Multimodal</p>
            <label className="ai-chat-voice-pref">
              <input
                type="checkbox"
                checked={voiceState.alertsEnabled}
                onChange={(e) => {
                  setAlertsEnabled(e.target.checked);
                  dashboard.putVoicePreferences({ alerts_enabled: e.target.checked }).catch(() => {});
                }}
              />
              Alertas por voz
            </label>
          </div>
        </header>

        {wakeToast && <div className="ai-chat-wake-toast">{wakeToast}</div>}

        <div className="ai-chat-messages">
          {loading ? (
            <div className="ai-chat-loading">
              <div className="ai-chat-spinner" />
              <p>Carregando seu resumo...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`ai-chat-msg ai-chat-msg--${msg.role}`}>
                <div className="ai-chat-msg__avatar">
                  {msg.role === 'assistant' ? (
                    <img
                      src={impetusIaAvatar}
                      alt="IA"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #1E90FF',
                        background: 'transparent',
                        boxShadow: '0 0 8px rgba(30,144,255,0.4)'
                      }}
                    />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className="ai-chat-msg__content">
                  {msg.hasImage && msg.role === 'user' && (
                    <p className="ai-chat-msg__meta">
                      <em>📷 Imagem anexada</em>
                    </p>
                  )}
                  {(msg.content || '').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-toolbar">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
          <button type="button" className="ai-chat-tool-btn" onClick={() => fileInputRef.current?.click()} title="Enviar arquivo">
            <Paperclip size={20} />
          </button>
          <button type="button" className="ai-chat-tool-btn" onClick={() => imageInputRef.current?.click()} title="Enviar imagem">
            <Image size={20} />
          </button>
          <button type="button" className="ai-chat-tool-btn" onClick={() => cameraInputRef.current?.click()} title="Câmera">
            <Camera size={20} />
          </button>
        </div>

        {(pendingImage || pendingFileContext) && (
          <div className="ai-chat-pending">
            {pendingImage && <span>📷 Imagem anexada</span>}
            {pendingFileContext && <span>📎 {pendingFileContext.originalName}</span>}
            <button
              type="button"
              className="ai-chat-pending-clear"
              onClick={() => {
                setPendingImage(null);
                setPendingFileContext(null);
                setUploadError('');
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {uploadError && <p className="ai-chat-error">{uploadError}</p>}
        {voiceState.lastAlert && <p className="ai-chat-error">{voiceState.lastAlert}</p>}

        <div className="ai-chat-input-row">
          <div className="ai-chat-input-shell">
            {voiceBadge.visible && voiceBadge.text && (
              <div
                className={`ai-chat-voice-badge ${
                  voiceBadge.text.includes('Ouvindo')
                    ? 'ai-chat-voice-badge--listen'
                    : voiceBadge.text.includes('Processando')
                      ? 'ai-chat-voice-badge--proc'
                      : 'ai-chat-voice-badge--speak'
                }`}
              >
                {voiceBadge.text}
              </div>
            )}
            <div className="ai-chat-input-inner">
              <input
                type="text"
                className="ai-chat-input-field"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={hasMultimodalContent ? 'Adicione pergunta (opcional)...' : 'Digite ou fale...'}
                disabled={sending}
              />
              {voiceState.currentTranscript && voiceState.isContinuous && (
                <span className="ai-chat-input-partial" aria-live="polite">
                  {voiceState.currentTranscript}
                </span>
              )}
              <button
                type="button"
                className={`ai-chat-mic-icon ${micStatusClass}`}
                onClick={toggleVoice}
                title={
                  voiceState.isContinuous
                    ? 'Modo voz ativo — clique para parar'
                    : 'Clique para conversa por voz contínua'
                }
                aria-pressed={voiceState.isContinuous}
              >
                <Mic size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          <button className="ai-chat-send" onClick={handleSend} disabled={!canSend}>
            <Send size={20} />
          </button>
        </div>

        {voiceState.isContinuous && (
          <div
            className="ai-chat-voice-dot"
            title="Modo voz ativo — clique no microfone para parar"
          />
        )}

        {sensitiveModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 12,
                padding: 32,
                minWidth: 340,
                maxWidth: 400
              }}
            >
              <h3 style={{ color: '#f1f5f9', marginTop: 0, marginBottom: 8 }}>Conteúdo Sigiloso</h3>
              <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
                Esta pergunta contém informações sigilosas. Confirme sua senha para continuar.
              </p>
              <input
                type="password"
                placeholder="Sua senha"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyAndSend()}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#f1f5f9',
                  marginBottom: 8,
                  boxSizing: 'border-box'
                }}
              />
              {verifyError && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{verifyError}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={() => {
                    setSensitiveModal(false);
                    setVerifyPassword('');
                    setPendingMessage(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #475569',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerifyAndSend}
                  disabled={verifying || !verifyPassword}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: 'white',
                    cursor: 'pointer',
                    opacity: verifying || !verifyPassword ? 0.5 : 1
                  }}
                >
                  {verifying ? 'Verificando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

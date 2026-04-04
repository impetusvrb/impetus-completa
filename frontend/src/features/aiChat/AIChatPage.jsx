/**
 * Chat Impetus — Multimodal; voz centralizada em useVoiceEngine (sem SpeechSynthesis).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Send, User, Mic, Paperclip, Image, Camera, X } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useImpetusVoice } from '../../voice/ImpetusVoiceContext';
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
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { log } = useActivityLog();
  const {
    voiceState,
    voiceBadge,
    speakNaturalReply,
    stopSpeaking,
    setAlertsEnabled,
    toggleVoice
  } = useImpetusVoice();

  /** idle | recording | transcribing — microfone só envia áudio transcrito, sem modo voz contínua / overlay */
  const [voiceNoteState, setVoiceNoteState] = useState('idle');
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // preferências de voz são carregadas no provider global

  useEffect(() => {
    const onWake = (ev) => {
      setWakeToast(ev.detail?.text || 'Estou ouvindo…');
      setTimeout(() => setWakeToast(''), 2200);
    };
    window.addEventListener('impetus-wake-toast', onWake);
    return () => window.removeEventListener('impetus-wake-toast', onWake);
  }, []);

  // alertas por voz rodam no provider global (fora desta tela)

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

  const stopVoiceNoteStream = useCallback(() => {
    voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
    voiceStreamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      try {
        voiceRecorderRef.current?.stop();
      } catch (_) {}
      stopVoiceNoteStream();
    };
  }, [stopVoiceNoteStream]);

  /** Após o utilizador já estar na lista de mensagens. multimodalPayload = null para texto só. */
  const runChatRequest = useCallback(
    async (textForApi, historyBeforeUser, multimodalPayload) => {
      setSending(true);
      if (voiceState.isContinuous) stopSpeaking();
      try {
        let r;
        if (multimodalPayload) {
          r = await dashboard.chatMultimodal(multimodalPayload);
        } else {
          r = await dashboard.chat(textForApi, historyBeforeUser, {
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
        if (!multimodalPayload && e.response?.data?.code === 'SENSITIVE_CONTENT') {
          setPendingMessage({ text: textForApi, history: historyBeforeUser });
          setSensitiveModal(true);
          setMessages((m) => m.slice(0, -1));
          setInput(textForApi);
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
    },
    [autoSpeakResponses, speakNaturalReply, stopSpeaking, voiceState.isContinuous]
  );

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

    if (imgToSend || fileCtxToSend) {
      await runChatRequest(null, historyBeforeUser, {
        message: text || 'Analise o conteúdo anexado.',
        history: historyBeforeUser,
        imageBase64: imgToSend || undefined,
        fileContext: fileCtxToSend || undefined
      });
    } else {
      await runChatRequest(text, historyBeforeUser, null);
    }
  };

  const handleVoiceNoteClick = async () => {
    if (sending || voiceNoteState === 'transcribing') return;

    if (voiceNoteState === 'recording') {
      voiceRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType });
      voiceRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size) voiceChunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        stopVoiceNoteStream();
        voiceRecorderRef.current = null;
        const baseType = mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(voiceChunksRef.current, { type: baseType });
        voiceChunksRef.current = [];
        setVoiceNoteState('transcribing');
        try {
          if (blob.size < 900) {
            setMessages((m) => [
              ...m,
              {
                id: Date.now(),
                role: 'assistant',
                content: 'Gravação muito curta. Segure o microfone e fale um pouco mais.'
              }
            ]);
            return;
          }
          const r = await dashboard.transcribeChatAudio(blob, {
            prompt:
              'sistema industrial, manutenção, alertas, produção, linha, máquina, Impetus'
          });
          const transcript = String(r.data?.transcript || '').trim();
          if (!transcript) {
            setMessages((m) => [
              ...m,
              {
                id: Date.now(),
                role: 'assistant',
                content: 'Não consegui transcrever o áudio. Tente falar mais perto do microfone.'
              }
            ]);
            return;
          }
          const historyBeforeUser = messagesRef.current.map((m) => ({
            role: m.role,
            content: m.content
          }));
          setMessages((m) => [
            ...m,
            { id: Date.now(), role: 'user', content: transcript }
          ]);
          await runChatRequest(transcript, historyBeforeUser, null);
        } catch (e) {
          const msg =
            e?.response?.data?.error ||
            e?.message ||
            'Não foi possível transcrever o áudio.';
          setMessages((m) => [
            ...m,
            { id: Date.now(), role: 'assistant', content: msg }
          ]);
        } finally {
          setVoiceNoteState('idle');
        }
      };

      rec.start(200);
      setVoiceNoteState('recording');
    } catch (_) {
      stopVoiceNoteStream();
      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Não foi possível usar o microfone. Verifique a permissão do navegador.'
        }
      ]);
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
    voiceNoteState === 'recording'
      ? 'ai-chat-mic-icon--listening'
      : voiceNoteState === 'transcribing'
        ? 'ai-chat-mic-icon--processing'
        : 'ai-chat-mic-icon--idle';

  return (
    <Layout>
      <div className="ai-chat-page">
        <header className="ai-chat-header">
          <button
            type="button"
            className="ai-chat-header-avatar-btn"
            onClick={() => void toggleVoice()}
            title="Abrir IA operacional ao vivo e ativar escuta (como «Ok Impetus»)"
          >
            <img
              src={impetusIaAvatar}
              alt="Impetus IA"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #1E90FF',
                boxShadow: '0 0 12px rgba(30,144,255,0.4)',
                display: 'block'
              }}
            />
          </button>
          <div style={{ flex: 1 }}>
            <h1>Impetus</h1>
            <p className="ai-chat-header-tag">Assistente industrial • Multimodal</p>
            <label className="ai-chat-voice-pref">
              <input
                type="checkbox"
                checked={voiceState.alertsEnabled}
                onChange={(e) => {
                  setAlertsEnabled(e.target.checked);
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
                placeholder={
                  hasMultimodalContent
                    ? 'Adicione pergunta (opcional)...'
                    : voiceState.isContinuous
                      ? 'Ouvindo……'
                      : 'Digite ou use o microfone para gravar...'
                }
                disabled={sending}
              />
              <button
                type="button"
                className={`ai-chat-mic-icon ${micStatusClass}`}
                onClick={handleVoiceNoteClick}
                disabled={sending || voiceNoteState === 'transcribing'}
                title={
                  voiceNoteState === 'recording'
                    ? 'Clique para parar e enviar o áudio'
                    : voiceNoteState === 'transcribing'
                      ? 'A transcrever…'
                      : 'Gravar mensagem de voz — clique de novo para parar e enviar'
                }
                aria-pressed={voiceNoteState === 'recording'}
              >
                <Mic size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          <button className="ai-chat-send" onClick={handleSend} disabled={!canSend}>
            <Send size={20} />
          </button>
        </div>

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

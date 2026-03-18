/**
 * Chat com o Impetus - Multimodal
 * Suporta: texto, imagens, arquivos, voz (STT/TTS), avatar
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Send, User, Mic, MicOff, Paperclip, Image, Camera, X } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useVoiceOutput } from '../../hooks/useVoiceOutput';
import AvatarAI from '../../components/AvatarAI';
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
  const [voiceMode, setVoiceMode] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingFileContext, setPendingFileContext] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [voiceConvOn, setVoiceConvOn] = useState(false);
  const [voicePhase, setVoicePhase] = useState('idle');
  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const voiceModeRef = useRef(false);
  const voiceLoopRef = useRef(false);
  const voiceRecRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { log } = useActivityLog();

  const handleVoiceResult = (text) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  };
  const { isListening, isSupported: voiceInputSupported, startListening, stopListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: (e) => console.warn('[VoiceInput]', e)
  });
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput({});
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

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
          setMessages([{
            id: 'ai-summary',
            role: 'assistant',
            content: greeting + r.data.summary
          }]);
        } else {
          setMessages([{
            id: 'ai-greeting',
            role: 'assistant',
            content: `Olá, ${userName}! Não há resumo disponível no momento. Em que posso ajudar?`
          }]);
        }
        log('view', 'ai_chat', null, { loaded_summary: true });
      } catch (e) {
        setMessages([{
          id: 'ai-error',
          role: 'assistant',
          content: 'Resumo temporariamente indisponível. Em que posso ajudar?'
        }]);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playVoiceReply = (reply) => {
    const cleanTts = String(reply).replace(/\*\*/g, '').replace(/#{1,6}\s?/g, '').slice(0, 4500);
    return new Promise((resolve) => {
      const done = () => {
        voiceAudioRef.current = null;
        resolve();
      };
      dashboard
        .gerarVoz(cleanTts, true)
        .then((v) => {
          if (v.data?.ok && v.data?.audio) {
            const a = new Audio('data:audio/mp3;base64,' + v.data.audio);
            voiceAudioRef.current = a;
            a.onended = done;
            a.onerror = done;
            a.play().catch(() => {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(String(reply).slice(0, 4000));
              u.lang = 'pt-BR';
              u.onend = done;
              u.onerror = done;
              window.speechSynthesis.speak(u);
            });
          } else {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(String(reply).slice(0, 4000));
            u.lang = 'pt-BR';
            u.onend = done;
            u.onerror = done;
            window.speechSynthesis.speak(u);
          }
        })
        .catch(() => {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(String(reply).slice(0, 4000));
          u.lang = 'pt-BR';
          u.onend = done;
          window.speechSynthesis.speak(u);
        });
    });
  };

  const stopVoiceConversation = () => {
    voiceLoopRef.current = false;
    setVoiceConvOn(false);
    setVoicePhase('idle');
    try {
      voiceRecRef.current?.stop?.();
    } catch (_) {}
    try {
      voiceRecRef.current?.abort?.();
    } catch (_) {}
    voiceRecRef.current = null;
    try {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
    } catch (_) {}
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  };

  const captureVoiceUtterance = () =>
    new Promise((resolve) => {
      if (!voiceLoopRef.current) {
        resolve('');
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        resolve('');
        return;
      }
      const rec = new SR();
      voiceRecRef.current = rec;
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;
      let settled = false;
      const finish = (t) => {
        if (settled) return;
        settled = true;
        voiceRecRef.current = null;
        resolve(String(t || '').trim());
      };
      rec.onresult = (ev) => finish(ev.results[0]?.[0]?.transcript || '');
      rec.onerror = () => finish('');
      rec.onend = () => setTimeout(() => finish(''), 700);
      try {
        rec.start();
      } catch {
        finish('');
      }
    });

  const runVoiceTurn = async () => {
    if (!voiceLoopRef.current || !voiceModeRef.current) return;
    setVoicePhase('listening');
    setUploadError('');
    const text = await captureVoiceUtterance();
    if (!voiceLoopRef.current || !voiceModeRef.current) return;
    if (!text) {
      setUploadError('Não ouvi. Fale quando aparecer “Ouvindo…”.');
      setTimeout(() => voiceLoopRef.current && voiceModeRef.current && runVoiceTurn(), 450);
      return;
    }
    setUploadError('');
    const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
    const uid = Date.now();
    setMessages((m) => [...m, { id: 'vu-' + uid, role: 'user', content: text }]);
    setVoicePhase('thinking');
    setSending(true);
    if (isSpeaking) stopSpeaking();
    try {
      const r = await dashboard.chat(text, history);
      const reply =
        r.data?.ok && r.data?.reply
          ? r.data.reply
          : r.data?.fallback || 'Resposta temporariamente indisponível.';
      setMessages((m) => [...m, { id: 'va-' + uid, role: 'assistant', content: reply }]);
      if (!voiceLoopRef.current) {
        setSending(false);
        setVoicePhase('idle');
        return;
      }
      setVoicePhase('speaking');
      setSending(false);
      await playVoiceReply(reply);
    } catch (e) {
      setSending(false);
      if (e.response?.data?.code === 'SENSITIVE_CONTENT') {
        setPendingMessage({ text, history });
        setSensitiveModal(true);
        setMessages((m) => m.slice(0, -1));
        stopVoiceConversation();
        return;
      }
      const errMsg =
        e.apiMessage || e.response?.data?.fallback || e.response?.data?.error || 'Erro de conexão.';
      setMessages((m) => [...m, { id: 'va-' + uid, role: 'assistant', content: errMsg }]);
      if (voiceLoopRef.current) {
        setVoicePhase('speaking');
        await playVoiceReply(errMsg);
      }
    }
    if (voiceLoopRef.current && voiceModeRef.current) {
      setTimeout(() => runVoiceTurn(), 350);
    } else {
      setVoicePhase('idle');
    }
  };

  const startVoiceConversation = async () => {
    setUploadError('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setUploadError('Use Chrome (ou Edge) com microfone liberado.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setUploadError('Permita o microfone para iniciar.');
      return;
    }
    voiceLoopRef.current = true;
    setVoiceConvOn(true);
    runVoiceTurn();
  };

  const hasMultimodalContent = pendingImage || pendingFileContext;
  const canSend = (input.trim() || hasMultimodalContent) && !sending;

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !hasMultimodalContent) || sending) return;

    const displayContent = text || (pendingImage ? '[Imagem enviada]' : '[Arquivo enviado]');
    const userMsg = { id: Date.now(), role: 'user', content: displayContent, hasImage: !!pendingImage };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    const imgToSend = pendingImage;
    const fileCtxToSend = pendingFileContext;
    setPendingImage(null);
    setPendingFileContext(null);
    setSending(true);

    if (voiceMode && isSpeaking) stopSpeaking();

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      let r;
      if (imgToSend || fileCtxToSend) {
        r = await dashboard.chatMultimodal({
          message: text || 'Analise o conteúdo anexado.',
          history,
          imageBase64: imgToSend || undefined,
          fileContext: fileCtxToSend || undefined
        });
      } else {
        r = await dashboard.chat(text, history);
      }
      const reply = r.data?.ok && r.data?.reply
        ? r.data.reply
        : r.data?.fallback || 'Resposta temporariamente indisponível. Tente novamente.';
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply
      }]);
      if (voiceMode) speak(reply);
    } catch (e) {
      if (e.response?.data?.code === 'SENSITIVE_CONTENT') {
        setPendingMessage({ text, history: messages.map((m) => ({ role: m.role, content: m.content })) });
        setSensitiveModal(true);
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setSending(false);
        return;
      }
      const errMsg = e.apiMessage || e.response?.data?.fallback || e.response?.data?.error;
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errMsg || 'Parece que houve um problema de conexão. Verifique sua rede e tente novamente. O Impetus oferece comunicação inteligente, manutenção assistida e melhoria contínua para a sua indústria.'
      }]);
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

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopVoiceConversation();
      stopSpeaking();
    }
    setVoiceMode((v) => !v);
    if (!voiceMode) stopSpeaking();
  };

  const interruptVoiceAndListen = () => {
    try {
      voiceAudioRef.current?.pause();
      voiceAudioRef.current = null;
    } catch (_) {}
    window.speechSynthesis?.cancel();
    if (voiceLoopRef.current) setTimeout(() => runVoiceTurn(), 200);
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
        const { dashboard } = await import('../../services/api');
        const r2 = await dashboard.chatWithHeader(text, history, { 'x-password-verified': 'true' });
        const reply = r2.data?.ok && r2.data?.reply
          ? r2.data.reply
          : r2.data?.fallback || 'Resposta temporariamente indisponível.';
        setMessages((m) => [...m, { id: Date.now(), role: 'user', content: text }, { id: Date.now()+1, role: 'assistant', content: reply }]);
        setSending(false);
      } else {
        setVerifyError('Senha incorreta. Tente novamente.');
      }
    } catch {
      setVerifyError('Erro ao verificar senha.');
    }
    setVerifying(false);
  };

  return (
    <Layout>
      <div className="ai-chat-page">
        <header className="ai-chat-header">
          {voiceMode ? (
            <AvatarAI
              state={
                voicePhase === 'listening'
                  ? 'listening'
                  : voicePhase === 'thinking' || voicePhase === 'speaking' || isSpeaking
                    ? 'speaking'
                    : 'standby'
              }
              size={64}
            />
          ) : (
            <img src={impetusIaAvatar} alt="Impetus IA" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",border:"2px solid #1E90FF",boxShadow:"0 0 12px rgba(30,144,255,0.4)"}} />
          )}
          <div style={{ flex: 1 }}>
            <h1>Impetus</h1>
            <p className="ai-chat-header-tag">
              {voiceMode
                ? 'Conversa por voz — mesma IA e histórico que o chat por texto'
                : 'Assistente industrial • Multimodal'}
            </p>
          </div>
          <button
            type="button"
            className={`ai-chat-voice-btn ${voiceMode ? 'active' : ''}`}
            onClick={toggleVoiceMode}
            title={voiceMode ? 'Sair do modo voz' : 'Entrar no modo conversa por voz'}
            aria-pressed={voiceMode}
          >
            {voiceMode ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </header>
        {voiceMode && (
          <div className="ai-voice-gpt-panel" role="region" aria-label="Conversa por voz">
            <div
              className={`ai-voice-gpt-orb ai-voice-gpt-orb--${voicePhase}`}
              aria-hidden
            />
            <p className="ai-voice-gpt-status">
              {!voiceConvOn && 'Toque abaixo para conversar por voz — igual ao chat, em sequência.'}
              {voiceConvOn && voicePhase === 'listening' && 'Ouvindo… fale agora'}
              {voiceConvOn && voicePhase === 'thinking' && 'Pensando… (mesmo modelo do chat)'}
              {voiceConvOn && voicePhase === 'speaking' && 'Falando…'}
            </p>
            <div className="ai-voice-gpt-actions">
              {!voiceConvOn ? (
                <button type="button" className="ai-voice-gpt-primary" onClick={startVoiceConversation}>
                  Iniciar conversa
                </button>
              ) : (
                <>
                  <button type="button" className="ai-voice-gpt-secondary" onClick={stopVoiceConversation}>
                    Encerrar conversa
                  </button>
                  {voicePhase === 'speaking' && (
                    <button type="button" className="ai-voice-gpt-interrupt" onClick={interruptVoiceAndListen}>
                      Interromper e falar
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="ai-voice-gpt-foot">
              Você pode <strong>digitar</strong> no campo de baixo a qualquer momento — tudo fica no mesmo histórico.
            </p>
          </div>
        )}
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
                  {msg.role === 'assistant' ? <img src={impetusIaAvatar} alt="IA" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:'2px solid #1E90FF',background:'transparent',boxShadow:'0 0 8px rgba(30,144,255,0.4)'}} /> : <User size={20} />}
                </div>
                <div className="ai-chat-msg__content">
                  {msg.hasImage && msg.role === 'user' && (
                    <p className="ai-chat-msg__meta"><em>📷 Imagem anexada</em></p>
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
          <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFileSelect} style={{ display: 'none' }} />
          <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
          <button type="button" className="ai-chat-tool-btn" onClick={() => fileInputRef.current?.click()} title="Enviar arquivo (PDF, DOC, imagem)">
            <Paperclip size={20} />
          </button>
          <button type="button" className="ai-chat-tool-btn" onClick={() => imageInputRef.current?.click()} title="Enviar imagem">
            <Image size={20} />
          </button>
          <button type="button" className="ai-chat-tool-btn" onClick={() => cameraInputRef.current?.click()} title="Abrir câmera">
            <Camera size={20} />
          </button>
          {voiceInputSupported && !voiceConvOn && (
            <button
              type="button"
              className={`ai-chat-tool-btn ${isListening ? 'active' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Parar gravação' : 'Falar (converter voz em texto)'}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
        {(pendingImage || pendingFileContext) && (
          <div className="ai-chat-pending">
            {pendingImage && <span>📷 Imagem anexada</span>}
            {pendingFileContext && <span>📎 {pendingFileContext.originalName}</span>}
            <button type="button" className="ai-chat-pending-clear" onClick={() => { setPendingImage(null); setPendingFileContext(null); setUploadError(''); }}>
              <X size={16} />
            </button>
          </div>
        )}
        {uploadError && <p className="ai-chat-error">{uploadError}</p>}
        <div className="ai-chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={hasMultimodalContent ? "Adicione uma pergunta (opcional) e envie..." : "Digite sua mensagem ou use voz..."}
            disabled={sending}
          />
          <button className="ai-chat-send" onClick={handleSend} disabled={!canSend}>
            <Send size={20} />
          </button>
        </div>

      {sensitiveModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:32,minWidth:340,maxWidth:400}}>
            <h3 style={{color:'#f1f5f9',marginTop:0,marginBottom:8}}>Conteúdo Sigiloso</h3>
            <p style={{color:'#94a3b8',fontSize:14,marginBottom:16}}>Esta pergunta contém informações sigilosas. Confirme sua senha para continuar.</p>
            <input
              type="password"
              placeholder="Sua senha"
              value={verifyPassword}
              onChange={e => setVerifyPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerifyAndSend()}
              style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #475569',background:'#0f172a',color:'#f1f5f9',marginBottom:8,boxSizing:'border-box'}}
            />
            {verifyError && <p style={{color:'#f87171',fontSize:13,marginBottom:8}}>{verifyError}</p>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
              <button onClick={() => { setSensitiveModal(false); setVerifyPassword(''); setPendingMessage(null); }} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #475569',background:'transparent',color:'#94a3b8',cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleVerifyAndSend} disabled={verifying || !verifyPassword} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#2563eb',color:'white',cursor:'pointer',opacity:verifying||!verifyPassword?0.5:1}}>{verifying ? 'Verificando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

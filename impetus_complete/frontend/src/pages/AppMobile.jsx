/**
 * APP IMPETUS - Versão Mobile PWA
 * Chat focado em comunicação operacional: texto, áudio, vídeo
<<<<<<< HEAD
 * Substitui canal WhatsApp/Z-API
=======
 * Canal de mensagens App Impetus
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, Video, Image, ArrowLeft } from 'lucide-react';
import { appCommunications } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './AppMobile.css';

export default function AppMobile() {
  const navigate = useNavigate();
  const token = localStorage.getItem('impetus_token');
  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const [communications, setCommunications] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadCommunications();
    const t = setInterval(loadCommunications, 15000);
    return () => clearInterval(t);
  }, [token, navigate]);

  useEffect(() => {
    listRef.current?.scrollTo(0, 0);
  }, [communications]);

  const loadCommunications = useCallback(async () => {
    try {
      const { data } = await appCommunications.list(30, 0);
      setCommunications(data.communications || []);
    } catch (err) {
      console.warn('[APP_MOBILE] loadCommunications', err);
    }
  }, []);

  const sendText = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('text_content', text);
      form.append('message_type', 'text');
      await appCommunications.send(form);
      setInputText('');
      loadCommunications();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  const sendMedia = async (file) => {
    if (!file || loading) return;
    const ext = (file.name || '').toLowerCase();
    let type = 'audio';
    if (ext.match(/\.(mp4|webm|mov)$/)) type = 'video';
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('message_type', type);
      if (type === 'audio' || type === 'video') {
        form.append('text_content', type === 'audio' ? '(Áudio)' : '(Vídeo)');
      }
      await appCommunications.send(form);
      loadCommunications();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao enviar mídia');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        sendMedia(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError('Microfone não disponível');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) sendMedia(file);
    e.target.value = '';
  };

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

  return (
    <div className="app-mobile">
      <header className="app-mobile__header">
        <button type="button" className="app-mobile__back" onClick={() => navigate('/app')} aria-label="Voltar">
          <ArrowLeft size={24} />
        </button>
        <h1 className="app-mobile__title">Impetus</h1>
        <span className="app-mobile__user">{user.name || 'Você'}</span>
      </header>

      <main className="app-mobile__list" ref={listRef}>
        {communications.length === 0 && !loading && (
          <div className="app-mobile__empty">
            <p>Envie texto, áudio ou vídeo para registrar uma comunicação operacional.</p>
            <p className="app-mobile__hint">A IA analisa e gera relatórios automaticamente.</p>
          </div>
        )}
        {communications.map((c) => (
          <div
            key={c.id}
            className={`app-mobile__msg ${c.direction === 'outbound' ? 'app-mobile__msg--out' : 'app-mobile__msg--in'}`}
          >
            <div className="app-mobile__msg-bubble">
              {c.media_url && (
                <div className="app-mobile__msg-media">
                  {c.message_type === 'video' ? (
                    <video src={`${API_BASE}${c.media_url}`} controls />
                  ) : c.message_type === 'audio' ? (
                    <audio src={`${API_BASE}${c.media_url}`} controls />
                  ) : (
                    <img src={`${API_BASE}${c.media_url}`} alt="Mídia" />
                  )}
                </div>
              )}
              {c.media_transcription && (
                <div className="app-mobile__msg-transcription">
                  Transcrição: {c.media_transcription.slice(0, 150)}...
                </div>
              )}
              <p className="app-mobile__msg-text">{c.text_content}</p>
              <span className="app-mobile__msg-time">
                {c.created_at ? format(new Date(c.created_at), 'dd/MM HH:mm', { locale: ptBR }) : ''}
              </span>
            </div>
          </div>
        ))}
      </main>

      {error && <div className="app-mobile__error">{error}</div>}

      <form className="app-mobile__input" onSubmit={sendText}>
        <button
          type="button"
          className="app-mobile__btn app-mobile__btn--media"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Enviar mídia"
        >
          <Video size={22} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="audio/*,video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {recording ? (
          <button
            type="button"
            className="app-mobile__btn app-mobile__btn--recording"
            onClick={stopRecording}
            aria-label="Parar gravação"
          >
            <span className="app-mobile__rec-dot" /> Gravar
          </button>
        ) : (
          <button
            type="button"
            className="app-mobile__btn app-mobile__btn--mic"
            onClick={startRecording}
            disabled={loading}
            aria-label="Gravar áudio"
          >
            <Mic size={22} />
          </button>
        )}
        <input
          type="text"
          className="app-mobile__text-input"
          placeholder="Mensagem..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="app-mobile__btn app-mobile__btn--send"
          disabled={!inputText.trim() || loading}
          aria-label="Enviar"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
}

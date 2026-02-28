/**
 * ONBOARDING INTELIGENTE - Modal de entrevista estratégica adaptativa
 */
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, MessageSquare, Loader2 } from 'lucide-react';
import { onboarding } from '../services/api';
import './OnboardingModal.css';

export default function OnboardingModal({ tipo, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onboarding.start(tipo);
        const msg = res.data?.message;
        if (msg && !cancelled) {
          setMessages([{ role: 'assistant', content: msg }]);
          if (res.data?.completed) {
            setCompleted(true);
            setTimeout(() => onComplete?.(), 1500);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: 'Olá! Vamos começar. Por favor, apresente-se ou responda à pergunta inicial.' }]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const answer = input.trim();
    if (!answer || sending) return;

    setMessages((m) => [...m, { role: 'user', content: answer }]);
    setInput('');
    setSending(true);

    try {
      const res = await onboarding.respond(tipo, answer);
      const nextMsg = res.data?.message;
      if (nextMsg) {
        setMessages((m) => [...m, { role: 'assistant', content: nextMsg }]);
        if (res.data?.completed) {
          setCompleted(true);
          setTimeout(() => onComplete?.(), 2000);
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Pode repetir sua resposta?' }]);
    } finally {
      setSending(false);
    }
  };

  const title = tipo === 'empresa' ? 'Entrevista estratégica – Conheça sua empresa' : 'Seja bem-vindo – Conte-nos sobre você';
  const subtitle = tipo === 'empresa'
    ? 'Preciso entender profundamente sua empresa para atuar de forma estratégica.'
    : 'Sou sua assistente estratégica pessoal. Vamos nos conhecer.';

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <div className="onboarding-header-icon"><Bot size={28} /></div>
          <div>
            <h2>{title}</h2>
            <p className="onboarding-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="onboarding-messages">
          {loading ? (
            <div className="onboarding-loading">
              <Loader2 size={24} className="spin" />
              <span>Preparando entrevista...</span>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`onboarding-msg onboarding-msg--${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="onboarding-msg-avatar"><MessageSquare size={18} /></div>
                  )}
                  <div className="onboarding-msg-content">
                    {(msg.content || '').split('\n').map((line, j) => (
                      <p key={j}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {!loading && !completed && (
          <form className="onboarding-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua resposta..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </form>
        )}

        {completed && (
          <div className="onboarding-complete">
            <p>Perfil registrado! Redirecionando...</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Modal de Identificação / Ativação
 * - Primeiro acesso: conversa com IA (nome, setor, cargo, atividades → no final, IA solicita criação do PIN)
 * - Verificação diária: nome + PIN (ao abrir o dashboard)
 */
import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Send, MessageSquare, Loader2, Bot } from 'lucide-react';
import { userIdentification } from '../services/api';
import './IdentificationModal.css';

export default function IdentificationModal({ status, onComplete }) {
  const [mode, setMode] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const isFirstAccess = status?.status === 'needs_activation';
  const isDailyVerify = status?.status === 'needs_daily_verify';
  const isLocked = !!status?.pinLockedUntil;

  const [dailyForm, setDailyForm] = useState({ fullName: '', pin: '' });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (isDailyVerify && status?.profile) {
      setDailyForm((f) => ({ ...f, fullName: status.profile.full_name }));
    }
  }, [isDailyVerify, status?.profile]);

  useEffect(() => {
    if (!isFirstAccess) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await userIdentification.activationStart();
        const msg = res.data?.message;
        if (msg && !cancelled) {
          setMessages([{ role: 'assistant', content: msg }]);
          setMode('conversation');
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: 'Olá! Vamos começar sua ativação. Por favor, responda à primeira pergunta.' }]);
          setMode('conversation');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isFirstAccess]);

  const handleConversationSubmit = async (e) => {
    e.preventDefault();
    const answer = input.trim();
    if (!answer || sending) return;

    setMessages((m) => [...m, { role: 'user', content: answer }]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await userIdentification.activationRespond(answer);
      const nextMsg = res.data?.message;
      if (nextMsg) {
        setMessages((m) => [...m, { role: 'assistant', content: nextMsg }]);
        if (res.data?.completed) {
          setTimeout(() => onComplete?.(), 2000);
        }
      }
    } catch (err) {
      setError(err.apiMessage || err.response?.data?.error || 'Erro. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleDailySubmit = async (e) => {
    e.preventDefault();
    const { fullName, pin } = dailyForm;
    if (!fullName?.trim() || pin.length !== 4) {
      setError('Informe seu nome e PIN de 4 dígitos.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await userIdentification.dailyVerify(fullName, pin);
      onComplete?.();
    } catch (err) {
      setError(err.apiMessage || err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  };

  if (isLocked) {
    const until = status.pinLockedUntil ? new Date(status.pinLockedUntil) : null;
    return (
      <div className="identification-overlay">
        <div className="identification-modal identification-modal--locked">
          <AlertTriangle size={48} />
          <h2>Acesso temporariamente bloqueado</h2>
          <p>
            Muitas tentativas incorretas de contra-senha. Por segurança, o acesso foi bloqueado.
            {until && <br />}
            {until && `Tente novamente após ${until.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`}
          </p>
          <p className="identification-audit-hint">
            Foi registrado um alerta de segurança. Em caso de dúvidas, contate o administrador.
          </p>
        </div>
      </div>
    );
  }

  if (isFirstAccess) {
    return (
      <div className="identification-overlay">
        <div className="identification-modal identification-modal--conversation">
          <div className="identification-header">
            <div className="identification-header-icon"><Bot size={28} /></div>
            <div>
              <h2>Ativação – Primeiro acesso</h2>
              <p>O Impetus vai solicitar algumas informações. Ao final, crie sua contra-senha de 4 dígitos.</p>
            </div>
          </div>

          <div className="identification-messages">
            {loading ? (
              <div className="identification-loading">
                <Loader2 size={24} className="spin" />
                <span>Preparando...</span>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`identification-msg identification-msg--${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="identification-msg-avatar"><MessageSquare size={18} /></div>
                    )}
                    <div className="identification-msg-content">
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

          {!loading && (
            <form className="identification-input" onSubmit={handleConversationSubmit}>
              {error && <div className="identification-error">{error}</div>}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua resposta..."
                disabled={sending}
                autoComplete="off"
              />
              <button type="submit" disabled={sending || !input.trim()}>
                {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (isDailyVerify) {
    return (
      <div className="identification-overlay">
        <div className="identification-modal">
          <div className="identification-header">
            <Shield size={28} />
            <div>
              <h2>Confirmação de identidade</h2>
              <p>O Impetus solicita sua contra-senha para confirmar seu acesso.</p>
            </div>
          </div>

          <form onSubmit={handleDailySubmit} className="identification-form">
            {error && (
              <div className="identification-error">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}
            <div className="identification-field">
              <label>Nome completo</label>
              <input
                type="text"
                value={dailyForm.fullName}
                onChange={(e) => setDailyForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Seu nome"
                required
                disabled={loading}
              />
            </div>
            <div className="identification-field">
              <label>Contra-senha (4 dígitos)</label>
              <input
                type="password"
                value={dailyForm.pin}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= 4 && /^\d*$/.test(v)) setDailyForm((f) => ({ ...f, pin: v }));
                }}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="identification-submit" disabled={sending}>
              {sending ? <Loader2 size={20} className="spin" /> : 'Confirmar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

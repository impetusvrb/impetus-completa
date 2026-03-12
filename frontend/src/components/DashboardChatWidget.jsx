/**
 * Widget de chat interacional para embed em dashboards
 * Disponível em todos os dashboards conforme Indústria 4.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { dashboard } from '../services/api';
import './DashboardChatWidget.css';

export default function DashboardChatWidget({ compact = false, greetingSummary = true }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(greetingSummary);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (!greetingSummary) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou o Impetus, assistente de inteligência operacional. Como posso ajudar?'
      }]);
      setLoading(false);
      return;
    }
    const loadGreeting = async () => {
      setLoading(true);
      try {
        const userName = JSON.parse(localStorage.getItem('impetus_user') || '{}').name || 'Usuário';
        const r = await dashboard.getSmartSummary();
        if (r.data?.ok && r.data?.summary) {
          setMessages([{
            id: 'ai-greet',
            role: 'assistant',
            content: `${userName},\n\n${r.data.summary}`
          }]);
        } else {
          setMessages([{
            id: 'ai-greet',
            role: 'assistant',
            content: `Olá, ${userName}! Em que posso ajudar?`
          }]);
        }
      } catch {
        setMessages([{
          id: 'ai-greet',
          role: 'assistant',
          content: 'Em que posso ajudar?'
        }]);
      } finally {
        setLoading(false);
      }
    };
    loadGreeting();
  }, [greetingSummary]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const r = await dashboard.chat(text, history);
      const reply = r.data?.ok && r.data?.reply
        ? r.data.reply
        : r.data?.fallback || 'Resposta temporariamente indisponível. Tente novamente.';
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: reply }]);
    } catch (e) {
      const errMsg = e.apiMessage || e.response?.data?.fallback || e.response?.data?.error;
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errMsg || 'Conexão indisponível. O Impetus oferece comunicação inteligente, manutenção assistida e melhoria contínua para a indústria. Tente novamente.'
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`dashboard-chat-widget ${compact ? 'dashboard-chat-widget--compact' : ''}`}>
      <h3 className="dashboard-chat-widget__title">
        <Bot size={20} />
        Chat com Impetus
      </h3>
      <div className="dashboard-chat-widget__box">
        <div className="dashboard-chat-widget__messages">
          {loading ? (
            <div className="dashboard-chat-widget__loading">
              <div className="dashboard-chat-widget__spinner" />
              <p>Carregando...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`dashboard-chat-widget__msg dashboard-chat-widget__msg--${msg.role}`}>
                <div className="dashboard-chat-widget__avatar">
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="dashboard-chat-widget__content">
                  {(msg.content || '').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="dashboard-chat-widget__input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            disabled={sending || loading}
            aria-label="Mensagem para o chat"
          />
          <button
            type="button"
            className="dashboard-chat-widget__send"
            onClick={handleSend}
            disabled={!input.trim() || sending || loading}
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

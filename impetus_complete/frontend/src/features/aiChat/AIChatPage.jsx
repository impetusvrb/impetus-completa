/**
 * Chat com o Impetus
 * A identificação/ativação é feita no Layout ao abrir o dashboard
 */
import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { Bot, Send, User } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import './AIChatPage.css';

export default function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { log } = useActivityLog();

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
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply
      }]);
    } catch (e) {
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

  return (
    <Layout>
      <div className="ai-chat-page">
        <header className="ai-chat-header">
          <Bot size={24} />
          <div>
            <h1>Impetus</h1>
            <p>Assistente de Inteligência Operacional Industrial</p>
          </div>
        </header>
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
                  {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="ai-chat-msg__content">
                  {(msg.content || '').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="ai-chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            disabled={sending}
          />
          <button className="ai-chat-send" onClick={handleSend} disabled={!input.trim() || sending}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </Layout>
  );
}

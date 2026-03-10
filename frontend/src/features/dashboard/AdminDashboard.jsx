/**
 * DASHBOARD ADMINISTRATIVO
 * Visão exclusiva do administrador: carregamento de documentos internos + chat interacional
 * Sem KPIs, gráficos, monitoramento ou dados de produção
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Shield, FileText, BookOpen, Phone, Settings, Bot, Send, User, ArrowRight } from 'lucide-react';
import { dashboard, adminSettings } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import './AdminDashboard.css';

const DOC_CARDS = [
  { id: 'policy', icon: Shield, title: 'Política da Empresa', desc: 'Normas, POPs gerais e diretrizes para a IA', tab: 'policy', path: '/app/settings' },
  { id: 'pops', icon: FileText, title: 'POPs', desc: 'Procedimentos Operacionais Padrão', tab: 'pops', path: '/app/settings' },
  { id: 'manuals', icon: BookOpen, title: 'Manuais Técnicos', desc: 'Manuais operacionais e de máquinas', tab: 'manuals', path: '/app/settings' },
  { id: 'whatsapp', icon: Phone, title: 'Contatos WhatsApp', desc: 'Contatos para a IA e notificações', tab: 'whatsapp-contacts', path: '/app/settings' },
];

export default function AdminDashboard() {
  const { log } = useActivityLog();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [docCounts, setDocCounts] = useState({ pops: 0, manuals: 0 });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    log('view', 'admin_dashboard', null, {});
  }, []);

  useEffect(() => {
    const loadDocCounts = async () => {
      try {
        const [popsRes, manualsRes] = await Promise.all([
          adminSettings.listPops().catch(() => ({ data: { pops: [] } })),
          adminSettings.listManuals().catch(() => ({ data: { manuals: [] } }))
        ]);
        setDocCounts({
          pops: popsRes?.data?.pops?.length ?? 0,
          manuals: manualsRes?.data?.manuals?.length ?? 0
        });
      } catch (_) {}
    };
    loadDocCounts();
  }, []);

  useEffect(() => {
    const loadGreeting = async () => {
      setChatLoading(true);
      try {
        const userName = JSON.parse(localStorage.getItem('impetus_user') || '{}').name || 'Administrador';
        const r = await dashboard.getSmartSummary();
        if (r.data?.ok && r.data?.summary) {
          setMessages([{
            id: 'ai-greet',
            role: 'assistant',
            content: `${userName},\n\nResumo:\n\n${r.data.summary}\n\nComo administrador, você pode carregar documentos pelos atalhos ao lado.`
          }]);
        } else {
          setMessages([{
            id: 'ai-greet',
            role: 'assistant',
            content: `${userName}, carregue políticas, POPs e manuais pelos atalhos ao lado. Em que posso ajudar?`
          }]);
        }
      } catch (_) {
        setMessages([{
          id: 'ai-greet',
          role: 'assistant',
          content: 'Em que posso ajudar com documentos e configurações?'
        }]);
      } finally {
        setChatLoading(false);
      }
    };
    loadGreeting();
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
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: reply }]);
    } catch (e) {
      const errMsg = e.apiMessage || e.response?.data?.fallback || e.response?.data?.error;
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errMsg || 'Parece que houve um problema de conexão. Verifique e tente novamente. O Impetus oferece comunicação inteligente e manutenção assistida para a sua indústria.'
      }]);
    } finally {
      setSending(false);
    }
  };

  const getCardBadge = (id) => {
    if (id === 'pops') return docCounts.pops;
    if (id === 'manuals') return docCounts.manuals;
    return null;
  };

  return (
    <Layout>
      <div className="admin-dashboard">
        <header className="admin-dashboard__header">
          <div>
            <h1>Dashboard Administrativo</h1>
            <p>Carregar documentos internos e configurar o sistema</p>
          </div>
          <Link to="/app/settings" className="admin-dashboard__settings-link">
            <Settings size={20} />
            Configurações completas
          </Link>
        </header>

        <div className="admin-dashboard__grid">
          <section className="admin-dashboard__docs">
            <h2>Documentos Internos</h2>
            <p className="admin-dashboard__docs-desc">
              Carregue políticas, POPs, manuais e normativas. A IA utilizará este conteúdo nas sugestões.
            </p>
            <div className="admin-dashboard__cards">
              {DOC_CARDS.map(({ id, icon: Icon, title, desc, tab, path }) => (
                <Link
                  key={id}
                  to={`${path}?tab=${tab}`}
                  className="admin-dashboard__card"
                >
                  <div className="admin-dashboard__card-icon">
                    <Icon size={24} />
                  </div>
                  <div className="admin-dashboard__card-body">
                    <h3>{title}</h3>
                    <p>{desc}</p>
                    {getCardBadge(id) !== null && (
                      <span className="admin-dashboard__card-badge">
                        {getCardBadge(id)} cadastrado(s)
                      </span>
                    )}
                  </div>
                  <ArrowRight size={20} className="admin-dashboard__card-arrow" />
                </Link>
              ))}
            </div>
          </section>

          <section className="admin-dashboard__chat">
            <h2>
              <Bot size={20} />
              Chat Interacional
            </h2>
            <p className="admin-dashboard__chat-desc">
              Converse com o Impetus. A IA consulta os documentos carregados para responder.
            </p>
            <div className="admin-dashboard__chat-box">
              <div className="admin-dashboard__chat-messages">
                {chatLoading ? (
                  <div className="admin-dashboard__chat-loading">
                    <div className="admin-dashboard__chat-spinner" />
                    <p>Carregando...</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`admin-dashboard__chat-msg admin-dashboard__chat-msg--${msg.role}`}>
                      <div className="admin-dashboard__chat-avatar">
                        {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                      </div>
                      <div className="admin-dashboard__chat-content">
                        {(msg.content || '').split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="admin-dashboard__chat-input">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Digite sua mensagem..."
                  disabled={sending || chatLoading}
                />
                <button
                  className="admin-dashboard__chat-send"
                  onClick={handleSend}
                  disabled={!input.trim() || sending || chatLoading}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

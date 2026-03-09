/**
 * Chat com o Impetus
 * A identificação/ativação é feita no Layout ao abrir o dashboard
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Bot, Send, User } from 'lucide-react';
import { dashboard } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
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
          <img src="/ai-avatar.png" alt="Impetus IA" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",border:"2px solid #1E90FF",boxShadow:"0 0 12px rgba(30,144,255,0.4)"}} />
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
                  {msg.role === 'assistant' ? <img src='/ai-avatar.png' alt='IA' style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:'2px solid #1E90FF',background:'transparent',boxShadow:'0 0 8px rgba(30,144,255,0.4)'}} /> : <User size={20} />}
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

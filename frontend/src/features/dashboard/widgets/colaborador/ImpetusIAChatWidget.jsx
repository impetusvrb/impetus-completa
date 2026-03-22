/**
 * Widget Impetus IA e Chat — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, MessageSquare } from 'lucide-react';

export default function ImpetusIAChatWidget({ widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const navigate = useNavigate();

  return (
    <section className={`cc-widget ${widgetClass}`} style={{ gridColumn: 'span 2' }}>
      <div className="cc-kpi__header">
        <Bot size={20} />
        <span>Impetus IA e Chat</span>
      </div>
      <p className="cc-resumo__text">Assistente IA e chat com a equipe.</p>
      <div className="dcl-ia-chat-row">
        <button type="button" className={`${btnClass} ${btnClass}--primary`} onClick={() => navigate('/app/chatbot')}>
          <Zap size={18} /> Impetus IA
        </button>
        <button type="button" className={`${btnClass} ${btnClass}--secondary`} onClick={() => navigate('/chat')}>
          <MessageSquare size={18} /> Chat Impetus
        </button>
      </div>
    </section>
  );
}

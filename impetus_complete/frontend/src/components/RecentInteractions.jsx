/**
 * INTERAÇÕES RECENTES (FEED)
 */

import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './RecentInteractions.css';

export default function RecentInteractions({ interactions = [], loading = false, onInteractionClick }) {
  const defaultInteractions = [
    {
      id: 1,
      source: 'whatsapp',
      text: 'Novo chamado aberto via WhatsApp',
      sender_name: 'João Silva',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      avatar_url: null
    },
    {
      id: 2,
      source: 'web',
      text: 'Por favor, envie a análise de consumo de energia de hoje.',
      sender_name: 'Maria Santos',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      avatar_url: null
    }
  ];

  const displayInteractions = interactions.length > 0 ? interactions : defaultInteractions;

  const getTimeAgo = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Agora';
      if (diffMinutes < 60) return `${diffMinutes}min atrás`;
      
      const hours = Math.floor(diffMinutes / 60);
      if (hours < 24) {
        const minutes = diffMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
      }
      
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return 'Há pouco';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div className="interactions-card">
        <h3>Interações Recentes</h3>
        <div className="interactions-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="interactions-card">
      <h3>Interações Recentes</h3>
      
      <div className="interactions-list">
        {displayInteractions.map((interaction) => (
          <div
            key={interaction.id}
            className={`interaction-item ${onInteractionClick ? 'interaction-item--clickable' : ''}`}
            role={onInteractionClick ? 'button' : undefined}
            tabIndex={onInteractionClick ? 0 : undefined}
            onClick={onInteractionClick ? () => onInteractionClick(interaction) : undefined}
            onKeyDown={onInteractionClick ? (e) => e.key === 'Enter' && onInteractionClick(interaction) : undefined}
          >
            <div className="interaction-avatar">
              {interaction.avatar_url ? (
                <img src={interaction.avatar_url} alt={interaction.sender_name} />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(interaction.sender_name)}
                </div>
              )}
              {interaction.source === 'whatsapp' && (
                <div className="source-badge whatsapp">
                  <MessageSquare size={10} />
                </div>
              )}
            </div>

            <div className="interaction-content">
              <div className="interaction-header">
                <span className="interaction-sender">{interaction.sender_name}</span>
                <span className="interaction-time">
                  <Clock size={12} />
                  {getTimeAgo(interaction.created_at)}
                </span>
              </div>
              <p className="interaction-text">{interaction.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

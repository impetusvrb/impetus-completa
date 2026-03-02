/**
 * IMPETUS CHAT - Página principal estilo WhatsApp
 * Dark mode, design industrial
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { chatApi } from './chatApi';
import { useChatSocket } from './useChatSocket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './ChatPage.css';

const API_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin)
  : '';

export default function ChatPage() {
  const token = localStorage.getItem('impetus_token');
  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const {
    connected,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
    sendMessageSocket,
    onReceiveMessage,
    onTyping,
    onStopTyping
  } = useChatSocket(token);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('[CHAT] loadConversations', err);
    }
  }, []);

  const loadColaboradores = useCallback(async () => {
    try {
      const { data } = await chatApi.getColaboradores();
      setColaboradores(data.colaboradores || []);
    } catch (err) {
      console.error('[CHAT] loadColaboradores', err);
    }
  }, []);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const { data } = await chatApi.getMessages(convId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('[CHAT] loadMessages', err);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadConversations();
      loadColaboradores();
    }
  }, [token, loadConversations, loadColaboradores]);

  useEffect(() => {
    if (selectedConv) {
      joinConversation(selectedConv.id);
      loadMessages(selectedConv.id);
      return () => leaveConversation(selectedConv.id);
    }
  }, [selectedConv?.id, joinConversation, leaveConversation, loadMessages]);

  useEffect(() => {
    const unsub = onReceiveMessage((msg) => {
      if (selectedConv && msg.conversation_id === selectedConv.id) {
        setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
      }
      loadConversations();
    });
    return unsub;
  }, [selectedConv?.id, onReceiveMessage, loadConversations]);

  useEffect(() => {
    const unsub = onTyping(({ user_id, name }) => {
      if (user_id !== user?.id) setTypingUser(name);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      unsub();
    };
  }, [onTyping, user?.id]);

  useEffect(() => {
    const unsub = onStopTyping(() => setTypingUser(null));
    return unsub;
  }, [onStopTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv) return;

    const payload = {
      conversation_id: selectedConv.id,
      message_type: 'text',
      content: text
    };

    sendMessageSocket(payload, (res) => {
      if (res?.ok && res?.message) {
        setMessages((prev) => [...prev, { ...res.message, sender_name: user?.name }]);
        setInputText('');
        loadConversations();
      }
    });
  };

  const handleStartChat = async (participant) => {
    try {
      const { data } = await chatApi.createConversation({
        type: 'private',
        participant_id: participant.id
      });
      setSelectedConv(data.conversation);
      setShowNewChat(false);
      loadConversations();
    } catch (err) {
      console.error('[CHAT] startChat', err);
    }
  };

  const getOtherParticipant = (conv) => {
    const participants = conv.participants || [];
    return participants.find((p) => p.id !== user?.id) || participants[0];
  };

  const getConvTitle = (conv) => {
    if (conv.type === 'group' && conv.name) return conv.name;
    const other = getOtherParticipant(conv);
    return other?.name || 'Conversa';
  };

  const getConvAvatar = (conv) => {
    const other = getOtherParticipant(conv);
    return other?.avatar_url;
  };

  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.pathname === '/chat') {
      navigator.serviceWorker.register('/chat-sw.js').catch(() => {});
    }
  }, []);

  if (!token) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <header className="chat-sidebar-header">
          <h1 className="chat-logo">
            <Link to="/app" className="chat-logo-link">IMPETUS Chat</Link>
          </h1>
          <div className="chat-user-info">
            <span className="chat-online-dot" data-connected={connected} />
            <span>{user?.name}</span>
          </div>
        </header>

        <button className="chat-new-btn" onClick={() => setShowNewChat(true)}>
          + Nova conversa
        </button>

        <ul className="chat-conversation-list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`chat-conv-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
              onClick={() => setSelectedConv(conv)}
            >
              <div className="chat-conv-avatar">
                {getConvAvatar(conv) ? (
                  <img src={getConvAvatar(conv)} alt="" />
                ) : (
                  <span>{getConvTitle(conv).slice(0, 2).toUpperCase()}</span>
                )}
                {conv.unread_count > 0 && <span className="chat-badge">{conv.unread_count}</span>}
              </div>
              <div className="chat-conv-info">
                <strong>{getConvTitle(conv)}</strong>
                <span className="chat-conv-preview">
                  {conv.last_message_content?.slice(0, 40) || 'Sem mensagens'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-main">
        {selectedConv ? (
          <>
            <header className="chat-main-header">
              <div className="chat-main-title">
                <h2>{getConvTitle(selectedConv)}</h2>
                {typingUser && <span className="chat-typing">{typingUser} está digitando...</span>}
              </div>
            </header>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-msg ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
                >
                  {msg.sender_role === 'ai_system' && (
                    <span className="chat-msg-ai-badge">Impetus IA</span>
                  )}
                  {msg.message_type === 'text' || msg.message_type === 'ai' ? (
                    <div className="chat-msg-bubble">
                      <p>{msg.content}</p>
                      <span className="chat-msg-time">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  ) : (
                    <div className="chat-msg-media">
                      {msg.message_type === 'image' && msg.file_url && (
                        <a href={`${API_URL}${msg.file_url}`} target="_blank" rel="noreferrer">
                          <img src={`${API_URL}${msg.file_url}`} alt="" />
                        </a>
                      )}
                      {msg.message_type === 'video' && msg.file_url && (
                        <video controls src={`${API_URL}${msg.file_url}`} />
                      )}
                      {msg.message_type === 'audio' && msg.file_url && (
                        <audio controls src={`${API_URL}${msg.file_url}`} />
                      )}
                      {msg.message_type === 'document' && msg.file_url && (
                        <a href={`${API_URL}${msg.file_url}`} target="_blank" rel="noreferrer">
                          📄 {msg.file_name || 'Documento'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                type="text"
                className="chat-input"
                placeholder="Digite uma mensagem... Mencione @ImpetusIA para acionar a IA"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (selectedConv) emitTyping(selectedConv.id);
                }}
                onBlur={() => selectedConv && emitStopTyping(selectedConv.id)}
              />
              <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <p>Selecione uma conversa ou inicie uma nova</p>
          </div>
        )}
      </main>

      {showNewChat && (
        <div className="chat-modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova conversa</h3>
            <ul className="chat-colab-list">
              {colaboradores.map((c) => (
                <li key={c.id} onClick={() => handleStartChat(c)}>
                  <span>{c.name}</span>
                  <small>{c.department_name || c.role}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

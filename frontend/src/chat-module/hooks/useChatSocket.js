import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
let socketInstance = null;

function socketBase() {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function getSocket() {
  if (!socketInstance || !socketInstance.connected) {
    const token = localStorage.getItem('impetus_token');
    const base = socketBase();
    socketInstance = io(base || window.location.origin, { auth: { token }, path: '/socket.io', transports: ['websocket','polling'], reconnectionAttempts: 10 });
  }
  return socketInstance;
}
export function useChatSocket({ onMessage, onTyping, onStopTyping, onOnline, onOffline, onReaction, onRead, onProfileUpdate }) {
  const socketRef = useRef(null);
  const h = useRef({});
  useEffect(() => { h.current = { onMessage, onTyping, onStopTyping, onOnline, onOffline, onReaction, onRead, onProfileUpdate }; });
  useEffect(() => {
    const s = getSocket(); socketRef.current = s; s.emit('join_conversations');
    s.on('new_message', m => h.current.onMessage && h.current.onMessage(m));
    s.on('user_typing', d => h.current.onTyping && h.current.onTyping(d));
    s.on('user_stop_typing', d => h.current.onStopTyping && h.current.onStopTyping(d));
    s.on('user_online', d => h.current.onOnline && h.current.onOnline(d));
    s.on('user_offline', d => h.current.onOffline && h.current.onOffline(d));
    s.on('message_reaction', d => h.current.onReaction && h.current.onReaction(d));
    s.on('messages_read', d => h.current.onRead && h.current.onRead(d));
    s.on('user_profile_updated', d => h.current.onProfileUpdate && h.current.onProfileUpdate(d));
    return () => { ['new_message','user_typing','user_stop_typing','user_online','user_offline','message_reaction','messages_read','user_profile_updated'].forEach(e => s.off(e)); };
  }, []);
  const sendMessage = useCallback((data) => new Promise((res,rej) => { socketRef.current && socketRef.current.emit('send_message', data, r => r && r.error ? rej(new Error(r.error)) : res(r)); }), []);
  const emitTyping = useCallback((id) => { socketRef.current && socketRef.current.emit('typing', { conversationId: id }); }, []);
  const emitStopTyping = useCallback((id) => { socketRef.current && socketRef.current.emit('stop_typing', { conversationId: id }); }, []);
  const markRead = useCallback((id) => { socketRef.current && socketRef.current.emit('mark_read', { conversationId: id }); }, []);
  const joinConversation = useCallback((id) => { socketRef.current && socketRef.current.emit('join_conversation', id); }, []);
  return { sendMessage, emitTyping, emitStopTyping, markRead, joinConversation };
}

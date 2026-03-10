import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : (window.location.origin.includes('localhost') ? '' : window.location.origin))
  : '';

export function useChatSocket(token) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinConversation = useCallback((id) => {
    if (socketRef.current) socketRef.current.emit('join_conversation', id);
  }, []);
  const leaveConversation = useCallback((id) => {
    if (socketRef.current) socketRef.current.emit('leave_conversation', id);
  }, []);
  const emitTyping = useCallback((id) => {
    if (socketRef.current) socketRef.current.emit('typing', id);
  }, []);
  const emitStopTyping = useCallback((id) => {
    if (socketRef.current) socketRef.current.emit('stop_typing', id);
  }, []);
  const sendMessageSocket = useCallback((payload, ack) => {
    if (socketRef.current) socketRef.current.emit('send_message', payload, ack);
  }, []);
  const onReceiveMessage = useCallback((handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('receive_message', handler);
    return () => socketRef.current.off('receive_message', handler);
  }, []);
  const onTyping = useCallback((handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('typing', handler);
    return () => socketRef.current.off('typing', handler);
  }, []);
  const onStopTyping = useCallback((handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('stop_typing', handler);
    return () => socketRef.current.off('stop_typing', handler);
  }, []);

  return {
    connected,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
    sendMessageSocket,
    onReceiveMessage,
    onTyping,
    onStopTyping
  };
}

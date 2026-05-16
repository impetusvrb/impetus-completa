/**
 * WAVE 6 — Unified Realtime Channel Manager.
 * Abstracção sobre socket.io existente. Zero breaking change — useChatSocket continua intacto.
 *
 * Estratégia:
 * - Reutiliza a mesma ligação socket.io (singleton em useChatSocket).
 * - Subscreve handlers por topic (REALTIME_TOPIC.*).
 * - Handlers por topic são isolados dos handlers existentes do chat.
 */

import { io } from 'socket.io-client';
import { SOCKET_EVENT_TO_TOPIC } from './realtimeTopics';

let _socket = null;
let _tokenSnapshot = null;

/** @type {Map<string, Set<Function>>} topic → Set<handler> */
const _topicHandlers = new Map();

/** @type {Set<string>} socket events já subscritos pelo canal unificado */
const _subscribedEvents = new Set();

function socketBase() {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function _dispatch(topic, event, data) {
  const handlers = _topicHandlers.get(topic);
  if (!handlers || handlers.size === 0) return;
  handlers.forEach((fn) => {
    try { fn({ topic, event, data }); } catch (err) {
      console.warn('[UNIFIED_CHANNEL] Handler error:', err?.message || err);
    }
  });
}

function _ensureEventSubscribed(socketEvt, topic) {
  if (!_socket || _subscribedEvents.has(socketEvt)) return;
  _subscribedEvents.add(socketEvt);
  _socket.on(socketEvt, (data) => _dispatch(topic, socketEvt, data));
}

function _ensureAllTopicsSubscribed() {
  for (const [evt, topic] of Object.entries(SOCKET_EVENT_TO_TOPIC)) {
    _ensureEventSubscribed(evt, topic);
  }
}

/**
 * Inicializa (ou reutiliza) a ligação socket unificada.
 * Chamada internamente no subscribe; não necessita chamada manual.
 */
export function initUnifiedChannel() {
  const token = localStorage.getItem('impetus_token');
  if (!token) {
    if (_socket) {
      _socket.off();
      _socket.disconnect();
      _socket = null;
      _tokenSnapshot = null;
      _subscribedEvents.clear();
    }
    return null;
  }
  if (_socket && _tokenSnapshot && _tokenSnapshot !== token) {
    _socket.off();
    _socket.disconnect();
    _socket = null;
    _subscribedEvents.clear();
  }
  if (!_socket || !_socket.connected) {
    const base = socketBase();
    _socket = io(base || window.location.origin, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });
    _tokenSnapshot = token;
  }
  _ensureAllTopicsSubscribed();
  return _socket;
}

/**
 * Subscreve um handler a um topic.
 * @param {string} topic — REALTIME_TOPIC.*
 * @param {(payload: { topic: string, event: string, data: unknown }) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function subscribeToTopic(topic, handler) {
  if (!_topicHandlers.has(topic)) {
    _topicHandlers.set(topic, new Set());
  }
  _topicHandlers.get(topic).add(handler);
  initUnifiedChannel();
  return () => {
    const s = _topicHandlers.get(topic);
    if (s) s.delete(handler);
  };
}

/**
 * Emite um evento para o servidor via canal unificado.
 * @param {string} event
 * @param {unknown} data
 */
export function emitUnified(event, data) {
  const socket = initUnifiedChannel();
  if (!socket) return;
  socket.emit(event, data);
}

/** Retorna o socket actual (null se sem token). */
export function getUnifiedSocket() {
  return _socket;
}

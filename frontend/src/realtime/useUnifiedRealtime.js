/**
 * WAVE 6 — Hook para canal realtime unificado por topic.
 * Uso: const { lastMessage } = useUnifiedRealtime(REALTIME_TOPIC.WORKFLOW);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { subscribeToTopic, emitUnified } from './unifiedChannelManager';

/**
 * @param {string} topic — REALTIME_TOPIC.*
 * @returns {{ lastMessage: { topic, event, data } | null, emit: (event, data) => void }}
 */
export function useUnifiedRealtime(topic) {
  const [lastMessage, setLastMessage] = useState(null);
  const handlerRef = useRef(null);

  useEffect(() => {
    if (!topic) return;
    handlerRef.current = (payload) => setLastMessage(payload);
    const unsubscribe = subscribeToTopic(topic, handlerRef.current);
    return unsubscribe;
  }, [topic]);

  const emit = useCallback((event, data) => {
    emitUnified(event, data);
  }, []);

  return { lastMessage, emit };
}

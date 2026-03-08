import { useState, useCallback, useRef } from 'react';
import chatApi from '../services/chatApi';
export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldest = useRef(null);
  const loadMessages = useCallback(async (reset) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    try {
      const { data } = await chatApi.getMessages(conversationId, 50, reset ? null : oldest.current);
      if (data.length < 50) setHasMore(false);
      if (data.length > 0) oldest.current = data[0].created_at;
      setMessages(prev => reset ? data : [...data, ...prev]);
    } catch(e) { console.error('[LOAD_MSGS]', e); }
    finally { setLoading(false); }
  }, [conversationId, loading, hasMore]);
  const addMessage = useCallback((msg) => setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]), []);
  const reset = useCallback(() => { setMessages([]); setHasMore(true); oldest.current = null; }, []);
  return { messages, loading, hasMore, loadMessages, addMessage, reset };
}

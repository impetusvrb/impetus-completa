import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || '/api';
const http = axios.create({ baseURL: API_URL });
http.interceptors.request.use(c => { const t = localStorage.getItem('impetus_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
http.interceptors.response.use(
  (response) => {
    try {
      const url = String(response.config?.url || '');
      const method = String(response.config?.method || '').toLowerCase();
      if (
        method === 'post' &&
        (url.includes('/dashboard/chat') ||
          url.includes('/dashboard/chat-multimodal') ||
          url.includes('/cognitive-council/execute'))
      ) {
        const tid = response.headers?.['x-ai-trace-id'] || response.headers?.['X-AI-Trace-ID'];
        if (tid && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('impetus_last_ai_trace_id', tid);
        }
      }
    } catch (_) { /* ignore */ }
    return response;
  },
  (err) => Promise.reject(err)
);
const chatApi = {
  getConversations: () => http.get('/chat/conversations'),
  createPrivateConversation: (uid) => http.post('/chat/conversations', { type: 'private', targetUserId: uid }),
  createGroup: (name, ids) => http.post('/chat/conversations', { type: 'group', name, participantIds: ids }),
  getMessages: (id, limit, before) => http.get('/chat/conversations/'+id+'/messages', { params: { limit: limit||50, ...(before && { before }) } }),
  sendMessage: (id, content, replyTo) => http.post('/chat/conversations/'+id+'/messages', { content, replyTo }),
  uploadFile: (conversationId, file, replyTo) => { const fd = new FormData(); fd.append('file', file); fd.append('conversationId', conversationId); if (replyTo) fd.append('replyTo', replyTo); return http.post('/chat/upload', fd); },
  markAsRead: (conversationId, messageId) => http.put('/chat/messages/'+messageId+'/read', { conversationId }),
  deleteMessage: (messageId, scope, conversationId) =>
    http.post('/chat/messages/' + messageId + '/delete', { scope, conversationId }),
  getParticipants: (id) => http.get('/chat/conversations/'+id+'/participants'),
  addParticipant: (id, userId) => http.post('/chat/conversations/'+id+'/participants', { userId }),
  removeParticipant: (id, userId) => http.delete('/chat/conversations/'+id+'/participants/'+userId),
  getUsers: () => http.get('/chat/users'),
  subscribePush: (sub) => http.post('/chat/push/subscribe', sub),
  /** Backend: POST /api/dashboard/chat — corpo { message: string, history: {role,content}[] } */
  sendAIMessage: ({ message, history }) => {
    let last_ai_trace_id;
    try {
      last_ai_trace_id = sessionStorage.getItem('impetus_last_ai_trace_id') || undefined;
    } catch (_) {
      last_ai_trace_id = undefined;
    }
    return http.post('/dashboard/chat', {
      message,
      history: history || [],
      ...(last_ai_trace_id ? { last_ai_trace_id } : {})
    });
  },
  /** Conselho Cognitivo — pipeline Gemini → Claude → GPT (sem chat entre modelos). */
  executeCognitiveCouncil: (body = {}) => {
    let last_ai_trace_id;
    try {
      last_ai_trace_id = sessionStorage.getItem('impetus_last_ai_trace_id') || undefined;
    } catch (_) {
      last_ai_trace_id = undefined;
    }
    return http.post('/cognitive-council/execute', {
      ...body,
      ...(last_ai_trace_id ? { last_ai_trace_id } : {})
    });
  },
  /** Detalhe de auditoria (explicabilidade) por trace do conselho — mesma empresa do utilizador. */
  getCognitiveTrace: (traceId) =>
    http.get('/cognitive-council/trace/' + encodeURIComponent(String(traceId || ''))),
  submitRegistration: (text) => http.post('/intelligent-registration', { text }),
  listRegistrations: () => http.get('/intelligent-registration?limit=10'),
  updateAvatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/chat/me/avatar', fd);
  },
  cadastrarComIA: {
    cadastrar: (formData) => {
      const fd = formData instanceof FormData ? formData : Object.entries(formData || {}).reduce((acc,[k,v]) => { acc.append(k,v); return acc; }, new FormData());
      return http.post('/cadastrar-com-ia', fd);
    }
  },
  proacao: {
    create: (data) => http.post('/proacao', data)
  }
};
export default chatApi;

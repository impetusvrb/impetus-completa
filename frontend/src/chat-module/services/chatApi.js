import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || '/api';
const http = axios.create({ baseURL: API_URL });
http.interceptors.request.use(c => { const t = localStorage.getItem('impetus_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
const chatApi = {
  getConversations: () => http.get('/chat/conversations'),
  createPrivateConversation: (uid) => http.post('/chat/conversations', { type: 'private', targetUserId: uid }),
  createGroup: (name, ids) => http.post('/chat/conversations', { type: 'group', name, participantIds: ids }),
  getMessages: (id, limit, before) => http.get('/chat/conversations/'+id+'/messages', { params: { limit: limit||50, ...(before && { before }) } }),
  sendMessage: (id, content, replyTo) => http.post('/chat/conversations/'+id+'/messages', { content, replyTo }),
  uploadFile: (conversationId, file, replyTo) => { const fd = new FormData(); fd.append('file', file); fd.append('conversationId', conversationId); if (replyTo) fd.append('replyTo', replyTo); return http.post('/chat/upload', fd); },
  markAsRead: (conversationId, messageId) => http.put('/chat/messages/'+messageId+'/read', { conversationId }),
  deleteMessage: (messageId, scope) => http.post('/chat/messages/' + messageId + '/delete', { scope }),
  getParticipants: (id) => http.get('/chat/conversations/'+id+'/participants'),
  addParticipant: (id, userId) => http.post('/chat/conversations/'+id+'/participants', { userId }),
  removeParticipant: (id, userId) => http.delete('/chat/conversations/'+id+'/participants/'+userId),
  getUsers: () => http.get('/chat/users'),
  subscribePush: (sub) => http.post('/chat/push/subscribe', sub),
  /** Backend: POST /api/dashboard/chat — corpo { message: string, history: {role,content}[] } */
  sendAIMessage: ({ message, history }) => http.post('/dashboard/chat', { message, history: history || [] }),
  /** Conselho Cognitivo — pipeline Gemini → Claude → GPT (sem chat entre modelos). */
  executeCognitiveCouncil: (body) => http.post('/cognitive-council/execute', body),
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

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const chatService = require('../services/chatService');
const { handleAIMessage, mentionsAI } = require('../services/chatAIService');
const operationalRealtimeCoordinator = require('../services/operationalRealtimeCoordinator');
const onlineUsers = new Map();

function initChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token || socket.handshake.query && socket.handshake.query.token;
    if (!token) return next(new Error('Token nao fornecido'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch { next(new Error('Token invalido')); }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    onlineUsers.set(user.id, socket.id);
    chatService.setUserPresence(user.id, true).catch(() => {});
    socket.join('company:' + user.company_id);
    io.to('company:' + user.company_id).emit('user_online', { userId: user.id });
    try {
      const convs = await chatService.getConversations(user.id, user.company_id);
      for (const c of convs) socket.join(c.id);
    } catch {}

    socket.on('join_conversations', async () => {
      try { const convs = await chatService.getConversations(user.id, user.company_id); for (const c of convs) socket.join(c.id); } catch {}
    });
    socket.on('join_conversation', (id) => socket.join(id));

    socket.on('send_message', async (data, ack) => {
      try {
        const { conversationId, content, type, fileUrl, fileName, fileSize, replyTo } = data;
        if (!conversationId) return ack && ack({ error: 'Dados invalidos' });
        await chatService.verifyParticipant(conversationId, user.id);
        const msg = await chatService.saveMessage({ conversationId, senderId: user.id, type: type||'text', content, fileUrl, fileName, fileSize, replyTo });
        io.to(conversationId).emit('new_message', msg);
        if (ack) ack({ ok: true, message: msg });
        if (mentionsAI(content)) setImmediate(() => handleAIMessage(conversationId, content, io));
        // Captura todas as conversas do chat Impetus para automações operacionais em tempo real.
        if (type === 'text' && content && String(content).trim().length >= 3) {
          setImmediate(() => operationalRealtimeCoordinator.processChatMessage({
            companyId: user.company_id,
            conversationId,
            senderUser: user,
            content,
            io
          }).catch(() => {}));
        }
      } catch (e) { if (ack) ack({ error: e.message }); }
    });

    socket.on('typing', (d) => socket.to(d.conversationId).emit('user_typing', { conversationId: d.conversationId, userId: user.id, userName: user.name || user.email }));
    socket.on('stop_typing', (d) => socket.to(d.conversationId).emit('user_stop_typing', { conversationId: d.conversationId, userId: user.id }));
    socket.on('mark_read', async (d) => {
      try { await chatService.markAsRead(d.conversationId, user.id); socket.to(d.conversationId).emit('messages_read', { conversationId: d.conversationId, userId: user.id }); } catch {}
    });
    socket.on('add_reaction', async (d, ack) => {
      try { await chatService.addReaction(d.messageId, user.id, d.emoji); io.to(d.conversationId).emit('message_reaction', { messageId: d.messageId, emoji: d.emoji, userId: user.id, action: 'add' }); if (ack) ack({ ok: true }); } catch (e) { if (ack) ack({ error: e.message }); }
    });
    socket.on('disconnect', () => {
      onlineUsers.delete(user.id);
      chatService.setUserPresence(user.id, false).catch(() => {});
      io.to('company:' + user.company_id).emit('user_offline', { userId: user.id });
    });
  });
}

module.exports = { initChatSocket, onlineUsers };

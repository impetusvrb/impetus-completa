/**
 * IMPETUS CHAT MODULE - Socket.io tempo real
 * Eventos: send_message, receive_message, typing, stop_typing, user_online, user_offline
 */

const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { setIO } = require('./chatBroadcast');
const chatService = require('./chatService');
const chatAIService = require('./chatAIService');

const JWT_SECRET = process.env.JWT_SECRET || 'impetus_super_secret_key';

async function validateSocketAuth(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) return null;
    const r = await db.query(`
      SELECT id, name, email, role, company_id FROM users 
      WHERE id = $1 AND active = true AND deleted_at IS NULL
    `, [decoded.id]);
    if (r.rows.length === 0) return null;
    return r.rows[0];
  } catch {
    return null;
  }
}

const onlineUsers = new Map();

function setupChatSocket(io) {
  setIO(io);
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = await validateSocketAuth(token);
    if (!user) return next(new Error('Auth failed'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const { id, name, company_id } = socket.user;
    onlineUsers.set(id, { id, name, company_id, socketId: socket.id });
    socket.broadcast.emit('user_online', { user_id: id, name });

    socket.on('join_conversation', async (conversationId) => {
      const ok = await chatService.isParticipant(conversationId, id);
      if (ok) socket.join(`conv_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('typing', async (conversationId) => {
      const ok = await chatService.isParticipant(conversationId, id);
      if (ok) {
        socket.to(`conv_${conversationId}`).emit('typing', { user_id: id, name });
      }
    });

    socket.on('stop_typing', async (conversationId) => {
      socket.to(`conv_${conversationId}`).emit('stop_typing', { user_id: id });
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const { conversation_id, message_type, content, file_url, file_name } = payload;
        const ok = await chatService.isParticipant(conversation_id, id);
        if (!ok) return ack?.({ ok: false, error: 'Não autorizado' });

        const msg = await chatService.sendMessage({
          conversationId: conversation_id,
          senderId: id,
          messageType: message_type || 'text',
          content,
          fileUrl: file_url,
          fileName: file_name,
          clientIp: socket.handshake.address,
          source: 'web'
        });

        io.to(`conv_${conversation_id}`).emit('receive_message', {
          ...msg,
          sender_name: name,
          sender_avatar: null
        });

        if (content && chatAIService.detectMention(content)) {
          const aiMsg = await chatAIService.processIncomingForAI(conversation_id, socket.user.company_id, content);
          if (aiMsg) {
            io.to(`conv_${conversation_id}`).emit('receive_message', {
              ...aiMsg,
              sender_name: chatService.IMPETUS_IA_NAME,
              sender_role: 'ai_system'
            });
          }
        }

        ack?.({ ok: true, message: msg });
      } catch (err) {
        console.error('[CHAT_SOCKET_SEND]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(id);
      socket.broadcast.emit('user_offline', { user_id: id });
    });
  });

  return { onlineUsers };
}

function getOnlineUsers() {
  return Array.from(onlineUsers.values()).map(({ id, name, company_id }) => ({ id, name, company_id }));
}

module.exports = { setupChatSocket, getOnlineUsers };

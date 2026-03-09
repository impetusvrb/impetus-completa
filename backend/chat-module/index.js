/**
 * IMPETUS CHAT MODULE - Ponto de entrada
 * Módulo completo de chat estilo WhatsApp - isolado para PWA
 */

const path = require('path');
const fs = require('fs');
const chatRoutes = require('./chatRoutes');
const chatSocket = require('./chatSocket');

const UPLOAD_DIR = process.env.CHAT_UPLOAD_DIR || path.join(__dirname, '../..', 'uploads', 'chat');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function mountRoutes(app, basePath = '/api/chat') {
  app.use(basePath, chatRoutes);
  app.use('/uploads/chat', require('express').static(UPLOAD_DIR));
}

let ioInstance = null;

function mountSocket(io) {
  ioInstance = io;
  return chatSocket.setupChatSocket(io);
}

function broadcastMessage(conversationId, message) {
  if (ioInstance) ioInstance.to(`conv_${conversationId}`).emit('receive_message', message);
}

function getSchemaPath() {
  return path.join(__dirname, 'chat_module_schema.sql');
}

module.exports = {
  mountRoutes,
  mountSocket,
  getSchemaPath,
  broadcastMessage
};

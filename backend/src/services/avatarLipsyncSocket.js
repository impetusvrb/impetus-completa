'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_ALGORITHMS } = require('../middleware/auth');

/**
 * Registra handlers no namespace Socket.IO do avatar (Wav2Lip / demo HTML).
 * Use: const nsp = io.of('/impetus-avatar'); registerAvatarLipsyncNamespace(nsp);
 * @param {import('socket.io').Namespace} namespace
 */
function registerAvatarLipsyncNamespace(namespace) {
  if (!namespace || typeof namespace.on !== 'function') return;

  namespace.use((socket, next) => {
    const token =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token);
    if (!token) return next(new Error('Token não fornecido'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET, { algorithms: JWT_ALGORITHMS });
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  namespace.on('connection', (socket) => {
    socket.on('join_avatar', () => {
      socket.join('avatar_clients');
    });
  });
}

module.exports = { registerAvatarLipsyncNamespace };

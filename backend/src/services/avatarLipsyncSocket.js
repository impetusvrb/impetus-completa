/**
 * Registra handlers no namespace Socket.IO do avatar (Wav2Lip / demo HTML).
 * Use: const nsp = io.of('/impetus-avatar'); registerAvatarLipsyncNamespace(nsp);
 * @param {import('socket.io').Namespace} namespace
 */
function registerAvatarLipsyncNamespace(namespace) {
  if (!namespace || typeof namespace.on !== 'function') return;
  namespace.on('connection', (socket) => {
    socket.on('join_avatar', () => {
      socket.join('avatar_clients');
    });
  });
}

module.exports = { registerAvatarLipsyncNamespace };

let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function broadcast(conversationId, message) {
  if (ioInstance) ioInstance.to(`conv_${conversationId}`).emit('receive_message', message);
}

module.exports = { setIO, broadcast };

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const chatModule = require('../chat-module');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  },
  path: '/socket.io'
});

chatModule.mountSocket(io);

chatModule.mountRoutes(app, '/api/chat');

server.listen(PORT, () => {
  console.log(`🚀 Backend listening on ${PORT}`);
  console.log(`📡 Socket.io ready`);
});

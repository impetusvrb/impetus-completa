require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { initChatSocket } = require('./socket/chatSocket');
const app = require('./app');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io'
});

app.set('io', io);
initChatSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Backend listening on ${PORT}`);
});

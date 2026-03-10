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

server.listen(PORT, async () => {
  console.log(`🚀 Backend listening on ${PORT}`);

  // Verificação da tabela operational_memory no startup (ambiente não-dev)
  if (process.env.NODE_ENV !== 'development') {
    try {
      const db = require('./db');
      await db.query('SELECT 1 FROM operational_memory LIMIT 1');
    } catch (err) {
      if (err.message?.includes('does not exist')) {
        console.warn('[STARTUP] AVISO: Tabela operational_memory não encontrada. Execute: npm run migrate');
      }
    }
  }
});

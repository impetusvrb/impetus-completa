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

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
const db = require('./db');
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    db.pool.end(() => {
      console.log('Pool de conexões encerrado.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED_REJECTION]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

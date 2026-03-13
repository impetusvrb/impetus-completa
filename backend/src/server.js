require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { initChatSocket } = require('./socket/chatSocket');
const unifiedMessaging = require('./services/unifiedMessagingService');
const reminderScheduler = require('./services/reminderSchedulerService');
const operationalBrain = require('./services/operationalBrainEngine');
const machineMonitoring = require('./services/machineMonitoringService');
const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 4000;

// Handlers para evitar crash silencioso em produção
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
  process.exit(1);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io'
});

app.set('io', io);
try { unifiedMessaging.setSocketIo(io); } catch (e) { console.warn('[SERVER] unifiedMessaging:', e?.message); }
initChatSocket(io);
reminderScheduler.start();

let brainIntervalId = null;
if (operationalBrain.BRAIN_ENABLED) {
  brainIntervalId = setInterval(async () => {
    try {
      const r = await db.query('SELECT id FROM companies WHERE active = true LIMIT 50');
      for (const c of r.rows || []) {
        operationalBrain.checkAlerts(c.id).catch(() => {});
      }
    } catch {}
  }, 5 * 60 * 1000);
  console.info('[OPERATIONAL_BRAIN] Alert checker iniciado (5 min)');
}
machineMonitoring.start();

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando gracefully...`);
  if (brainIntervalId) clearInterval(brainIntervalId);
  try {
    if (typeof reminderScheduler.stop === 'function') await reminderScheduler.stop();
  } catch (e) { console.warn('[SHUTDOWN] reminderScheduler:', e?.message); }
  try {
    if (typeof machineMonitoring.stop === 'function') await machineMonitoring.stop();
  } catch (e) { console.warn('[SHUTDOWN] machineMonitoring:', e?.message); }
  server.close(() => {
    if (db.pool) {
      db.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
    } else process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, async () => {
  console.log(`🚀 Backend listening on ${PORT}`);

  // Verificação da tabela operational_memory no startup (ambiente não-dev)
  if (process.env.NODE_ENV !== 'development') {
    try {
      await db.query('SELECT 1 FROM operational_memory LIMIT 1');
    } catch (err) {
      if (err.message?.includes('does not exist')) {
        console.warn('[STARTUP] AVISO: Tabela operational_memory não encontrada. Execute: npm run migrate');
      }
    }
  }
});

// Graceful shutdown - encerra conexões corretamente em deploy/crash
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

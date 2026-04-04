/**
 * Ponto de entrada alternativo (árvore `backend/` na raiz do repo).
 * O PM2 neste servidor usa: impetus_complete/backend/src/server.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { registerAvatarLipsyncNamespace } =
  require('./services/avatarLipsyncSocket');
const { attachRealtimeOpenaiProxy } =
  require('./services/realtimeOpenaiProxy');
const { initChatSocket } = require('./socket/chatSocket');
const { initVoiceStreamSocket } = require('./socket/voiceStreamSocket');
const { requireAuth } = require('./middleware/auth');
const db = require('./db');
const unifiedMessaging = require('./services/unifiedMessagingService');
const reminderScheduler = require('./services/reminderSchedulerService');
const machineMonitoring = require('./services/machineMonitoringService');

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.session = { id: 'http' };
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: [
      'Content-Type',
      'X-TTS-Engine',
      'X-TTS-Voice-Google',
      'X-TTS-Template',
      'Cache-Control'
    ]
  })
);

const stripeNexusWalletWebhook = require('./routes/webhooks/stripeNexusWallet');
app.post(
  '/api/webhooks/stripe-nexus-wallet',
  bodyParser.raw({ type: 'application/json' }),
  (req, res) => {
    Promise.resolve(stripeNexusWalletWebhook(req, res)).catch((e) => {
      console.error('[STRIPE_NEXUS_WEBHOOK]', e);
      res.status(500).send('error');
    });
  }
);

function needsLargeBodyParser(url) {
  const p = String(url || '').split('?')[0];
  return (
    p.startsWith('/api/vision') ||
    p.startsWith('/api/cadastrar-com-ia') ||
    p.startsWith('/api/intelligent-registration') ||
    p.startsWith('/api/asset-management') ||
    p.startsWith('/api/admin/equipment-library') ||
    p.startsWith('/api/technical-library')
  );
}

const jsonParserDefault = bodyParser.json({ limit: '20mb' });
const jsonParserLarge = bodyParser.json({ limit: '50mb' });
const urlEncDefault = bodyParser.urlencoded({ extended: true, limit: '20mb' });
const urlEncLarge = bodyParser.urlencoded({ extended: true, limit: '50mb' });

app.use((req, res, next) => {
  if (needsLargeBodyParser(req.originalUrl || req.url)) {
    return jsonParserLarge(req, res, next);
  }
  return jsonParserDefault(req, res, next);
});
app.use((req, res, next) => {
  if (needsLargeBodyParser(req.originalUrl || req.url)) {
    return urlEncLarge(req, res, next);
  }
  return urlEncDefault(req, res, next);
});

/** Probe rápido TTS (paridade impetus_complete/app.js) + estado Google/credenciais sem chamada extra à API Google. */
async function voiceHealthProbe() {
  const voz = { openai: false };
  try {
    try {
      const googleTts = require('./services/googleTtsCore');
      voz.google_credentials_ok = !!googleTts.getTtsAvailable?.();
    } catch (_) {
      voz.google_credentials_ok = false;
    }
    try {
      const voiceTts = require('./services/voiceTtsService');
      voz.tts_available = !!voiceTts.getTtsAvailable?.();
    } catch (_) {
      voz.tts_available = false;
    }

    const hasKey = !!(process.env.OPENAI_API_KEY || '').trim();
    if (!hasKey) {
      voz.error = 'OPENAI_API_KEY não configurada';
      return voz;
    }
    const { gerarAudio } = require('./services/openaiVozService');
    const buf = await gerarAudio('Ok');
    voz.openai = !!(buf && buf.length > 0);
    if (!voz.openai) voz.error = 'TTS OpenAI sem resposta';
  } catch (e) {
    voz.error = (e && e.message) || String(e);
  }
  return voz;
}

app.get('/health', async (_req, res) => {
  const voz = await voiceHealthProbe();
  res.json({ ok: true, status: 'ok', service: 'impetus-backend', voz });
});

app.get('/api/health', async (_req, res) => {
  const voz = await voiceHealthProbe();
  res.json({ ok: true, status: 'ok', service: 'impetus-backend', voz });
});

const uploadsPublicPath = path.join(__dirname, '../../uploads');
try {
  fs.mkdirSync(uploadsPublicPath, { recursive: true });
  app.use('/uploads', express.static(uploadsPublicPath));
} catch (e) {
  console.warn('[server] /uploads estático não montado:', e?.message);
}

function useRoute(mountPath, modulePath, ...middlewares) {
  try {
    const router = require(modulePath);
    app.use(mountPath, ...middlewares, router);
  } catch (e) {
    console.warn('[server] Rota não carregada:', mountPath, '-', e.message);
  }
}

/* --- API (cada bloco isolado: dependência em falta não derruba o servidor) --- */
useRoute('/api/auth', './routes/auth');
useRoute('/api/companies', './routes/companies');
useRoute('/api/onboarding', './routes/onboarding', requireAuth);
useRoute('/api/dashboard', './routes/dashboard');
useRoute('/api/live-dashboard', './routes/liveDashboard', requireAuth);
useRoute('/api/communications', './routes/communications');
useRoute('/api/admin/users', './routes/admin/users');
useRoute('/api/admin/logs', './routes/admin/logs');
useRoute('/api/admin/settings', './routes/admin/settings');
useRoute('/api/admin/departments', './routes/admin/departments');
useRoute('/api/admin/structural', './routes/admin/structural');
useRoute('/api/admin/equipment-library', './routes/admin/equipmentLibrary');
useRoute('/api/technical-library', './routes/technicalLibrary');
useRoute('/api/admin/warehouse', './routes/admin/warehouse');
useRoute('/api/admin/raw-materials', './routes/admin/rawMaterials');
useRoute('/api/admin/logistics', './routes/admin/logistics');
useRoute('/api/admin/time-clock', './routes/admin/timeClock');
useRoute('/api/admin/nexus-custos', './routes/admin/nexusCustos');
useRoute('/api/admin/nexus-wallet', './routes/admin/nexusWallet');
useRoute('/api/dashboard/chat/voice', './routes/chatVoice');
useRoute('/api/realtime-presence', './routes/realtimePresence', requireAuth);
useRoute('/api/tts', './routes/tts');
useRoute('/api/voz', './routes/voz');
useRoute('/api/did', './routes/did');
useRoute('/api/asset-management', './routes/assetManagement');
useRoute('/api/vision', './routes/vision');
useRoute('/api/proacao', './routes/proacao');
useRoute('/api/cadastrar-com-ia', './routes/cadastrarComIA');
useRoute('/api/chat', './routes/chat', requireAuth);
useRoute('/api/tpm', './routes/tpm', requireAuth);
useRoute('/api/tasks', './routes/tasks', requireAuth);
useRoute('/api/diagnostic', './routes/diagnostic');
useRoute('/api/central-ai', './routes/centralIndustryAI');
useRoute('/api/integrations', './routes/integrations');
useRoute('/api/webhooks/asaas', './routes/webhooks/asaas');
useRoute('/api/webhook', './routes/webhook');
useRoute('/api/diag-report', './routes/diag_report');
useRoute('/api/manuals', './routes/manuals');
useRoute('/api/lgpd', './routes/lgpd');
useRoute('/api/intelligent-registration', './routes/intelligentRegistration');
useRoute('/api/internal-chat', './routes/internalChat');
useRoute('/api/role-verification', './routes/roleVerification');
useRoute('/api/usuarios', './routes/usuarios');
useRoute('/api/plc-alerts', './routes/plcAlerts');
useRoute('/api/app-impetus', './routes/app_impetus');
useRoute('/api/subscription', './routes/subscription');
useRoute('/api/alerts', './routes/alerts');
useRoute('/api/app-communications', './routes/appCommunications');
useRoute('/api/audit', './routes/audit');
useRoute('/api/warehouse-intelligence', './routes/warehouseIntelligence');
useRoute('/api/quality-intelligence', './routes/qualityIntelligence');
useRoute('/api/hr-intelligence', './routes/hrIntelligence');
useRoute('/api/pulse', './routes/pulse', requireAuth);
useRoute('/api/raw-material-lots', './routes/rawMaterialLots');
useRoute('/api/operational-anomalies', './routes/operationalAnomalies');
useRoute('/api/logistics-intelligence', './routes/logisticsIntelligence');
useRoute('/api/internal/sales', './routes/internal/sales');

/* ManuIA - Feature flag: ativo por padrão; ENABLE_MANUIA=false desativa rapidamente sem revert */
const manuiaEnabled = process.env.ENABLE_MANUIA !== 'false' && process.env.ENABLE_MANUIA !== '0';
if (manuiaEnabled) {
  useRoute('/api/manutencao-ia', './routes/manutencao-ia');
} else {
  console.log('[server] ManuIA: desabilitado (ENABLE_MANUIA=false)');
}

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ ok: false, error: err.message || 'Erro interno' });
});

const PORT = parseInt(process.env.PORT || '4000', 10);
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
  }
});

app.set('io', io);
initChatSocket(io);
try {
  initVoiceStreamSocket(io);
} catch (e) {
  console.warn('[server] initVoiceStreamSocket:', e?.message);
}

/* Erros de transporte / namespace voz — log apenas; não derruba o processo. */
try {
  io.of('/impetus-voice').on('connection', (socket) => {
    const raw = socket.conn;
    if (raw && typeof raw.on === 'function') {
      raw.on('error', (err) => {
        console.warn('[impetus-voice] transport:', err?.message || err);
      });
    }
  });
} catch (e) {
  console.warn('[server] impetus-voice error hooks:', e?.message);
}

/* Após criar httpServer e io: namespace do avatar + proxy Realtime (Wav2Lip) */
const avatarNsp = io.of('/impetus-avatar');
registerAvatarLipsyncNamespace(avatarNsp);
attachRealtimeOpenaiProxy(httpServer, {
  avatarLipsyncNamespace: avatarNsp
});

/* Mesmo httpServer acima: upgrade WebSocket do proxy Realtime + HTTP API Express (sem segunda porta). */
try {
  unifiedMessaging.setSocketIo(io);
} catch (e) {
  console.warn('[server] unifiedMessaging:', e?.message);
}
reminderScheduler.start();
machineMonitoring.start();

/**
 * Cérebro operacional: checker periódico (paridade impetus_complete/server.js).
 * Ativo quando OPERATIONAL_BRAIN_ENABLED ≠ false e o cron não está explicitamente desligado.
 */
let operationalBrainIntervalId = null;
const brainCronExplicitOff =
  String(process.env.OPERATIONAL_BRAIN_CRON_ENABLED || '').toLowerCase() === 'false' ||
  process.env.OPERATIONAL_BRAIN_CRON_ENABLED === '0';
if (!brainCronExplicitOff) {
  try {
    const operationalBrain = require('./services/operationalBrainEngine');
    if (operationalBrain.BRAIN_ENABLED) {
      operationalBrainIntervalId = setInterval(async () => {
        try {
          const r = await db.query(
            'SELECT id FROM companies WHERE active = true LIMIT 50'
          );
          for (const c of r.rows || []) {
            operationalBrain.checkAlerts(c.id).catch(() => {});
          }
        } catch (_) {}
      }, 5 * 60 * 1000);
      console.info('[OPERATIONAL_BRAIN] Alert checker ativo (5 min)');
    }
  } catch (e) {
    console.warn('[OPERATIONAL_BRAIN] Cron não iniciado:', e?.message);
  }
}

function clearOperationalBrainInterval() {
  if (operationalBrainIntervalId) {
    clearInterval(operationalBrainIntervalId);
    operationalBrainIntervalId = null;
  }
}

function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  clearOperationalBrainInterval();
  try {
    if (typeof reminderScheduler.stop === 'function') reminderScheduler.stop();
  } catch (e) {
    console.warn('[SHUTDOWN] reminderScheduler:', e?.message);
  }
  try {
    if (typeof machineMonitoring.stop === 'function') machineMonitoring.stop();
  } catch (e) {
    console.warn('[SHUTDOWN] machineMonitoring:', e?.message);
  }
  httpServer.close(() => {
    if (db.pool) {
      db.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
    } else {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000);
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

if (String(process.env.ENABLE_NEXUS_TOKEN_BILLING_CRON || '').toLowerCase() === 'true') {
  try {
    const cron = require('node-cron');
    const billingTokenService = require('./services/billingTokenService');
    const tz = process.env.TZ || 'America/Sao_Paulo';
    cron.schedule(
      '0 8 1 * *',
      () => {
        billingTokenService.runMonthlyTokenBilling().catch((e) => console.error('[NEXUS_CRON]', e));
      },
      { timezone: tz }
    );
    console.log('[server] NexusIA token billing: cron dia 1 às 08:00 (' + tz + ')');
  } catch (e) {
    console.warn('[server] NexusIA cron não iniciado:', e.message);
  }
}

httpServer.listen(PORT, () => {
  console.log(`[impetus-backend] http://0.0.0.0:${PORT}  (health: /health)`);
});

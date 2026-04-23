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
const { buildCorsOptions, buildHelmetOptions } = require('./config/security');
const { apiByIpLimiter, apiByUserLimiter } = require('./middleware/globalRateLimit');
const secureStaticUploads = require('./middleware/secureStaticUploads');
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
const { sendSafeError } = require('./utils/sendSafeError');
const { allowHealthDetails } = require('./middleware/healthExposure');
const { getAiIntegrationsHealth } = require('./services/aiIntegrationsHealthService');
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

app.use(helmet(buildHelmetOptions()));
app.use(compression());
const corsOptions = buildCorsOptions();
app.use(cors(corsOptions));

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
    p.startsWith('/api/technical-library') ||
    p.startsWith('/api/manutencao-ia') ||
    p.startsWith('/api/cognitive-council') ||
    p.includes('/dashboard/chat-multimodal')
  );
}

/** POST /api/webhook — corpo bruto para HMAC Meta (X-Hub-Signature-256). */
function isWebhookPost(req) {
  const p = String(req.originalUrl || req.url || '').split('?')[0];
  return req.method === 'POST' && p === '/api/webhook';
}

const jsonParserDefault = bodyParser.json({ limit: '20mb' });
const jsonParserLarge = bodyParser.json({ limit: '50mb' });
const urlEncDefault = bodyParser.urlencoded({ extended: true, limit: '20mb' });
const urlEncLarge = bodyParser.urlencoded({ extended: true, limit: '50mb' });

app.use((req, res, next) => {
  if (isWebhookPost(req)) {
    return bodyParser.raw({ type: '*/*', limit: '20mb' })(req, res, (err) => {
      if (err) return next(err);
      req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      try {
        const s = req.rawBody.length ? req.rawBody.toString('utf8') : '{}';
        req.body = s ? JSON.parse(s) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  }
  if (needsLargeBodyParser(req.originalUrl || req.url)) {
    return jsonParserLarge(req, res, next);
  }
  return jsonParserDefault(req, res, next);
});
app.use((req, res, next) => {
  if (isWebhookPost(req)) return next();
  if (needsLargeBodyParser(req.originalUrl || req.url)) {
    return urlEncLarge(req, res, next);
  }
  return urlEncDefault(req, res, next);
});

/** Rate limit por IP em /api (utilizadores autenticados são ignorados no limiter; webhooks excluídos). */
app.use((req, res, next) => {
  const orig = String(req.originalUrl || req.url || '');
  if (!orig.startsWith('/api')) return next();
  return apiByIpLimiter(req, res, next);
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

app.get('/health', async (req, res) => {
  if (allowHealthDetails(req)) {
    const [voz, integrations] = await Promise.all([voiceHealthProbe(), getAiIntegrationsHealth()]);
    return res.json({
      success: true,
      status: 'ok',
      service: 'impetus-backend',
      voz,
      integrations
    });
  }
  return res.json({ success: true, status: 'ok', service: 'impetus-backend' });
});

app.get('/api/health', async (req, res) => {
  if (allowHealthDetails(req)) {
    const [voz, integrations] = await Promise.all([voiceHealthProbe(), getAiIntegrationsHealth()]);
    return res.json({
      success: true,
      status: 'ok',
      service: 'impetus-backend',
      voz,
      integrations
    });
  }
  return res.json({ success: true, status: 'ok', service: 'impetus-backend' });
});

const uploadsPublicPath = path.join(__dirname, '../../uploads');
try {
  fs.mkdirSync(uploadsPublicPath, { recursive: true });
  app.use('/uploads', secureStaticUploads);
} catch (e) {
  console.warn('[server] /uploads seguro não montado:', e?.message);
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
useRoute('/api/media', './routes/mediaFile');
useRoute('/api/auth', './routes/auth');
useRoute('/api/factory-team', './routes/factoryTeam');
useRoute('/api/companies', './routes/companies');
useRoute('/api/onboarding', './routes/onboarding', requireAuth);
useRoute('/api/dashboard', './routes/dashboard');
useRoute('/api/live-dashboard', './routes/liveDashboard', requireAuth);
useRoute('/api/communications', './routes/communications');
useRoute('/api/impetus-admin', './routes/impetusAdmin');
useRoute('/api/admin-portal', './routes/adminPortalGovernance');
useRoute('/api/admin/users', './routes/admin/users');
useRoute('/api/admin/logs', './routes/admin/logs');
useRoute('/api/admin/settings', './routes/admin/settings');
useRoute('/api/admin/help-manual', './routes/admin/helpManual');
useRoute('/api/admin/departments', './routes/admin/departments');
/** Métricas/relatórios primeiro (router leve); CRUD em operationalTeams pode depender de bcrypt. */
useRoute('/api/admin/operational-teams', './routes/admin/operationalTeamsMetrics');
useRoute('/api/admin/operational-teams', './routes/admin/operationalTeams');
// Alias PT-BR para builds/frontend antigos que ainda usam "equipes-operacionais".
useRoute('/api/admin/equipes-operacionais', './routes/admin/operationalTeamsMetrics');
useRoute('/api/admin/equipes-operacionais', './routes/admin/operationalTeams');
useRoute('/api/admin/structural', './routes/admin/structural');
useRoute('/api/admin/ai-audit', './routes/admin/aiAudit');
useRoute('/api/admin/incidents', './routes/admin/incidents');
useRoute('/api/admin/ai-policies', './routes/admin/aiPolicies');
useRoute('/api/admin/equipment-library', './routes/admin/equipmentLibrary');
useRoute('/api/technical-library', './routes/technicalLibrary');
useRoute('/api/admin/warehouse', './routes/admin/warehouse');
useRoute('/api/admin/raw-materials', './routes/admin/rawMaterials');
useRoute('/api/admin/logistics', './routes/admin/logistics');
useRoute('/api/admin/time-clock', './routes/admin/timeClock');
useRoute('/api/admin/nexus-custos', './routes/admin/nexusCustos');
useRoute('/api/admin/nexus-wallet', './routes/admin/nexusWallet');
useRoute('/api/nexus-ia', './routes/nexusIa');
useRoute('/api/dashboard/chat/voice', './routes/chatVoice');
useRoute('/api/realtime-presence', './routes/realtimePresence', requireAuth);
useRoute('/api/tts', './routes/tts');
useRoute('/api/voz', './routes/voz');
useRoute('/api/did', './routes/did');
useRoute('/api/asset-management', './routes/assetManagement');
useRoute('/api/vision', './routes/vision', requireAuth, apiByUserLimiter);
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
useRoute('/api/cognitive-council', './routes/cognitiveCouncil', requireAuth, apiByUserLimiter);
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

app.use((err, req, res, _next) => {
  const st = err.status || err.statusCode;
  sendSafeError(res, err, {
    status: st,
    code: err.code || 'EXPRESS_ERROR',
    logContext: { path: req.originalUrl || req.path, method: req.method }
  });
});

const PORT = parseInt(process.env.PORT || '4000', 10);
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: corsOptions.origin,
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
let dataLifecycleIntervalId = null;
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

function clearDataLifecycleInterval() {
  if (dataLifecycleIntervalId) {
    clearInterval(dataLifecycleIntervalId);
    dataLifecycleIntervalId = null;
  }
}

if (String(process.env.DATA_LIFECYCLE_CRON_ENABLED || 'true').toLowerCase() !== 'false') {
  try {
    const dataLifecycleService = require('./services/dataLifecycleService');
    const hours = Math.min(168, Math.max(1, parseInt(process.env.DATA_LIFECYCLE_INTERVAL_HOURS || '24', 10)));
    dataLifecycleIntervalId = setInterval(() => {
      dataLifecycleService.runRetentionCycle().catch((e) => {
        console.warn('[DATA_LIFECYCLE]', e?.message || e);
      });
    }, hours * 3600 * 1000);
    setTimeout(() => {
      dataLifecycleService.runRetentionCycle().catch((e) => {
        console.warn('[DATA_LIFECYCLE:first-run]', e?.message || e);
      });
    }, 120000);
    console.info(`[DATA_LIFECYCLE] Retenção/expurgo agendado a cada ${hours}h (1.ª execução ~2 min)`);
  } catch (e) {
    console.warn('[DATA_LIFECYCLE] Não iniciado:', e?.message);
  }
}

function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  clearOperationalBrainInterval();
  clearDataLifecycleInterval();
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

httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.warn(
      `[server] Porta ${PORT} já em uso. Libere com: fuser -k ${PORT}/tcp  ou  kill $(lsof -t -i:${PORT})`
    );
    process.exit(1);
    return;
  }
  console.error('[server] falha no servidor HTTP:', err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`[impetus-backend] http://0.0.0.0:${PORT}  (health: /health)`);
});

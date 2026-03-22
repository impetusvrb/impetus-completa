/**
 * Ponto de entrada alternativo (árvore `backend/` na raiz do repo).
 * O PM2 neste servidor usa: impetus_complete/backend/src/server.js
 */
require('dotenv').config();

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
const { requireAuth } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.session = { id: 'http' };
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'impetus-backend' });
});

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
useRoute('/api/dashboard', './routes/dashboard');
useRoute('/api/communications', './routes/communications');
useRoute('/api/admin/users', './routes/admin/users');
useRoute('/api/admin/logs', './routes/admin/logs');
useRoute('/api/admin/settings', './routes/admin/settings');
useRoute('/api/admin/departments', './routes/admin/departments');
useRoute('/api/admin/structural', './routes/admin/structural');
useRoute('/api/admin/warehouse', './routes/admin/warehouse');
useRoute('/api/admin/raw-materials', './routes/admin/rawMaterials');
useRoute('/api/admin/logistics', './routes/admin/logistics');
useRoute('/api/admin/time-clock', './routes/admin/timeClock');
useRoute('/api/dashboard/chat/voice', './routes/chatVoice');
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
useRoute('/api/plc-alerts', './routes/plcAlerts');
useRoute('/api/app-impetus', './routes/app_impetus');
useRoute('/api/subscription', './routes/subscription');
useRoute('/api/alerts', './routes/alerts');
useRoute('/api/app-communications', './routes/appCommunications');
useRoute('/api/warehouse-intelligence', './routes/warehouseIntelligence');
useRoute('/api/quality-intelligence', './routes/qualityIntelligence');
useRoute('/api/hr-intelligence', './routes/hrIntelligence');
useRoute('/api/raw-material-lots', './routes/rawMaterialLots');
useRoute('/api/operational-anomalies', './routes/operationalAnomalies');
useRoute('/api/logistics-intelligence', './routes/logisticsIntelligence');
useRoute('/api/internal/sales', './routes/internal/sales');

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ ok: false, error: err.message || 'Erro interno' });
});

const PORT = parseInt(process.env.PORT || '4000', 10);
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: true, credentials: true }
});

app.set('io', io);
initChatSocket(io);

/* Após criar httpServer e io: namespace do avatar + proxy Realtime (Wav2Lip) */
const avatarNsp = io.of('/impetus-avatar');
registerAvatarLipsyncNamespace(avatarNsp);
attachRealtimeOpenaiProxy(httpServer, {
  avatarLipsyncNamespace: avatarNsp
});

httpServer.listen(PORT, () => {
  console.log(`[impetus-backend] http://0.0.0.0:${PORT}  (health: /health)`);
});

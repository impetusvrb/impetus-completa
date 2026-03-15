require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
/**
 * IMPETUS COMUNICA IA - BACKEND APPLICATION
 * Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial
 * Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
 * Registro INPI: BR512025007048-9 (30/11/2025)
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');

// Rotas existentes
const webhook = require('./routes/webhook');
const manuals = require('./routes/manuals');
const tasks = require('./routes/tasks');
const proacao = require('./routes/proacao');
const proacaoAlerts = require('./routes/alerts');
const plcAlerts = require('./routes/plcAlerts');
const diagnostic = require('./routes/diagnostic');
const diagReport = require('./routes/diag_report');
const tpm = require('./routes/tpm');

// Novas rotas
const auth = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const lgpd = require('./routes/lgpd');
const communications = require('./routes/communications');
const internalChat = require('./routes/internalChat');
const dashboard = require('./routes/dashboard');

// Rotas de administração
const adminUsers = require('./routes/admin/users');
const adminDepartments = require('./routes/admin/departments');
const adminLogs = require('./routes/admin/logs');
const adminSettings = require('./routes/admin/settings');
const adminStructural = require('./routes/admin/structural');
const adminTimeClock = require('./routes/admin/timeClock');
const hrIntelligence = require('./routes/hrIntelligence');
const operationalAnomalies = require('./routes/operationalAnomalies');
const rawMaterialLots = require('./routes/rawMaterialLots');
const adminRawMaterials = require('./routes/admin/rawMaterials');
const adminWarehouse = require('./routes/admin/warehouse');
const adminLogistics = require('./routes/admin/logistics');
const warehouseIntelligence = require('./routes/warehouseIntelligence');
const logisticsIntelligence = require('./routes/logisticsIntelligence');
const centralIndustryAI = require('./routes/centralIndustryAI');
const qualityIntelligence = require('./routes/qualityIntelligence');
const roleVerificationRoutes = require('./routes/roleVerification');
const intelligentRegistration = require('./routes/intelligentRegistration');
const companies = require('./routes/companies');
const setupCompany = require('./routes/setupCompany');
const onboarding = require('./routes/onboarding');
const userIdentification = require('./routes/userIdentification');
const internalSales = require('./routes/internal/sales');
const subscription = require('./routes/subscription');

// Middlewares
const { requireAuth } = require('./middleware/auth');
const { requireCompanyActive } = require('./middleware/multiTenant');
const { requireInternalAdmin } = require('./middleware/internalAdmin');
const { requireValidLicense } = require('./middleware/license');
const { requireRoleVerified } = require('./middleware/roleVerification');
const db = require('./db');
const { getStats } = require('./utils/cache');

const app = express();

// Configurações de segurança
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
if (process.env.COMPRESSION !== 'false') {
  app.use(compression());
}
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Arquivos enviados (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Rate limiting para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: { ok: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

// Rate limiting para registro (evitar criação em massa)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 registros por IP/hora
  message: { ok: false, error: 'Limite de registros excedido. Tente novamente mais tarde.' }
});

// Rate limiting para criação de empresa (onboarding)
const companyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { ok: false, error: 'Limite de criações excedido. Tente novamente mais tarde.' }
});

// Rate limiting global da API (proteção DDoS)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 1000, // 200 req/min por IP
  message: { ok: false, error: 'Muitas requisições. Aguarde um momento.' },
  skip: req => req.path === '/health' || req.path === '/'
});

// Rotas públicas
app.get('/', (req, res) => res.json({
  ok: true,
  app: 'Impetus Comunica IA',
  version: '1.0.0',
  status: 'running',
  timestamp: new Date().toISOString()
}));

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

app.get('/health', async (req, res) => {
  const mem = process.memoryUsage();
  let dbOk = false;
  let dbPoolSize = null;
  try {
    await db.query('SELECT 1');
    dbOk = true;
    if (db.pool && typeof db.pool.totalCount === 'number') {
      dbPoolSize = { total: db.pool.totalCount, idle: db.pool.idleCount };
    }
  } catch (err) {
    console.error('[HEALTH_DB_ERROR]', err.message);
  }

  let claudeStatus = 'not_configured';
  if (process.env.ANTHROPIC_API_KEY && process.env.OPERATIONAL_MEMORY_ENABLED !== 'false') {
    try {
      const claudeService = require('./services/claudeService');
      claudeStatus = claudeService.isAvailable() ? 'available' : 'circuit_open';
    } catch (_) {}
  }

  let openaiStatus = 'not_configured';
  if (process.env.OPENAI_API_KEY) {
    openaiStatus = 'configured';
  }

  let geminiStatus = 'not_configured';
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiService = require('./services/geminiService');
      geminiStatus = geminiService.isAvailable() ? 'available' : 'circuit_open';
    } catch (_) {}
  }

  const cacheStats = getStats();
  const healthy = dbOk;
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    status: healthy ? 'healthy' : 'degraded',
    app: 'Impetus Comunica IA',
    version: '1.0.0',
    node: process.version,
    uptime: Math.round(process.uptime()),
    uptimeFormatted: formatUptime(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbOk ? 'connected' : 'error',
    dbPool: dbPoolSize,
    claude: claudeStatus,
    openai: openaiStatus,
    gemini: geminiStatus,
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      unit: 'MB'
    },
    cache: cacheStats
  });
});

// Rotas de autenticação (públicas com rate limiting)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api', apiLimiter);
app.use('/api', requireValidLicense);
app.use('/api/auth', auth);
app.use('/api/chat', requireAuth, chatRoutes);

// Empresas: POST bloqueado (cadastro controlado via fluxo de ativação comercial)
app.use('/api/companies', companyLimiter);
app.post('/api/companies', (req, res) => {
  return res.status(403).json({
    ok: false,
    error: 'Cadastro de empresa desabilitado. Acesso via ativação comercial controlada.',
    code: 'PUBLIC_COMPANY_REGISTRATION_DISABLED'
  });
});

// Webhooks (Asaas, Genérico). Canal mensagens: App Impetus
app.use('/api/webhook', webhook);
app.use('/api/webhooks/asaas', require('./routes/webhooks/asaas'));
const appImpetusRoutes = require('./routes/app_impetus');

// Rotas protegidas (autenticação + empresa ativa)
const protected = [requireAuth, requireCompanyActive];

app.use('/api/setup-company', requireAuth, setupCompany);
// Status do onboarding: apenas requireAuth (funciona sem company_id)
app.get('/api/onboarding/status', requireAuth, async (req, res) => {
  try {
    const onboardingService = require('./services/onboardingService');
    const status = await onboardingService.getOnboardingStatus(req.user);
    res.json({ ok: true, ...status });
  } catch (err) {
    console.error('[ONBOARDING_STATUS]', err);
    res.json({ ok: true, needsOnboarding: false, activeType: null });
  }
});
app.use('/api/onboarding', requireAuth, requireCompanyActive, onboarding);
// Identificação e ativação de usuário (status funciona sem company; demais rotas exigem company ativa)
app.use('/api/user-identification', requireAuth, userIdentification);
app.use('/api/internal/sales', requireAuth, requireInternalAdmin, internalSales);
app.use('/api/subscription', requireAuth, subscription);
app.use('/api/app-impetus', requireAuth, requireCompanyActive, appImpetusRoutes);
const appCommunications = require('./routes/appCommunications');
app.use('/api/app-communications', ...protected, appCommunications);

app.get('/api/companies/me', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!req.user?.company_id) return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    const r = await db.query('SELECT id, name, cnpj, plan_type, active, subscription_tier, subscription_status, created_at FROM companies WHERE id = $1', [req.user.company_id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    res.json({ ok: true, company: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erro ao buscar empresa' });
  }
});

app.use('/api/role-verification', ...protected, roleVerificationRoutes);
app.use('/api/lgpd', ...protected, lgpd);
app.use('/api/communications', ...protected, requireRoleVerified, communications);
app.use('/api/internal-chat', ...protected, internalChat);
app.use('/api/dashboard', ...protected, requireRoleVerified, dashboard);
app.use('/api/manuals', ...protected, manuals);
app.use('/api/tasks', ...protected, tasks);
app.use('/api/proacao', ...protected, requireRoleVerified, proacao);
app.use('/api/alerts', ...protected, proacaoAlerts);
app.use('/api/plc-alerts', ...protected, requireRoleVerified, plcAlerts);
app.use('/api/diagnostic', ...protected, diagnostic);
app.use('/api/diagnostic/report', ...protected, diagReport);
app.use('/api/tpm', ...protected, tpm);
app.use('/api/intelligent-registration', ...protected, intelligentRegistration);
app.use('/api/ai', ...protected, require('./routes/aiOrchestrator'));
app.use('/api/cadastrar-com-ia', ...protected, require('./routes/cadastrarComIA'));

// Rotas de administração
app.use('/api/admin/users', ...protected, requireRoleVerified, adminUsers);
app.use('/api/admin/departments', ...protected, adminDepartments);
app.use('/api/admin/logs', ...protected, requireRoleVerified, adminLogs);
app.use('/api/admin/settings', ...protected, adminSettings);
app.use('/api/admin/structural', ...protected, adminStructural);
app.use('/api/admin/time-clock', ...protected, adminTimeClock);
app.use('/api/hr-intelligence', ...protected, hrIntelligence);
app.use('/api/operational-anomalies', ...protected, operationalAnomalies);
app.use('/api/raw-material-lots', ...protected, rawMaterialLots);
app.use('/api/admin/raw-materials', ...protected, adminRawMaterials);
app.use('/api/admin/warehouse', ...protected, adminWarehouse);
app.use('/api/admin/logistics', ...protected, adminLogistics);
app.use('/api/warehouse-intelligence', ...protected, warehouseIntelligence);
app.use('/api/logistics-intelligence', ...protected, logisticsIntelligence);
app.use('/api/central-ai', ...protected, centralIndustryAI);
app.use('/api/quality-intelligence', ...protected, qualityIntelligence);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint não encontrado',
    path: req.path
  });
});

// Error Handler padronizado
const { errorHandler } = require('./utils/errors');
app.use(errorHandler);

module.exports = app;

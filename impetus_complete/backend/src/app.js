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

// Rotas existentes
const webhook = require('./routes/webhook');
const zapiWebhook = require('./routes/zapi_webhook');
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
const lgpd = require('./routes/lgpd');
const communications = require('./routes/communications');
const dashboard = require('./routes/dashboard');

// Rotas de administração
const adminUsers = require('./routes/admin/users');
const adminDepartments = require('./routes/admin/departments');
const adminLogs = require('./routes/admin/logs');
const adminSettings = require('./routes/admin/settings');
const companies = require('./routes/companies');
const setupCompany = require('./routes/setupCompany');
const internalSales = require('./routes/internal/sales');
const subscription = require('./routes/subscription');

// Middlewares
const { requireAuth } = require('./middleware/auth');
const { requireCompanyActive } = require('./middleware/multiTenant');
const { requireInternalAdmin } = require('./middleware/internalAdmin');
const { requireValidLicense } = require('./middleware/license');
const db = require('./db');
const { getStats } = require('./utils/cache');

const app = express();

// Configurações de segurança
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
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
  max: 200, // 200 req/min por IP
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
  try {
    await db.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.error('[HEALTH_DB_ERROR]', err.message);
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

// Empresas: POST bloqueado (cadastro controlado via fluxo de ativação comercial)
app.use('/api/companies', companyLimiter);
app.post('/api/companies', (req, res) => {
  return res.status(403).json({
    ok: false,
    error: 'Cadastro de empresa desabilitado. Acesso via ativação comercial controlada.',
    code: 'PUBLIC_COMPANY_REGISTRATION_DISABLED'
  });
});

// Webhooks (Z-API, Asaas, Genérico)
app.use('/api/webhook/zapi', zapiWebhook);
app.use('/api/webhook', webhook);
app.use('/api/webhooks/asaas', require('./routes/webhooks/asaas'));
const zapiRoutes = require('./routes/zapi');

// Rotas protegidas (autenticação + empresa ativa)
const protected = [requireAuth, requireCompanyActive];

app.use('/api/setup-company', requireAuth, setupCompany);
app.use('/api/internal/sales', requireAuth, requireInternalAdmin, internalSales);
app.use('/api/subscription', requireAuth, subscription);
app.use('/api/zapi', requireAuth, requireCompanyActive, zapiRoutes);
app.use('/api/whatsapp', requireAuth, requireCompanyActive, require('./routes/whatsapp'));

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

app.use('/api/lgpd', ...protected, lgpd);
app.use('/api/communications', ...protected, communications);
app.use('/api/dashboard', ...protected, dashboard);
app.use('/api/manuals', ...protected, manuals);
app.use('/api/tasks', ...protected, tasks);
app.use('/api/proacao', ...protected, proacao);
app.use('/api/alerts', ...protected, proacaoAlerts);
app.use('/api/plc-alerts', ...protected, plcAlerts);
app.use('/api/diagnostic', ...protected, diagnostic);
app.use('/api/diagnostic/report', ...protected, diagReport);
app.use('/api/tpm', ...protected, tpm);

// Rotas de administração
app.use('/api/admin/users', ...protected, adminUsers);
app.use('/api/admin/departments', ...protected, adminDepartments);
app.use('/api/admin/logs', ...protected, adminLogs);
app.use('/api/admin/settings', ...protected, adminSettings);

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

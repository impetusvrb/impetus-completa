/**
 * Ponto de entrada alternativo (árvore `backend/` na raiz do repo).
 * O PM2 neste servidor usa: impetus_complete/backend/src/server.js
 */
require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

try {
  require('child_process').execSync(`node "${path.join(__dirname, '../scripts/fix-opcua-hexy-cjs.js')}"`, {
    stdio: 'pipe',
  });
} catch { /* opcua hexy CJS — mesmo host */ }

try {
  require('./config/configValidator').validateConfigOrThrow();
} catch (e) {
  console.error(e.name === 'ConfigError' ? e.message : e);
  process.exit(1);
}

const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { buildCorsOptions, buildHelmetOptions } = require('./config/security');
const { apiByIpLimiter, apiByUserLimiter, heavyRouteLimiter } = require('./middleware/globalRateLimit');
const secureStaticUploads = require('./middleware/secureStaticUploads');
const { requireInternalAccess } = require('./middleware/internalRouteGuard');
const { requireInternalNetworkAccess } = require('./middleware/internalNetworkGuard');
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
const { requireCompanyActive } = require('./middleware/multiTenant');
const { sendSafeError } = require('./utils/sendSafeError');
const { allowHealthDetails } = require('./middleware/healthExposure');
const { getAiIntegrationsHealth } = require('./services/aiIntegrationsHealthService');
const db = require('./db');
const systemReadinessService = require('./services/systemReadinessService');
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
// Enterprise Hardening Bloco 10: Correlation ID antes de tudo — propaga req.id
// para handlers e responde com X-Request-Id (clientes podem correlacionar).
try {
  const { correlationIdMiddleware } = require('./middleware/correlationId');
  app.use(correlationIdMiddleware);
} catch (_e) {
  /* never break boot */
}
try {
  const { observabilityMiddleware } = require('./middleware/observabilityMiddleware');
  app.use(observabilityMiddleware);
} catch (_e) {
  /* WAVE 2 opt-in — never break boot */
}
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

// ─── Universal Audit Middleware (Enterprise LGPD + ISO 42001) ─────────────────
// Flag: IMPETUS_UNIVERSAL_AUDIT=off|shadow|pilot|on (default off)
// Intercepta rotas WRITE P0 de forma assíncrona, zero-blocking.
try {
  const { universalAuditMiddleware } = require('./middleware/universalAuditMiddleware');
  app.use(universalAuditMiddleware);
} catch (_e) {
  /* never break boot */
}

// ─── Runtime State Enforcement (Observability vs Execution) ──────────────────
// Flag: IMPETUS_RUNTIME_STATE_ENFORCEMENT=off|audit|enforce (default off)
// Protege contra side effects acidentais de módulos classificados como observability/enrich/assistive.
try {
  const { runtimeStateEnforcementMiddleware } = require('./middleware/runtimeStateEnforcementMiddleware');
  app.use(runtimeStateEnforcementMiddleware);
} catch (_e) {
  /* never break boot */
}

// ─── Flag Reconciler Runtime (Enterprise Governance) ──────────────────────────
// Boot-time validation: detecta contradições, drift PM2/dotenv, estados impossíveis.
try {
  const flagReconciler = require('./governance/flagReconcilerRuntime');
  const bootOk = flagReconciler.bootValidation();
  if (!bootOk) {
    console.error('[FLAG_RECONCILER] CRITICAL: Boot blocked by flag contradictions (IMPETUS_FLAG_RECONCILER_STRICT=on). Fix flags and restart.');
  }
} catch (_e) {
  console.warn('[FLAG_RECONCILER] Boot validation skipped:', _e?.message);
}

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

/** Versão do build frontend — negociação runtime (cache busting seguro). Sem auth. */
app.get('/api/system/frontend-build', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const frontendBuildVersionService = require('./services/frontendBuildVersionService');
    return res.json({ ok: true, ...frontendBuildVersionService.getPublicBuildInfo() });
  } catch (err) {
    return res.json({
      ok: true,
      build_id: process.env.IMPETUS_BUILD_ID || 'unknown',
      built_at: null,
      server_time: new Date().toISOString(),
      source: 'fallback'
    });
  }
});

/**
 * Prontidão: BD, schema, cifra (sem chamadas a APIs de IA).
 *
 * Enterprise Hardening Bloco 1 (A12):
 *   • Acesso anónimo passa a receber payload reduzido (apenas { ready }).
 *   • Detalhes técnicos só com header X-Health-Key OU loopback OU
 *     utilizador autenticado com role internal_admin/admin do tenant.
 *   • Comportamento aditivo: callers existentes que enviem X-Health-Key
 *     continuam a obter o payload completo (zero quebra).
 */
app.get('/api/system/health/deep', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const r = await systemReadinessService.checkSystemReadiness();
    const fullPayload = systemReadinessService.toPublicPayload(r);

    // 1) chave/loopback: mantém compatibilidade total.
    if (allowHealthDetails(req)) {
      return res.json(fullPayload);
    }

    // 2) sessão autenticada + role admin/internal: devolve completo + log auditável.
    try {
      const token =
        (req.headers.authorization || '').replace('Bearer ', '').trim() ||
        req.headers['x-access-token'] ||
        null;
      if (token) {
        const { validateSession } = require('./middleware/auth');
        const { userIsInternalAdmin } = require('./middleware/internalRouteGuard');
        const user = await validateSession(token);
        if (user && userIsInternalAdmin(user)) {
          console.info(
            '[INTERNAL_ROUTE_ACCESS]',
            JSON.stringify({
              event: 'INTERNAL_ROUTE_ACCESS',
              decision: 'allowed',
              path: '/api/system/health/deep',
              user_id: user.id,
              company_id: user.company_id || null,
              at: new Date().toISOString()
            })
          );
          return res.json(fullPayload);
        }
      }
    } catch (_e) {
      /* never break health endpoint by auth glitch */
    }

    // 3) público: apenas estado binário (sem revelar configs/issues).
    return res.json({ ready: !!fullPayload.ready });
  } catch (e) {
    const msg = e && e.message ? String(e.message) : 'erro interno';
    return res.status(500).json({ ready: false, error: 'READINESS_ERROR' });
  }
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
    if (mountPath === '/api/cognitive-council' || String(modulePath).includes('cognitiveCouncil')) {
      console.warn('[COGNITIVE_COUNCIL_NOT_LOADED]', e && e.message ? e.message : e);
    }
  }
}

/* --- API (cada bloco isolado: dependência em falta não derruba o servidor) --- */
useRoute('/api/media', './routes/mediaFile');
useRoute('/api/auth', './routes/auth');
useRoute('/api/auth/mfa', './routes/authMfa');
useRoute('/api/federation', './routes/federation');
useRoute('/api/federation/scim/v2', './routes/federationScim');
useRoute('/api/factory-team', './routes/factoryTeam');
useRoute('/api/companies', './routes/companies');
useRoute('/api/onboarding', './routes/onboarding', requireAuth);
useRoute('/api/dashboard', './routes/dashboard');
useRoute('/api/runtime-z-sovereign', './routes/runtimeZSovereign', requireAuth);
useRoute('/api/runtime-z-cognitive-os', './routes/runtimeZCognitiveOs', requireAuth);
useRoute('/api/runtime-z-operational-nervous-system', './routes/runtimeZOperationalNervousSystem', requireAuth);
useRoute('/api/runtime-z-sz5', './routes/runtimeZSz5', requireAuth);
useRoute('/api/runtime-z-maturation', './routes/runtimeZMaturation', requireAuth);
useRoute('/api/cognitive-activation', './routes/cognitiveActivation', requireAuth);
useRoute('/api/live-dashboard', './routes/liveDashboard', requireAuth);
useRoute('/api/communications', './routes/communications');
useRoute('/api/impetus-admin', './routes/impetusAdmin');
useRoute('/api/admin-portal', './routes/adminPortalGovernance');
useRoute('/api/admin/tenant-admins', './routes/admin/tenantAdmins');
useRoute('/api/admin/users', './routes/admin/users');
useRoute('/api/admin/logs', './routes/admin/logs');
useRoute('/api/admin/settings', './routes/admin/settings');
useRoute('/api/admin/runtime', './routes/admin/runtimeFlags', requireAuth);
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
useRoute('/api/ai/governance', './routes/aiGovernance', requireAuth);
useRoute('/api/action-runtime', './routes/actionRuntime', requireAuth);
useRoute('/api/workflow-engine', './routes/workflowEngine', requireAuth);
useRoute('/api/cognitive-registry', './routes/cognitiveRegistry', requireAuth);
useRoute('/api/deprecation-governance', './routes/deprecationGovernance', requireAuth);
useRoute('/api/runtime-unification', './routes/runtimeUnification', requireAuth);
useRoute('/api/rollout-center', './routes/rolloutCenter', requireAuth);
useRoute('/api/enterprise-locale', './routes/enterpriseLocale', requireAuth);
useRoute('/api/certification-readiness', './routes/certificationReadiness', requireAuth);
useRoute('/api/final-consolidation-audit', './routes/finalConsolidationAudit', requireAuth);
useRoute('/api/admin/learning', './routes/adminLearning');
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
useRoute('/api/anam', './routes/anam');
useRoute('/api/asset-management', './routes/assetManagement');
useRoute('/api/vision', './routes/vision', requireAuth, apiByUserLimiter);
useRoute('/api/proacao', './routes/proacao');
useRoute('/api/cadastrar-com-ia', './routes/cadastrarComIA');
useRoute('/api/chat/metrics', './routes/chatMetrics', requireAuth);
useRoute('/api/feedback', './routes/feedback');
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
useRoute(
  '/api/quality-operational',
  './routes/qualityOperational',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-governance',
  './routes/qualityGovernance',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-telemetry',
  './routes/qualityTelemetry',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-cognitive',
  './routes/qualityCognitive',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-rollout',
  './routes/qualityRollout',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-navigation',
  './routes/qualityNavigation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/quality-activation',
  './routes/qualityActivation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-operational',
  './routes/safetyOperational',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-governance',
  './routes/safetyGovernance',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-telemetry',
  './routes/safetyTelemetry',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-cognitive',
  './routes/safetyCognitive',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-rollout',
  './routes/safetyRollout',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-navigation',
  './routes/safetyNavigation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-activation',
  './routes/safetyActivation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/safety-operational-validation',
  './routes/safetyOperationalValidation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/enterprise-runtime-validation',
  './routes/enterpriseRuntimeValidation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/enterprise-shadow-stabilization',
  './routes/enterpriseShadowStabilization',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/enterprise-pilot-rollout',
  './routes/enterprisePilotRollout',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/enterprise-ecosystem-consolidation',
  './routes/enterpriseEcosystemConsolidation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/logistics-navigation',
  './routes/logisticsNavigation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/logistics-activation',
  './routes/logisticsActivation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/logistics-operational-validation',
  './routes/logisticsOperationalValidation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-navigation',
  './routes/environmentNavigation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-activation',
  './routes/environmentActivation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-operational',
  './routes/environmentOperational',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-governance',
  './routes/environmentGovernance',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-operational-validation',
  './routes/environmentOperationalValidation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/domain-governance-gate',
  './routes/domainGovernanceGate',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-telemetry',
  './routes/environmentTelemetry',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-cognitive',
  './routes/environmentCognitive',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-executive',
  './routes/environmentExecutive',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/environment-pilot-rollout',
  './routes/environmentPilotRollout',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/ecosystem-correlation',
  './routes/ecosystemCorrelation',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute(
  '/api/enterprise-hardening',
  './routes/enterpriseHardeningMaturity',
  requireAuth,
  requireCompanyActive,
  apiByUserLimiter
);
useRoute('/api/hr-intelligence', './routes/hrIntelligence');
useRoute('/api/pulse', './routes/pulse', requireAuth);
useRoute('/api/cognitive-council', './routes/cognitiveCouncil', requireAuth, apiByUserLimiter);
useRoute('/api/raw-material-lots', './routes/rawMaterialLots');
useRoute('/api/operational-anomalies', './routes/operationalAnomalies');
useRoute('/api/operational', './routes/operational', requireAuth);
useRoute('/api/logistics-intelligence', './routes/logisticsIntelligence');
/**
 * Internals — Enterprise Hardening Bloco 1.
 *
 * Política: requireAuth + requireInternalAccess (role internal_admin OU admin
 *           OU capability system_administration). Rate limit por utilizador.
 *           Vector-health/rebuild adiciona heavyRouteLimiter.
 *
 * Feature flag: IMPETUS_INTERNAL_ROUTES_ENABLED (default true). Quando posto a
 * 'false', todas as rotas internas respondem 503 com INTERNAL_ROUTES_DISABLED.
 *
 * unifiedHealth mantém o requireHealthAccess existente porque tem semântica
 * mais permissiva (líderes do tenant); apenas adicionamos requireAuth aqui
 * caso o router não o aplique por dentro — duplo-cinto é seguro.
 */
const internalNet = (label) => requireInternalNetworkAccess({ label });
const internalAcl = (label) => requireInternalAccess({ label });

useRoute('/api/internal/governance', './routes/internal/governance', requireAuth, internalNet('governance'), internalAcl('governance'), apiByUserLimiter);
useRoute('/api/internal/sales', './routes/internal/sales', requireAuth, internalNet('sales'), internalAcl('sales'), apiByUserLimiter);
useRoute('/api/internal/unified-metrics', './routes/internal/unifiedMetrics', requireAuth, internalNet('unified-metrics'), internalAcl('unified-metrics'), apiByUserLimiter);
useRoute('/api/internal/unified-health', './routes/internal/unifiedHealth', requireAuth, internalNet('unified-health'), apiByUserLimiter);
useRoute('/api/internal/vector-health', './routes/internal/vectorHealth', requireAuth, internalNet('vector-health'), internalAcl('vector-health'), heavyRouteLimiter);
useRoute(
  '/api/internal/test-environmental-cognitive',
  './routes/internal/environmentalCognitiveTest',
  requireAuth,
  internalNet('env-cognitive-test'),
  internalAcl('env-cognitive-test'),
  apiByUserLimiter
);
useRoute('/api/internal/enterprise', './routes/internal/enterpriseConsolidation', requireAuth, internalNet('enterprise'), internalAcl('enterprise'), apiByUserLimiter);
useRoute('/api/internal/operational-runtime', './routes/internal/operationalRuntime', requireAuth, internalNet('operational-runtime'), internalAcl('operational-runtime'), apiByUserLimiter);
useRoute('/api/internal/shadow-routes', './routes/internal/shadowRoutes', requireAuth, internalNet('shadow-routes'), internalAcl('shadow-routes'), apiByUserLimiter);
useRoute('/api/internal/tenant-rls', './routes/internal/tenantRls', requireAuth, internalNet('tenant-rls'), internalAcl('governance'), apiByUserLimiter);
useRoute(
  '/api/internal/industrial-event-backbone',
  './routes/internal/industrialEventBackbone',
  requireAuth,
  internalNet('industrial-event-backbone'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/observability',
  './routes/internal/enterpriseObservability',
  requireAuth,
  internalNet('observability'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/storage',
  './routes/internal/industrialStorage',
  requireAuth,
  internalNet('storage'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/cognitive-budget',
  './routes/internal/cognitiveBudget',
  requireAuth,
  internalNet('cognitive-budget'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/domains',
  './routes/internal/boundedDomains',
  requireAuth,
  internalNet('domains'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/quality-universal',
  './routes/internal/qualityUniversalRuntime',
  requireAuth,
  internalNet('quality-universal'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/industrialGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('enterprise'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernancePhaseG',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernancePhaseH',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernancePhaseI',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernancePhaseJ',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernanceFinalReview',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernanceProductionRollout',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/cognitiveGovernanceBootstrap',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/semanticRuntimeAlignment',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance',
  './routes/internal/runtimePrecision',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/cognitive-convergence',
  './routes/internal/cognitiveConvergence',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/cognitive-operations',
  './routes/internal/cognitiveOperations',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-stabilization',
  './routes/internal/runtimeStabilization',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/contextual-delivery',
  './routes/internal/contextualDeliveryStabilization',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-consistency',
  './routes/internal/runtimeConsistency',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/decision-reliability',
  './routes/internal/decisionReliability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/controlled-activation',
  './routes/internal/controlledActivation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-rollout',
  './routes/internal/kpiRollout',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-stabilization',
  './routes/internal/kpiStabilization',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-rollout',
  './routes/internal/summaryRollout',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/chat-alignment',
  './routes/internal/chatAlignment',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-enrichment',
  './routes/internal/runtimeEnrichment',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-calibration',
  './routes/internal/runtimeCalibration',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/production-deployment',
  './routes/internal/productionDeployment',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/tenant-rollout',
  './routes/internal/tenantRollout',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-tuning',
  './routes/internal/runtimeTuning',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-consolidation',
  './routes/internal/runtimeConsolidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-observation',
  './routes/internal/runtimeObservation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/operational-identity',
  './routes/internal/operationalIdentity',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/menu-governance',
  './routes/internal/menuGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/contextual-enforcement',
  './routes/internal/contextualEnforcement',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/tenant-profiling',
  './routes/internal/tenantProfiling',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/dashboard-density',
  './routes/internal/dashboardDensity',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/contextual-activation',
  './routes/internal/contextualActivation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/pilot-tenants',
  './routes/internal/pilotTenants',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/underdelivery-protection',
  './routes/internal/underdeliveryProtection',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/dashboard-stabilization',
  './routes/internal/dashboardStabilization',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/pilot-maturity',
  './routes/internal/pilotMaturity',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-preparation',
  './routes/internal/kpiPreparation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/delivery-quality',
  './routes/internal/deliveryQuality',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/pilot-observability',
  './routes/internal/pilotObservability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-runtime-enforcement',
  './routes/internal/kpiRuntimeEnforcement',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-safety',
  './routes/internal/kpiSafety',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-pilot-observability',
  './routes/internal/kpiPilotObservability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-runtime-stability',
  './routes/internal/kpiRuntimeStability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-visibility',
  './routes/internal/kpiVisibility',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-dashboard-stabilization',
  './routes/internal/kpiDashboardStabilization',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-convergence',
  './routes/internal/kpiConvergence',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-blindness',
  './routes/internal/kpiBlindness',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/kpi-governance-health',
  './routes/internal/kpiGovernanceHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-convergence',
  './routes/internal/summaryConvergence',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-blindness',
  './routes/internal/summaryBlindness',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-governance-health',
  './routes/internal/summaryGovernanceHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-runtime-activation',
  './routes/internal/summaryRuntimeActivation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-delivery-quality',
  './routes/internal/summaryDeliveryQuality',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/summary-runtime-observability',
  './routes/internal/summaryRuntimeObservability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/tenant-governance-maturity',
  './routes/internal/tenantGovernanceMaturity',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-sustainability',
  './routes/internal/runtimeSustainability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-governance-consolidation',
  './routes/internal/runtimeGovernanceConsolidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/tenant-expansion-scaling',
  './routes/internal/tenantExpansionScaling',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-scaling-readiness',
  './routes/internal/runtimeScalingReadiness',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-expansion-observability',
  './routes/internal/runtimeExpansionObservability',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/production-runtime-activation',
  './routes/internal/productionRuntimeActivation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/pilot-tenant-health',
  './routes/internal/pilotTenantHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-observation-consolidation',
  './routes/internal/runtimeObservationConsolidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/operational-identity-governance',
  './routes/internal/operationalIdentityGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/real-tenant-enforcement',
  './routes/internal/realTenantEnforcement',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/real-menu-governance',
  './routes/internal/realMenuGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/real-kpi-targeting',
  './routes/internal/realKpiTargeting',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/real-summary-targeting',
  './routes/internal/realSummaryTargeting',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/operational-leakage',
  './routes/internal/operationalLeakage',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/sidebar-governance',
  './routes/internal/sidebarGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/runtime-delivery-audit',
  './routes/internal/runtimeDeliveryAudit',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/terminal-governance',
  './routes/internal/terminalGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/operational-validation',
  './routes/internal/operationalValidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/production-validation',
  './routes/internal/productionValidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/telemetry-governance',
  './routes/internal/telemetryGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/industrial-runtime-health',
  './routes/internal/industrialRuntimeHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/environmental-validation',
  './routes/internal/environmentalValidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/environmental-live-validation',
  './routes/internal/environmentalLiveValidation',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/regulatory-governance',
  './routes/internal/regulatoryGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/environmental-governance',
  './routes/internal/environmentalGovernance',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/environmental-runtime-health',
  './routes/internal/environmentalRuntimeHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/adaptive-orchestration',
  './routes/internal/adaptiveOrchestration',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/cognitive-fatigue',
  './routes/internal/cognitiveFatigue',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/usefulness-runtime',
  './routes/internal/usefulnessRuntime',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/orchestration-health',
  './routes/internal/orchestrationHealth',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/governance-learning',
  './routes/internal/governanceLearning',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/learning-patterns',
  './routes/internal/learningPatterns',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/usefulness-learning',
  './routes/internal/usefulnessLearning',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);
useRoute(
  '/api/internal/convergence-learning',
  './routes/internal/convergenceLearning',
  requireAuth,
  internalNet('governance'),
  internalAcl('governance'),
  apiByUserLimiter
);

/* ManuIA - Feature flag: ativo por padrão; ENABLE_MANUIA=false desativa rapidamente sem revert */
const manuiaEnabled = process.env.ENABLE_MANUIA !== 'false' && process.env.ENABLE_MANUIA !== '0';
if (manuiaEnabled) {
  useRoute('/api/manutencao-ia', './routes/manutencao-ia');
} else {
  console.log(
    '[server] ManuIA: desabilitado (ENABLE_MANUIA=false) — fallback JSON em /api/manutencao-ia/*'
  );
  useRoute('/api/manutencao-ia', './routes/manuiaDisabledFallback');
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

setImmediate(() => {
  try {
    const operationalLearningService = require('./services/operationalLearningService');
    operationalLearningService
      .loadAllOperationalLearningFromDB()
      .then(() => {
        console.info('[OPERATIONAL_LEARNING_BOOT]', JSON.stringify({ event: 'OPERATIONAL_LEARNING_BOOT', status: 'ok' }));
      })
      .catch((err) => {
        console.warn(
          '[OPERATIONAL_LEARNING_BOOT_WARN]',
          JSON.stringify({ event: 'OPERATIONAL_LEARNING_BOOT_WARN', error: err?.message || String(err) })
        );
      });
  } catch (e) {
    console.warn('[OPERATIONAL_LEARNING] bootstrap:', e?.message);
  }
});

let systemMetricsIntervalId = null;
if (String(process.env.SYSTEM_METRICS_CRON_ENABLED || 'true').toLowerCase() !== 'false') {
  try {
    const observabilityService = require('./services/observabilityService');
    const rawMs = parseInt(process.env.SYSTEM_METRICS_INTERVAL_MS || '60000', 10);
    const intervalMs = Number.isFinite(rawMs)
      ? Math.min(3600000, Math.max(60000, rawMs))
      : 60000;
    systemMetricsIntervalId = setInterval(() => {
      observabilityService.persistMetricsSnapshot().catch(() => {});
    }, intervalMs);
    setTimeout(() => {
      observabilityService.persistMetricsSnapshot().catch(() => {});
    }, 15000);
    console.info(`[SYSTEM_METRICS] Persistência de métricas a cada ${intervalMs}ms (1.ª após ~15s)`);
  } catch (e) {
    console.warn('[SYSTEM_METRICS] Cron não iniciado:', e?.message);
  }
}

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
            operationalBrain.checkAlerts(c.id).catch((err) => {
              console.warn(
                '[SERVER][OPERATIONAL_BRAIN_CHECK_ALERTS]',
                err && err.message ? err.message : err
              );
            });
          }
        } catch (err) {
          console.warn(
            '[SERVER][OPERATIONAL_BRAIN_CRON_TICK]',
            err && err.message ? err.message : err
          );
        }
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

  // ─── Retention Shadow Workers (T1.7.2) ────────────────────────────────────────
  try {
    const retentionShadow = require('./workers/retentionShadowWorker');
    const started = retentionShadow.startScheduler();
    const stats = retentionShadow.getWorkerStats();
    console.info(`[RETENTION_SHADOW_BOOT] ${JSON.stringify({ event: 'RETENTION_SHADOW_BOOT', mode: stats.mode, enabled: stats.enabled, scheduler: started, targets: stats.targets })}`);
  } catch (e) {
    console.warn('[RETENTION_SHADOW_BOOT] Não iniciado:', e?.message);
  }

  // ─── Retention Pilot Workers (T1.7.3) ─────────────────────────────────────────
  try {
    const retentionPilot = require('./workers/retentionPilotWorker');
    if (retentionPilot.isPilotMode()) {
      const started = retentionPilot.startPilotScheduler();
      const stats = retentionPilot.getPilotStats();
      console.info(`[RETENTION_PILOT_BOOT] ${JSON.stringify({ event: 'RETENTION_PILOT_BOOT', enabled: true, scheduler: started, tenants: stats.tenants.length, batch_size: stats.batch_size, max_per_run: stats.max_per_run, targets: stats.targets })}`);
    } else {
      console.info(`[RETENTION_PILOT_BOOT] ${JSON.stringify({ event: 'RETENTION_PILOT_BOOT', enabled: false, reason: 'mode_not_pilot' })}`);
    }
  } catch (e) {
    console.warn('[RETENTION_PILOT_BOOT] Não iniciado:', e?.message);
  }

  // ─── Retention Enforce Workers (T1.7.4) ────────────────────────────────────────
  try {
    const retentionEnforce = require('./workers/retentionEnforceWorker');
    if (retentionEnforce.isEnforceMode()) {
      const started = retentionEnforce.startEnforceScheduler();
      const stats = retentionEnforce.getEnforceStats();
      console.info(`[RETENTION_ENFORCE_BOOT] ${JSON.stringify({ event: 'RETENTION_ENFORCE_BOOT', enabled: true, scheduler: started, targets: stats.targets.length, batch_size: stats.config.batch_size, max_per_table: stats.config.max_per_table })}`);
    } else {
      console.info(`[RETENTION_ENFORCE_BOOT] ${JSON.stringify({ event: 'RETENTION_ENFORCE_BOOT', enabled: false, reason: 'mode_not_enforce' })}`);
    }
  } catch (e) {
    console.warn('[RETENTION_ENFORCE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Industrial Event Backbone WAVE 2 (PROMPT 23) — recovery + scheduler opt-in ─
{
  try {
    const backbone = require('./eventPipeline/industrialEventBackbone');
    setTimeout(() => {
      backbone
        .bootIndustrialEventBackbone()
        .then((boot) => {
          console.info(
            `[INDUSTRIAL_EVENT_BACKBONE_BOOT] ${JSON.stringify({
              event: 'INDUSTRIAL_EVENT_BACKBONE_BOOT',
              ...boot
            })}`
          );
        })
        .catch((e) => console.warn('[INDUSTRIAL_EVENT_BACKBONE_BOOT]', e?.message));
    }, 8000);
  } catch (e) {
    console.warn('[INDUSTRIAL_EVENT_BACKBONE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Action Runtime + HITL (PROMPT 24) — health diagnostics ───────────────────
{
  try {
    const actionFlags = require('./actionRuntime/config/actionRuntimeFlags');
    const orchestrator = require('./actionRuntime/orchestration/actionRuntimeOrchestrator');
    setTimeout(() => {
      console.info(
        `[ACTION_RUNTIME_BOOT] ${JSON.stringify({
          event: 'ACTION_RUNTIME_BOOT',
          mode: actionFlags.actionRuntimeMode(),
          enabled: actionFlags.isActionRuntimeEnabled(),
          pilot_tenants: actionFlags.pilotTenants(),
          legacy_tool_calling: actionFlags.legacyToolCallingEnabled(),
          health: orchestrator.getHealth()
        })}`
      );
    }, 8500);
  } catch (e) {
    console.warn('[ACTION_RUNTIME_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Legacy Deprecation Governance (PROMPT 27) ────────────────────────────────
{
  try {
    const depFlags = require('./legacyDeprecation/config/deprecationGovernanceFlags');
    const depRouter = require('./legacyDeprecation/governance/legacyCompatibilityRouter');
    setTimeout(() => {
      console.info(
        `[LEGACY_DEPRECATION_BOOT] ${JSON.stringify({
          event: 'LEGACY_DEPRECATION_BOOT',
          mode: depFlags.deprecationMode(),
          active: depFlags.isDeprecationGovernanceActive(),
          health: depRouter.getHealth()
        })}`
      );
    }, 9600);
  } catch (e) {
    console.warn('[LEGACY_DEPRECATION_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Final Consolidation Audit (PROMPT 32) — maturidade enterprise/industrial ───
{
  try {
    const fcFlags = require('./finalConsolidationAudit/config/finalConsolidationAuditFlags');
    const fcFacade = require('./finalConsolidationAudit/facade/finalConsolidationAuditFacade');
    setTimeout(() => {
      console.info(
        `[FINAL_CONSOLIDATION_AUDIT_BOOT] ${JSON.stringify({
          event: 'FINAL_CONSOLIDATION_AUDIT_BOOT',
          mode: fcFlags.consolidationAuditMode(),
          active: fcFlags.isFinalConsolidationAuditActive(),
          health: fcFacade.getHealth()
        })}`
      );
    }, 10100);
  } catch (e) {
    console.warn('[FINAL_CONSOLIDATION_AUDIT_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Certification Readiness (PROMPT 31) — ISO 27001 / 42001 / SOC2 / IEC 62443 ─
{
  try {
    const crFlags = require('./certificationReadiness/config/certificationReadinessFlags');
    const crFacade = require('./certificationReadiness/facade/certificationReadinessFacade');
    setTimeout(() => {
      console.info(
        `[CERTIFICATION_READINESS_BOOT] ${JSON.stringify({
          event: 'CERTIFICATION_READINESS_BOOT',
          mode: crFlags.certificationMode(),
          active: crFlags.isCertificationReadinessActive(),
          health: crFacade.getHealth()
        })}`
      );
    }, 10000);
  } catch (e) {
    console.warn('[CERTIFICATION_READINESS_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Enterprise Locale / i18n / Timezone (PROMPT 30) ───────────────────────────
{
  try {
    const elFlags = require('./enterpriseLocale/config/enterpriseLocaleFlags');
    const elFacade = require('./enterpriseLocale/facade/enterpriseLocaleFacade');
    setTimeout(() => {
      console.info(
        `[ENTERPRISE_LOCALE_BOOT] ${JSON.stringify({
          event: 'ENTERPRISE_LOCALE_BOOT',
          mode: elFlags.localeEngineMode(),
          active: elFlags.isLocaleEngineActive(),
          health: elFacade.getHealth()
        })}`
      );
    }, 9900);
  } catch (e) {
    console.warn('[ENTERPRISE_LOCALE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Rollout Center (PROMPT 29) — painel unificado de flags e promoção ────────
{
  try {
    const rcFlags = require('./rolloutCenter/config/rolloutCenterFlags');
    const rcFacade = require('./rolloutCenter/facade/rolloutCenterFacade');
    setTimeout(() => {
      console.info(
        `[ROLLOUT_CENTER_BOOT] ${JSON.stringify({
          event: 'ROLLOUT_CENTER_BOOT',
          mode: rcFlags.rolloutCenterMode(),
          active: rcFlags.isRolloutCenterActive(),
          health: rcFacade.getHealth()
        })}`
      );
    }, 9800);
  } catch (e) {
    console.warn('[ROLLOUT_CENTER_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Runtime Unification SZ5 (PROMPT 28) — voice/panel/text/memory/orchestration ─
{
  try {
    const ruFlags = require('./runtimeUnification/config/runtimeUnificationFlags');
    const ruFacade = require('./runtimeUnification/facade/unifiedSz5RuntimeFacade');
    setTimeout(() => {
      console.info(
        `[RUNTIME_UNIFICATION_BOOT] ${JSON.stringify({
          event: 'RUNTIME_UNIFICATION_BOOT',
          mode: ruFlags.unificationMode(),
          active: ruFlags.isUnificationActive(),
          health: ruFacade.getHealth()
        })}`
      );
    }, 9700);
  } catch (e) {
    console.warn('[RUNTIME_UNIFICATION_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Cognitive Registry Consolidation (PROMPT 26) — SSOT facade ─────────────
{
  try {
    const crFlags = require('./cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
    const unifiedCr = require('./cognitiveRegistry/consolidation/unifiedCognitiveRegistry');
    setTimeout(() => {
      console.info(
        `[COGNITIVE_REGISTRY_CONSOLIDATION_BOOT] ${JSON.stringify({
          event: 'COGNITIVE_REGISTRY_CONSOLIDATION_BOOT',
          mode: crFlags.consolidationMode(),
          active: crFlags.isConsolidationActive(),
          health: unifiedCr.getHealth()
        })}`
      );
    }, 9500);
  } catch (e) {
    console.warn('[COGNITIVE_REGISTRY_CONSOLIDATION_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Industrial Workflow Engine (PROMPT 25) — BPMN + state machine ───────────
{
  try {
    const wfFlags = require('./workflowEngine/config/workflowEngineFlags');
    const wfOrch = require('./workflowEngine/orchestration/workflowOrchestrator');
    setTimeout(() => {
      console.info(
        `[WORKFLOW_ENGINE_BOOT] ${JSON.stringify({
          event: 'WORKFLOW_ENGINE_BOOT',
          mode: wfFlags.workflowEngineMode(),
          enabled: wfFlags.isWorkflowEngineActive(),
          pilot_tenants: wfFlags.pilotTenants(),
          health: wfOrch.getHealth()
        })}`
      );
    }, 9000);
  } catch (e) {
    console.warn('[WORKFLOW_ENGINE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── DSR Notification SLA Scheduler (T1.6.5) ─────────────────────────────────
{
  try {
    const dsrNotify = require('./services/dsrNotificationService');
    const started = dsrNotify.startSlaScheduler();
    console.info(`[DSR_SLA_SCHEDULER_BOOT] ${JSON.stringify({ event: 'DSR_SLA_SCHEDULER_BOOT', started })}`);
  } catch (e) {
    console.warn('[DSR_SLA_SCHEDULER_BOOT] Não iniciado:', e?.message);
  }
}

// ─── AI Anonymization Worker (T1.8.3) ────────────────────────────────────────
{
  try {
    const aiAnonWorker = require('./workers/aiAnonymizationWorker');
    const started = aiAnonWorker.startScheduler();
    const stats = aiAnonWorker.getWorkerStats();
    console.info(`[AI_ANON_WORKER_BOOT] ${JSON.stringify({ event: 'AI_ANON_WORKER_BOOT', enabled: stats.enabled, mode: stats.mode, scheduler: started })}`);
  } catch (e) {
    console.warn('[AI_ANON_WORKER_BOOT] Não iniciado:', e?.message);
  }
}

// ─── AI Model Registry + Governance (PROMPT 12) ───────────────────────────────
{
  try {
    const schemaBootstrap = require('./services/aiSchemaBootstrap');
    const registry = require('./governance/aiModelRegistry');
    schemaBootstrap.ensureAiGovernanceSchema().then(async (schema) => {
      if (schema.ok) {
        const sync = await registry.syncRegistryToDatabase();
        console.info(`[AI_MODEL_REGISTRY_BOOT] ${JSON.stringify({ event: 'AI_MODEL_REGISTRY_BOOT', schema: true, sync, diagnostics: registry.getDiagnostics() })}`);
      } else {
        console.warn('[AI_MODEL_REGISTRY_BOOT] Schema bootstrap incomplete:', schema.error);
      }
    }).catch((e) => console.warn('[AI_MODEL_REGISTRY_BOOT]', e?.message));
  } catch (e) {
    console.warn('[AI_MODEL_REGISTRY_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Hallucination Detection V1 (PROMPT 13) ───────────────────────────────────
{
  try {
    const hallucinationSvc = require('./services/hallucinationDetectionService');
    const schemaBootstrap = require('./services/aiSchemaBootstrap');
    schemaBootstrap.ensureAiGovernanceSchema().then((schema) => {
      console.info(`[HALLUCINATION_DETECTION_BOOT] ${JSON.stringify({
        event: 'HALLUCINATION_DETECTION_BOOT',
        schema_ok: schema.ok,
        diagnostics: hallucinationSvc.getDiagnostics(),
      })}`);
    }).catch((e) => console.warn('[HALLUCINATION_DETECTION_BOOT]', e?.message));
  } catch (e) {
    console.warn('[HALLUCINATION_DETECTION_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Edge Runtime + Industrial Lab (PROMPT 22) ─────────────────────────────────
{
  try {
    const edgeReal = require('./industrial-edge/runtime/edgeRealSyncRuntime');
    const edgeTrace = require('./industrial-edge/observability/edgeTracing');
    edgeReal.warmBoot()
      .then(async (boot) => {
        await edgeTrace.emitBootAudit().catch(() => {});
        console.info(`[EDGE_RUNTIME_BOOT] ${JSON.stringify({
          event: 'EDGE_RUNTIME_BOOT',
          ...boot,
          stats: edgeReal.getGlobalStats(),
        })}`);
      })
      .catch((e) => console.warn('[EDGE_RUNTIME_BOOT]', e?.message));
  } catch (e) {
    console.warn('[EDGE_RUNTIME_BOOT] Não iniciado:', e?.message);
  }
}

// ─── MQTT Real Runtime (PROMPT 19) ───────────────────────────────────────────
{
  try {
    const mqttReal = require('./industrial-mqtt/runtime/mqttRealClientRuntime');
    const mqttTrace = require('./industrial-mqtt/observability/mqttTracing');
    mqttReal.warmBoot()
      .then(async (boot) => {
        await mqttTrace.emitBootAudit().catch(() => {});
        console.info(`[MQTT_REAL_BOOT] ${JSON.stringify({
          event: 'MQTT_REAL_BOOT',
          ...boot,
          stats: mqttReal.getGlobalStats(),
        })}`);
      })
      .catch((e) => console.warn('[MQTT_REAL_BOOT]', e?.message));
  } catch (e) {
    console.warn('[MQTT_REAL_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Modbus Real Runtime (PROMPT 21) ─────────────────────────────────────────
{
  try {
    const modbusReal = require('./industrial-modbus/runtime/modbusRealPollRuntime');
    const modbusTrace = require('./industrial-modbus/observability/modbusTracing');
    modbusReal.warmBoot()
      .then(async (boot) => {
        await modbusTrace.emitBootAudit().catch(() => {});
        console.info(`[MODBUS_REAL_BOOT] ${JSON.stringify({
          event: 'MODBUS_REAL_BOOT',
          ...boot,
          stats: modbusReal.getGlobalStats(),
        })}`);
      })
      .catch((e) => console.warn('[MODBUS_REAL_BOOT]', e?.message));
  } catch (e) {
    console.warn('[MODBUS_REAL_BOOT] Não iniciado:', e?.message);
  }
}

// ─── OPC-UA Real Runtime (PROMPT 20) ─────────────────────────────────────────
{
  try {
    const opcuaReal = require('./industrial-opcua/runtime/opcuaRealClientRuntime');
    const opcuaTrace = require('./industrial-opcua/observability/opcuaTracing');
    const runOpcuaWarmBoot = () => opcuaReal.warmBoot()
      .then(async (boot) => {
        await opcuaTrace.emitBootAudit().catch(() => {});
        console.info(`[OPCUA_REAL_BOOT] ${JSON.stringify({
          event: 'OPCUA_REAL_BOOT',
          ...boot,
          stats: opcuaReal.getGlobalStats(),
        })}`);
        if (!boot?.clients?.[0]?.ok) {
          setTimeout(() => {
            opcuaReal.bootPilotClients()
              .then((retry) => console.info(`[OPCUA_REAL_RETRY] ${JSON.stringify(retry)}`))
              .catch((e) => console.warn('[OPCUA_REAL_RETRY]', e?.message));
          }, 15000);
        }
      })
      .catch((e) => console.warn('[OPCUA_REAL_BOOT]', e?.message));
    setTimeout(runOpcuaWarmBoot, 12000);
  } catch (e) {
    console.warn('[OPCUA_REAL_BOOT] Não iniciado:', e?.message);
  }
}

// ─── RLS + Multi-tenant Hardening (PROMPT 18) ───────────────────────────────
{
  try {
    const tenantRls = require('./tenant-isolation/runtime/tenantRlsRuntime');
    const tenantGov = require('./tenant-isolation/governance/tenantRlsGovernanceService');
    tenantRls.boot()
      .then(async (boot) => {
        await tenantRls.emitBootAudit().catch(() => {});
        if (tenantGov.shouldRunFuzz(tenantGov.getEffectiveMode(tenantGov.getDiagnostics().mode))) {
          const fuzz = require('./tenant-isolation/testing/tenantFuzzSuite');
          const fuzzOut = await fuzz.runFullSuite().catch((e) => ({ ok: false, error: e?.message }));
          console.info(`[TENANT_RLS_FUZZ_BOOT] ${JSON.stringify({
            event: 'TENANT_RLS_FUZZ_BOOT',
            ...fuzzOut?.summary,
            ok: fuzzOut?.ok,
          })}`);
        }
        console.info(`[TENANT_RLS_BOOT] ${JSON.stringify({
          event: 'TENANT_RLS_BOOT',
          ...boot,
          diagnostics: tenantGov.getDiagnostics(),
        })}`);
      })
      .catch((e) => console.warn('[TENANT_RLS_BOOT]', e?.message));
  } catch (e) {
    console.warn('[TENANT_RLS_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Enterprise MFA Universal (PROMPT 17) — TOTP · WebAuthn · Backup ───────
{
  try {
    const mfaBootstrap = require('./mfa/bootstrap/mfaSchemaBootstrap');
    const mfaAudit = require('./mfa/observability/mfaAuditTracing');
    const mfaGov = require('./mfa/governance/mfaGovernanceService');
    mfaBootstrap.ensureMfaSchema()
      .then(async (schema) => {
        await mfaAudit.emitBootAudit().catch(() => {});
        console.info(`[MFA_BOOT] ${JSON.stringify({
          event: 'MFA_BOOT',
          schema_ok: schema.ok,
          diagnostics: mfaGov.getDiagnostics(),
        })}`);
      })
      .catch((e) => console.warn('[MFA_BOOT]', e?.message));
  } catch (e) {
    console.warn('[MFA_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Enterprise Federation (PROMPT 16) — OIDC · SAML · SCIM (pilot) ────────
{
  try {
    const fedBootstrap = require('./federation/bootstrap/federationSchemaBootstrap');
    fedBootstrap.ensureFederationSchema()
      .then(async (schema) => {
        await fedBootstrap.emitBootAuditTrail().catch(() => {});
        const gov = require('./federation/governance/federationGovernanceService');
        console.info(`[FEDERATION_BOOT] ${JSON.stringify({
          event: 'FEDERATION_BOOT',
          schema_ok: schema.ok,
          diagnostics: gov.getDiagnostics(),
        })}`);
      })
      .catch((e) => console.warn('[FEDERATION_BOOT]', e?.message));
  } catch (e) {
    console.warn('[FEDERATION_BOOT] Não iniciado:', e?.message);
  }
}

// ─── SZ4 Persistence (PROMPT 15) — pilot tenant, replay on boot, TTL purge ───
{
  try {
    const sz4Persistence = require('./runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    sz4Persistence.warmRecoveryOnBoot()
      .then(async (recovery) => {
        await sz4Persistence.purgeExpired().catch(() => {});
        await sz4Persistence.emitBootAuditTrail().catch(() => {});
        console.info(`[SZ4_PERSISTENCE_BOOT] ${JSON.stringify({
          event: 'SZ4_PERSISTENCE_BOOT',
          recovery,
          diagnostics: sz4Persistence.getDiagnostics(),
        })}`);
      })
      .catch((e) => console.warn('[SZ4_PERSISTENCE_BOOT]', e?.message));
  } catch (e) {
    console.warn('[SZ4_PERSISTENCE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── KMS Governance Warm Startup (PROMPT 11) ─────────────────────────────────
{
  try {
    const kmsGov = require('./services/kms/kmsGovernanceService');
    kmsGov.warmStartup().then(result => {
      kmsGov.startRotationScheduler();
      console.info(`[KMS_GOVERNANCE_BOOT] ${JSON.stringify({ event: 'KMS_GOVERNANCE_BOOT', ...result })}`);
    }).catch(e => {
      console.warn('[KMS_GOVERNANCE_BOOT] Warm startup error:', e?.message);
    });
  } catch (e) {
    console.warn('[KMS_GOVERNANCE_BOOT] Não iniciado:', e?.message);
  }
}

// ─── Retention Worker Unified (T1.7) ─────────────────────────────────────────
{
  try {
    const retentionWorker = require('./workers/retentionWorker');
    const started = retentionWorker.startScheduler();
    const stats = retentionWorker.getWorkerStats();
    console.info(`[RETENTION_WORKER_BOOT] ${JSON.stringify({ event: 'RETENTION_WORKER_BOOT', mode: stats.mode, enabled: stats.enabled, scheduler: started })}`);
  } catch (e) {
    console.warn('[RETENTION_WORKER_BOOT] Não iniciado:', e?.message);
  }
}

// ─── SZ5 Cross-Thread Anonymizer Worker (PROMPT 10) ──────────────────────────
{
  try {
    const sz5Worker = require('./workers/sz5CrossThreadAnonymizerWorker');
    const started = sz5Worker.startScheduler();
    const stats = sz5Worker.getWorkerStats();
    console.info(`[SZ5_CROSS_THREAD_BOOT] ${JSON.stringify({ event: 'SZ5_CROSS_THREAD_BOOT', mode: stats.mode, scheduler: started })}`);
  } catch (e) {
    console.warn('[SZ5_CROSS_THREAD_BOOT] Não iniciado:', e?.message);
  }
}

/**
 * Enterprise Hardening Bloco 12 — graceful shutdown completo:
 *   • para intervals (systemMetrics, operationalBrain, dataLifecycle)
 *   • para reminderScheduler / machineMonitoring
 *   • fecha Socket.io (drena ligações antes de matar HTTP)
 *   • para crons node-cron registados
 *   • fecha httpServer + db.pool
 *   • watchdog de 12s para forçar exit
 */
const _nodeCronTasks = [];
function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  if (systemMetricsIntervalId) {
    clearInterval(systemMetricsIntervalId);
    systemMetricsIntervalId = null;
  }
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
  // Cron jobs registados (Nexus billing, etc.)
  try {
    for (const t of _nodeCronTasks) {
      try { typeof t.stop === 'function' && t.stop(); } catch (_) { /* ignore */ }
    }
  } catch (e) {
    console.warn('[SHUTDOWN] cron tasks:', e?.message);
  }
  // Socket.io — drena antes de fechar HTTP
  try {
    if (io && typeof io.close === 'function') {
      io.close(() => {
        try {
          httpServer.close(() => {
            if (db.pool) {
              db.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
            } else {
              process.exit(0);
            }
          });
        } catch (e) {
          console.warn('[SHUTDOWN] httpServer close after io.close:', e?.message);
          process.exit(1);
        }
      });
    } else {
      httpServer.close(() => {
        if (db.pool) {
          db.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
        } else {
          process.exit(0);
        }
      });
    }
  } catch (e) {
    console.warn('[SHUTDOWN] sequence error:', e?.message);
    process.exit(1);
  }
  // Watchdog mais generoso (12s) e logging final.
  setTimeout(() => {
    console.warn('[SHUTDOWN] watchdog timeout — forçando exit');
    process.exit(1);
  }, 12000);
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

if (String(process.env.ENABLE_NEXUS_TOKEN_BILLING_CRON || '').toLowerCase() === 'true') {
  try {
    const cron = require('node-cron');
    const billingTokenService = require('./services/billingTokenService');
    const tz = process.env.TZ || 'America/Sao_Paulo';
    const task = cron.schedule(
      '0 8 1 * *',
      () => {
        billingTokenService.runMonthlyTokenBilling().catch((e) => console.error('[NEXUS_CRON]', e));
      },
      { timezone: tz }
    );
    // Registar para shutdown gracioso (Enterprise Hardening Bloco 12).
    try { _nodeCronTasks.push(task); } catch (_e) { /* ignore */ }
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

(function runWithReadiness() {
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  (async () => {
    try {
      const r = await systemReadinessService.checkSystemReadiness();
      const pub = systemReadinessService.toPublicPayload(r);
      if (systemReadinessService.shouldAbortOnStartup(r)) {
        console.error('[SYSTEM_READINESS] Arranque abortado em produção (falhas críticas).');
        for (const line of pub.issues) {
          console.error(' ', line);
        }
        process.exit(1);
        return;
      }
      if (pub.issues.length) {
        if (nodeEnv === 'production') {
          console.warn('[SYSTEM_READINESS] Avisos em produção (processo a iniciar).');
        } else {
          console.warn(
            '[SYSTEM_READINESS] Configuração incompleta (modo dev: processo continua; use /api/system/health/deep).'
          );
        }
        for (const line of pub.issues) {
          console.warn(' ', line);
        }
      }
    } catch (e) {
      const msg = e && e.message ? String(e.message) : String(e);
      if (nodeEnv === 'production') {
        console.error('[SYSTEM_READINESS] Exceção no arranque (produção):', msg);
        process.exit(1);
        return;
      }
      console.warn('[SYSTEM_READINESS] Exceção no check (dev: continua):', msg);
    }

    try {
      const eventPipelineBootstrapService = require('./services/eventPipelineBootstrapService');
      const epOut = eventPipelineBootstrapService.bootIfEnabled();
      console.info(
        '[EVENT_PIPELINE_BOOT]',
        epOut.ok
          ? JSON.stringify(epOut)
          : JSON.stringify({ ok: false, reason: epOut.reason || 'unknown' })
      );
    } catch (e) {
      console.warn('[EVENT_PIPELINE_BOOT]', e && e.message ? e.message : e);
    }

    // Enterprise Hardening Bloco 11: snapshot + validação de feature flags.
    try {
      const featureGovernance = require('./services/featureGovernanceService');
      const { validation } = featureGovernance.bootstrap();
      if (validation && Array.isArray(validation.findings) && validation.findings.length) {
        console.info(
          '[FEATURE_GOVERNANCE_BOOT]',
          JSON.stringify({
            event: 'FEATURE_GOVERNANCE_BOOT',
            findings_count: validation.findings.length,
            ok: validation.ok
          })
        );
      }
    } catch (e) {
      console.warn('[FEATURE_GOVERNANCE_BOOT]', e && e.message ? e.message : e);
    }

    // WAVE 2 — observabilidade enterprise (opt-in via IMPETUS_OBSERVABILITY_V2_ENABLED).
    try {
      const obsV2 = require('./observability/enterpriseObservabilityV2Runtime');
      obsV2.bootstrap();
      const apm = require('./observability/apmEnterpriseBridge');
      apm.recordRuntimeHealth('impetus-backend', true);
      apm.emitBootAuditTrail().catch(() => {});
      console.info(
        `[APM_ENTERPRISE_BOOT] ${JSON.stringify({
          event: 'APM_ENTERPRISE_BOOT',
          ...apm.getDiagnostics(),
        })}`
      );
    } catch (e) {
      console.warn('[OBSERVABILITY_V2_BOOT]', e && e.message ? e.message : e);
    }

    // WAVE 3 — storage temporal foundation (opt-in via IMPETUS_STORAGE_V3_ENABLED).
    try {
      const storageV3 = require('./storage/industrialStorageRuntime');
      storageV3.bootstrap();
    } catch (e) {
      console.warn('[STORAGE_V3_BOOT]', e && e.message ? e.message : e);
    }

    // WAVE 4 — contexto cognitivo seguro (budget off por defeito; autoloop guard on).
    try {
      const cognitiveBudget = require('./cognitiveBudget/cognitiveBudgetRuntime');
      cognitiveBudget.bootstrap();
    } catch (e) {
      console.warn('[COGNITIVE_BUDGET_BOOT]', e && e.message ? e.message : e);
    }

    // WAVE 5 — bounded contexts (scaffolding; runtime legado intocado).
    try {
      const domainsV5 = require('./domains/_core/boundedContextRuntime');
      domainsV5.bootstrap();
    } catch (e) {
      console.warn('[DOMAINS_V5_BOOT]', e && e.message ? e.message : e);
    }

    // WAVE 7 — governança industrial enterprise.
    try {
      const govV7 = require('./governance/industrialGovernanceRuntime');
      govV7.bootstrap();
    } catch (e) {
      console.warn('[GOVERNANCE_V7_BOOT]', e && e.message ? e.message : e);
    }

    // Phase Z.17 — recuperação de pilotos aprovados pós-reload PM2.
    try {
      const z17 = require('./operationalValidation/operationalConvergenceFacade');
      const recovery = z17.recoverApprovedPilotsOnBoot();
      if (recovery.tenant_count > 0) {
        console.log(
          `[Z17_PILOT_RECOVERY] tenants=${recovery.tenant_count} recovered=${recovery.recovered}`
        );
      }
    } catch (e) {
      console.warn('[Z17_PILOT_RECOVERY_BOOT]', e && e.message ? e.message : e);
    }

    httpServer.listen(PORT, () => {
      const env = String(process.env.NODE_ENV || 'development').toLowerCase();
      console.log(
        `[impetus-backend] http://0.0.0.0:${PORT}  env=${env}  (health: /health  deep: /api/system/health/deep)`
      );
    });
  })();
})();

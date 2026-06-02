#!/usr/bin/env node
'use strict';

/**
 * Auditoria Gemini — produção IMPETUS.
 * Uso: node scripts/gemini-readiness-audit.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const geminiService = require('../src/services/geminiService');
const arch = require('../src/services/architectureHealthService');

const MODULES = [
  { id: 'executionLayer', path: 'src/ai/layers/executionLayer.js', fn: 'perception multimodal' },
  { id: 'geminiIngressEngine', path: 'src/services/geminiIngressEngine.js', fn: 'ingress gate' },
  { id: 'intentRefinement', path: 'src/eventPipeline/intent/intentRefinementService.js', fn: 'event pipeline' },
  { id: 'cognitiveIntentIngress', path: 'src/ai/cognitiveIntentIngress.js', fn: 'cognitive ingress' },
  { id: 'aiOrchestrator', path: 'src/services/aiOrchestrator.js', fn: 'orchestrator multimodal' },
  { id: 'aiComplaintDetection', path: 'src/services/aiComplaintDetectionService.js', fn: 'quality complaint' },
  { id: 'manuiaLiveAssistance', path: 'src/services/manuiaLiveAssistanceService.js', fn: 'ManuIA vision' },
  { id: 'cadastrarComIA', path: 'src/routes/cadastrarComIA.js', fn: 'cadastro IA imagem' },
  { id: 'humanValidationClosure', path: 'src/services/humanValidationClosureService.js', fn: 'HITL classifier' },
  { id: 'operationalRealtimeCoordinator', path: 'src/services/operationalRealtimeCoordinator.js', fn: 'chat realtime' }
];

async function livePing() {
  if (!geminiService.isAvailable()) {
    return { ok: false, reason: 'client_not_configured' };
  }
  const t0 = Date.now();
  const out = await geminiService.generateText(
    'Responda apenas com JSON: {"ping":true}',
    { model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }
  );
  return {
    ok: Boolean(out && out.length > 0),
    latency_ms: Date.now() - t0,
    sample: out ? String(out).slice(0, 120) : null
  };
}

async function main() {
  const health = arch.getArchitectureHealth({ exposeDetails: true });
  const ping = await livePing();

  const report = {
    generated_at: new Date().toISOString(),
    gemini_available: health.gemini_available,
    root_cause: !health.gemini_available
      ? health.missing_stages.includes('gemini_credentials')
        ? 'Credenciais Gemini/Vertex ausentes no ambiente (GEMINI_API_KEY, GOOGLE_API_KEY ou GOOGLE_GENAI_USE_VERTEXAI + GOOGLE_CLOUD_PROJECT).'
        : 'Cliente Gemini não inicializável.'
      : null,
    env: {
      GEMINI_API_KEY_set: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      GOOGLE_API_KEY_set: Boolean(String(process.env.GOOGLE_API_KEY || '').trim()),
      GOOGLE_GENAI_USE_VERTEXAI: process.env.GOOGLE_GENAI_USE_VERTEXAI || null,
      GOOGLE_CLOUD_PROJECT_set: Boolean(String(process.env.GOOGLE_CLOUD_PROJECT || '').trim()),
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      IMPETUS_STRICT_AI_PIPELINE: process.env.IMPETUS_STRICT_AI_PIPELINE || null,
      IMPETUS_ENFORCE_GEMINI_INGRESS: process.env.IMPETUS_ENFORCE_GEMINI_INGRESS || null
    },
    architecture_health: health,
    live_ping: ping,
    affected_modules: MODULES,
    recovery_plan: [
      'Definir GEMINI_API_KEY (Google AI Studio) OU GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT + credenciais ADC.',
      'Reiniciar PM2: pm2 restart impetus-backend --update-env',
      'Validar: node scripts/gemini-readiness-audit.js (live_ping.ok=true)',
      'Monitorar architecture health: gemini_available=true'
    ],
    regression_risk: 'Baixo se apenas credenciais forem adicionadas; médio se IMPETUS_STRICT_AI_PIPELINE=true sem todas as chaves.'
  };

  console.log(JSON.stringify(report, null, 2));
  const strictExit = String(process.env.GEMINI_AUDIT_STRICT_EXIT || '').trim() === '1';
  process.exit(strictExit && !ping.ok ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

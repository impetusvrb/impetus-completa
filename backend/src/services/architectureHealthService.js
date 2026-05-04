'use strict';

/**
 * Estado de saúde da arquitectura obrigatória IMPETUS (Gemini → Orquestrador → Claude → ChatGPT).
 */

const geminiService = require('./geminiService');
const orchestratorExecutionGate = require('../ai/orchestratorExecutionGate');
const vertexCentralOrchestrator = require('../ai/vertexCentralOrchestrator');

function isStrictMode() {
  return String(process.env.IMPETUS_STRICT_AI_PIPELINE || '').trim() === 'true';
}

function computeMissingStages() {
  const missing = [];
  const geminiOk = typeof geminiService.isAvailable === 'function' && geminiService.isAvailable();
  if (!geminiOk) missing.push('gemini_credentials');
  if (!String(process.env.ANTHROPIC_API_KEY || '').trim()) missing.push('anthropic_api_key');
  if (!String(process.env.OPENAI_API_KEY || '').trim()) missing.push('openai_api_key');
  return missing;
}

/**
 * @param {{ exposeDetails?: boolean }} [opts]
 */
function getArchitectureHealth(opts = {}) {
  const strict = isStrictMode();
  const gate = orchestratorExecutionGate.isEnforceGate();
  const missing = computeMissingStages();
  const violations = opts.exposeDetails ? orchestratorExecutionGate.getViolationsSnapshot() : [];
  const failures = opts.exposeDetails ? orchestratorExecutionGate.getFailuresSnapshot() : [];

  let pipeline_integrity = 'OK';
  if (!strict) pipeline_integrity = 'BROKEN';
  else if (missing.length) pipeline_integrity = 'BROKEN';
  else if (gate && !geminiService.isAvailable()) pipeline_integrity = 'BROKEN';

  return {
    pipeline_integrity,
    strict_mode: strict,
    orchestrator_gate_enforced: gate,
    missing_stages: missing,
    last_failures: failures,
    violations_recent: violations,
    gemini_available: typeof geminiService.isAvailable === 'function' && geminiService.isAvailable(),
    orchestration: vertexCentralOrchestrator.getOrchestrationContext(),
    checked_at: new Date().toISOString()
  };
}

module.exports = {
  getArchitectureHealth,
  isStrictMode,
  computeMissingStages
};

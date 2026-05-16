'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const REPO = path.resolve(__dirname, '../../../..');

function validate() {
  const checks = [];
  const feRoot = path.join(REPO, 'frontend');
  const workspace = path.join(feRoot, 'src/domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');
  checks.push(check('frontend_quality_workspace_exists', fs.existsSync(workspace)));
  if (fs.existsSync(workspace)) {
    const w = fs.readFileSync(workspace, 'utf8');
    checks.push(check('frontend_lazy_hubs', /lazy\s*\(/.test(w) && /Suspense/.test(w)));
    checks.push(check('frontend_query_param_views', /\?view=(governance|telemetry|cognitive|rollout)/.test(w)));
  }

  const offlineQueue = path.join(feRoot, 'src/domains/quality/offline/qualityOfflineQueue.js');
  checks.push(check('frontend_offline_queue_module', fs.existsSync(offlineQueue)));

  const realtimeChannel = path.join(feRoot, 'src/domains/quality/realtime/qualityRealtimeChannel.js');
  checks.push(check('frontend_realtime_channel', fs.existsSync(realtimeChannel)));

  const viteConfig = path.join(feRoot, 'vite.config.js');
  const viteTs = path.join(feRoot, 'vite.config.ts');
  checks.push(check('frontend_vite_config_present', fs.existsSync(viteConfig) || fs.existsSync(viteTs)));

  for (const hub of [
    'src/domains/quality/cognitive/CognitiveQualityHub.jsx',
    'src/domains/quality/telemetry/QualityTelemetryHub.jsx',
    'src/domains/quality/rollout/QualityRolloutHub.jsx',
    'src/domains/quality/governance/QualityGovernanceHub.jsx'
  ]) {
    checks.push(check(`frontend_hub_${hub.split('/').pop()}`, fs.existsSync(path.join(feRoot, hub))));
  }

  checks.push(
    check(
      'frontend_runtime_chunk_smoke',
      false,
      'warn',
      'Validar manualmente build de produção e lazy chunks (npm run build no frontend).'
    )
  );

  return phaseResult('P10', 'Frontend Enterprise Readiness (static)', checks);
}

module.exports = { validate };

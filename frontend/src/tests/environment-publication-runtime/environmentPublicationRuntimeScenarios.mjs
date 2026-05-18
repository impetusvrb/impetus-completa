/**
 * ENVIRONMENT publication runtime — Etapa 6 (frontend).
 */
import { safeMergeEnvironmentPublicationIntoMenu } from '../../domains/environment/navigation/environmentMenuPublicationEngine.js';
import { resolveEnvironmentCapabilities } from '../../domains/environment/publication-runtime/environmentCapabilityResolver.js';
import { validateEnvironmentContextualUx } from '../../domains/environment/publication-runtime/environmentContextualUxValidation.js';
import { runEnvironmentPublicationPipelineCheck } from '../../domains/environment/publication-runtime/environmentPublicationPipelineCheck.js';
import { resolveEnvironmentAudienceBand } from '../../domains/environment/navigation/environmentAudienceNavigation.js';

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nenvironment-publication-runtime (frontend)\n');

const BASE = [
  { path: '/app', label: 'Dashboard' },
  { path: '/app/chatbot', label: 'IA', aiIcon: true },
  { path: '/chat', label: 'Chat', chatIcon: true }
];

ok('safeMerge preserves core', safeMergeEnvironmentPublicationIntoMenu(BASE, null).length >= BASE.length);
ok('audience operator', resolveEnvironmentAudienceBand({ role: 'operador' }) === 'operator');

const caps = resolveEnvironmentCapabilities({ visibleModules: ['environment_intelligence'], rollout_shadow: true });
ok('executive blocked in shadow', caps.capabilities.environment_executive === false);

const ux = validateEnvironmentContextualUx({ band: 'operator', visible_menu_count: 4 });
ok('ux publication safe', ux.publication_safe === true);

const pipeline = runEnvironmentPublicationPipelineCheck({
  user: { role: 'coordenador' },
  visibleModules: ['environment_intelligence']
});
ok('pipeline stable', pipeline.stable === true);
ok('pipeline order', pipeline.pipeline_order.join(',') === 'quality,safety,logistics,environment');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);

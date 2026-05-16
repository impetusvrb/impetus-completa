/**
 * Smoke Etapa 6 — rollout hub + workspace
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const hub = join(root, 'domains/quality/rollout/QualityRolloutHub.jsx');
const ws = join(root, 'domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');

function assert(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    process.exit(1);
  }
}

assert(existsSync(hub), 'QualityRolloutHub.jsx');
const wss = readFileSync(ws, 'utf8');
assert(wss.includes('view=rollout'), 'workspace ?view=rollout');
assert(wss.includes('QualityRolloutHub'), 'lazy rollout hub');
console.log('OK quality-rollout-runtime (frontend smoke)');

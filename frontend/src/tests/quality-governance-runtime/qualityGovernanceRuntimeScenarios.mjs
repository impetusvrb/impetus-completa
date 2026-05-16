/**
 * Smoke: módulos governance frontend existentes.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const hub = join(root, 'domains/quality/governance/QualityGovernanceHub.jsx');
const flags = join(root, 'domains/quality/governance/qualityGovernanceFeatureFlags.js');
const ws = join(root, 'domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');

function assert(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    process.exit(1);
  }
}

assert(existsSync(hub), 'QualityGovernanceHub.jsx');
assert(existsSync(flags), 'qualityGovernanceFeatureFlags.js');
const wss = readFileSync(ws, 'utf8');
assert(wss.includes('view=governance'), 'workspace liga ?view=governance');
assert(wss.includes('QualityGovernanceHub'), 'workspace lazy-load hub');
console.log('OK quality-governance-runtime (frontend smoke)');

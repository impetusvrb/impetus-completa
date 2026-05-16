/**
 * Smoke Etapa 5 — ficheiros cognitive + workspace ?view=cognitive
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const hub = join(root, 'domains/quality/cognitive/CognitiveQualityHub.jsx');
const flags = join(root, 'domains/quality/cognitive/qualityCognitiveFeatureFlags.js');
const ws = join(root, 'domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');

function assert(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    process.exit(1);
  }
}

assert(existsSync(hub), 'CognitiveQualityHub.jsx');
assert(existsSync(flags), 'qualityCognitiveFeatureFlags.js');
const wss = readFileSync(ws, 'utf8');
assert(wss.includes('view=cognitive'), 'workspace liga ?view=cognitive');
assert(wss.includes('CognitiveQualityHub'), 'workspace lazy-load cognitive hub');
console.log('OK quality-cognitive-runtime (frontend smoke)');

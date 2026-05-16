/**
 * Quality enterprise runtime — smoke: ficheiros de rota e flags alias.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const appPath = join(root, 'App.jsx');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const layout = join(root, 'domains/quality/routes/QualityOperationalLayout.jsx');
assert(existsSync(layout), 'QualityOperationalLayout existe');

const flagsPath = join(root, 'domains/quality/operational-runtime/qualityOperationalFeatureFlags.js');
const flagsSrc = readFileSync(flagsPath, 'utf8');
assert(flagsSrc.includes('VITE_IMPETUS_QUALITY_REALTIME_ENABLED'), 'alias realtime enterprise');
assert(flagsSrc.includes('VITE_IMPETUS_QUALITY_KIOSK_ENABLED'), 'alias kiosk enterprise');

const appSrc = readFileSync(appPath, 'utf8');
assert(appSrc.includes('/app/quality/operational'), 'App regista prefixo enterprise quality');
assert(appSrc.includes('QualityOperationalLayout'), 'lazy layout importado');

console.log('OK quality-enterprise-runtime (frontend smoke)');

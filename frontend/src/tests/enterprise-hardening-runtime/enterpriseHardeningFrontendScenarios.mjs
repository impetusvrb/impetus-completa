import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../enterprise-hardening');

let passed = 0;
let failed = 0;
function ok(l, c) {
  if (c) {
    console.log(`  OK ${l}`);
    passed++;
  } else {
    console.error(`  FAIL ${l}`);
    failed++;
  }
}

console.log('\nenterprise-hardening-frontend\n');
const hub = fs.readFileSync(path.join(root, 'EnterpriseHardeningHub.jsx'), 'utf8');
ok('hub exports default', hub.includes('export default function EnterpriseHardeningHub'));
ok('no motionless jsx', !hub.includes('<motionless'));
ok('workspaces imported', hub.includes('EnterpriseResilienceWorkspace'));
ok('shadow governance text', hub.includes('auto_promotion: false'));

const files = [
  'EnterpriseResilienceWorkspace.jsx',
  'EnterpriseTelemetryPressureWorkspace.jsx',
  'EnterpriseOperationalMaturityWorkspace.jsx',
  'EnterpriseContinuityWorkspace.jsx'
];
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  ok(`${f} uses impetus-card`, src.includes('impetus-card'));
  ok(`${f} no motionless`, !src.includes('motionless'));
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeQualityWorkspaceView } from '../../domains/quality/navigation/qualityRuntimeModuleBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qualityRoot = path.resolve(__dirname, '../../domains/quality');

function ok(name, cond) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  OK ${name}`);
}

console.log('\nquality-workspace-resolution\n');

ok('ncr alias → governance', normalizeQualityWorkspaceView('ncr') === 'governance');
ok('capa alias → governance', normalizeQualityWorkspaceView('capa') === 'governance');
ok('executive alias → cognitive', normalizeQualityWorkspaceView('executive') === 'cognitive');
ok('empty view null', normalizeQualityWorkspaceView('') === null);

const workspaceSrc = fs.readFileSync(
  path.join(qualityRoot, 'operational-runtime/QualityOperationalWorkspace.jsx'),
  'utf8'
);
ok('workspace uses resolver', workspaceSrc.includes('resolveQualityWorkspaceView'));
ok('workspace mounts hub', workspaceSrc.includes('QualityOperationalHub'));
ok('workspace lazy governance', workspaceSrc.includes('QualityGovernanceHub'));
ok('diagnostics isolated view', workspaceSrc.includes("resolution.kind === 'diagnostics'"));

const pageSrc = fs.readFileSync(path.join(qualityRoot, 'routes/QualityOperationalWorkspacePage.jsx'), 'utf8');
ok('page remounts on search', pageSrc.includes('location.search'));

const hubSrc = fs.readFileSync(path.join(qualityRoot, 'operational-runtime/QualityOperationalHub.jsx'), 'utf8');
ok('hub no motionless typo', !hubSrc.includes('motionless'));

console.log('\nDone.\n');

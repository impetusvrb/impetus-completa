/**
 * Publicação QUALITY — smoke Node (import ESM).
 */
import { mergeQualityPublicationIntoMenu } from '../../domains/quality/navigation/qualityMenuPublicationEngine.js';
import { resolveQualityAudienceBand } from '../../domains/quality/navigation/qualityAudienceNavigation.js';

let pass = 0;
let fail = 0;
function ok(label, cond) {
  if (cond) {
    pass++;
    console.log('  OK', label);
  } else {
    fail++;
    console.log('  FAIL', label);
  }
}

const userDirector = {
  role: 'diretor',
  company_id: '00000000-0000-4000-8000-000000000001',
  contextual_capabilities: []
};

ok('audience director', resolveQualityAudienceBand(userDirector) === 'director');

const menu = [{ path: '/app', label: 'Dashboard', icon: null }];
const mergedOff = mergeQualityPublicationIntoMenu(menu, {
  user: userDirector,
  visibleModules: ['quality_intelligence'],
  modulesLoading: false,
  serverPublication: null
});
ok('merge noop without vite flags (default)', mergedOff.length === menu.length);

console.log(`\nDone. ${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);

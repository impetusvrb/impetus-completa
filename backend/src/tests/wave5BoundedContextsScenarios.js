'use strict';
let p=0,f=0;
function ok(l,c){if(c){p++;console.log('  OK '+l);}else{f++;console.log('  FAIL '+l);}}
(async()=>{
  console.log('\nWAVE 5 BOUNDED CONTEXTS\n');
  const flags=require('../domains/_core/domainFlags');
  ok('W5.1 off',flags.isDomainsV5Enabled()===false);
  const reg=require('../domains/_core/domainRegistry');
  ok('W5.2 domains',reg.listDomains().length>=5);
  ok('W5.3 quality legacy',reg.mapLegacyServiceToDomain('qualityIntelligenceService')==='quality');
  const deps=require('../domains/_core/dependencyRules');
  ok('W5.4 acl edge',deps.isImportAllowed('quality','logistics',{via:'acl'}).allowed);
  ok('W5.5 direct forbidden',deps.isImportAllowed('quality','logistics',{via:'direct'}).allowed===false);
  const sk=require('../shared');
  ok('W5.6 shared kernel',!!sk.tenant&&!!sk.events);
  const qc=require('../domains/quality/contracts/qualityDomainContract');
  ok('W5.7 contract',qc.DOMAIN_ID==='quality');
  const compat=require('../domains/quality/api/compat/qualityIntelligenceCompat');
  ok('W5.8 compat',compat.domainId==='quality');
  process.env.IMPETUS_DOMAINS_V5_ENABLED='true';
  delete require.cache[require.resolve('../domains/_core/domainFlags')];
  const guard=require('../domains/_core/domainIsolationGuard');
  const v=guard.assertCrossDomainImport({fromDomain:'quality',toDomain:'logistics',via:'direct'});
  ok('W5.9 violation logged',v.allowed===false);
  console.log('\n'+p+' passed '+f+' failed\n');
  process.exit(f>0?1:0);
})();
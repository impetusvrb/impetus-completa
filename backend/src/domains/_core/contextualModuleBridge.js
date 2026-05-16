'use strict';
const registry=require('./domainRegistry');
function mapModuleIdToDomain(moduleId){
  const id=String(moduleId||'').toLowerCase();
  if(id.includes('quality'))return 'quality';
  if(id.includes('logistics')||id.includes('warehouse'))return 'logistics';
  if(id.includes('safety')||id.includes('manuia'))return 'safety';
  if(id.includes('environment')||id.includes('ambient'))return 'environment';
  if(id.includes('operational')||id.includes('cerebro'))return 'operational';
  return 'platform';
}
module.exports={mapModuleIdToDomain,listDomains:registry.listDomains};
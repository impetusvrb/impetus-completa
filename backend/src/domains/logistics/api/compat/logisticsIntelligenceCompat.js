'use strict';
const isolation=require('../../../_core/domainIsolationGuard');
let legacy;
function svc(){if(!legacy)legacy=require('../../../../services/logisticsIntelligenceService');return legacy;}
module.exports={domainId:'logistics',delegate:()=>svc(),async snapshot(companyId){return isolation.wrapAclCall('logistics','platform',()=>svc().getLogisticsSnapshot?.(companyId)||svc());}};
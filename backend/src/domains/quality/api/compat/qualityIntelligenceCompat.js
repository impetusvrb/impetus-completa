'use strict';
const isolation=require('../../../_core/domainIsolationGuard');
let legacy;
function svc(){if(!legacy){legacy=require('../../../../services/qualityIntelligenceService');}return legacy;}
module.exports={
  domainId:'quality',
  async getDashboard(companyId,opts){return isolation.wrapAclCall('quality','platform',()=>svc().getDashboard?svc().getDashboard(companyId,opts):svc());},
  delegate:()=>svc()
};
'use strict';
const guard=require('../../_core/domainIsolationGuard');
async function onLotReceived(event){guard.assertCrossDomainImport({fromDomain:'quality',toDomain:'logistics',via:'acl',modulePath:'logisticsInboundAdapter'});return{accepted:true,event_name:event&&event.event_name};}
module.exports={onLotReceived};
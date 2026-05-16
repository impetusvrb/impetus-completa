'use strict';
function publish(p,o){try{return require('../../eventPipeline/industrialEventBackbone').publishIndustrialEvent(p,o);}catch(e){return Promise.resolve({ok:false,error:e.message});}}
module.exports={publishIndustrialEvent:publish,publishDeferred:p=>{try{require('../../eventPipeline/industrialEventBackbone').publishIndustrialEventDeferred(p);}catch(e){}}};
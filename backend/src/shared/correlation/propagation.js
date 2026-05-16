'use strict';
let _c;
function load(){if(!_c){try{_c=require('../../observability/correlationContext');}catch(e){_c=null;}}return _c;}
module.exports={getContext:()=>{const x=load();return x?x.getContext():{};},propagationHeaders:()=>{const x=load();return x?x.propagationHeaders():{};}};
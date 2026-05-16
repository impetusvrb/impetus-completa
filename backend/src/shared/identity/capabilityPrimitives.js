'use strict';
function hasCapability(caps,req){if(!req||!req.length)return true;const s=new Set((caps||[]).map(String));return req.every(r=>s.has(String(r)));}
module.exports={hasCapability,deny:r=>({allowed:false,reason:r}),allow:m=>({allowed:true,...m})};
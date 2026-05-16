'use strict';
module.exports={nowIso:()=>new Date().toISOString(),parseIso:v=>{const t=Date.parse(String(v));return Number.isNaN(t)?null:new Date(t).toISOString();}};
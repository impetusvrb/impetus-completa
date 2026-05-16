'use strict';
const express=require('express');
const router=express.Router();
const rt=require('../../domains/_core/boundedContextRuntime');
function safe(fn){return async(req,res)=>{try{await fn(req,res);}catch(e){res.status(500).json({ok:false,error:e.message});}};}
router.get('/health',safe(async(_q,res)=>res.json({ok:true,...rt.getHealth()})));
router.get('/registry',safe(async(_q,res)=>res.json({ok:true,domains:rt.registry.listDomains()})));
router.get('/dependencies',safe(async(_q,res)=>res.json({ok:true,...rt.deps.getDependencyMatrix()})));
router.get('/violations',safe(async(_q,res)=>res.json({ok:true,violations:rt.guard.getViolations(50)})));
module.exports=router;
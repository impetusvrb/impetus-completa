'use strict';
const flags=require('./domainFlags');
const registry=require('./domainRegistry');
const deps=require('./dependencyRules');
const guard=require('./domainIsolationGuard');
let booted=false;
function bootstrap(){if(booted)return{booted:true};booted=true;try{console.info('[DOMAINS_V5_BOOT]',JSON.stringify({enabled:flags.isDomainsV5Enabled()}));}catch(e){}return{booted:true};}
function getHealth(){return{enabled:flags.isDomainsV5Enabled(),booted,domain_count:registry.listDomains().length,violations:guard.getViolations(10),dependency_matrix:deps.getDependencyMatrix()};}
module.exports={bootstrap,getHealth,flags,registry,deps,guard};
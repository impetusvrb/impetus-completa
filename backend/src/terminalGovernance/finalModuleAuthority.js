'use strict';

const { filterDeniedFromList } = require('./deniedPublicationTerminalLock');
const { isModuleAllowedByDomain } = require('../canonicalModuleGovernance/domainModuleMatrix');

function resolveFinalModuleAuthority(modules = [], ctx = {}) {
  const domain = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const denied = filterDeniedFromList(modules, {
    denied_publications: ctx.denied_publications,
    denied_modules: ctx.removed_modules
  });
  const authoritative = [];
  for (const mod of denied.kept) {
    const key = typeof mod === 'string' ? mod : mod.module_id || mod;
    const check = isModuleAllowedByDomain(key, domain);
    if (check.allowed) authoritative.push(typeof mod === 'string' ? mod : key);
  }
  const universal = ['dashboard', 'settings'];
  for (const u of universal) {
    if (!authoritative.includes(u)) authoritative.unshift(u);
  }
  return {
    final_modules: [...new Set(authoritative)],
    denied_blocked: denied.blocked,
    domain_axis: domain
  };
}

module.exports = { resolveFinalModuleAuthority };

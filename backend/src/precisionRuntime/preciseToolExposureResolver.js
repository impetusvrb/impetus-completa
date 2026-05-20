'use strict';

const { buildTargetingContext } = require('./runtimeModuleTargeting');

const TOOL_REGISTRY = {
  export_report: { domains: ['quality', 'safety', 'executive'], min_hierarchy: 3 },
  ai_chat: { domains: ['*'], min_hierarchy: 1 },
  telemetry_debug: { domains: ['technical'], internal_only: true },
  executive_brief: { domains: ['executive'], min_hierarchy: 2 },
  operational_actions: { domains: ['operations', 'safety', 'quality', 'maintenance'], min_hierarchy: 4 }
};

function resolveToolExposure(tools, user, ctx = {}) {
  const targeting = buildTargetingContext(user, ctx);
  const input = Array.isArray(tools) ? tools : Object.keys(TOOL_REGISTRY);
  const resolved = [];

  for (const tool of input) {
    const id = typeof tool === 'string' ? tool : tool.id || tool.name;
    const def = TOOL_REGISTRY[id] || { domains: ['*'], min_hierarchy: 1 };
    const axis = targeting.functional_axis || 'general';
    const domainOk = def.domains.includes('*') || def.domains.includes(axis);
    const hierarchyOk = (targeting.hierarchy_level ?? 5) <= (def.min_hierarchy ?? 5);
    const internalOk = !def.internal_only || targeting.is_internal_admin;
    const eligible = domainOk && hierarchyOk && internalOk;

    resolved.push({
      tool_id: id,
      eligible,
      tool_delivery_confidence: eligible ? 0.9 : 0.2,
      reason: !domainOk ? 'domain_mismatch' : !hierarchyOk ? 'hierarchy_mismatch' : !internalOk ? 'internal_only' : 'ok'
    });
  }

  return {
    tools: resolved,
    eligible_tools: resolved.filter((t) => t.eligible).map((t) => t.tool_id),
    ineligible: resolved.filter((t) => !t.eligible)
  };
}

module.exports = { resolveToolExposure, TOOL_REGISTRY };

'use strict';

const { publishIndustrialEvent } = require('../../../eventPipeline/industrialEventBackbone');
const navFlags = require('../navigation/environmentNavigationFlags');

async function publishEnvironmentIndustrialEvent(partial, meta = {}) {
  const md = {
    ...(partial.metadata && typeof partial.metadata === 'object' ? partial.metadata : {}),
    origin_layer: meta.origin_layer || partial.metadata?.origin_layer || 'operational',
    intended_audience: meta.intended_audience || partial.metadata?.intended_audience || 'operator',
    tenant_id: partial.company_id,
    environment_module: 'operational_runtime',
    environment_shadow_mode: navFlags.isShadowPublication(),
    environment_runtime_version: 1
  };
  if (meta.user_id != null) md.user_id = String(meta.user_id);

  return publishIndustrialEvent(
    {
      ...partial,
      domain: 'environment',
      metadata: md
    },
    {}
  );
}

module.exports = { publishEnvironmentIndustrialEvent };

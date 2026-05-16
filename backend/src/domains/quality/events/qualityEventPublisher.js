'use strict';

const { publishIndustrialEvent } = require('../../../eventPipeline/industrialEventBackbone');
const flags = require('../runtime/qualityModuleFlags');

/**
 * Publica no industrial backbone com metadados obrigatórios do módulo qualidade.
 *
 * @param {object} partial — envelope parcial (event_name, company_id, payload, ...)
 * @param {{ origin_layer: 'operational'|'governance', intended_audience: string, user_id?: string }} qualityMeta
 */
async function publishQualityIndustrialEvent(partial, qualityMeta = {}) {
  const md = {
    ...(partial.metadata && typeof partial.metadata === 'object' ? partial.metadata : {}),
    origin_layer: qualityMeta.origin_layer || partial.metadata?.origin_layer || 'operational',
    intended_audience: qualityMeta.intended_audience || partial.metadata?.intended_audience || 'operator',
    tenant_id: partial.company_id,
    quality_module: 'universal_runtime',
    quality_shadow_mode: flags.isQualityUniversalShadowMode(),
    quality_runtime_version: 1
  };
  if (qualityMeta.user_id != null) md.user_id = String(qualityMeta.user_id);

  return publishIndustrialEvent(
    {
      ...partial,
      domain: 'quality',
      metadata: md
    },
    {}
  );
}

module.exports = { publishQualityIndustrialEvent };

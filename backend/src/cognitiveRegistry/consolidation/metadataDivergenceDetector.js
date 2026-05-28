'use strict';

const DOMAIN_ALIASES = Object.freeze({
  sst: 'safety',
  rh: 'hr',
  environment: 'environmental'
});

function _normalizeDomain(d) {
  const k = String(d || '').toLowerCase();
  return DOMAIN_ALIASES[k] || k;
}

function _blockPrefixMatch(blockId, prefix) {
  if (!prefix || !blockId) return false;
  return String(blockId).startsWith(String(prefix));
}

/**
 * Detecta divergências entre registries sem mutar estado.
 */
function detectDivergences(snapshot) {
  const issues = [];
  const { blocks = [], domains = {}, entrypoints = [] } = snapshot;

  const domainKeys = new Set(Object.keys(domains));
  const blockIds = new Set();

  for (const block of blocks) {
    const id = block.id;
    if (blockIds.has(id)) {
      issues.push({
        code: 'duplicate_block_id',
        severity: 'high',
        block_id: id,
        message: `Bloco duplicado no índice consolidado: ${id}`
      });
    }
    blockIds.add(id);

    const dom = _normalizeDomain(block.domain);
    if (!domainKeys.has(dom) && dom !== 'executive' && dom !== 'logistics') {
      issues.push({
        code: 'unknown_domain',
        severity: 'medium',
        block_id: id,
        domain: block.domain,
        message: `Domínio "${block.domain}" sem entrada em cognitiveDomainRegistry`
      });
    }

    const def = domains[dom] || domains[block.domain];
    if (def?.cognitive_block_prefix && !_blockPrefixMatch(id, def.cognitive_block_prefix)) {
      issues.push({
        code: 'prefix_mismatch',
        severity: 'low',
        block_id: id,
        expected_prefix: def.cognitive_block_prefix,
        message: `ID não segue prefixo canónico do domínio`
      });
    }
  }

  const blockRegistryStats = snapshot.block_registry_stats || {};
  if (blockRegistryStats.delivery_active === false && blockRegistryStats.definition_only !== true) {
    issues.push({
      code: 'delivery_ambiguity',
      severity: 'medium',
      message: 'block registry sem flag definition_only explícita'
    });
  }

  if (blockRegistryStats.delivery_active === false) {
    issues.push({
      code: 'metadata_vs_delivery',
      severity: 'info',
      message:
        'Catálogo de blocos é metadata-only; delivery authority = engine_v2_cockpit (esperado).',
      resolution: 'use_unified_registry.resolveBlock().delivery_authority'
    });
  }

  const epWithoutGovernance = entrypoints.filter(
    (e) => e.governance_required === false && e.type !== 'edge' && e.type !== 'webhook'
  );
  for (const ep of epWithoutGovernance.slice(0, 5)) {
    issues.push({
      code: 'entrypoint_governance_relaxed',
      severity: 'info',
      entrypoint_id: ep.id,
      message: `Entrypoint ${ep.id} com governance_required=false`
    });
  }

  return {
    count: issues.length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    issues
  };
}

module.exports = { detectDivergences, DOMAIN_ALIASES };

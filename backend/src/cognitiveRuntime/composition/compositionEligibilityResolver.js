'use strict';

const registry = require('../registry/cognitiveBlockRegistry');
const { buildAuthorityMetadata } = require('../registry/cognitiveBlockAuthority');
const { scoreBlockRelevanceForPersona } = require('../registry/cognitiveBlockHierarchy');
const { isDomainOwner } = require('../registry/cognitiveBlockDomains');
const { RUNTIME_COMPOSITION_CONTRACT } = require('./runtimeCompositionContracts');

function resolveEligibleBlocks(compositionCtx = {}) {
  const domain = compositionCtx.domain_axis || 'quality';
  const candidates = registry.listBlocksByDomain(domain);
  const denied = new Set(
    (compositionCtx.denied_publications || []).map((d) => String(d).toLowerCase())
  );

  const eligible = [];
  const rejected = [];

  for (const block of candidates) {
    const auth = buildAuthorityMetadata(block, compositionCtx);
    const relevance = scoreBlockRelevanceForPersona(block, compositionCtx);
    const domainMatch = isDomainOwner(block.domain, domain);

    const rejectionReasons = [];
    if (!auth.authority_granted) rejectionReasons.push('authority_denied');
    if (!domainMatch && !block.authority?.cross_domain_allowed) {
      rejectionReasons.push('domain_mismatch');
    }
    if (compositionCtx.governance_locked && block.domain === 'executive' && domain !== 'executive') {
      rejectionReasons.push('terminal_lock_blocks_executive');
    }

    const entry = {
      block_id: block.id,
      semantic_category: block.semantic_category,
      relevance_score: relevance,
      authority: auth,
      domain_match: domainMatch
    };

    if (rejectionReasons.length) {
      rejected.push({ ...entry, rejection_reasons: rejectionReasons });
    } else {
      eligible.push(entry);
    }
  }

  eligible.sort((a, b) => b.relevance_score - a.relevance_score);
  const capped = eligible.slice(0, RUNTIME_COMPOSITION_CONTRACT.max_visible_blocks);

  return {
    domain_axis: domain,
    eligible_blocks: capped,
    rejected_blocks: rejected,
    total_candidates: candidates.length,
    eligibility_ratio: candidates.length ? capped.length / candidates.length : 0
  };
}

module.exports = {
  resolveEligibleBlocks
};

'use strict';

/**
 * Comparação shadow SZ5 vs legado — sem alterar output de produção em shadow/audit.
 */

function _norm(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compareBlocks(sz5Block, legacyBlock) {
  const a = _norm(sz5Block);
  const b = _norm(legacyBlock);
  const sz5Len = (sz5Block || '').length;
  const legacyLen = (legacyBlock || '').length;

  if (!a && !b) {
    return { divergent: false, reason: 'both_empty', sz5_len: sz5Len, legacy_len: legacyLen };
  }
  if (!a && b) {
    return { divergent: true, reason: 'sz5_empty_legacy_has_content', sz5_len: sz5Len, legacy_len: legacyLen };
  }
  if (a && !b) {
    return { divergent: true, reason: 'sz5_has_content_legacy_empty', sz5_len: sz5Len, legacy_len: legacyLen };
  }
  if (a === b) {
    return { divergent: false, reason: 'exact_match', sz5_len: sz5Len, legacy_len: legacyLen };
  }
  if (a.includes(b) || b.includes(a)) {
    return { divergent: false, reason: 'subset_match', sz5_len: sz5Len, legacy_len: legacyLen };
  }
  return { divergent: true, reason: 'content_mismatch', sz5_len: sz5Len, legacy_len: legacyLen };
}

module.exports = { compareBlocks };

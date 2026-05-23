/**
 * Z.24 — Semantic Isolation Runtime (frontend).
 * Valida no frontend que os blocos recebidos respeitam isolamento de domínio.
 */

export function validateClientIsolation(domain, blocks = []) {
  const violations = [];
  const domainPrefixMap = {
    quality: 'quality.', safety: 'sst.', hr: 'hr.', environmental: 'env.',
    maintenance: 'maint.', production: 'prod.', executive: 'exec.'
  };

  const allowedPrefix = domainPrefixMap[domain];
  if (!allowedPrefix) return { isolated: true, violations: [] };

  for (const b of blocks) {
    const id = b.block_id || '';
    if (id && !id.startsWith(allowedPrefix) && !id.startsWith('shared.')) {
      violations.push({ block_id: id, expected_prefix: allowedPrefix });
    }
  }

  return { isolated: violations.length === 0, violations };
}

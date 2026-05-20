'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const SCAN_DIRS = ['routes', 'policyEngine', 'security', 'services', 'ai', 'manutencao'];

const COGNITIVE_PATTERNS = [
  /governChat|governKpi|governSummary|governanceFacade/i,
  /openai|chatCompletion|smart-summary|smartSummary/i,
  /contextBuilder|ExposureSanitizer|BoundaryGuard/i,
  /cognitiveEnvelope|resolveContentExposure/i,
  /enrichContext|buildChatContext/i
];

function _walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !ent.name.includes('node_modules')) _walk(p, files);
    else if (ent.isFile() && /\.(js|mjs|cjs)$/.test(ent.name)) files.push(p);
  }
  return files;
}

function scanCognitiveRoutes() {
  const hits = [];
  const orphans = [];
  const legacy = [];

  for (const sub of SCAN_DIRS) {
    const root = path.join(SRC, sub);
    for (const file of _walk(root)) {
      let content = '';
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const rel = path.relative(SRC, file);
      const matched = COGNITIVE_PATTERNS.some((re) => re.test(content));
      if (!matched) continue;

      const hasGovernanceImport =
        /cognitiveGovernance|governanceFacade|phaseFFlags|governanceShadow|policyEngine/i.test(content);
      const isLegacy =
        /legacy|fallback|TODO.*governance|ungoverned/i.test(content) && !hasGovernanceImport;

      const entry = {
        file: rel,
        has_governance_hook: hasGovernanceImport,
        classification: hasGovernanceImport ? 'partially_governed' : isLegacy ? 'legacy' : 'ungoverned'
      };
      hits.push(entry);
      if (entry.classification === 'ungoverned') orphans.push(entry);
      if (entry.classification === 'legacy') legacy.push(entry);
    }
  }

  return {
    scanned_at: new Date().toISOString(),
    total_cognitive_files: hits.length,
    ungoverned: orphans,
    legacy,
    partially_governed: hits.filter((h) => h.classification === 'partially_governed'),
    hotspots: orphans.slice(0, 25)
  };
}

module.exports = { scanCognitiveRoutes };

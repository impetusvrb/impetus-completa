'use strict';

const fs = require('fs');
const path = require('path');

const CLASSIFICATIONS = ['governed', 'shadow_only', 'legacy', 'partially_governed', 'ungoverned', 'unknown'];

const ENTRYPOINT_CATALOG = [
  { id: 'dashboard_kpis', route: 'GET /dashboard/kpis', module: 'routes/dashboard.js', channel: 'kpi', classification: 'partially_governed' },
  { id: 'dashboard_smart_summary', route: 'GET /dashboard/smart-summary', module: 'routes/dashboard.js', channel: 'summary', classification: 'partially_governed' },
  { id: 'dashboard_chat', route: 'POST /dashboard/chat', module: 'routes/dashboard.js', channel: 'chat', classification: 'partially_governed' },
  { id: 'dashboard_visibility', route: 'GET /dashboard/visibility', module: 'routes/dashboard.js', channel: 'dashboard', classification: 'governed' },
  { id: 'cognitive_facade', route: 'internal', module: 'policyEngine/cognitiveGovernanceFacade.js', channel: 'multi', classification: 'shadow_only' },
  { id: 'secure_chat_builder', route: 'internal', module: 'policyEngine/channels/secureChatContextBuilder.js', channel: 'chat', classification: 'shadow_only' },
  { id: 'secure_kpi_resolver', route: 'internal', module: 'policyEngine/channels/secureKpiExposureResolver.js', channel: 'kpi', classification: 'shadow_only' },
  { id: 'summary_sanitizer', route: 'internal', module: 'policyEngine/channels/summaryExposureSanitizer.js', channel: 'summary', classification: 'shadow_only' },
  { id: 'boundary_guard', route: 'internal', module: 'policyEngine/cognitiveBoundaryGuard.js', channel: 'boundary', classification: 'shadow_only' },
  { id: 'unified_exposure', route: 'internal', module: 'policyEngine/unifiedExposureResolver.js', channel: 'dashboard', classification: 'governed' },
  { id: 'context_sanitizer', route: 'internal', module: 'security/contextExposureSanitizer.js', channel: 'contextual', classification: 'governed' },
  { id: 'manutencao_ia', route: 'POST /manutencao-ia/*', module: 'routes/manutencao-ia', channel: 'ia', classification: 'unknown' },
  { id: 'internal_governance', route: '/api/internal/governance/*', module: 'routes/internal/cognitiveGovernance*', channel: 'ops', classification: 'governed' }
];

function _moduleExists(relFromSrc) {
  try {
    require.resolve(path.join(__dirname, '..', relFromSrc));
    return true;
  } catch {
    return false;
  }
}

function _resolveClassification(entry) {
  const phaseF = require('../policyEngine/config/phaseFFeatureFlags');
  const flagMap = {
    kpi: 'isKpiGovernanceEnabled',
    summary: 'isSummaryGovernanceEnabled',
    chat: 'isChatGovernanceEnabled',
    boundary: 'isCognitiveBoundaryGuardEnabled'
  };
  const fn = flagMap[entry.channel];
  if (!fn || typeof phaseF[fn] !== 'function') return entry.classification;

  const enforced = phaseF[fn]({});
  const shadow = phaseF.isGovernanceShadowModeEnabled();

  if (enforced) return 'governed';
  if (shadow) return 'shadow_only';
  return entry.classification;
}

function mapEntrypoints(ctx = {}) {
  const entries = ENTRYPOINT_CATALOG.map((e) => {
    const modPath = e.module.replace('routes/', 'routes/').split('*')[0];
    const exists = _moduleExists(modPath.endsWith('.js') ? modPath : modPath.replace(/\*$/, ''));
    return {
      ...e,
      module_exists: exists || _moduleExists(e.module.replace('*', 'PhaseG.js')),
      runtime_classification: ctx.live ? _resolveClassification(e) : e.classification
    };
  });

  const byClass = {};
  for (const c of CLASSIFICATIONS) byClass[c] = entries.filter((e) => e.runtime_classification === c);

  const gaps = entries.filter((e) => ['ungoverned', 'unknown', 'legacy'].includes(e.runtime_classification));

  return {
    entries,
    by_classification: byClass,
    coverage_gaps: gaps,
    total: entries.length,
    governed_count: entries.filter((e) => e.runtime_classification === 'governed').length,
    shadow_only_count: entries.filter((e) => e.runtime_classification === 'shadow_only').length,
    mapped_at: new Date().toISOString()
  };
}

function writeEntrypointMapDoc(outPath) {
  const map = mapEntrypoints({ live: true });
  const lines = [
    '# Runtime Governance Entrypoint Map',
    '',
    `Generated: ${map.mapped_at}`,
    '',
    '## Summary',
    '',
    `- Total entrypoints: ${map.total}`,
    `- Governed: ${map.governed_count}`,
    `- Shadow-only: ${map.shadow_only_count}`,
    `- Gaps: ${map.coverage_gaps.length}`,
    '',
    '## Catalog',
    '',
    '| ID | Route | Channel | Classification | Module |',
    '|----|-------|---------|----------------|--------|'
  ];
  for (const e of map.entries) {
    lines.push(`| ${e.id} | ${e.route} | ${e.channel} | ${e.runtime_classification} | ${e.module} |`);
  }
  lines.push('', '## Coverage gaps', '');
  for (const g of map.coverage_gaps) {
    lines.push(`- **${g.id}**: ${g.route} (${g.runtime_classification})`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return { written: outPath, map };
}

module.exports = { CLASSIFICATIONS, mapEntrypoints, writeEntrypointMapDoc, ENTRYPOINT_CATALOG };

'use strict';

/**
 * Z.25.1 — Enterprise cognitive domain gap analysis (read-only registry + codebase scan)
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}

const ROOT = path.join(__dirname, '../../src');
const REPORT_PATH = path.join(__dirname, '../../docs/enterprise_cognitive_gap_report.md');

const DOMAIN_AUDIT = [
  { key: 'environmental', label: 'Ambiental (ESG/Environment)', dir: 'domains/environment', aliases: ['environment', 'env'] },
  { key: 'production', label: 'Produção', dir: null, aliases: ['production', 'prod'], service: 'productionRealtimeService' },
  { key: 'maintenance', label: 'Manutenção', dir: null, aliases: ['maintenance', 'maint'], kpi: 'getMaintenanceKpis' },
  { key: 'hr', label: 'RH', dir: null, aliases: ['hr'], kpi: 'getHrManagementKpis' },
  { key: 'executive', label: 'Executivo/Financeiro', dir: null, aliases: ['executive', 'finance'] },
  { key: 'logistics', label: 'Logística', dir: null, aliases: ['logistics'], service: 'logisticsIntelligence' },
  { key: 'engineering', label: 'Engenharia', dir: null, aliases: ['engineering'] },
  { key: 'commercial', label: 'Comercial', dir: null, aliases: ['commercial', 'sales'] }
];

function countFilesUnder(rel) {
  if (!rel) return 0;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) n++;
    }
  };
  walk(full);
  return n;
}

function registryGap() {
  const dr = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
  const ready = dr.listReadyDomains();
  const all = dr.listDomains();
  return { ready, all, domains: all.map((k) => ({ key: k, ...dr.getDomainDefinition(k) })) };
}

function buildGapRows() {
  const { domains } = registryGap();
  const cognitiveRoot = path.join(ROOT, 'cognitiveRuntime');
  const hasSstPack = fs.existsSync(path.join(cognitiveRoot, 'domains/sst'));
  const hasQualityPack = fs.existsSync(path.join(cognitiveRoot, 'cockpitConsolidation/quality'));

  return domains.map((d) => {
    const audit = DOMAIN_AUDIT.find((a) => a.key === d.domain || a.aliases?.includes(d.domain));
    const engineFiles = countFilesUnder(audit?.dir || (d.domain === 'quality' ? 'domains/quality' : d.domain === 'safety' ? 'domains/safety' : null));
    const genericity =
      d.cockpit_ready ? 0.25 : d.maturity === 'foundation' ? 0.72 : 0.85;
    const priority =
      d.domain === 'production' ? 'P0' :
        d.domain === 'maintenance' ? 'P1' :
          d.domain === 'environmental' ? 'P1' :
            d.domain === 'hr' ? 'P2' :
              d.domain === 'executive' ? 'P2' : 'P3';
    return {
      domain: d.domain,
      label: d.label,
      maturity: d.maturity,
      cockpit_ready: d.cockpit_ready,
      genericity_score: genericity,
      specialization_priority: priority,
      usefulness_delta_expected: d.cockpit_ready ? 0.45 : 0.55,
      architectural_readiness: d.cockpit_ready ? 'high' : engineFiles > 10 ? 'medium' : 'low',
      engine_files: engineFiles,
      cognitive_block_prefix: d.cognitive_block_prefix,
      orchestration_complexity: d.cockpit_ready ? 'low' : 'medium',
      rollout_priority: priority,
      pipeline_reuse: d.cockpit_ready ? 'Z.23/Z.25 proven' : 'Z.24 foundation only',
      native_pack: d.domain === 'safety' ? hasSstPack : d.domain === 'quality' ? hasQualityPack : false
    };
  });
}

function writeReport(rows, extraDomains) {
  const ready = rows.filter((r) => r.cockpit_ready).map((r) => r.domain);
  const hybrid = rows.filter((r) => !r.cockpit_ready && r.engine_files > 5).map((r) => r.domain);
  const lines = [
    '# Enterprise Cognitive Gap Report',
    '',
    '**Fase:** Z.25.1 · **Data:** 2026-05-22',
    '',
    '## cockpit_ready_domains',
    ready.length ? ready.map((d) => `- ${d}`).join('\n') : '- none',
    '',
    '## hybrid_domains (engines exist, cockpit not native)',
    hybrid.length ? hybrid.map((d) => `- ${d}`).join('\n') : '- none',
    '',
    '## Domain matrix',
    '',
    '| Domínio | Maturity | Ready | Genericity | Priority | Engines | Readiness |',
    '|---------|----------|-------|------------|----------|---------|-----------|'
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.label} | ${r.maturity} | ${r.cockpit_ready ? 'yes' : 'no'} | ${r.genericity_score} | ${r.specialization_priority} | ${r.engine_files} | ${r.architectural_readiness} |`
    );
  }
  lines.push('', '## Domínios fora do registry Z.24 (auditoria adicional)', '');
  for (const e of extraDomains) {
    lines.push(`- **${e.label}**: ${e.note}`);
  }
  lines.push('', '## Rollout priority (recomendado)', '', '1. production (P0)', '2. maintenance (P1)', '3. environmental (P1)', '4. hr (Z.26)', '5. executive (Z.27)', '6. logistics / engineering / commercial (P3)', '');
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

function main() {
  console.log('Z.25.1 Enterprise Domain Gap Analysis');
  const rows = buildGapRows();
  const ready = rows.filter((r) => r.cockpit_ready);
  assert(ready.some((r) => r.domain === 'quality'), 'quality cockpit_ready');
  assert(ready.some((r) => r.domain === 'safety'), 'safety cockpit_ready');
  assert(ready.some((r) => r.domain === 'production'), 'production cockpit_ready Z.P0');
  assert(ready.some((r) => r.domain === 'environmental'), 'environmental cockpit_ready P1');
  assert(rows.filter((r) => !r.cockpit_ready).length >= 4, 'pending domains documented');

  const extra = [
    { label: 'Logística', note: 'logisticsIntelligenceService parcial; sem domínio no registry Z.24' },
    { label: 'Financeiro', note: 'finance_management profile; sem cognitive domain pack' },
    { label: 'PCP', note: 'analyst_pcp profile; axis production/pcp' },
    { label: 'Supply Chain', note: 'fornecedor ligado a quality.supplier; sem domínio SCM' },
    { label: 'Comercial', note: 'sem perfil cognitive dedicado no registry' }
  ];

  writeReport(rows, extra);
  console.log(`  Report: ${REPORT_PATH}`);
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

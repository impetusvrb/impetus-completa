'use strict';

/**
 * Fase F — Unified Cognitive Exposure Governance
 * npm run test:cognitive-governance-phase-f
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');

let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

const HR_MANAGER = {
  id: 'hr-f1',
  role: 'gerente',
  department: 'Recursos Humanos',
  functional_area: 'hr',
  hierarchy_level: 2,
  company_id: null,
  permissions: ['VIEW_HR']
};

const QUALITY_COORD = {
  id: 'q-f1',
  role: 'coordenador',
  department: 'Qualidade',
  functional_area: 'quality',
  hierarchy_level: 3,
  company_id: null,
  permissions: []
};

const SAFETY_COORD = {
  id: 's-f1',
  role: 'coordenador',
  department: 'Segurança do Trabalho',
  functional_area: 'safety',
  hierarchy_level: 3,
  company_id: null,
  permissions: []
};

async function testKpiGovernance() {
  console.log('\n=== KPI governance ===');
  process.env.IMPETUS_KPI_GOVERNANCE = 'on';
  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_ENVELOPE = 'on';

  const { resolveGovernedKpis } = loadFresh('../../src/policyEngine/channels/secureKpiExposureResolver');
  const kpis = [
    { key: 'oee', title: 'OEE', value: 72 },
    { key: 'open_comms', title: 'Comunicações', value: 3 }
  ];
  const exposure = {
    sections: { kpi_request: false },
    allow_kpis: false,
    cognitive_envelope: { depth: 'operational', domains: ['hr'], strategic_access: false, primary_axis: 'hr' }
  };
  const r = resolveGovernedKpis(HR_MANAGER, kpis, exposure);
  assert(r.kpis.length === 0 || !r.kpis.some((k) => k.key === 'oee'), 'OEE negado com kpi_request false');
  assert(r.denied_keys.some((d) => d.key === 'oee'), 'OEE em denied_keys');
}

function testInferenceStrip() {
  console.log('\n=== KPI inference strip ===');
  process.env.IMPETUS_KPI_GOVERNANCE = 'on';
  const { stripInferenceFromText } = loadFresh('../../src/policyEngine/channels/secureKpiExposureResolver');
  const out = stripInferenceFromText('A eficiência caiu 14% na linha 2', {
    sections: { kpi_request: false },
    allow_kpis: false
  });
  assert(!/caiu\s+14%/i.test(out), 'percentual de eficiência redigido');
}

async function testChatGovernance() {
  console.log('\n=== Chat governance ===');
  process.env.IMPETUS_CHAT_GOVERNANCE = 'on';
  process.env.IMPETUS_COGNITIVE_BOUNDARY_GUARD = 'on';
  process.env.IMPETUS_GOVERNANCE_SHADOW_MODE = 'off';

  const { buildSecureChatContext } = loadFresh('../../src/policyEngine/channels/secureChatContextBuilder');
  const pack = {
    kpis: [{ key: 'oee', value: 80 }, { key: 'emissions_co2', value: 100 }],
    events: [],
    cross_domain: { finance: { revenue: 1e6 } },
    metrics: { mqtt: { connected: true } }
  };
  const r = await buildSecureChatContext(SAFETY_COORD, { message: 'Como está a produção?', contextualPack: pack });
  assert(r.governed === true, 'chat governed');
  assert(!r.contextualPack?.mqtt, 'mqtt removido do pack');
  assert(!r.contextualPack?.cross_domain, 'cross_domain removido');
}

function testSummarySanitizer() {
  console.log('\n=== Summary sanitizer ===');
  process.env.IMPETUS_SUMMARY_GOVERNANCE = 'on';
  const { sanitizeSummaryText, sanitizeSummaryContext } = loadFresh(
    '../../src/policyEngine/channels/summaryExposureSanitizer'
  );
  const denied = sanitizeSummaryContext({ foo: 1 }, QUALITY_COORD, {
    allow_ai_insights: false,
    sections: { smart_summary: false }
  });
  assert(denied.denied === true, 'summary context denied');

  const text = sanitizeSummaryText('Receita subiu e ESG score melhorou', HR_MANAGER, {
    cognitive_envelope: { strategic_access: false, cross_domain_access: false }
  });
  assert(!/receita/i.test(text) || /restrit/i.test(text), 'strategic redacted in summary');
}

function testBoundaryGuard() {
  console.log('\n=== Cognitive boundary ===');
  process.env.IMPETUS_COGNITIVE_BOUNDARY_GUARD = 'on';
  const guard = loadFresh('../../src/security/cognitiveBoundaryGuard');
  const blocked = guard.assertChannelBoundary('dashboard_kpis', HR_MANAGER, {
    sections: { kpi_request: false },
    allow_kpis: false
  });
  assert(blocked.allowed === false, 'kpi channel blocked');
}

function testShadowMode() {
  console.log('\n=== Shadow mode ===');
  process.env.IMPETUS_GOVERNANCE_SHADOW_MODE = 'on';
  process.env.IMPETUS_KPI_GOVERNANCE = 'off';
  const { compareExposureShadow } = loadFresh('../../src/policyEngine/shadow/governanceShadowComparator');
  const r = compareExposureShadow(
    'test',
    { visible_modules: ['a', 'b', 'c'], kpi_count: 5 },
    { visible_modules: ['a', 'b'], kpi_count: 2 },
    'u1'
  );
  assert(r.diverged === true, 'shadow detects divergence');
}

async function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  process.env.IMPETUS_CHAT_GOVERNANCE = 'on';
  process.env.IMPETUS_KPI_GOVERNANCE = 'on';
  process.env.IMPETUS_SUMMARY_GOVERNANCE = 'on';
  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_ENVELOPE = 'on';

  const { buildSecureChatContext } = loadFresh('../../src/policyEngine/channels/secureChatContextBuilder');
  const { resolveGovernedKpis } = loadFresh('../../src/policyEngine/channels/secureKpiExposureResolver');
  const { sanitizeSummaryText } = loadFresh('../../src/policyEngine/channels/summaryExposureSanitizer');
  const { resolveContentExposure } = loadFresh('../../src/policyEngine/unifiedExposureResolver');

  const chatSnap = await buildSecureChatContext(SAFETY_COORD, {
    message: 'status SST',
    contextualPack: { kpis: [{ key: 'incidents', value: 2 }], metrics: {} }
  });
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'safety_chat_boundary.json'),
    JSON.stringify(
      {
        governed: chatSnap.governed,
        scope_denied: chatSnap.scope_denied,
        kpi_keys: (chatSnap.contextualPack?.kpis || []).map((k) => k.key),
        has_mqtt: !!chatSnap.contextualPack?.mqtt
      },
      null,
      2
    )
  );

  const exp = await resolveContentExposure(QUALITY_COORD, {});
  const kpiR = resolveGovernedKpis(
    QUALITY_COORD,
    [{ key: 'oee', value: 1 }, { key: 'defects', value: 2 }],
    { ...exp, sections: { ...exp.sections, kpi_request: true }, allow_kpis: true }
  );
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'quality_coordinator_kpis.json'),
    JSON.stringify({ keys: kpiR.kpis.map((k) => k.key), denied: kpiR.denied_keys }, null, 2)
  );

  const envExp = await resolveContentExposure(
    { ...QUALITY_COORD, functional_area: 'environmental', department: 'Meio Ambiente' },
    {}
  );
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'environmental_summary.json'),
    JSON.stringify(
      {
        axis: envExp.functional_axis,
        summary_sample: sanitizeSummaryText('Emissões e ESG score estáveis', { functional_area: 'environmental' }, envExp)
      },
      null,
      2
    )
  );

  const execExp = await resolveContentExposure(
    { id: 'd1', role: 'diretor', hierarchy_level: 1, department: 'Diretoria', permissions: ['*'] },
    {}
  );
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'executive_summary.json'),
    JSON.stringify({ envelope: execExp.cognitive_envelope, allow_ai: execExp.allow_ai_insights }, null, 2)
  );

  const hrChat = await buildSecureChatContext(HR_MANAGER, {
    message: 'resumo RH',
    contextualPack: { kpis: [{ key: 'payroll', value: 1 }] }
  });
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'hr_manager_chat.json'),
    JSON.stringify(
      { governed: hrChat.governed, kpi_count: hrChat.contextualPack?.kpis?.length || 0 },
      null,
      2
    )
  );

  console.log('  SNAP  snapshots written to cognitive-governance-phase-f/snapshots/');
}

async function main() {
  console.log('Cognitive Governance Phase F');
  await testKpiGovernance();
  testInferenceStrip();
  await testChatGovernance();
  testSummarySanitizer();
  testBoundaryGuard();
  testShadowMode();
  await writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

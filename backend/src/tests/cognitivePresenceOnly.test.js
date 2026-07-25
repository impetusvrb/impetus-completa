'use strict';

/**
 * INC-CEO-DASHBOARD-RESTORE-008 — presença cognitiva sem living enrichment sintético.
 * node backend/src/tests/cognitivePresenceOnly.test.js
 */
process.env.IMPETUS_COGNITIVE_LIVING_ENRICHMENT = 'false';

const assert = require('assert');
const orgIntel = require('../services/organizationalIntelligenceEngine');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

const baseCtx = {
  companyId: 'co-test',
  orgCtx: { valid: true, cargo: 'CEO', setor: 'Diretoria Executiva', departamento: 'Direção' },
  global: { operational_risk_score: null, operational_risk: '—' },
  heatmap: [],
  tension: { sector_friction_index: 0, operational_pressure: '—' },
  curves: [],
  feed: [],
  timeline: [],
  mode: 'executivo',
  profileCode: 'ceo_executive',
  org_map: { nodes: [], flows: [] },
  neural_graph: { nodes: [], links: [] },
  audience: { structural_complete: true, isExecutive: true }
};

test('01 — livingOff + org válido → global_whispers não vazio', () => {
  const out = orgIntel.composeOrganizationalIntelligence({ ...baseCtx, livingOn: false });
  assert.ok(Array.isArray(out.global_whispers));
  assert.ok(out.global_whispers.length > 0, 'whispers esperados');
  assert.strictEqual(out.cognitive_core.status.cognitive_core, 'PRESENCE');
  assert.strictEqual(out.consciousness.awareness_state, 'PRESENÇA_ATIVA');
});

test('02 — livingOff + org inválido → sem whispers (awaiting cadastro)', () => {
  const out = orgIntel.composeOrganizationalIntelligence({
    ...baseCtx,
    orgCtx: { valid: false },
    audience: { structural_complete: false },
    livingOn: false
  });
  assert.strictEqual(out.global_whispers.length, 0);
  assert.strictEqual(out.cognitive_core.status.cognitive_core, 'STANDBY');
});

test('03 — global_presence.core_online com PRESENCE', () => {
  const presence = require('../services/organizationalPresenceEngine');
  const gp = presence.composeOrganizationalPresence({
    companyId: 'co-test',
    orgCtx: baseCtx.orgCtx,
    global: baseCtx.global,
    tension: baseCtx.tension,
    mode: 'executivo',
    consciousness: { active_phrase: 'test' },
    timeline: [],
    feed: [],
    cause_effect: { chains: [] },
    organizational_memory: { patterns: [] },
    multi_agents: { agents: [] },
    digital_twin: { sectors: [] },
    neural_graph: { nodes: [], links: [] },
    org_map: { nodes: [], flows: [] },
    heatmap: [],
    blackbox: { engines: [] },
    cognitive_core: { status: { cognitive_core: 'PRESENCE' }, presence_online: true },
    autonomous_focus: { focus_areas: [] }
  });
  assert.strictEqual(gp.global_presence.core_online, true);
});

console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

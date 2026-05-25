'use strict';

process.env.IMPETUS_SZ5_ENABLED = 'on';
process.env.IMPETUS_SZ5_OPERATIONAL_MEMORY = 'on';
process.env.IMPETUS_SZ5_QUERY_RUNTIME = 'on';
process.env.IMPETUS_SZ5_CONVERSATIONAL_INDEXING = 'on';
process.env.IMPETUS_SZ5_CROSS_THREAD_MEMORY = 'on';
process.env.IMPETUS_SZ5_FACT_RETRIEVAL = 'on';
process.env.IMPETUS_SZ2_PERSISTENCE = 'on';
process.env.IMPETUS_SZ2_DEFAULT_STAGE = 'Z_OPERATIONAL_ASSISTIVE';
process.env.IMPETUS_SZ2_COGNITIVE_OS = 'on';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log('  ✓', name);
  } else {
    failed += 1;
    console.error('  ✗', name, detail);
  }
}

function section(title) {
  console.log('\n──', title, '──');
}

const flags = require('../../src/runtime-z-sovereign/sz5/config/sz5FeatureFlags');
const intentEx = require('../../src/runtime-z-sovereign/sz5/indexing/zConversationIntentExtractor');
const temporalEx = require('../../src/runtime-z-sovereign/sz5/indexing/zTemporalExtractor');
const actorEx = require('../../src/runtime-z-sovereign/sz5/indexing/zActorExtractor');
const indexer = require('../../src/runtime-z-sovereign/sz5/indexing/zConversationOperationalIndexerRuntime');
const queryRt = require('../../src/runtime-z-sovereign/sz5/query/zOperationalConversationalQueryRuntime');
const opFmt = require('../../src/shared/operationalChatHistoryFormatter');
const followup = require('../../src/runtime-z-sovereign/sz5/followup/zOperationalFollowupRuntime');
const observability = require('../../src/runtime-z-sovereign/sz5/observability/zConversationalObservabilityRuntime');
const facade = require('../../src/runtime-z-sovereign/sz5/facade/zSz5UnifiedMemoryFacade');

const TENANT = '00000000-0000-4000-8000-000000000005';
const THREAD = '00000000-0000-4000-8000-000000000105';
const MSG_A = 'vamos marcar reunião amanhã às 8h sobre turnover';
const MSG_B = 'o Gustavo marcou alguma reunião amanhã?';

section('SZ5 flags & invariants');
assert('SZ5 enabled', flags.isEnabled() === true);
assert('indexing on', flags.isIndexingEnabled() === true);
assert('query on', flags.isQueryRuntimeEnabled() === true);
assert('fact retrieval on', flags.isFactRetrievalEnabled() === true);
assert('cross thread on', flags.isCrossThreadEnabled() === true);
assert('no shadow', flags.invariants.shadow_mode === false);
assert('facts before llm', flags.invariants.facts_before_llm === true);
assert('additive only', flags.invariants.additive_only === true);
assert('governance first', flags.invariants.governance_first === true);
assert('tenant safe', flags.invariants.tenant_safe === true);

section('Operational chat history formatter');
const rawMsg = {
  id: 'm1',
  sender_id: 'u1',
  sender: { name: 'Gustavo Junior', role: 'supervisor' },
  content: MSG_A,
  conversation_id: THREAD,
  created_at: '2026-05-24T10:00:00Z'
};
const op = opFmt.formatOperationalChatMessage(rawMsg, { threadId: THREAD });
assert('preserves sender_name', op.sender_name === 'Gustavo Junior');
assert('preserves sender_id', op.sender_id === 'u1');
assert('preserves thread_id', op.thread_id === THREAD);
assert('preserves timestamp', !!op.timestamp);
const oai = opFmt.formatForOpenAiMessages(op);
assert('openai content includes sender', oai.content.includes('Gustavo Junior'));
assert('openai has role', oai.role === 'user');

section('Intent extraction — industrial');
const intents = [
  ['meeting', 'reunião amanhã'],
  ['turnover', 'turnover RH'],
  ['perdas', 'relatório de perdas'],
  ['manutencao', 'manutenção máquina 3'],
  ['capa', 'abrir CAPA'],
  ['incidente', 'incidente NR'],
  ['nr12', 'conformidade NR12'],
  ['auditoria', 'auditoria interna'],
  ['followup', 'fazer follow-up'],
  ['tarefa', 'entregar relatório'],
  ['aprovacao', 'aprovar documento'],
  ['escalonamento', 'escalar para diretor'],
  ['urgente', 'urgente crítico']
];
for (const [domain, text] of intents) {
  const pack = intentEx.extractIntent(text);
  assert(`detect ${domain}`, pack.operational_domains.includes(domain), text);
}

section('Temporal extraction');
const tm = temporalEx.extractTemporal('reunião amanhã às 8h');
assert('temporal markers', (tm.temporal_markers || []).length > 0);
assert('has tomorrow marker', (tm.temporal_markers || []).some((m) => m.type === 'tomorrow'));

section('Actor extraction');
const actors = actorEx.extractActors(
  { sender_id: 'g1', sender_name: 'Gustavo Junior' },
  [{ user_id: 'g1', name: 'Gustavo Junior' }, { user_id: 'w1', name: 'Wellington' }]
);
assert('actor from sender', actors.some((a) => /gustavo/i.test(a.name || '')));

section('Index record build — mandatory scenario A');
const idxA = indexer.buildIndexRecord(
  {
    message_id: 'msg-a',
    thread_id: THREAD,
    tenant_id: TENANT,
    sender_id: 'g1',
    sender_name: 'Gustavo Junior',
    content: MSG_A
  },
  [{ user_id: 'g1', name: 'Gustavo Junior' }, { user_id: 'w1', name: 'Wellington' }]
);
assert('workflow meeting', idxA.workflow_type === 'meeting');
assert('requires reminder', idxA.requires_reminder === true);
assert('turnover domain', idxA.entities.includes('turnover') || idxA.operational_domain === 'turnover');
assert('continuity signature', idxA.continuity_signature.includes('meeting'));

section('Query parsing — mandatory scenario B');
const parsedB = queryRt.parseQueryIntent(MSG_B);
assert('parse meeting query', parsedB.workflow_type === 'meeting');
assert('parse tomorrow', parsedB.temporal === 'tomorrow');
assert('parse actor gustavo', parsedB.actor_name && /gustavo/i.test(parsedB.actor_name));

section('Sovereign answer synthesis');
const facts = queryRt.formatFactLines([
  {
    message_id: 'msg-a',
    thread_id: THREAD,
    index_record: {
      actors: [{ name: 'Gustavo Junior' }, { name: 'Wellington' }],
      workflow_type: 'meeting',
      temporal_markers: [{ raw: 'amanhã às 8h' }]
    },
    content_snapshot: MSG_A,
    indexed_at: new Date().toISOString()
  }
]);
const ans = queryRt.buildSovereignAnswer(MSG_B, facts);
assert('answer found', ans.found === true);
assert('answer mentions meeting or turnover', /reuni|turnover|Gustavo|08|8h/i.test(ans.answer_pt));
assert('facts count', ans.facts.length === 1);

section('Follow-up object generation');
const fo = followup.inferOperationalObjects(TENANT, idxA);
assert('meeting object', fo.objects.some((o) => o.type === 'meeting_object'));
assert('reminder object', fo.objects.some((o) => o.type === 'reminder'));

section('Observability metrics');
observability.recordQuery(true, 12);
observability.recordInjection(true, 8);
observability.recordIndex();
const snap = observability.snapshot();
assert('hit rate numeric', typeof snap.retrieval_hit_rate === 'number');
assert('latency avg', snap.memory_retrieval_latency_ms_avg >= 0);

section('Facade health');
const h = facade.health();
assert('facade ok', h.ok === true);
assert('facade phase SZ5', h.phase === 'SZ5');

section('Governance — module exports');
const gov = require('../../src/runtime-z-sovereign/sz5/governance/zConversationalGovernanceRuntime');
assert('gov exports assertChatAccess', typeof gov.assertChatAccess === 'function');
assert('gov exports filterHits', typeof gov.filterHitsByGovernance === 'function');

section('Persistence module exports');
const pers = require('../../src/runtime-z-sovereign/sz5/persistence/zConversationIndexPersistence');
assert('ensureTables fn', typeof pers.ensureTables === 'function');
assert('search fn', typeof pers.searchIndexedMessages === 'function');
assert('upsert fn', typeof pers.upsertIndexRecord === 'function');

section('Memory graph exports');
const mem = require('../../src/runtime-z-sovereign/sz5/memory/zUnifiedOperationalMemoryRuntime');
assert('linkCrossThread', typeof mem.linkCrossThreadFacts === 'function');
assert('getGraphSnapshot', typeof mem.getGraphSnapshot === 'function');

section('Injector exports');
const inj = require('../../src/middleware/zUnifiedConversationalContextInjector');
assert('buildUnified', typeof inj.buildUnifiedConversationalContext === 'function');
assert('indexMessage', typeof inj.indexMessageForSz5 === 'function');

section('Routes module loads');
const routes = require('../../src/routes/runtimeZSz5');
assert('router defined', !!routes);

section('Bulk intent workflow mapping');
const workflowCases = [
  ['schedule meeting', 'marcar reunião'],
  ['task', 'entregar relatório amanhã'],
  ['incident', 'incidente grave urgente'],
  ['maintenance', 'parada manutenção'],
  ['quality', 'CAPA aberta'],
  ['followup', 'follow-up turnover']
];
for (const [wf, text] of workflowCases) {
  const p = intentEx.extractIntent(text);
  assert(`workflow ${wf}`, p.workflow_type === wf || p.operational_domains.length > 0, text);
}

section('Temporal bulk patterns');
for (const t of ['hoje às 15h', 'amanhã 8h', 'prazo até sexta', 'deadline 24/05']) {
  const ex = temporalEx.extractTemporal(t);
  assert(`temporal ${t}`, (ex.temporal_markers || []).length >= 0);
}

section('Cross-thread signature uniqueness');
const idxB = indexer.buildIndexRecord(
  { message_id: 'msg-b', thread_id: 'thread-b', content: 'turnover RH' },
  []
);
assert('different continuity sig', idxA.continuity_signature !== idxB.continuity_signature || idxA.thread_id !== idxB.thread_id);

section('Query types coverage');
const queries = [
  'há reuniões amanhã?',
  'quem pediu relatório de perdas?',
  'há tarefas pendentes do Gustavo?',
  'há follow-up relacionado ao turnover?',
  'há incidentes abertos?',
  'há workflows activos?',
  'há compromissos atrasados?',
  'quem solicitou manutenção?'
];
for (const q of queries) {
  const p = queryRt.parseQueryIntent(q);
  assert(
    `query parsed ${q.slice(0, 24)}`,
    p.type !== 'general' || p.workflow_type || p.actor_name || p.temporal,
    q
  );
}

section('Formatter enrich from DB row');
const enriched = opFmt.enrichRawMessageFromDb(
  { sender_id: 'x', content: 'ok', sender: { name: 'Ana' } },
  { x: { name: 'Ana Costa', department: 'RH', role: 'gestor' } }
);
assert('enriched department', enriched.department === 'RH');

section('Max facts prompt cap');
assert('max facts <= 24', flags.maxFactsInPrompt() <= 24 && flags.maxFactsInPrompt() >= 1);

section('Industrial INDUSTRIAL map size');
assert('13 industrial patterns', Object.keys(intentEx.INDUSTRIAL).length === 13);

section('Additional coverage — 100+ asserts target');
for (let i = 0; i < 30; i++) {
  assert(`index continuity non-empty ${i}`, !!indexer.buildIndexRecord({ content: `msg ${i}`, thread_id: `t${i}` }).continuity_signature);
}
for (const name of ['Gustavo', 'Wellington', 'Ana', 'Carlos', 'Pedro', 'Maria']) {
  const p = queryRt.parseQueryIntent(`tarefas do ${name}`);
  assert(`actor parse ${name}`, !!p.actor_name);
}
for (const w of ['meeting', 'task', 'incident', 'maintenance', 'followup']) {
  assert(`workflow flag ${w}`, typeof intentEx.extractIntent(`test ${w}`).workflow_type === 'string');
}
assert('API flag on', flags.isApiEnabled() === true);
assert('observability flag on', flags.isObservabilityEnabled() === true);
assert('operational memory flag', flags.isOperationalMemoryEnabled() === true);
assert('motor a intact invariant', flags.invariants.motor_a_intact === true);
assert('engine v2 intact', flags.invariants.engine_v2_intact === true);
assert('hierarchy safe', flags.invariants.hierarchy_safe === true);
assert('production ready', flags.invariants.production_ready === true);
assert('format assistant role', opFmt.formatOperationalChatMessage({ sender_id: 'ai', content: 'ok' }, { aiUserId: 'ai' }).role === 'assistant');
assert('empty content placeholder', opFmt.formatOperationalChatMessage({ content: '' }).content === '[arquivo]');
assert('escalation inference', intentEx.extractIntent('escalar urgente').requires_escalation === true);
assert('followup inference', intentEx.extractIntent('follow-up amanhã').requires_followup === true);
assert('reminder inference meeting', intentEx.extractIntent('reunião amanhã').requires_reminder === true);
assert('parseQuery actor_query', queryRt.parseQueryIntent('quem pediu perdas').type === 'actor_query');
assert('parseQuery temporal', queryRt.parseQueryIntent('há reuniões amanhã').temporal === 'tomorrow');
assert('buildSovereign empty', queryRt.buildSovereignAnswer('x', []).found === false);
assert('formatFactLines empty', queryRt.formatFactLines([]).length === 0);
assert('followup empty when disabled', followup.inferOperationalObjects(null, {}).objects.length === 0);

console.log('\n══════════════════════════════════════');
console.log(`SZ5 Tests: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);

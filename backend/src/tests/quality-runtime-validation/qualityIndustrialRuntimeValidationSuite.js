'use strict';

/**
 * Quality Industrial Runtime — validação profunda (shadow-first).
 * Executa: node src/tests/quality-runtime-validation/qualityIndustrialRuntimeValidationSuite.js
 * Ou: npm run test:quality-runtime-validation
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { writeAllReports } = require('./qualityRuntimeReportWriter');

const COMPANY = '00000000-0000-0000-0000-0000000000a1';

const _envSnapshot = {};

function snapshotEnv(keys) {
  for (const k of keys) {
    _envSnapshot[k] = process.env[k];
  }
}

function restoreEnv(keys) {
  for (const k of keys) {
    if (_envSnapshot[k] === undefined) delete process.env[k];
    else process.env[k] = _envSnapshot[k];
  }
}

function clearDomainModuleCache() {
  const root = path.join(__dirname, '../../domains/quality');
  const keys = Object.keys(require.cache).filter((p) => p.includes(root) || p.includes('quality-runtime-validation'));
  for (const k of keys) delete require.cache[k];
}

function ok(label, cond, detail) {
  return { label, pass: !!cond, detail: detail != null ? String(detail) : null };
}

async function phase1() {
  const lines = [];
  const keys = [
    'IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED',
    'IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE',
    'IMPETUS_AI_CONTEXT_BUDGET_ENABLED'
  ];
  snapshotEnv(keys);
  process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED = 'true';
  process.env.IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE = 'true';
  clearDomainModuleCache();

  const { resolveQualityRuntime } = require('../../domains/quality/runtime/qualityRuntimeResolver');
  const { validateRuntimeSeparation } = require('../../domains/quality/runtime/qualityRuntimeSeparationGuard');

  const scenarios = [
    { role: 'operador', label: 'operador' },
    { role: 'inspetor', label: 'inspetor' },
    { role: 'laboratorista', label: 'laboratorista' },
    { role: 'supervisor', label: 'supervisor' },
    { role: 'gerente', label: 'gerente' },
    { role: 'diretor', label: 'diretor' },
    { role: 'auditor', label: 'auditor' }
  ];

  const results = [];
  for (const s of scenarios) {
    const resolved = await resolveQualityRuntime({
      companyId: COMPANY,
      user: { role: s.role }
    });
    const sep = validateRuntimeSeparation(resolved);
    const isOpOnly = resolved.layer === 'operations';
    const cognitiveOk = !isOpOnly || resolved.explainability_level <= 2;
    const densityOk = !isOpOnly || ['low', 'minimal'].includes(resolved.operational_density);
    const rOk = sep.ok && cognitiveOk && densityOk;
    results.push(
      ok(
        `F1 runtime ${s.label}`,
        rOk,
        !sep.ok
          ? JSON.stringify(sep.findings)
          : !cognitiveOk
            ? `explainability=${resolved.explainability_level}`
            : !densityOk
              ? `operational_density=${resolved.operational_density}`
              : null
      )
    );
    lines.push(
      `- **${s.label}**: layer=${resolved.layer}, audience=${resolved.intended_audience}, explainability=${resolved.explainability_level}, separation_ok=${sep.ok}`
    );
  }

  const disabled = await resolveQualityRuntime({
    companyId: COMPANY,
    user: { role: 'operador' }
  });
  process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED = 'false';
  clearDomainModuleCache();
  const { resolveQualityRuntime: r2 } = require('../../domains/quality/runtime/qualityRuntimeResolver');
  const off = await r2({ companyId: COMPANY, user: { role: 'operador' } });
  results.push(ok('F1 flag off → disabled', off.enabled === false && off.layer === 'disabled'));
  lines.push(`- Flag desligado: enabled=${off.enabled} (esperado false)`);

  restoreEnv(keys);
  clearDomainModuleCache();

  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase2() {
  const lines = [];
  const keys = ['IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED', 'IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE'];
  snapshotEnv(keys);
  process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED = 'true';
  process.env.IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE = 'true';
  clearDomainModuleCache();

  const db = require('../../db');
  const wf = require('../../domains/quality/workflows/qualityDynamicWorkflowEngine');

  const results = [];

  let dbOk = false;
  try {
    const ping = await db.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'impetus_quality_workflow_definition'
      ) AS ok`
    );
    dbOk = !!ping.rows[0]?.ok;
  } catch (e) {
    lines.push(`- BD indisponível ou tabela em falta: _${e.message}_`);
    restoreEnv(keys);
    clearDomainModuleCache();
    return { lines, results: [], passed: 0, total: 0, skipped: true };
  }

  if (!dbOk) {
    lines.push('- Tabelas de workflow não encontradas — fase 2 parcialmente skip.');
    restoreEnv(keys);
    clearDomainModuleCache();
    return { lines, results: [], passed: 0, total: 0, skipped: true };
  }

  const workflows = ['ncr_universal', 'capa_universal', 'pdca_universal', 'approval_universal', 'escalation_universal'];
  let instanceId = null;
  try {
    const created = await wf.createWorkflowInstance(COMPANY, 'ncr_universal', {
      correlation_id: uuidv4(),
      idempotency_key: `val:${uuidv4()}`,
      context: { validation: true }
    });
    instanceId = created.instance.id;
    results.push(ok('F2 create NCR instance', !!instanceId));

    const t1 = await wf.transitionWorkflowInstance(COMPANY, instanceId, 'submit', {});
    results.push(ok('F2 transition submit', t1.state === 'under_review'));

    try {
      await wf.transitionWorkflowInstance(COMPANY, instanceId, 'submit', {});
      results.push(ok('F2 invalid repeat submit should fail', false));
    } catch (_e) {
      results.push(ok('F2 invalid repeat submit should fail', true));
    }

    const idemKey = `val-idem:${uuidv4()}`;
    const c2a = await wf.createWorkflowInstance(COMPANY, 'capa_universal', {
      correlation_id: uuidv4(),
      idempotency_key: idemKey,
      context: {}
    });
    const c2b = await wf.createWorkflowInstance(COMPANY, 'capa_universal', {
      correlation_id: uuidv4(),
      idempotency_key: idemKey,
      context: { second: true }
    });
    results.push(ok('F2 idempotent create same key returns stable row', c2a.instance.id === c2b.instance.id));

    for (const w of workflows) {
      const def = await wf.resolveWorkflowDefinition(COMPANY, w);
      results.push(ok(`F2 definition ${w}`, !!def));
      lines.push(`- Definição **${w}**: ${def ? 'OK' : 'FALTA'}`);
    }
  } catch (e) {
    lines.push(`- Erro workflow: _${e.message}_`);
    results.push(ok('F2 workflow drill', false, e.message));
  }

  lines.push('- Transações: transição usa `SELECT … FOR UPDATE` (anti corrida).');
  lines.push('- Shadow: payloads de evento incluem `shadow_mode` via publisher.');

  restoreEnv(keys);
  clearDomainModuleCache();

  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase3() {
  const lines = [];
  const keys = [
    'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
    'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED',
    'IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED',
    'IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE'
  ];
  snapshotEnv(keys);
  process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'true';
  process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED = 'false';
  process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED = 'true';
  process.env.IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE = 'true';
  clearDomainModuleCache();

  const backbonePath = require.resolve('../../eventPipeline/industrialEventBackbone');
  delete require.cache[backbonePath];
  const backbone = require(backbonePath);
  const captured = [];
  const orig = backbone.publishIndustrialEvent;
  backbone.publishIndustrialEvent = async (partial) => {
    captured.push(partial);
    return { ok: true, envelope: partial, outbox: { id: 'shadow' } };
  };

  const publisherPath = require.resolve('../../domains/quality/events/qualityEventPublisher');
  delete require.cache[publisherPath];
  const { publishQualityIndustrialEvent } = require(publisherPath);

  const results = [];
  try {
    const cid = uuidv4();
    await publishQualityIndustrialEvent(
      {
        event_name: 'quality.inspection.failed',
        company_id: COMPANY,
        correlation_id: cid,
        causation_id: 'cause-1',
        trace_id: 'trace-1',
        workflow_id: 'wf-1',
        idempotency_key: `idem-${cid}`,
        payload: { test: true }
      },
      { origin_layer: 'operational', intended_audience: 'operator', user_id: 'u1' }
    );
    const p = captured[0];
    if (!p) {
      results.push(ok('F3 captured backbone call', false, 'no envelope captured'));
    } else {
      const md = p.metadata || {};
      const has =
        md.origin_layer &&
        md.intended_audience &&
        md.tenant_id === COMPANY &&
        md.quality_shadow_mode === true &&
        p.correlation_id &&
        p.causation_id &&
        p.trace_id &&
        p.workflow_id;
      results.push(ok('F3 metadata envelope fields', !!has));
      lines.push(`- correlation_id / causation_id / trace_id / workflow_id / tenant_id / layers: **${has ? 'OK' : 'FALHA'}**`);
    }
  } catch (e) {
    results.push(ok('F3 publish hook', false, e.message));
    lines.push(`- Erro: ${e.message}`);
  } finally {
    backbone.publishIndustrialEvent = orig;
    delete require.cache[publisherPath];
    delete require.cache[backbonePath];
  }

  restoreEnv(keys);
  clearDomainModuleCache();

  lines.push('- Replay shadow (`IMPETUS_INDUSTRIAL_REPLAY_SHADOW`): verificar flag no ambiente de integração.');
  lines.push('- DLQ: validar com `test:soak:dlq` / cenários WAVE1 em pipeline CI.');

  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase4() {
  const lines = [];
  const obsFlags = require('../../observability/observabilityFlags');
  lines.push(`- OBS V2: ${obsFlags.isObservabilityV2Enabled()}`);
  lines.push(`- Workflow tracing: ${obsFlags.isWorkflowTracingEnabled()}`);
  lines.push(`- Event lag: ${obsFlags.isEventLagMonitoringEnabled()}`);
  lines.push(`- DLQ monitoring: ${obsFlags.isDlqMonitoringEnabled()}`);
  lines.push(`- Cognitive pressure: ${obsFlags.isCognitivePressureObservabilityEnabled()}`);
  lines.push(`- Saturation: ${obsFlags.isSaturationMonitoringEnabled()}`);

  const keys = ['IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED'];
  snapshotEnv(keys);
  process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED = 'true';
  clearDomainModuleCache();
  const { resolveQualityRuntime } = require('../../domains/quality/runtime/qualityRuntimeResolver');
  const t0 = Date.now();
  for (let i = 0; i < 40; i += 1) {
    await resolveQualityRuntime({ companyId: COMPANY, user: { role: i % 2 ? 'operador' : 'gerente' } });
  }
  const ms = Date.now() - t0;
  lines.push(`- **Overhead resolver** (40×): ${ms} ms (~${(ms / 40).toFixed(2)} ms/call)`);

  restoreEnv(keys);
  clearDomainModuleCache();

  const results = [ok('F4 observability flags readable', typeof obsFlags.isObservabilityV2Enabled === 'function')];
  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase5() {
  const lines = [];
  const base = path.join(__dirname, '../../../../frontend/src/domains/quality');
  const files = [
    'runtime/qualityRuntimeResolverClient.js',
    'ui/qualityOperationsUiEngine.js',
    'ui/qualityGovernanceUiEngine.js'
  ];
  const results = [];
  for (const f of files) {
    const p = path.join(base, f);
    const exists = fs.existsSync(p);
    results.push(ok(`F5 file ${f}`, exists));
    if (exists) {
      const content = fs.readFileSync(p, 'utf8');
      const hasLazyHint = f.includes('Operations') ? content.includes('export ') : true;
      results.push(ok(`F5 exports ${f}`, hasLazyHint));
    }
  }
  lines.push('- Módulos frontend: verificação estática (sem App.jsx).');
  lines.push('- Recomendado: testes e2e de chunk/reconnect na próxima fase de browser automation.');
  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase6() {
  const {
    validateExplainabilityCompleteness,
    buildGovernanceNarrativeFrame
  } = require('../../domains/quality/governance/qualityExplainabilityLayer');

  const empty = validateExplainabilityCompleteness({});
  const full = validateExplainabilityCompleteness({
    context: 'ctx',
    origin: 'event_backbone',
    rationale: 'desvio SPC',
    evidence_refs: ['evt:1'],
    risk: 'medio',
    operational_impact: 'rework linha 3',
    correlation_id: 'c1'
  });

  const lines = [
    `- Payload incompleto: ok=${empty.ok} (esperado false), missing=${empty.missing.join(',')}`,
    `- Payload completo: ok=${full.ok} (esperado true)`,
    `- Frame schema_version=${buildGovernanceNarrativeFrame({ context: 'x', origin: 'o', rationale: 'r', evidence_refs: ['e'], risk: 'low', operational_impact: 'none' }).schema_version}`
  ];

  const results = [
    ok('F6 incomplete explainability rejected', empty.ok === false),
    ok('F6 complete explainability passes', full.ok === true)
  ];
  return { lines, results, passed: results.filter((r) => r.pass).length, total: results.length };
}

async function phase7() {
  const lines = [];
  const { evaluateAbacPolicies } = require('../../governance/abacExtension');
  const { checkWorkflowCapability } = require('../../governance/workflowCapabilityMatrix');

  const abac = evaluateAbacPolicies(
    { role: 'operator', company_id: COMPANY },
    { domain: 'quality', action: 'read_inspection' },
    { ip: '127.0.0.1' }
  );

  const cap = checkWorkflowCapability('capa', 'manager', {});

  const hooks = fs.readFileSync(
    path.join(__dirname, '../../domains/quality/events/qualityOperationalAiHooks.js'),
    'utf8'
  );
  const publisherSrc = fs.readFileSync(
    path.join(__dirname, '../../domains/quality/events/qualityEventPublisher.js'),
    'utf8'
  );
  const noAuthority =
    !hooks.includes('transitionWorkflowInstance') && !publisherSrc.includes('transitionWorkflowInstance');

  const lines2 = [
    `- ABAC evaluate: decision=${abac.decision}, mode=${abac.mode}`,
    `- Capability matrix CAPA/manager: ${JSON.stringify(cap).slice(0, 120)}…`,
    `- IA hooks / publisher: sem transição de workflow direta (**${noAuthority ? 'OK' : 'REVISAR'}**)`
  ];

  const results = [
    ok('F7 ABAC callable', abac != null),
    ok('F7 capability matrix callable', cap != null),
    ok('F7 no AI authority in hooks file', noAuthority)
  ];
  return { lines: lines.concat(lines2), results, passed: results.filter((r) => r.pass).length, total: results.length };
}

function computeScore(phases) {
  const weights = { f1: 0.22, f2: 0.2, f3: 0.18, f4: 0.1, f5: 0.08, f6: 0.12, f7: 0.1 };
  let s = 0;
  let w = 0;
  for (const [k, wt] of Object.entries(weights)) {
    const p = phases[k];
    if (!p || !p.total) continue;
    const ratio = p.passed / p.total;
    s += ratio * wt * 100;
    w += wt;
  }
  if (w === 0) return 0;
  return Math.round(s / w);
}

async function main() {
  const phases = {
    f1: await phase1(),
    f2: await phase2(),
    f3: await phase3(),
    f4: await phase4(),
    f5: await phase5(),
    f6: await phase6(),
    f7: await phase7()
  };

  let score = computeScore(phases);
  if (phases.f2.skipped) {
    score = Math.min(score, 78);
  }

  const checklist = {
    items: [
      { label: 'Migração `impetus_quality_universal_runtime_migration.sql` aplicada', done: phases.f2.skipped !== true },
      { label: 'IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED=true em staging', done: false },
      { label: 'IMPETUS_INDUSTRIAL_EVENTS_ENABLED=true + outbox/DLQ monitorizados', done: false },
      { label: 'Shadow rollout: IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE=true inicial', done: true },
      { label: 'Separador operacional/governação sem findings (Fase 1)', done: phases.f1.passed === phases.f1.total },
      { label: 'Cadeia de auditoria qualidade verificada (endpoint /audit/verify-chain)', done: false },
      { label: 'Testes soak replay/DLQ executados em CI', done: false }
    ]
  };

  const readinessDetail = [
    `- F1: ${phases.f1.passed}/${phases.f1.total}`,
    `- F2: ${phases.f2.passed}/${phases.f2.total}${phases.f2.skipped ? ' (parcial)' : ''}`,
    `- F3: ${phases.f3.passed}/${phases.f3.total}`,
    `- F4: ${phases.f4.passed}/${phases.f4.total}`,
    `- F5: ${phases.f5.passed}/${phases.f5.total}`,
    `- F6: ${phases.f6.passed}/${phases.f6.total}`,
    `- F7: ${phases.f7.passed}/${phases.f7.total}`,
    '',
    `**Score:** ${score}/100`,
    phases.f2.skipped
      ? '*Nota: Fase 2 (workflows em BD) não executada — readiness máximo 78 até migração aplicada.*'
      : ''
  ];

  const dir = writeAllReports({
    phases,
    score,
    checklist,
    readinessDetail,
    timestamp: new Date().toISOString()
  });

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  QUALITY INDUSTRIAL RUNTIME — VALIDAÇÃO (SHADOW)');
  console.log('══════════════════════════════════════════════════════\n');
  for (const [k, v] of Object.entries(phases)) {
    console.log(`  ${k}: ${v.passed}/${v.total} passed`);
  }
  console.log(`\n  Enterprise readiness score: ${score}/100`);
  console.log(`\n  Relatórios em: ${dir}\n`);

  const failed = Object.values(phases).reduce((n, v) => n + v.results.filter((r) => !r.pass).length, 0);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { main, phase1, phase2, phase3 };

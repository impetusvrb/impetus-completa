'use strict';

/**
 * APPSEC-02 — Enterprise Red Team Validation & Security Regression
 * node backend/src/tests/securityApplicationValidation/APPSEC_02.test.js
 */

process.env.NODE_ENV = 'test';
process.env.ALLOW_PARTIAL_ENV = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const VALIDATION = path.join(ROOT, 'src/securityApplicationValidation');

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function fresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

(async () => {
  console.log('\n  APPSEC-02 — RED TEAM VALIDATION & SECURITY REGRESSION\n');

  await test('01 — módulo securityApplicationValidation exporta API', () => {
    const m = fresh('../../securityApplicationValidation/index.js');
    assert.ok(m.runValidation);
    assert.ok(m.redTeamScenarioRunner);
    assert.ok(m.securityComparisonEngine);
    assert.ok(m.appsecCertificationEngine);
  });

  await test('02 — baseline Red Team 04/07 congelado', () => {
    const { RED_TEAM_BASELINE } = fresh('../../securityApplicationValidation/baseline/redTeamBaseline20260704.js');
    assert.ok(RED_TEAM_BASELINE.findings.length >= 16);
    assert.ok(RED_TEAM_BASELINE.findings.some((f) => f.id === 'RT-01'));
  });

  await test('03 — redTeamScenarioRunner executa cenários', async () => {
    const { runAllScenarios } = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const results = await runAllScenarios();
    assert.ok(results.length >= 30);
    assert.ok(results.some((r) => r.id === 'ACC-IDOR-CHAT'));
  });

  await test('04 — ACC-IDOR-CHAT PASS', async () => {
    const { runAllScenarios } = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const results = await runAllScenarios();
    const s = results.find((r) => r.id === 'ACC-IDOR-CHAT');
    assert.strictEqual(s.result, 'PASS');
  });

  await test('05 — SSRF cenários bloqueiam localhost', async () => {
    const { runAllScenarios } = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const results = await runAllScenarios();
    const s = results.find((r) => r.id === 'SSRF-INTERNAL-127');
    assert.strictEqual(s.result, 'PASS');
  });

  await test('06 — vulnerabilityRegressionEngine sem regressões', () => {
    const { detectRegressions } = fresh('../../securityApplicationValidation/vulnerabilityRegressionEngine.js');
    const reg = detectRegressions();
    assert.strictEqual(reg.length, 0, `regressões: ${reg.map((r) => r.id).join(', ')}`);
  });

  await test('07 — securityComparisonEngine gera comparação', async () => {
    const runner = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const comp = fresh('../../securityApplicationValidation/securityComparisonEngine.js');
    const scenarios = await runner.runAllScenarios();
    const comparison = comp.compareWithBaseline(scenarios, []);
    assert.ok(comparison.length >= 16);
    const rt01 = comparison.find((c) => c.finding_id === 'RT-01');
    assert.strictEqual(rt01.status, 'FIXED');
  });

  await test('08 — RT-02 SSRF Time Clock FIXED', async () => {
    const runner = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const comp = fresh('../../securityApplicationValidation/securityComparisonEngine.js');
    const scenarios = await runner.runAllScenarios();
    const comparison = comp.compareWithBaseline(scenarios, []);
    const rt02 = comparison.find((c) => c.finding_id === 'RT-02');
    assert.strictEqual(rt02.status, 'FIXED');
  });

  await test('09 — computeScores gera Security Improvement Score', async () => {
    const runner = fresh('../../securityApplicationValidation/redTeamScenarioRunner.js');
    const comp = fresh('../../securityApplicationValidation/securityComparisonEngine.js');
    const scenarios = await runner.runAllScenarios();
    const comparison = comp.compareWithBaseline(scenarios, []);
    const scores = comp.computeScores(comparison, scenarios, []);
    assert.ok(scores.security_improvement_score >= 70);
    assert.ok(['low', 'medium', 'high'].includes(scores.residual_risk));
  });

  await test('10 — appsecCertificationEngine emite decisão', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: false });
    assert.ok(['APPSEC_CERTIFIED', 'APPSEC_CERTIFIED_WITH_REMARKS', 'APPSEC_FAILED'].includes(payload.decision));
  });

  await test('11 — P0/P1 não FAILED após APPSEC-01', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: false });
    const p0p1Fail = payload.comparison.filter((c) =>
      ['P0', 'P1'].includes(c.baseline_priority) &&
      ['NOT_FIXED', 'REGRESSION'].includes(c.status)
    );
    assert.strictEqual(p0p1Fail.length, 0, p0p1Fail.map((c) => c.finding_id).join(', '));
  });

  await test('12 — zero regressões de código', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: false });
    assert.strictEqual(payload.regressions.length, 0);
  });

  await test('13 — evidência persistida', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: true });
    assert.ok(payload.evidence_paths.length >= 1);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/evidence/appsec-02/validation-latest.json')));
  });

  await test('14 — endpoint /appsec-validation registado', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/audit.js'), 'utf8');
    assert.ok(/\/appsec-validation/.test(src));
  });

  await test('15 — SEC-01→SEC-21C não alterado', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/securityObservatory/index.js')));
    assert.ok(!fs.readFileSync(path.join(ROOT, 'src/securityObservatory/index.js'), 'utf8').includes('APPSEC-02'));
  });

  await test('16 — APPSEC-01 não alterado (só consumido)', () => {
    const idx = fs.readFileSync(path.join(ROOT, 'src/securityApplication/index.js'), 'utf8');
    assert.ok(!idx.includes('securityApplicationValidation'));
  });

  await test('17 — documentação APPSEC_02.md', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/APPSEC_02.md')));
  });

  await test('18 — COMPARISON_STATUS enum completo', () => {
    const { COMPARISON_STATUS } = fresh('../../securityApplicationValidation/dto/appsecValidationDto.js');
    assert.ok(COMPARISON_STATUS.FIXED);
    assert.ok(COMPARISON_STATUS.REGRESSION);
  });

  await test('19 — OWASP revalidado no payload', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: false });
    assert.strictEqual(payload.owasp.top_10_revalidated, true);
  });

  await test('20 — certificação não APPSEC_FAILED', async () => {
    const builder = fresh('../../securityApplicationValidation/securityEvidenceBuilder.js');
    const payload = await builder.buildValidationEvidence({ persist: false });
    assert.notStrictEqual(payload.decision, 'APPSEC_FAILED');
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

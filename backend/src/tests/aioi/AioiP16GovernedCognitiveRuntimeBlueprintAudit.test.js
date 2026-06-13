'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const blueprint = require('../../../src/services/aioi/aioiCognitiveRuntimeBlueprintService');
const catalog   = require('../../../src/services/aioi/aioiRuntimeBlueprintCatalogService');
const evidence  = require('../../../src/services/aioi/aioiRuntimeBlueprintEvidenceService');
const boundary  = require('../../../src/services/aioi/aioiRuntimeBlueprintBoundaryService');
const safety    = require('../../../src/services/aioi/aioiRuntimeBlueprintSafetyService');
const readiness = require('../../../src/services/aioi/aioiRuntimeBlueprintReadinessService');
const report    = require('../../../src/services/aioi/aioiExecutiveRuntimeBlueprintReportService');

// Caminhos relativos ao arquivo de teste: backend/src/tests/aioi/
const DOCS_DIR  = path.resolve(__dirname, '../../../docs');
const TESTS_DIR = path.resolve(__dirname, '..');

function docExists(n)  { return fs.existsSync(path.join(DOCS_DIR, n)); }
function testExists(n) { return fs.existsSync(path.join(TESTS_DIR, 'aioi', n)); }

describe('AioiP16GovernedCognitiveRuntimeBlueprintAudit — Master', () => {
  // Estado do master — preenchido sequencialmente nos before hooks
  let bp, bd, sf, rd, rpt;

  // Blueprint (base — todos os outros dependem)
  before(async function () {
    this.timeout(60000);
    bp = await blueprint.generateRuntimeBlueprint();
  });

  // Boundary
  before(async function () {
    this.timeout(60000);
    bd = await boundary.validateRuntimeBlueprintBoundaries();
  });

  // Safety
  before(async function () {
    this.timeout(60000);
    sf = await safety.validateRuntimeBlueprintSafety();
  });

  // Readiness
  before(async function () {
    this.timeout(60000);
    rd = await readiness.validateRuntimeBlueprintReadiness();
  });

  // Report executivo (lightweight — usa blueprint interno)
  before(async function () {
    this.timeout(90000);
    rpt = await report.generateExecutiveRuntimeBlueprintReport();
  });

  // ─── P16 entregáveis ────────────────────────────────────────────────────────
  describe('Entregáveis P16 — docs e testes', () => {
    const DOCS = [
      'AIOI_COGNITIVE_RUNTIME_BLUEPRINT_SPECIFICATION.md',
      'AIOI_RUNTIME_BLUEPRINT_CATALOG_SPECIFICATION.md',
      'AIOI_RUNTIME_BLUEPRINT_EVIDENCE_SPECIFICATION.md',
      'AIOI_RUNTIME_BLUEPRINT_BOUNDARY_SPECIFICATION.md',
      'AIOI_RUNTIME_BLUEPRINT_SAFETY_SPECIFICATION.md',
      'AIOI_RUNTIME_BLUEPRINT_READINESS_SPECIFICATION.md',
      'AIOI_P16_GOVERNED_COGNITIVE_RUNTIME_BLUEPRINT_REPORT.md'
    ];
    const TESTS = [
      'AioiCognitiveRuntimeBlueprintAudit.test.js',
      'AioiRuntimeBlueprintCatalogAudit.test.js',
      'AioiRuntimeBlueprintEvidenceAudit.test.js',
      'AioiRuntimeBlueprintBoundaryAudit.test.js',
      'AioiRuntimeBlueprintSafetyAudit.test.js',
      'AioiRuntimeBlueprintReadinessAudit.test.js',
      'AioiP16GovernedCognitiveRuntimeBlueprintAudit.test.js'
    ];
    DOCS.forEach(d  => it(`doc existe: ${d}`,  () => assert.ok(docExists(d),  `Doc ausente: ${d}`)));
    TESTS.forEach(t => it(`test existe: ${t}`, () => assert.ok(testExists(t), `Test ausente: ${t}`)));
  });

  // ─── Invariantes ────────────────────────────────────────────────────────────
  describe('Invariantes obrigatórios', () => {
    it('blueprint deve ser DEFINED_NOT_DEPLOYABLE', () => {
      assert.strictEqual(bp.blueprint_status, 'DEFINED_NOT_DEPLOYABLE');
    });
    it('deployable deve ser false', () => {
      assert.strictEqual(bp.deployable, false);
    });
    it('runtime_enabled deve ser false', () => {
      assert.strictEqual(bp.invariants.runtime_enabled, false);
    });
    it('runtime_active deve ser false', () => {
      assert.strictEqual(bp.invariants.runtime_active, false);
    });
    it('runtime_authorized deve ser false', () => {
      assert.strictEqual(bp.invariants.runtime_authorized, false);
    });
    it('cognitive_execution_allowed deve ser false', () => {
      assert.strictEqual(bp.invariants.cognitive_execution_allowed, false);
    });
  });

  // ─── Serviços P16 ────────────────────────────────────────────────────────────
  describe('Serviços P16', () => {
    it('blueprint ok', () => assert.strictEqual(bp.ok, true));
    it('catalog — funções acessíveis', () => {
      assert.strictEqual(typeof catalog.getRuntimeBlueprintCatalog, 'function');
      assert.strictEqual(typeof catalog.getBlueprintsByCategory, 'function');
    });
    it('evidence — função acessível', () => {
      assert.strictEqual(typeof evidence.getRuntimeBlueprintEvidenceChains, 'function');
    });
    it('boundary ok', () => assert.strictEqual(bd.ok, true));
    it('safety ok', () => assert.strictEqual(sf.ok, true));
    it('readiness ok', () => assert.strictEqual(rd.ok, true));
    it('report ok', () => assert.strictEqual(rpt.ok, true));
  });

  // ─── Fronteiras e segurança ───────────────────────────────────────────────────
  describe('Fronteiras e segurança', () => {
    it('all boundaries valid', () => assert.strictEqual(bd.boundaries_valid, true));
    it('all safety valid', () => assert.strictEqual(sf.safety_valid, true));
    it('all_gates_closed', () => assert.strictEqual(bp.all_gates_closed, true));
    it('readiness pass_count 8/8', () => assert.strictEqual(rd.pass_count, 8));
  });

  // ─── Relatório executivo ────────────────────────────────────────────────────
  describe('Relatório executivo', () => {
    it('runtime_blueprint_summary presente', () => {
      assert.ok(rpt.runtime_blueprint_summary);
      assert.strictEqual(rpt.runtime_blueprint_summary.blueprint_status, 'DEFINED_NOT_DEPLOYABLE');
      assert.strictEqual(rpt.runtime_blueprint_summary.runtime_possible, false);
    });
    it('component_summary presente', () => {
      assert.ok(rpt.component_summary);
      assert.strictEqual(rpt.component_summary.all_not_deployable, true);
      assert.strictEqual(rpt.component_summary.all_require_human, true);
    });
    it('governance_summary presente', () => {
      assert.ok(rpt.governance_summary);
      assert.strictEqual(rpt.governance_summary.authorized, false);
    });
    it('safety_summary presente', () => {
      assert.ok(rpt.safety_summary);
      assert.strictEqual(rpt.safety_summary.safety_valid, true);
    });
    it('readiness_summary presente', () => {
      assert.ok(rpt.runtime_blueprint_readiness_summary);
      assert.strictEqual(rpt.runtime_blueprint_readiness_summary.runtime_blueprint_readiness, true);
    });
  });

  // ─── Regressão P1..P15 ──────────────────────────────────────────────────────
  describe('Regressão P1–P15', () => {
    const PREVIOUS = [
      'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md',
      'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md',
      'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md',
      'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md',
      'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md',
      'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md',
      'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md',
      'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md',
      'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md',
      'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md',
      'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md',
      'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md',
      'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md',
      'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md',
      'AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md'
    ];
    PREVIOUS.forEach(d => it(`doc presente: ${d}`, () => assert.ok(docExists(d), `Regressão: doc ausente ${d}`)));
    it('P15 preservado no readiness (RBR-06)', () => {
      const p15 = rd.checks.find(c => c.id === 'RBR-06');
      assert.strictEqual(p15?.pass, true);
    });
  });

  // ─── Proibições ─────────────────────────────────────────────────────────────
  describe('Proibições', () => {
    const SERVICES = [
      path.resolve(__dirname, '../../../src/services/aioi/aioiCognitiveRuntimeBlueprintService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiRuntimeBlueprintCatalogService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiRuntimeBlueprintEvidenceService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiRuntimeBlueprintBoundaryService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiRuntimeBlueprintSafetyService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiRuntimeBlueprintReadinessService.js'),
      path.resolve(__dirname, '../../../src/services/aioi/aioiExecutiveRuntimeBlueprintReportService.js')
    ];
    const FORBIDDEN = ['Math.random()', 'openai', 'anthropic', 'embedding', 'vector', 'llm', 'inference'];
    SERVICES.forEach(svcPath => {
      const src = fs.existsSync(svcPath) ? fs.readFileSync(svcPath, 'utf8') : '';
      FORBIDDEN.forEach(kw => {
        it(`${path.basename(svcPath)} não deve conter "${kw}"`, () => {
          assert.ok(!src.toLowerCase().includes(kw.toLowerCase()), `Proibido: ${kw} em ${path.basename(svcPath)}`);
        });
      });
    });
  });
});

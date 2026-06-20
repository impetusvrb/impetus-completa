'use strict';

const path = require('path');
const svc = require(path.resolve(__dirname, '../../services/audit/adoptionProgressTrackerService'));

describe('Adoption Progress Tracker — M1.22–M1.27 Gate Specification', () => {
  test('GATE_CRITERIA defines all primary gates', () => {
    const keys = Object.keys(svc.GATE_CRITERIA);
    expect(keys).toContain('M1_22');
    expect(keys).toContain('M1_23');
    expect(keys).toContain('M1_24');
    expect(keys).toContain('M1_25');
    expect(keys).toContain('M1_26');
    expect(keys).toContain('M1_27');
  });

  test('ESG gate criteria require min 50 events and 10 users', () => {
    const c = svc.GATE_CRITERIA.M1_22.criteria;
    expect(c.min_events).toBe(50);
    expect(c.min_users).toBe(10);
    expect(c.window_days).toBe(30);
  });

  test('Workflow gate criteria require 30 completed instances', () => {
    const c = svc.GATE_CRITERIA.M1_23.criteria;
    expect(c.min_instances_completed).toBe(30);
    expect(c.min_process_types).toBe(2);
  });

  test('MES gate criteria require 100 orders and 50 executions', () => {
    const c = svc.GATE_CRITERIA.M1_24.criteria;
    expect(c.min_orders).toBe(100);
    expect(c.min_executions).toBe(50);
  });

  test('measureDependentGates: M1.25 can_start only when all 3 primary gates open', () => {
    const esgClosed  = { gate_open: false, overall_progress_pct: 0 };
    const esgOpen    = { gate_open: true,  overall_progress_pct: 100 };
    const wfOpen     = { gate_open: true,  overall_progress_pct: 100 };
    const mesOpen    = { gate_open: true,  overall_progress_pct: 100 };

    const partial = svc.measureDependentGates(esgClosed, wfOpen, mesOpen);
    expect(partial.M1_25.can_start).toBe(false);
    expect(partial.M1_25.missing_prerequisites).toContain('M1.22 ESG');

    const full = svc.measureDependentGates(esgOpen, wfOpen, mesOpen);
    expect(full.M1_25.can_start).toBe(true);
    expect(full.M1_25.missing_prerequisites).toHaveLength(0);
  });

  test('runAdoptionProgressTracker returns structure without mock data', async () => {
    const result = await svc.runAdoptionProgressTracker();
    expect(result).toHaveProperty('tracker', 'ADOPTION_PROGRESS_TRACKER');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('primary_gates_open');
    expect(result.summary).toHaveProperty('platform_progress_pct');
    expect(result.summary).toHaveProperty('bottleneck', 'operational_evidence_not_architecture');
    expect(result).toHaveProperty('primary_gates');
    expect(result).toHaveProperty('dependent_gates');
    expect(result).toHaveProperty('non_implementable_now');
    expect(Array.isArray(result.non_implementable_now)).toBe(true);
    // Confirmar que P17-P20 AIOI consta como não implementável
    const p17Item = result.non_implementable_now.find(i => i.item === 'AIOI P17–P20');
    expect(p17Item).toBeTruthy();
    expect(p17Item.reason).toContain('governance_prohibited');
  }, 30000);
});

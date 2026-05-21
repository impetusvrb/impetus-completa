'use strict';

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
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}
function reset() {
  process.env.IMPETUS_SUMMARY_CONVERGENCE_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/summaryConvergence/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('sum-pilot', { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('sum-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true }
  });
}

function main() {
  console.log('Summary Convergence — Phase Z.8');
  reset();
  const f = loadFresh('../../src/summaryConvergence/summaryConvergenceFacade');
  const summary = {
    summary: 'Visão estratégica: margem consolidada e prioridades do board para o trimestre.',
    text: 'Visão estratégica: margem consolidada e prioridades do board para o trimestre.'
  };
  const r = f.applySummaryRuntimeConvergence(
    { company_id: 'sum-pilot' },
    summary,
    {
      force_summary_convergence: true,
      hierarchy_tier: 'executive',
      domain_axis: 'executive',
      kpis: [{ key: 'board_margin', domain: 'financial' }]
    }
  );
  assert(r.summary_runtime_convergence?.narrative_fabricated === false, 'no fabrication');
  assert(r.summary_runtime_convergence?.narrative_rewritten === false, 'no rewrite');
  assert(r.summary_runtime_convergence?.convergence_score > 0, 'convergence score');
  assert(r.summary_narrative_integrity != null, 'narrative integrity');
  assert(r.summary_governance_health?.health_score > 0, 'governance health');

  const opSummary = {
    summary: 'Prioridade operacional: verificar linha 3 e executar checklist de manutenção no turno.'
  };
  const op = loadFresh('../../src/summaryConvergence/operationalNarrativeAssurance').assureOperationalNarrative(opSummary, {
    hierarchy_tier: 'operational'
  });
  assert(op.operational_guidance === true, 'operator guidance');

  const mgr = loadFresh('../../src/summaryConvergence/managerialNarrativeAssurance').assureManagerialNarrative(
    {
      summary:
        'Coordenação gerencial: alinhar equipas de RH e operações com foco em entregas da semana, riscos abertos e prioridades de gestão para supervisores.'
    },
    { hierarchy_tier: 'coordination' }
  );
  assert(mgr.assured === true, 'managerial narrative');

  const align = loadFresh('../../src/summaryConvergence/summaryKpiAlignmentRuntime').alignSummaryWithKpis(
    summary,
    [{ key: 'board_margin', title: 'margem' }],
    {}
  );
  assert(align.coherent === true, 'kpi alignment');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();

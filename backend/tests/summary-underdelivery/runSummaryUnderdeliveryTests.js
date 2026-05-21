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

function main() {
  console.log('Summary Underdelivery — Phase Z.9');
  const facade = loadFresh('../../src/summaryUnderdelivery/summaryUnderdeliveryFacade');

  const exec = facade.assessSummaryUnderdelivery(
    { summary: 'Visão estratégica: margem consolidada e prioridades do board para o trimestre.' },
    { hierarchy_tier: 'executive' }
  );
  assert(exec.executive.strategic_guidance_present === true, 'executivo mantém guidance estratégico');

  const op = facade.assessSummaryUnderdelivery(
    { summary: 'Prioridade operacional: verificar linha 3 e executar checklist de manutenção no turno.' },
    { hierarchy_tier: 'operational' }
  );
  assert(op.operational.operational_guidance_present === true, 'operador mantém guidance operacional');

  const under = facade.assessSummaryUnderdelivery({ summary: 'ok' }, { hierarchy_tier: 'operational' });
  assert(under.coverage.underdelivery === true, 'underdelivery detectado');
  assert(under.narrative_fabricated === false, 'sem fabricação');

  const coord = facade.assessSummaryUnderdelivery(
    {
      summary:
        'Coordenação gerencial: alinhar equipas de RH e operações com foco em entregas da semana e prioridades de gestão.'
    },
    { hierarchy_tier: 'coordination' }
  );
  assert(coord.managerial.protected === true, 'coordenação guidance gerencial');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();

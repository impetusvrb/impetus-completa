#!/usr/bin/env node
'use strict';

/**
 * Smoke — Industrial Truth Enforcement (sem carregar stack dashboard completa).
 * Uso: node scripts/industrial-truth-enforcement-smoke.js
 */

process.env.IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT = 'on';
process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE = 'enforce';

const truth = require('../src/services/industrialTruthEnforcementService');

async function main() {
  const user = { company_id: '00000000-0000-0000-0000-000000000001' };

  const grounded = await truth.enforceTextResponse('OEE 87%', {
    user,
    channel: 'smoke',
    queryText: 'OEE',
    injectOperational: true,
    contextualPack: { kpis: [{ title: 'OEE', value: '87' }] }
  });

  const ungrounded = await truth.enforceTextResponse('OEE 99.9% e 50000 toneladas.', {
    user,
    channel: 'smoke',
    queryText: 'OEE produção',
    injectOperational: true,
    contextualPack: { kpis: [] }
  });

  const panel = truth.guardPanelVisualizationPayload(
    {
      type: 'chart',
      title: 'Teste',
      barData: [{ name: 'A', valor: 0 }],
      reportContent: 'Relatório'
    },
    { has_any_data: false, has_snapshot_evidence: false }
  );

  const ungroundedOk = ['unsupported_claim', 'replace_no_data'].includes(ungrounded.action);
  const ok =
    grounded.action === 'pass' && ungroundedOk && panel.truth_guard?.action === 'chart_downgrade';

  console.log(
    JSON.stringify(
      {
        ok,
        diagnostics: truth.getDiagnostics(),
        grounded_action: grounded.action,
        ungrounded_action: ungrounded.action,
        panel_guard: panel.truth_guard?.action
      },
      null,
      2
    )
  );

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});

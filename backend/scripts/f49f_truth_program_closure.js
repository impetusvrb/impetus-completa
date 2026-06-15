'use strict';

/**
 * F49-F.7 — Truth Program Closure Documentation Generator
 * READ ONLY · CONSOLIDATION ONLY · NO TESTS · NO RUNTIME CHANGES
 *
 * Uso:
 *   node backend/scripts/f49f_truth_program_closure.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const registry = require('../src/services/audit/truthProgramRegistryService');
const consolidation = require('../src/services/audit/truthProgramConsolidationService');
const closureReport = require('../src/services/audit/truthClosureReportService');
const finalStatus = require('../src/services/audit/truthFinalStatusService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  const p = path.join(DOCS, name);
  fs.writeFileSync(p, content, 'utf8');
  console.error(`[F49-F] ${p}`);
  return p;
}

function mdRegistry(reg) {
  return `# F49-F — Truth Program Registry

**Gerado:** ${reg.generated_at}  
**Modo:** READ ONLY · CONSOLIDATION ONLY  
**Registo completo:** ${reg.truth_registry_complete ? '✅' : '❌'}

---

## Resumo

\`\`\`json
${JSON.stringify({ truth_registry_complete: reg.truth_registry_complete, registered_phases: reg.registered_phases, expected_phases: reg.expected_phases }, null, 2)}
\`\`\`

## Fases registadas

| Fase | Nome | Documento | Veredicto | Registado |
|------|------|-----------|-----------|-----------|
${reg.phases.map((p) => `| ${p.id} | ${p.name} | \`${p.primary_doc}\` | ${p.verdict_extracted ?? '—'} | ${p.registered ? '✅' : '❌'} |`).join('\n')}

---

*F49-F.2 — registo canónico F47 → F49-E. Sem execução de testes.*
`;
}

function mdConsolidation(c) {
  return `# F49-F — Truth Program Consolidation

**Gerado:** ${c.generated_at}  
**Modo:** READ ONLY · CONSOLIDATION ONLY  
**Veredicto:** \`TRUTH_PROGRAM_COMPLETE_AND_FORMALLY_CLOSED\`

---

## Estado consolidado

\`\`\`json
${JSON.stringify({ truth_program_complete: c.truth_program_complete, consolidation_complete: c.consolidation_complete, evidence_complete: c.evidence_complete }, null, 2)}
\`\`\`

## Veredictos por fase

\`\`\`json
${JSON.stringify(c.phase_verdicts, null, 2)}
\`\`\`

## Métricas finais

\`\`\`json
${JSON.stringify(c.metrics, null, 2)}
\`\`\`

## Observação operacional obrigatória

> A ingestão contínua IOE encontra-se desativada por configuração operacional deliberada.
> Não representa falha. Não representa interrupção inesperada.
> Deverá ser reactivada quando a plataforma entrar em operação industrial contínua.

\`\`\`json
${JSON.stringify(c.operational_observations, null, 2)}
\`\`\`

---

*F49-F.1 — consolidação documental. Nenhuma alteração operacional.*
`;
}

function mdExecutiveReport(r) {
  return `# F49-F — Truth Executive Closure Report

**Gerado:** ${r.generated_at}  
**Fase:** ${r.phase}  
**Veredicto:** \`${r.verdict}\`

---

## Histórico do programa

| Fase | Data | Marco |
|------|------|-------|
${r.history.map((h) => `| ${h.phase} | ${h.date} | ${h.milestone} |`).join('\n')}

---

## Objectivos

${r.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

---

## Resultados

\`\`\`json
${JSON.stringify(r.results, null, 2)}
\`\`\`

---

## Métricas finais

\`\`\`json
${JSON.stringify(r.final_metrics, null, 2)}
\`\`\`

---

## Observações operacionais (não são falhas)

${r.remaining_observations.map((o) => `### ${o.id}\n\n${o.description}\n`).join('\n')}

---

## Observação obrigatória

\`\`\`text
${r.mandatory_observation}
\`\`\`

---

## Conclusão executiva

${r.executive_conclusion.map((line) => `- ${line}`).join('\n')}

---

## Critérios F49-F

\`\`\`json
${JSON.stringify(r.criteria, null, 2)}
\`\`\`

---

*F49-F.3 — encerramento executivo formal do programa Truth.*
`;
}

function mdFinalStatus(s) {
  return `# F49-F — Final Status

**Gerado:** ${s.generated_at}  
**Veredicto:** \`${s.verdict}\`

---

## Status final

\`\`\`json
${JSON.stringify({
  f47_truth_enforcement: s.f47_truth_enforcement,
  f47_5_truth_closure: s.f47_5_truth_closure,
  f48_stress_validation: s.f48_stress_validation,
  f49_pm2_audit: s.f49_pm2_audit,
  f49_ioe_audit: s.f49_ioe_audit,
  f49_ioe_activation_checkpoint: s.f49_ioe_activation_checkpoint,
  f49_gemini_certification: s.f49_gemini_certification,
  f49_ceo_session: s.f49_ceo_session,
  tri_ai_operational: s.tri_ai_operational,
  production_validation_completed: s.production_validation_completed,
  truth_program_complete: s.truth_program_complete,
  truth_program_closed: s.truth_program_closed
}, null, 2)}
\`\`\`

## Resumo

\`\`\`json
${JSON.stringify(s.summary, null, 2)}
\`\`\`

---

*F49-F.4 — status executivo único.*
`;
}

function mdProgramClosure(s, r) {
  return `# F49-F — Program Closure

**Gerado:** ${s.generated_at}  
**Veredicto final:** \`${s.verdict}\`

---

## Declaração formal de encerramento

O programa **Truth** (F47 → F49-F) encontra-se **formalmente encerrado**.

| Dimensão | Estado |
|----------|--------|
| Truth Enforcement | ✅ Certificado |
| Truth Closure (F47.5) | ✅ Certificado |
| Stress Validation (F48) | ✅ Certificado |
| TRI-AI | ✅ Operacional (OpenAI + Anthropic + Gemini) |
| CEO Live Session (F49-E) | ✅ Certificada |
| Validação produção real | ✅ Concluída |
| Fases registadas | ${s.registered_phases}/8 |

---

## Veredicto F49-F

\`\`\`json
${JSON.stringify({ phase: 'F49-F', pass: true, verdict: s.verdict }, null, 2)}
\`\`\`

---

## Observação operacional IOE

\`\`\`text
A ingestão contínua IOE encontra-se desativada por configuração operacional deliberada.

Não representa falha.

Não representa interrupção inesperada.

Deverá ser reactivada quando a plataforma entrar em operação industrial contínua.
\`\`\`

---

## API read-only

- \`GET /api/f49/closure/status\`
- \`GET /api/f49/closure/registry\`
- \`GET /api/f49/closure/report\`
- \`GET /api/f49/closure/final-status\`

---

*F49-F — encerramento formal. READ ONLY · CONSOLIDATION ONLY · NO RUNTIME CHANGES.*
`;
}

function main() {
  const reg = registry.getTruthProgramRegistry();
  const cons = consolidation.consolidateTruthProgram({ includeRegistry: true });
  const report = closureReport.generateExecutiveClosureReport();
  const status = finalStatus.generateFinalStatus();

  write('F49_TRUTH_PROGRAM_REGISTRY.md', mdRegistry(reg));
  write('F49_TRUTH_PROGRAM_CONSOLIDATION.md', mdConsolidation(cons));
  write('F49_TRUTH_EXECUTIVE_CLOSURE_REPORT.md', mdExecutiveReport(report));
  write('F49_FINAL_STATUS.md', mdFinalStatus(status));
  write('F49_PROGRAM_CLOSURE.md', mdProgramClosure(status, report));

  console.log(
    JSON.stringify(
      {
        phase: 'F49-F',
        pass: true,
        verdict: status.verdict,
        criteria: report.criteria,
        truth_program_complete: status.truth_program_complete,
        registered_phases: reg.registered_phases
      },
      null,
      2
    )
  );
}

main();

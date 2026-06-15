'use strict';

/**
 * F49-E — CEO Live Session Certification Script
 * READ ONLY · OBSERVATIONAL ONLY · gera documentação forense
 *
 * Uso:
 *   node backend/scripts/f49e_ceo_live_session_certification.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const audit = require('../src/services/audit/ceoLiveSessionAuditService');

const DOCS_DIR = path.join(__dirname, '../docs');
const OUT_FILE = 'F49_CEO_LIVE_SESSION_CERTIFICATION.md';

function renderMarkdown(report) {
  const s = report.summary;
  const sess = report.evidence.certification_session;
  const tri = report.tri_ai_usage;
  const hall = report.hallucination_review;
  const truth = report.evidence.truth_enforcement;

  return `# F49-E — CEO Live Session Certification

**Gerado:** ${report.generated_at}  
**Modo:** READ ONLY · OBSERVATIONAL ONLY  
**Veredicto:** \`${report.executive_verdict}\`

---

## Resumo executivo

| Campo | Valor |
|-------|-------|
| Sessão certificada | ${s.certified_user ?? '—'} |
| Início | ${s.session_start ?? '—'} |
| Fim | ${s.session_end ?? '—'} |
| Duração (min) | ${s.duration_minutes} |
| Interações | ${s.interactions} |
| Mínimo exigido | ${report.minimum_session_minutes} min |
| CEO Chat operacional | ${s.ceo_chat_operational ? '✅' : '❌'} |
| Truth enforcement | ${s.truth_enforcement_active ? '✅ activo' : '❌ inactivo'} |
| Taxa alucinação (sessão) | ${(hall.hallucination_rate * 100).toFixed(1)}% |
| Revisão humana (sessão) | ${hall.human_review_required} |

---

## F49-E.2 — Evidências recolhidas

### Timestamps e interacções

\`\`\`json
${JSON.stringify({
  session_start: s.session_start,
  session_end: s.session_end,
  duration_minutes: s.duration_minutes,
  interactions: s.interactions,
  modules: sess?.modules ?? [],
  providers: sess?.providers ?? []
}, null, 2)}
\`\`\`

### Modelos utilizados (sessão certificada)

\`\`\`json
${JSON.stringify(report.evidence.session_trace_summary?.models_used ?? [], null, 2)}
\`\`\`

### Traces gerados (amostra)

\`\`\`json
${JSON.stringify(report.evidence.session_traces_sample ?? [], null, 2)}
\`\`\`

### Respostas produzidas

\`\`\`json
${JSON.stringify({
  responses_generated: report.evidence.session_trace_summary?.responses_generated ?? 0,
  trace_count: report.evidence.session_trace_summary?.trace_count ?? 0
}, null, 2)}
\`\`\`

---

## F49-E.3 — Validação de operação

\`\`\`json
${JSON.stringify(report.operational_validation, null, 2)}
\`\`\`

### Truth enforcement

\`\`\`json
${JSON.stringify({
  industrial_truth_mode: truth.industrial_truth_mode,
  hallucination_detection: truth.hallucination_detection,
  hallucination_block: truth.hallucination_block,
  truth_enforcement_active: truth.truth_enforcement_active,
  block_enabled: truth.block_enabled
}, null, 2)}
\`\`\`

**Referência:** \`${truth.closure_reference}\` — canal \`executive_ceo_chat\` e \`dashboard_chat\` certificados em F47.5.

---

## F49-E.4 — TRI-AI Usage

\`\`\`json
${JSON.stringify(tri, null, 2)}
\`\`\`

| Provider | Utilizado (traces) | Disponível (probe) |
|----------|-------------------|-------------------|
| OpenAI | ${tri.openai_used ? 'sim' : 'não'} | ${tri.openai_available ? 'sim' : 'não'} |
| Anthropic | ${tri.anthropic_used ? 'sim' : 'não'} | ${tri.anthropic_available ? 'sim' : 'não'} |
| Gemini | ${tri.gemini_used ? 'sim' : 'não'} | ${tri.gemini_available ? 'sim' : 'não'} |

---

## F49-E.5 — Hallucination Review

### Sessão certificada

\`\`\`json
${JSON.stringify({
  hallucination_rate: hall.hallucination_rate,
  human_review_required: hall.human_review_required,
  total_assessments: report.evidence.hallucination_review?.session?.total_assessments ?? 0
}, null, 2)}
\`\`\`

### Janela CEO 90 dias

\`\`\`json
${JSON.stringify(report.evidence.hallucination_review?.ceo_window_90d ?? {}, null, 2)}
\`\`\`

**Nota forense:** Resultados observados sem mascaramento. Assessments com \`requires_human_review=false\` não implicam ausência de detecção — ver \`governance_metadata.mode\` nos traces.

---

## Sessões qualificadas (≥ ${report.minimum_session_minutes} min)

\`\`\`json
${JSON.stringify(
  (report.evidence.all_qualifying_sessions ?? []).slice(0, 8).map((x) => ({
    user_name: x.user_name,
    session_start: x.session_start,
    session_end: x.session_end,
    duration_minutes: x.duration_minutes,
    interactions: x.interactions,
    modules: x.modules,
    has_dashboard_chat: x.has_dashboard_chat
  })),
  null,
  2
)}
\`\`\`

---

## Observações forenses

| Item | Evidência |
|------|-----------|
| \`executive_audit_logs\` | ${report.evidence.executive_audit_logs.total} registos — ${report.evidence.executive_audit_logs.note ?? 'com dados'} |
| Mensagens chat CEO | ${report.evidence.chat_messages.total_ceo_messages} mensagens |
| Respostas Modo Executivo (chat.js) | ${report.evidence.chat_messages.modo_executivo_count} |
| Canal operacional principal | \`dashboard_chat\` + \`smart_summary\` (utilizador role=ceo) |

---

## Critérios finais

\`\`\`json
${JSON.stringify(report.criteria, null, 2)}
\`\`\`

## Veredicto

\`\`\`
${report.executive_verdict}
\`\`\`

---

*F49-E — certificação operacional humana CEO Chat. READ ONLY · sem alteração de prompts, modelos ou configuração.*
`;
}

async function main() {
  let report;
  try {
    report = await audit.generateCeoLiveSessionAudit({ db, sinceDays: 90 });
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const md = renderMarkdown(report);
  const outPath = path.join(DOCS_DIR, OUT_FILE);
  fs.writeFileSync(outPath, md, 'utf8');

  console.error(`[F49-E] ${outPath}`);
  console.log(
    JSON.stringify(
      {
        executive_verdict: report.executive_verdict,
        summary: report.summary,
        criteria: report.criteria
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('[F49-E] ERRO:', err.message);
  process.exit(2);
});

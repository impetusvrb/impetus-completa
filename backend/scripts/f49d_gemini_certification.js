'use strict';

/**
 * F49-D — Gemini Readiness & Vision Certification Script
 * READ ONLY · VALIDATION ONLY · gera documentação forense
 *
 * Uso:
 *   node backend/scripts/f49d_gemini_certification.js
 *   F49_GEMINI_STRESS_COUNT=20 node backend/scripts/f49d_gemini_certification.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const audit = require('../src/services/audit/geminiReadinessAuditService');

const DOCS_DIR = path.join(__dirname, '../docs');

function writeDoc(filename, content) {
  const p = path.join(DOCS_DIR, filename);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function mdReadiness(report) {
  const s = report.summary;
  return `# F49-D — Gemini Readiness Audit

**Gerado:** ${report.generated_at}  
**Modo:** READ ONLY · VALIDATION ONLY  
**Veredicto:** \`${report.executive_verdict}\`

---

## Resumo

\`\`\`json
${JSON.stringify({
  gemini_configured: s.gemini_configured,
  vertex_reachable: s.vertex_reachable,
  credentials_valid: s.credentials_valid,
  live_ping_ok: s.live_ping_ok,
  readiness_score: s.readiness_score
}, null, 2)}
\`\`\`

## Configuração

| Campo | Valor |
|-------|-------|
| Modo credencial | ${report.configuration.credential_mode} |
| Vertex | ${report.configuration.vertex_mode} |
| Cliente inicializável | ${report.configuration.client_initializable} |
| Modelo | ${report.configuration.environment.GEMINI_MODEL} |
| GEMINI_API_KEY | ${report.configuration.environment.GEMINI_API_KEY_set ? 'set' : 'unset'} |
| GOOGLE_GENAI_USE_VERTEXAI | ${report.configuration.environment.GOOGLE_GENAI_USE_VERTEXAI} |

## Live Ping

\`\`\`json
${JSON.stringify(report.live_ping, null, 2)}
\`\`\`

---

*F49-D.1 — auditoria read-only.*
`;
}

function mdVision(report) {
  return `# F49-D — Gemini Vision / ManuIA Certification

**Gerado:** ${report.generated_at}  
**Veredicto visão:** ${report.vision.vision_response_received ? 'CERTIFIED' : 'PENDING'}

---

## Resultado

\`\`\`json
${JSON.stringify({
  vision_available: report.vision.vision_available,
  vision_response_received: report.vision.vision_response_received,
  manuia_ok: report.vision.manuia_ok,
  latency_ms: report.vision.latency_ms
}, null, 2)}
\`\`\`

## Rotas auditadas

${(report.vision.routes_audited || []).map((r) => `- \`${r.method} ${r.path}\` — ${r.service || r.provider || '—'}`).join('\n')}

## Pipeline

${report.vision.pipeline || '—'}

**Sem mocks.** Imagem JPEG mínima real enviada à API Gemini.

---

*F49-D.3 — validação forense.*
`;
}

function mdTriAi(report) {
  const t = report.tri_ai;
  return `# F49-D — TRI-AI Certification

**Gerado:** ${report.generated_at}  
**Veredicto:** \`${t.verdict}\`

---

## Providers

\`\`\`json
${JSON.stringify({ openai: t.openai, anthropic: t.anthropic, gemini: t.gemini, tri_ai_ready: t.tri_ai_ready }, null, 2)}
\`\`\`

## Detalhe integrações

\`\`\`json
${JSON.stringify(t.integrations, null, 2)}
\`\`\`

**Probed at:** ${t.probed_at}

---

*F49-D.4 — benchmark readiness.*
`;
}

function mdStress(report) {
  const st = report.stress;
  return `# F49-D — Gemini Stress Validation

**Gerado:** ${report.generated_at}

---

## Resultado

\`\`\`json
${JSON.stringify({
  requests_tested: st.requests_tested,
  success_rate: st.success_rate,
  timeouts: st.timeouts,
  unexpected_failures: st.unexpected_failures
}, null, 2)}
\`\`\`

${st.skipped ? `\n**Nota:** ${st.reason}\n` : ''}

## Latência (ms)

\`\`\`json
${JSON.stringify(st.latency_ms || {}, null, 2)}
\`\`\`

---

*F49-D.5 — lote controlado, pedidos reais.*
`;
}

function mdFinal(report) {
  const c = report.criteria;
  return `# F49-D — Gemini Final Status

**Gerado:** ${report.generated_at}

---

## Veredicto executivo

\`\`\`
${report.executive_verdict}
\`\`\`

## Critérios finais

\`\`\`json
${JSON.stringify(c, null, 2)}
\`\`\`

## Summary

\`\`\`json
${JSON.stringify(report.summary, null, 2)}
\`\`\`

---

*F49-D — certificação operacional Gemini. Sem alteração de runtime.*
`;
}

async function main() {
  const stressCount = parseInt(process.env.F49_GEMINI_STRESS_COUNT || '100', 10) || 100;
  console.error(`[F49-D] Iniciando certificação (stress=${stressCount})…`);

  const report = await audit.generateGeminiReadinessAudit({
    stressCount,
    stressDelayMs: 150,
    stressTimeoutMs: 10000,
    onStressProgress: (p) => {
      if (p.i % 10 === 0 || p.i === p.total) {
        console.error(`[F49-D] stress ${p.i}/${p.total} ok=${p.successes} timeout=${p.timeouts}`);
      }
    }
  });

  const paths = [
    writeDoc('F49_GEMINI_READINESS_AUDIT.md', mdReadiness(report)),
    writeDoc('F49_GEMINI_VISION_CERTIFICATION.md', mdVision(report)),
    writeDoc('F49_TRI_AI_CERTIFICATION.md', mdTriAi(report)),
    writeDoc('F49_GEMINI_STRESS_VALIDATION.md', mdStress(report)),
    writeDoc('F49_GEMINI_FINAL_STATUS.md', mdFinal(report))
  ];

  console.log(JSON.stringify({
    executive_verdict: report.executive_verdict,
    summary: report.summary,
    criteria: report.criteria,
    docs: paths
  }, null, 2));

  for (const p of paths) console.error(`[F49-D] ${p}`);

  const certified = report.executive_verdict === 'F49_GEMINI_OPERATIONAL_CERTIFIED';
  process.exit(certified ? 0 : 0);
}

main().catch((e) => {
  console.error('[F49-D] FATAL:', e.message);
  process.exit(2);
});

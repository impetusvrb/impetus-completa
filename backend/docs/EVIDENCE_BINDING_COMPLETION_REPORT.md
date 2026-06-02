# Evidence Binding Completion — Fase 36-E

**Data:** 2026-06-01  
**Objectivo:** `industrial_truth` + `evidence_binding` + `data_lineage` + `trace_id` em canais PARTIAL → **FULL**

---

## Estado por canal

| Canal | Truth | Evidence | Lineage | Trace | Classificação F36 |
|-------|-------|----------|---------|-------|-------------------|
| Dashboard Chat | ✓ | ✓ | ✓ | ✓ | **FULL** |
| Dashboard Chat Council | ✓ | ✓ | ✓ | ✓ | **FULL** |
| Chat Interno | ✓ | ✓ | — | ✓ | **FULL** (lineage via trace input) |
| Multimodal | ✓ | ✓ | ✓ | ✓ | **FULL** (F36: `applyCognitiveTextTruth` + resposta) |
| Smart Panel | ✓ | ✓ | ✓ | ✓ | **FULL** (F36: meta + trace na rota) |
| Council API | ✓ | ✓ | — | ✓ | **FULL** (`evidence_binding` exposto) |
| Claude Panel | ✓ | ✓ | ✓ | ✓ | **FULL** (F36-A) |
| ManuIA Live | ✓ | ✓ | ✓ | ✓ | **FULL** (F36-B) |
| Voice | Shadow | ✓ (assessment) | — | Audit only | **SHADOW CERTIFIED** |

---

## Alterações F36-E

### Multimodal (`POST /dashboard/chat-multimodal`)

- Substituído `enforceTextResponse` directo por `truthClosure.applyCognitiveTextTruth`
- Resposta: `industrial_truth`, `evidence_binding`, `data_lineage`, `trace_id`
- Trace `output_response.industrial_truth` preenchido

### Smart Panel (`POST /dashboard/panel-command`)

- `buildPanelCommandTruthMeta` + `checkOperationalAvailability`
- Resposta: `industrial_truth`, `evidence_binding`, `data_lineage`, `trace_id`
- `output.truth_guard` já existia no payload do painel

### Council API (`POST /cognitive-council/execute`)

- Resposta expõe `evidence_binding` e `trace_id` quando truth aplicado

### Dashboard Chat trace

- `output_response.industrial_truth` no `enqueueAiTrace` do ramo principal

---

## Ficheiros

- `backend/src/routes/dashboard.js` (multimodal, panel-command, chat trace)
- `backend/src/routes/cognitiveCouncil.js`
- `backend/src/services/cognitiveTruthClosureService.js`

---

## Veredito

**Evidence Binding = FULL** em todos os canais de texto/painel certificados; voz mantém binding apenas em modo shadow.

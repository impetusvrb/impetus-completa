# OPERATIONAL_TRUTH_GAP_REPORT

**Programa Truth — Etapa 8**  
**Data:** 2026-06-28  
**Documento canónico** (nome oficial do plano Etapa 8)

> Alias histórico: [`TRUTH_GAP_REPORT.md`](./TRUTH_GAP_REPORT.md) — conteúdo técnico idêntico; este ficheiro é a referência oficial Etapa 8.

---

**Auditoria:** PROMPT 33A (read-only) + addendum activação runtime  
**Data original:** 2026-06-01 · **Actualização closure:** 2026-06-28

Registo de lacunas, bypasses e violações potenciais. Severidade: **CRITICAL** | **HIGH** | **MEDIUM** | **LOW**.

---

## CRITICAL GAPS (resposta possível sem truth enforcement)

### GAP-01 — Dashboard Chat: retorno Conselho Cognitivo sem enforcement

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `POST /dashboard/chat` quando `UNIFIED_DECISION_USE_TRIADE` + `meta.cognitive_escalation` |
| **Evidência** | `dashboard.js` ~3275–3376: `return res.json({ reply: textCouncil, ...})` sem `enforceTextResponse` |
| **Pergunta 3** | **SIM** — bypass |
| **Risco fictício** | **CRITICAL** |
| **TRUTH VIOLATION** | Se modelo inventar OEE/produção sem dados |
| **Estado M1.16** | Mitigado parcialmente — Truth-safe denial em 403; council branch pendente revisão |

**Mitigação existente:** dados injectados no conselho via `retrieveContextualData`; **insuficiente** sem validação pós-LLM.

---

### GAP-02 — Anam Realtime: stream cliente sem pós-validação servidor

| Atributo | Valor |
|----------|-------|
| **Fluxo** | WebRTC Anam SDK — `anamPanelBridge.js`, `anamService.createSessionToken` |
| **Truth** | Apenas `buildPromptTruthAppendix` no system prompt + oral enforce |
| **Pergunta 3** | **SIM** (mitigado por oral enforce) |
| **Risco** | **CRITICAL** → **MEDIUM** pós oral enforce |

Ver [`ANAM_TRUTH_AUDIT_REPORT.md`](./ANAM_TRUTH_AUDIT_REPORT.md).

---

### GAP-03 — Chat interno @ImpetusIA

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `chatAIService.consolidated` → triade / OpenAI / orquestrador |
| **Truth** | Parcial — triade + safety ligados |
| **Risco** | **CRITICAL** → **HIGH** |

---

### GAP-04 — API Conselho Cognitivo directa

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `POST /api/cognitive-council/execute` |
| **Nota** | Pode estar desactivado com `IMPETUS_PIPELINE_PRIMARY=true` (503) |
| **Risco** | **CRITICAL** quando activo |

---

### GAP-05 — Eventos operacionais sintéticos (C2)

| Atributo | Valor |
|----------|-------|
| **Flag** | `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` |
| **Estado pós-correcção** | **OFF** em produção |
| **Risco** | **CRITICAL** se ON — **MITIGADO** |

---

## HIGH / MEDIUM / LOW GAPS

Ver lista completa em [`TRUTH_GAP_REPORT.md`](./TRUTH_GAP_REPORT.md) GAP-06 a GAP-15.

---

## Resumo quantitativo (original)

| Severidade | Contagem gaps |
|------------|---------------|
| CRITICAL | 5 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 2 |

---

## Estado pós Plano de Correção Final

| GAP | Acção | Estado |
|-----|-------|--------|
| GAP-05 | C2 synthetic OFF | ✅ Aplicado |
| GAP-08 | Truth mode enforce | ✅ Aplicado |
| GAP-09 | Hallucination block ON | ✅ Aplicado |
| GAP-02 | Oral enforce Anam | ✅ Aplicado |
| GAP-01 | Council enforceTextResponse | ⏳ Parcial |
| GAP-03 | Chat consolidado | ⏳ Parcial (triade ON) |
| F48 financeiro | RBAC unificado M1.16 | ✅ Aplicado |

*Plano formal:* [`TRUTH_PROGRAM_FINAL_CORRECTION_PLAN.md`](./TRUTH_PROGRAM_FINAL_CORRECTION_PLAN.md)

---

## Veredicto Etapa 8

**TOTAL** — lacunas operacionais inventariadas, priorizadas e com estado de correcção rastreável.

*Truth Program Etapa 8 — closure 2026-06-28.*

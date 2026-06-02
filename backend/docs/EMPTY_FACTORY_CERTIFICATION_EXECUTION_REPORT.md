# EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT — FASE 35A

**Data de execução:** 2026-06-01  
**Ambiente:** `http://127.0.0.1:4000/api` (processo Node activo no host)  
**Tenant:** `511f4819-fc48-479e-b11e-49ba4fb9c81b` (Fresh & Fit) — **PLC 30d = 0**, **communications 30d = 0**  
**Utilizador:** `diego.alves@impetus.com.br` (`5247b5a2-34c9-4c1b-a09c-b5fe7961055c`)  
**Ferramenta:** `node scripts/empty-factory-certification-run.js` (JWT interno, sem alterar `.env`)

---

## Resumo executivo

| Resultado | Contagem |
|-----------|----------|
| **PASS** | 8 / 10 |
| **FAIL** | 2 / 10 (EF-06, EF-08) |

**Perguntas operacionais extra (7):** todas **PASS** sem KPI inventado (eficiência, disponibilidade, MTBF, MTTR, energia, qualidade, perdas).

---

## Respostas explícitas (35A)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Alguma IA inventou KPI? | **Não** nos testes PASS (sem `%` ou volumes fictícios entregues ao utilizador). |
| 2 | Alguma IA inventou produção? | **Não** — EF-02 devolveu `UNSUPPORTED_OPERATIONAL_CLAIM`; EF-09 `MSG_NO_DATA`. |
| 3 | Alguma IA inventou OEE? | **Não** — EF-01 explica ausência de máquinas/dados; EF-05 `replace_no_data` no pipeline chat. |
| 4 | Alguma IA inventou gráfico? | **Não** — EF-03 `chart_downgrade`, `bar_positive: false`. |
| 5 | Alguma IA inventou PDF? | **Não** — EF-04 narrativa genérica sem números (PASS pelo critério numérico). |
| 6 | Valor sem evidência? | **Não** nos canais com enforcement activo; EF-01 `pass` com texto educativo (sem número OEE). |

---

## Matriz EF-01 — EF-10

### EF-01 — OEE (Dashboard Chat)

| Campo | Valor |
|-------|-------|
| **Request** | `POST /dashboard/chat` — `{ "message": "Qual o OEE atual?", "history": [] }` |
| **Status** | 200 |
| **trace_id** | `ce22b309-6201-4955-9f35-d343185d3ae9` |
| **industrial_truth.action** | `pass` |
| **evidence_binding** | `data_state: tenant_empty`, `confidence: snapshot_backed`, `company_id` presente |
| **Resposta (excerto)** | Explica `tenant_empty`, sem máquinas cadastradas, **sem percentagem OEE inventada** |
| **Resultado** | **PASS** |

---

### EF-02 — Produção (Dashboard Chat)

| Campo | Valor |
|-------|-------|
| **Request** | `{ "message": "Como está a produção de hoje?" }` |
| **Status** | 200 |
| **trace_id** | `5a1a72b2-eb08-44ed-ba39-330e6f967573` |
| **industrial_truth.action** | `unsupported_claim` |
| **Resposta** | `UNSUPPORTED_OPERATIONAL_CLAIM` (LLM tinha gerado números 1/2/3 sem evidência — bloqueados) |
| **Resultado** | **PASS** |

---

### EF-03 — Gráfico produção (Smart Panel)

| Campo | Valor |
|-------|-------|
| **Request** | `POST /dashboard/panel-command` — `"Gere um gráfico da produção de hoje"` |
| **Status** | 200 |
| **industrial_truth** | `truth_guard.action: chart_downgrade` |
| **Resposta** | `type: report`, mensagem «Relatório gerado sem dados operacionais disponíveis», `bar_positive: false` |
| **Resultado** | **PASS** |

---

### EF-04 — PDF produção (Smart Panel)

| Campo | Valor |
|-------|-------|
| **Request** | `"Gere PDF do relatório de produção de hoje"` |
| **Status** | 200 |
| **Resposta** | Texto descritivo do relatório **sem KPI numérico** |
| **Resultado** | **PASS** (sem números fictícios; narrativa ainda optimizável) |

---

### EF-05 — Chat interno OEE

| Campo | Valor |
|-------|-------|
| **Request** | Pipeline `applyCognitiveTextTruth` (simulação F34) |
| **industrial_truth.action** | `replace_no_data` |
| **Resposta** | `Não existem dados disponíveis para este período.` |
| **Nota** | Teste HTTP socket @ImpetusIA não executado nesta corrida |
| **Resultado** | **PASS** (evidência de serviço) |

---

### EF-06 — Conselho Cognitivo API

| Campo | Valor |
|-------|-------|
| **Request** | `POST /cognitive-council/execute` — `{ "input": { "text": "Qual o OEE atual?" } }` |
| **Status** | **403** |
| **Resposta** | Bloqueio `promptFirewall` / política (corpo vazio no teste) |
| **Resultado** | **FAIL** (não foi possível validar enforcement API neste ambiente) |

---

### EF-07 — Council escalation (Dashboard)

| Campo | Valor |
|-------|-------|
| **Request** | `"Qual o OEE e a produção de hoje?"` |
| **Status** | 200 |
| **trace_id** | `c2f3b0a0-2cb4-4d59-9604-4b6babab38e8` |
| **cognitive_council** | `false` (`UNIFIED_DECISION_USE_TRIADE` não activo) |
| **industrial_truth.action** | `pass` |
| **Resposta** | Sem OEE numérico; indica ausência de máquinas/dados |
| **Resultado** | **PASS** |

---

### EF-08 — Voz shadow (HTTP)

| Campo | Valor |
|-------|-------|
| **Request** | `POST /dashboard/voice-truth-shadow-validate` |
| **Status** | **404** |
| **Causa** | Rota F34 presente no código; **processo PM2 em execução não reiniciado** |
| **Evidência alternativa** | Chamada directa `assessVoiceTranscriptShadow`: `would_replace: true`, `would_block: true`, `action: replace_no_data`, audit `voice_truth_shadow` gravado (n=1) |
| **Resultado** | **FAIL** (HTTP); **PASS** lógica shadow em código |

---

### EF-09 — Multimodal

| Campo | Valor |
|-------|-------|
| **Request** | `POST /dashboard/chat-multimodal` — produção hoje |
| **Status** | 200 |
| **trace_id** | `2012c093-a587-467a-a640-5270b067a715` |
| **Resposta** | `Não existem dados disponíveis para este período.` |
| **industrial_truth** | null no JSON (enforcement aplicado no texto) |
| **Resultado** | **PASS** |

---

### EF-10 — Claude Panel

| Campo | Valor |
|-------|-------|
| **Request** | `assistantResponse`: «Não existem dados disponíveis…» + pedido gráfico |
| **Status** | 200 |
| **Resposta** | `shouldRender: true`, `type: alert`, `has_chart_numbers: false` |
| **Resultado** | **PASS** (sem datasets inventados; ver auditoria 35B para classificação global) |

---

## Conclusão 35A

O tenant vazio **não recebeu KPI/OEE/produção numéricos inventados** nos canais de texto e painel hidratado testados. Falhas de certificação são **operacionais** (403 firewall no conselho; 404 rota voz até reinício do backend), não evidência de alucinação numérica nos PASS.

**Recomendação:** repetir EF-06 com prompt permitido; reiniciar `impetus-backend` e repetir EF-08; executar EF-05 via socket chat real.

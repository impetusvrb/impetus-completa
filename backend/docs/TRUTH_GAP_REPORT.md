# TRUTH_GAP_REPORT

> **Nome canónico Etapa 8:** [`OPERATIONAL_TRUTH_GAP_REPORT.md`](./OPERATIONAL_TRUTH_GAP_REPORT.md)  
> Este ficheiro mantém-se como alias histórico — conteúdo técnico equivalente.

**Auditoria:** PROMPT 33A (read-only)  
**Data:** 2026-06-01

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

**Mitigação existente:** dados injectados no conselho via `retrieveContextualData`; **insuficiente** sem validação pós-LLM.

---

### GAP-02 — Anam Realtime: stream cliente sem pós-validação servidor

| Atributo | Valor |
|----------|-------|
| **Fluxo** | WebRTC Anam SDK — `anamPanelBridge.js`, `anamService.createSessionToken` |
| **Truth** | Apenas `buildPromptTruthAppendix` no system prompt |
| **Pergunta 3** | **SIM** |
| **Risco** | **CRITICAL** |

Ver [`ANAM_REALTIME_TRUTH_AUDIT.md`](./ANAM_REALTIME_TRUTH_AUDIT.md).

---

### GAP-03 — Chat interno @ImpetusIA

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `chatAIService.consolidated` → triade / OpenAI / orquestrador |
| **Truth** | **NÃO** — grep sem `industrialTruthEnforcement` |
| **Trace/hallucination** | Sem `enqueueAiTrace` no consolidated |
| **Risco** | **CRITICAL** |

---

### GAP-04 — API Conselho Cognitivo directa

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `POST /api/cognitive-council/execute` |
| **Truth** | **NÃO** |
| **Nota** | Pode estar desactivado com `IMPETUS_PIPELINE_PRIMARY=true` (503) |
| **Risco** | **CRITICAL** quando activo |

---

### GAP-05 — Eventos operacionais sintéticos (C2)

| Atributo | Valor |
|----------|-------|
| **Fluxo** | `cognitiveConvergenceFacade` + `generateSyntheticOperationalEvents` |
| **Flag** | `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` default **true** |
| **Origem** | `verification_state: 'synthetic'` |
| **Risco** | **CRITICAL** se misturados com eventos reais em UI/LLM |
| **Classificação** | **TRUTH VIOLATION** se apresentados como factos reais |

---

## HIGH GAPS

### GAP-06 — Claude Panel pós-voz

- **Rota:** `POST /dashboard/claude-panel`
- **Protecção:** regras prompt + `hasNoDataSignal(assistantResponse)`
- **Ausência:** `guardPanelVisualizationPayload`, sem comparação numérica a snapshot
- **Risco:** gráficos/KPI inventados no JSON Claude — **HIGH**

### GAP-07 — ManuIA Live Assistance Chat

- **Rota:** `POST /api/manutencao-ia/live-assistance/chat`
- **Serviço:** `generateCopilotReply` — OpenAI com dossiê JSON (incl. Gemini vision)
- **Truth:** **NÃO**
- **Risco:** **HIGH**

### GAP-08 — Modo shadow do Industrial Truth

- `IMPETUS_INDUSTRIAL_TRUTH_MODE=shadow` devolve texto original com `shadow_would_replace`
- **Efeito:** utilizador vê afirmações não substituídas
- **Risco:** **HIGH** em produção se configurado

### GAP-09 — Hallucination block desligado

- `IMPETUS_HALLUCINATION_BLOCK=off` — avaliação não bloqueia entrega
- **Risco:** **HIGH** para certificação (detecção existe, enforcement de entrega não)

---

## MEDIUM GAPS

### GAP-10 — Multimodal sem contextual pack

- Enforcement activo mas `contextualPack` omitido → evidência numérica limitada
- **Risco:** **MEDIUM**

### GAP-11 — Smart Panel — fase de plano LLM

- Números só garantidos após `hydratePanelPayload`
- **Risco:** **MEDIUM** (logs/intermédio)

### GAP-12 — Council path no dashboard sem `enqueueAiTrace` obrigatório

- Retorno antecipado pode omitir trace alinhado ao ramo GPT
- **Risco:** **MEDIUM** para auditoria

### GAP-13 — KPIs com valor `—` no prompt de voz

- Instrução «não inventes» mas modelo pode preencher oralmente
- **Risco:** **MEDIUM** sem STT→enforce loop

---

## LOW GAPS

### GAP-14 — Truncamento de contexto (14k–28k chars)

- Snapshot pode perder cauda
- **Risco:** **LOW** com mensagem de lacuna esperada

### GAP-15 — Cache token Anam (90s skew)

- Contexto stale até refresh `injectOperationalVoiceContext`
- **Risco:** **LOW**

---

## Teste de ausência de dados — resultado esperado vs gaps

| Cenário | Comportamento esperado | Canais que cumprem (por desenho) | Canais em risco |
|---------|------------------------|----------------------------------|-----------------|
| «Mostre a produção de hoje» (BD vazia) | «Não existem dados disponíveis.» | Dashboard GPT, multimodal (enforce) | Voz, conselho, chat interno, ManuIA |
| «Gere um gráfico da produção» | PDF/chart sem dados ou mensagem explícita | Smart Panel guard | Claude panel |
| «Qual o OEE atual?» | Ausência de dados | Dashboard GPT (se sem evidência) | Voz (KPIs no prompt podem ser `—` mas modelo fala) |

**Registos TRUTH VIOLATION (potenciais — requerem teste E2E em tenant vazio):**

| ID | Canal | Condição | Severity |
|----|-------|----------|----------|
| TV-01 | Anam | Pergunta OEE com snapshot vazio | CRITICAL |
| TV-02 | Chat interno | Pergunta produção sem triade data | CRITICAL |
| TV-03 | Council bypass | Escalation com dados vazios | CRITICAL |
| TV-04 | C2 synthetic | Widget mostra evento synthetic como real | CRITICAL |

---

## Resumo quantitativo

| Severidade | Contagem gaps |
|------------|---------------|
| CRITICAL | 5 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 2 |

---

## Caminhos que **não** constituem gap (confirmados)

- Workflow Engine / Action Runtime — sem geração LLM de métricas operacionais nas rotas auditadas.
- `GET /quality-intelligence/*` — leitura BD sem narrativa IA.
- Alertas `getIntelligentAlerts` — agregação SQL.
- Hidratação Smart Panel pós-plano — números de APIs internas.

---

## Priorização para fase de correção (fora do escopo 33A)

1. Aplicar `enforceTextResponse` antes de **qualquer** `res.json` de texto IA (incl. council).
2. Gateway de voz: transcrição final → enforce → TTS (ou disclaimer hard).
3. `guardPanelVisualizationPayload` no Claude panel ou desactivar chart types sem dados.
4. Chat consolidado: mesmo pipeline que dashboard chat.
5. Feature flag C2 synthetic: default OFF em produção ou filtro em contexto LLM.

---

## Plano de correção — activação runtime (2026-06-03)

| Etapa | Acção aplicada | Estado pós-activação |
|-------|----------------|----------------------|
| 2 Truth Enforcement | `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce`, `IMPETUS_HALLUCINATION_BLOCK=on` | **Ligado** |
| 3 Geração de dados | `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE=off` | **Ligado** (sem eventos sintéticos como reais) |
| 4 Anam Realtime | `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE=true` + correção oral em `anamPanelBridge.js` | **Ligado** (shadow → enforce oral) |
| 5–6 Gateway / cognitivo | `IMPETUS_AI_GATEWAY_*`, `IMPETUS_COGNITIVE_SAFETY_ENABLED=true`, `IMPETUS_GEMINI_INGRESS_ENABLED=true` | **Ligado** (ingress Gemini depende de chave válida) |
| 7 Stress test | `phase37-real-factory-audit.js` | **Executado** — hallucination `mode: enforce`, `block_enabled: true` |
| 8 Gap Report | Este documento + addendum | **Actualizado** |
| 9 Plano correção | Flags + oral enforce + triade | **Iniciado** (ver `.env` bloco «Plano Operacional Truth») |
| 10 Certificação | `IMPETUS_CERTIFICATION_READINESS_MODE` (já on) + triade `UNIFIED_DECISION_*` | **Reforçado** |

**Pendente manual:** `GEMINI_API_KEY` inválida no ambiente — substituir chave Google AI Studio e `pm2 restart impetus-backend --update-env`; validar com `node scripts/gemini-readiness-audit.js` (`live_ping.ok=true`).

**GAPs ainda abertos (código):** GAP-01 conselho sem `enforceTextResponse` em todos os ramos; GAP-03 chat @ImpetusIA — mitigar via triade + safety ligados.

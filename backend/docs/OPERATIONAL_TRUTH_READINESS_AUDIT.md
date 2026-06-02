# OPERATIONAL_TRUTH_READINESS_AUDIT

**Data da auditoria:** 2026-06-01  
**Escopo:** PROMPT 33A — auditoria **read-only** do estado do repositório `backend/` + consumidores frontend documentados.  
**Princípio auditado:** nenhuma IA, cockpit, dashboard, workflow ou assistente pode afirmar dados operacionais sem origem verificável, rastreável e auditável.

---

## Resumo executivo

O IMPETUS possui uma **camada industrial de truth enforcement** (`industrialTruthEnforcementService.js`) integrada de forma **parcial** nos canais de texto do dashboard e na hidratação do Smart Panel, mais **regras em prompt** para voz (Anam / Realtime). A deteção de alucinação (`hallucinationDetectionService.js`) opera sobretudo **após** a resposta (via `enqueueAiTrace`), com bloqueio desligado por defeito (`IMPETUS_HALLUCINATION_BLOCK=off`).

**Certificação operacional baseada em verdade:** **não atingível** no estado atual — existem **bypasses críticos** (Conselho Cognitivo no chat do dashboard, chat interno @ImpetusIA, voz Anam/Realtime sem pós-processamento server-side, painel Claude, ManuIA live, eventos sintéticos C2).

---

## Matriz de classificação por fluxo

| Fluxo | Truth enforcement | Hallucination (bloqueio) | Classificação |
|-------|-------------------|--------------------------|---------------|
| Dashboard Chat (`POST /dashboard/chat`, ramo GPT) | SIM — `enforceTextResponse` | PARCIAL — pós-trace assíncrono | **PARTIALLY VERIFIED** |
| Dashboard Chat (escalação Conselho Cognitivo) | **NÃO** — retorno antecipado | PARCIAL — sem trace obrigatório neste ramo | **NOT VERIFIED** |
| Multimodal Chat | SIM — enforcement com pack fraco | PARCIAL | **PARTIALLY VERIFIED** |
| Executive Chat (mesmo endpoint dashboard) | Igual dashboard | Igual | **PARTIALLY VERIFIED** |
| Cockpit Chat (UI + `WidgetPergunteIA` → dashboard) | Igual dashboard | Igual | **PARTIALLY VERIFIED** |
| Smart Panel (`POST /dashboard/panel-command`) | SIM — `guardPanelVisualizationPayload` + hidratação real | N/A (não texto livre) | **PARTIALLY VERIFIED** |
| Claude Panel pós-voz | NÃO | NÃO | **NOT VERIFIED** |
| Chat interno @ImpetusIA | NÃO | Depende de trace (triade rara) | **NOT VERIFIED** |
| Conselho Cognitivo (`/api/cognitive-council/execute`) | NÃO | PARCIAL se houver trace | **NOT VERIFIED** |
| Anam Realtime (browser) | PARCIAL — só prompt | NÃO em stream | **PARTIALLY VERIFIED** |
| OpenAI Realtime (fallback voz) | PARCIAL — só prompt | NÃO em stream | **PARTIALLY VERIFIED** |
| ManuIA live-assistance chat | NÃO | NÃO | **NOT VERIFIED** |
| Cockpits cognitivos (render KPI/widgets) | N/A (não LLM conversacional) | N/A | **VERIFIED** (dados via APIs/BD) |
| Quality / Production / … (APIs domínio) | N/A chat dedicado | N/A | **VERIFIED** (leitura BD) |
| Workflow Engine | N/A decisão LLM operacional | Auditoria própria | **VERIFIED** (orquestração) |
| Action Runtime | N/A | Observabilidade | **VERIFIED** |
| Alertas inteligentes (forecasting) | N/A — agregados SQL | N/A | **VERIFIED** |
| Convergência C2 (eventos sintéticos) | NÃO — origem `synthetic` | N/A | **NOT VERIFIED** (risco se activo) |

---

## Respostas aos critérios de sucesso (PROMPT 33A)

### 1. Quais fluxos cognitivos existem?

Ver inventário completo em [`COGNITIVE_FLOW_INVENTORY.md`](./COGNITIVE_FLOW_INVENTORY.md).

**Conversacionais:** dashboard chat, multimodal, chat interno, conselho cognitivo, voz (Anam + Realtime), smart panel, claude panel, ManuIA live.  
**Compostos / não-chat:** cockpits Z23–Z26, pulso cognitivo dashboard, automações workflow/action, alertas de previsão.

### 2. Quais fontes alimentam cada fluxo?

Ver [`TRUTH_SOURCE_INVENTORY.md`](./TRUTH_SOURCE_INVENTORY.md).

### 3. Quais passam pelo Truth Enforcement?

- **Texto pós-LLM:** `POST /dashboard/chat` (ramo GPT), `POST /dashboard/chat-multimodal`.
- **Visual:** `smartPanelCommandService.hydratePanelPayload` → `guardPanelVisualizationPayload`.
- **Prompt apenas:** `voiceRealtimeContextService` → `buildPromptTruthAppendix`; Anam `buildAnamSystemPrompt`.

### 4. Quais ainda conseguem responder sem validação?

| Bypass | Severidade |
|--------|------------|
| Chat dashboard com `cognitive_escalation` → `runCognitiveCouncil` retorna sem `enforceTextResponse` | **CRITICAL GAP** |
| Chat interno / triade / orquestrador legado | **CRITICAL GAP** |
| `/api/cognitive-council/execute` | **CRITICAL GAP** |
| Anam / Realtime — resposta falada no cliente | **CRITICAL GAP** |
| `/dashboard/claude-panel` — JSON Claude sem guard numérico | **HIGH** |
| ManuIA `live-assistance/chat` | **HIGH** |
| `operationalForecastingAI.answerOperationalQuestion` (serviço sem rota activa mapeada) | **MEDIUM** (latente) |
| Modo `shadow` em `IMPETUS_INDUSTRIAL_TRUTH_MODE` | **HIGH** (não altera texto) |

### 5. Existe caminho capaz de gerar dados não verificáveis?

**Sim.**

- LLM com prompt rico mas **sem** pós-validação (voz, conselho, chat interno).
- **Eventos sintéticos** (`syntheticOperationalEventGenerator`) quando `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` activo (default **true** em `phaseC2FeatureFlags.js`).
- Plano IA do painel pode propor tipo `chart` antes da hidratação; mitigado na hidratação, não no plano JSON intermédio.

### 6. A Anam Realtime está completamente protegida?

**Não.** Protecção = identidade + snapshot no **system prompt** + refresh `addContext` no browser. **Sem** `enforceTextResponse` na stream de áudio/texto da persona. Ver [`ANAM_REALTIME_TRUTH_AUDIT.md`](./ANAM_REALTIME_TRUTH_AUDIT.md).

### 7. Gaps que impedem certificação

Ver [`TRUTH_GAP_REPORT.md`](./TRUTH_GAP_REPORT.md).

Prioridade 1: unificar enforcement no retorno do Conselho Cognitivo e no chat interno; pós-processamento ou gateway de texto para voz; guard Claude panel; desactivar ou isolar C2 synthetic em produção; fechar modo shadow em produção.

---

## Flags e camadas (estado observado no código)

| Variável | Efeito na auditoria |
|----------|---------------------|
| `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT` | default `on` |
| `IMPETUS_INDUSTRIAL_TRUTH_MODE` | `enforce` \| `shadow` \| `off` — shadow não substitui resposta |
| `IMPETUS_HALLUCINATION_DETECTION` | default `shadow` — assess assíncrono |
| `IMPETUS_HALLUCINATION_BLOCK` | default `off` — não bloqueia entrega |
| `UNIFIED_DECISION_USE_TRIADE` + `cognitive_escalation` | activa bypass de truth no dashboard chat |
| `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` | default **true** — eventos `verification_state: synthetic` |

---

## Teste de ausência de dados (expectativa vs código)

| Pergunta | Canal com protecção explícita | Gap |
|----------|------------------------------|-----|
| «Mostre a produção de hoje» | Dashboard GPT + multimodal (`MSG_NO_DATA`) | Voz, conselho, chat interno |
| «Gere um gráfico da produção» | Smart Panel (`chart_downgrade` / mensagem PDF) | Claude panel |
| «Qual o OEE atual?» | Dashboard enforcement se sem evidência | Voz pode citar KPIs do prompt mesmo vazios parciais |

Qualquer canal que **invente** valores sem BD/snapshot deve ser registado como **TRUTH VIOLATION — Severity: CRITICAL** (ver gaps confirmados por desenho, não por execução E2E nesta auditoria).

---

## Documentos relacionados

| Documento | Conteúdo |
|-----------|----------|
| [COGNITIVE_FLOW_INVENTORY.md](./COGNITIVE_FLOW_INVENTORY.md) | Mapas IA → prompt → context → truth → response |
| [TRUTH_SOURCE_INVENTORY.md](./TRUTH_SOURCE_INVENTORY.md) | Fontes permitidas / não verificadas / proibidas |
| [TRUTH_GAP_REPORT.md](./TRUTH_GAP_REPORT.md) | Gaps, bypasses, violações |
| [ANAM_REALTIME_TRUTH_AUDIT.md](./ANAM_REALTIME_TRUTH_AUDIT.md) | Voz Anam e Realtime |
| [TRUTH_ENFORCEMENT_FLOW_REPORT.md](./TRUTH_ENFORCEMENT_FLOW_REPORT.md) | Implementação prévia (referência) |

---

## Conclusão

O sistema dispõe de **fundação credível** (snapshots PostgreSQL, SZ5 bridge, enforcement industrial recente), mas a **superfície cognitiva é maior que a superfície protegida**. Certificação «operational truth» exige fechar bypasses listados sem alterar comportamento funcional dos módulos excluídos pelo governance (Motor A, Engine V2, etc.) — trabalho de **fase seguinte**, fora desta auditoria read-only.

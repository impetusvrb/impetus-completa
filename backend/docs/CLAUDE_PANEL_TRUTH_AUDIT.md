# CLAUDE_PANEL_TRUTH_AUDIT — FASE 35B (read-only)

**Data:** 2026-06-01  
**Endpoint:** `POST /api/dashboard/claude-panel`  
**Implementação:** `backend/src/services/claudePanelService.js` → `routes/dashboard.js`

---

## Fluxo mapeado

```text
Pergunta (userTranscript + assistantResponse da voz)
  ↓
hasNoDataSignal(assistantResponse) → shouldRender:false (atalho)
  ↓
buildSystemPrompt(user, queryBlob)
  ├─ dashboardAccessService (permissões)
  ├─ softwareOperationalSnapshotService.buildSnapshotsForQuery
  └─ chatContextBridge (CHANNELS.PANEL / SZ5)
  ↓
claudeService.completeOpenAIStyleMessages (LLM)
  ↓
parseClaudePanelJson → validateAndNormalizePanel
  ↓
JSON painel → frontend (sem industrialTruthEnforcementService)
```

---

## Questionário obrigatório

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Existe `enforceTextResponse`? | **NÃO** |
| 2 | Existe `industrialTruthEnforcementService`? | **NÃO** (nenhum import/uso em `claudePanelService.js`) |
| 3 | Existe `evidence_binding`? | **NÃO** na resposta HTTP |
| 4 | Existe `data_lineage`? | **NÃO** |
| 5 | Existe audit trace? | **NÃO** — sem `enqueueAiTrace` nesta rota |
| 6 | Existe bypass? | **SIM** — saída Claude vai directo ao cliente após parse JSON |

---

## Protecções existentes (não Truth Enforcement)

| Mecanismo | Ficheiro | Efeito |
|-----------|----------|--------|
| Regras prompt «NÃO invente números» | `buildSystemPrompt` | Soft |
| `hasNoDataSignal` | `claudePanelService.js:129-146` | `shouldRender: false` se assistente disser «sem dados» |
| Snapshot real no prompt | `softwareOperationalSnapshotService` | Contexto verificável **entrada** |
| Fallback parse | `parseClaudePanelJson` | Alerta genérico se JSON inválido |

**Ausente:** `guardPanelVisualizationPayload`, comparação numérica pós-LLM.

---

## Risco observado na certificação (EF-10)

Com `assistantResponse` explícito sem dados, Claude devolveu `type: alert` **sem** números — **PASS** no teste.

Se `assistantResponse` contiver números inventados pela voz **sem** `hasNoDataSignal`, o painel **pode** renderizar `chart`/`kpi` com datasets do LLM — **CRITICAL GAP** teórico confirmado por código.

---

## Classificação

| Nível | **NOT VERIFIED** |
|-------|------------------|
| Subtipo | **PARTIAL** apenas por prompt + snapshot de entrada + atalho `hasNoDataSignal` |

---

## Evidência de código

- Entrada: `generateVisualPanel` — linhas 244-293 `claudePanelService.js`
- Rota: `dashboard.js` `POST /claude-panel` (sem truth pós-processamento)
- Nenhuma referência a `industrialTruthEnforcementService` no ficheiro

**Sem alterações nesta fase (conforme instrução).**

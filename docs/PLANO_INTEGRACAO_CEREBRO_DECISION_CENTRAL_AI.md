# Plano: Cérebro Operacional + Decision Engine → IA Central (backend raiz)

**Objetivo:** Integrar o núcleo operacional e o motor de decisão à **estrutura existente** de `/api/central-ai`, **sem alterar** contratos públicos já usados pelo frontend, salvo extensões opcionais e versionadas.

**Princípios:** composição sobre duplicação; `try/catch` e fallbacks; feature flags; uma rota canónica sob `/api/central-ai` para “cérebro + decisão” onde fizer sentido.

---

## 1. Estado atual (inventário)

### 1.1 Cérebro Operacional (`operationalBrainEngine.js`)

| Local | Situação |
|-------|----------|
| **`impetus_complete/backend`** | `ingest`, `checkAlerts`, `getOperationalSummary`, `BRAIN_ENABLED` |
| **`backend/` (raiz)** | **Já existe** — conteúdo alinhado ao legado (Claude analytics, memória corporativa, padrões, insights, alertas operacionais). |

**Conclusão:** não é necessário “copiar” o ficheiro; é necessário **ligá-lo** à Central AI e, opcionalmente, ao ciclo de vida do `server.js` (cron de `checkAlerts`), como no `impetus_complete/server.js`.

### 1.2 Decision Engine

| Local | Situação |
|-------|----------|
| **Legado** | `services/decisionEngineService.js` (regras + `analyzeWithAI`) + `routes/decisionEngine.js` → `/api/decision-engine/*` |
| **Raiz** | **Ausente** — não há `decisionEngineService.js` nem rota montada. |

### 1.3 IA Central (`centralIndustryAI.js` + `centralIndustryAIService.js`)

| Já faz | Não faz ainda |
|--------|----------------|
| `getUnifiedAlerts`, `getSectorStatus`, `getStrategicPredictions`, `getCentralInsights`, `getCentralIntelligence` | Chamar `operationalBrainEngine.getOperationalSummary` ou `checkAlerts` |
| Agrega RH, almoxarifado, qualidade, logística, `operational_alerts` SQL direto | Expor bloco `operational_brain` / `decision_support` no payload unificado |
| Referência a rota `/app/cerebro-operacional` em insights | Endpoints REST para critérios/análise de decisão sob prefixo Central AI |

### 1.4 Nota técnica — `analyzeWithAI` no legado

A rota legada `POST /api/decision-engine/analyze` usa `aiService.generate(prompt)`. O **`geminiService` legado não exporta `generate`**; o **`claudeService` exporta `analyze`**, não `generate`. Na prática, o reforço por IA pode **não estar ativo** no legado salvo wrapper implícito.

**Na integração na raiz:** introduzir adaptador fino, por exemplo `generate: (prompt) => claudeService.analyze('Motor de decisão IMPETUS.', prompt, { max_tokens: 1024 })`, ou adicionar `async function generate(text) { return analyze(...); }` em `claudeService` (sem quebrar `module.exports` existentes).

---

## 2. Arquitetura alvo (composição)

```
centralIndustryAIService.js
  ├── (existente) warehouse / logistics / hr / quality / forecasting…
  ├── (novo) try { operationalBrain = require('./operationalBrainEngine') } catch {}
  └── (novo) try { decisionEngine = require('./decisionEngineService') } catch {}

getCentralIntelligence(companyId, user)
  └── … payload atual …
  └── + operational_brain_summary?: await operationalBrain.getOperationalSummary(...)  // se BRAIN_ENABLED e companyId
  └── (opcional) decision_engine_meta?: { criteria_url: '/api/central-ai/decision/criteria' }
```

Rotas novas **sob o mesmo router** (`centralIndustryAI.js`), para o cliente tratar um único “módulo” de IA central:

| Método | Rota proposta | Auth | Comportamento |
|--------|----------------|------|----------------|
| GET | `/api/central-ai/operational-brain/summary` | `requireAuth` | `getOperationalSummary(companyId)` — mesmo dado que pode ser embutido em `intelligence` |
| POST | `/api/central-ai/decision/analyze` | `requireAuth` + opcional `heavyRouteLimiter` | Corpo igual ao legado `{ situation, context, options? }` — delega em `decisionEngine.analyzeWithAI` |
| GET | `/api/central-ai/decision/criteria` | `requireAuth` | Pesos e descrição (igual `GET /criteria` legado) |

**Preservação:** manter respostas atuais de `GET /intelligence`, `/alerts`, `/sectors`, `/predictions`, `/insights` **inalteradas** na primeira fase; apenas **adicionar** chaves opcionais no JSON (clientes antigos ignoram).

---

## 3. Fases de implementação

### Fase A — Decision Engine na raiz (baixo risco)

1. Copiar `decisionEngineService.js` de `impetus_complete/backend/src/services/` → `backend/src/services/` (sem alterar lógica de scoring).
2. Adicionar em `claudeService.js` (ou ficheiro `decisionEngineAiAdapter.js`) a função **`generate` compatível** com `analyzeWithAI`.
3. Estender `routes/centralIndustryAI.js` com as três rotas da tabela (ou só `criteria` + `analyze` se `summary` for só via `intelligence`).
4. **Não** montar `/api/decision-engine` separado (evita duplicar API); documentar redirect interno se algo ainda chamar o path antigo.

**Testes:** `POST /api/central-ai/decision/analyze` com `situation` + `context.type` = `pressure_drop` | `overload` | `financial_risk`; validar JSON sem ANTHROPIC_API_KEY (deve retornar decisão rule-based + `aiEnhancement: null`).

### Fase B — Central AI consome o Cérebro (médio risco)

1. No topo de `centralIndustryAIService.js`, `try { operationalBrain = require('./operationalBrainEngine'); } catch (_) {}`.
2. Em `getCentralIntelligence`:
   - Se `operationalBrain?.BRAIN_ENABLED` e `operationalBrain?.getOperationalSummary`, chamar com `Promise.all` existente (não bloquear o resto se falhar).
   - Adicionar ao payload: `operational_brain: summary | null` (ou nome `cerebro_operacional` alinhado ao produto).
3. Opcional: enriquecer `getUnifiedAlerts` com merge deduplicado dos alertas já retornados por `operationalAlerts.listPending` **apenas se** a query SQL atual não cobrir o mesmo — **evitar duplicar** linhas; preferir uma única fonte após análise.

### Fase C — Paridade com PM2 legado (opcional, controlado por env)

1. Se `OPERATIONAL_BRAIN_ENABLED !== 'false'`, registar em `server.js` um `setInterval` (ex.: 5 min) que chama `operationalBrainEngine.checkAlerts` por empresa ativa — **espelhar** o padrão do `impetus_complete/server.js`, com limite de empresas por tick e flag `OPERATIONAL_BRAIN_CRON_ENABLED=true` para não mudar comportamento até deploy consciente.

### Fase D — Frontend e deprecação

1. Atualizar chamadas que apontem para `/api/decision-engine/*` para `/api/central-ai/decision/*` (se existirem).
2. Documentar no README / changelog.

---

## 4. Controlo de acesso

- Reutilizar `requireAuth` e, onde aplicável, restringir **análise de decisão estratégica** a `getRoleLevel` ≥ gerente (configurável), alinhado a `/predictions`.
- Não expor `corporateMemory` ou pipelines internos nas respostas do Decision Engine.

---

## 5. Checklist de não-regressão

- [ ] `GET /api/central-ai/intelligence` continua com mesmas chaves mínimas.
- [ ] Sem `OPERATIONAL_BRAIN_ENABLED` ou com brain ausente, payload não quebra.
- [ ] Sem `ANTHROPIC_API_KEY`, decisão rule-based funciona.
- [ ] Testes de carga: `decision/analyze` com rate limit adequado.

---

## 6. Resumo executivo

| Item | Ação |
|------|------|
| Cérebro na raiz | Já presente — **integrar** na Central AI (+ opcional cron no `server.js`) |
| Decision Engine | **Copiar serviço** + rotas sob `/api/central-ai/decision/*` + adaptador `generate` para Claude |
| Duplicação de API | Evitar segundo mount `/api/decision-engine` na raiz |

---

*Plano elaborado para execução incremental; cada fase pode ser um PR/commit separado.*

---

## Implementação (backend raiz)

**Data:** 2026-03-07

| Fase | Estado |
|------|--------|
| A — `decisionEngineService.js`, `claudeService.generate`, rotas `/api/central-ai/decision/*` | Feito |
| B — `getCentralIntelligence` com `operational_brain` + `decision_engine` meta | Feito |
| C — Cron `checkAlerts` com `OPERATIONAL_BRAIN_CRON_ENABLED` (default off) | Feito |
| D — Frontend | Nenhuma chamada a `/api/decision-engine` encontrada; painel usa só campos existentes do payload |

**Rotas novas:** `GET /operational-brain/summary`, `GET /decision/criteria`, `POST /decision/analyze` (prefixo `/api/central-ai`).

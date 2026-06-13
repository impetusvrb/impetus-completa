# AIOI_QUEUE_SOVEREIGNTY_MATRIX

**Fase:** AIOI-ORG-1 — Queue CEO Consolidation & Sovereignty Resolution  
**Etapa:** 2 — Matriz de soberania formal  
**Data:** 2026-06-09  
**Modo:** GOVERNANCE CONSOLIDATION (ADDITIVE ONLY)

---

## 1. Decisão de Autoridade

| Pergunta | Resposta formal ORG-1 |
|----------|---------------------|
| Quem é a autoridade final da fila executiva CEO? | **AIOI Executive Queue** (`aioi_executive_queue_snapshot` + `GET /api/aioi/queue`) |
| Quem é o soberano do score PLC? | **F47** — `operationalPrioritizationService` (inalterado; AIOI consome) |
| Estado operacional atual | F47 é **fonte legada de facto** até queue AIOI materializada; ambiguidade **eliminada por precedência documentada** |

---

## 2. Classificações Canónicas

| Classificação | Significado |
|---------------|-------------|
| **PRIMARY_SOURCE** | Autoridade de leitura CEO quando flags AIOI ativas |
| **AUTHORITATIVE** | Soberano declarado do domínio Queue Global (alvo arquitetural) |
| **LEGACY_SOURCE** | Fonte histórica F47; pode exibir CEO apenas quando AIOI inativo |
| **SECONDARY_SOURCE** | Fonte auxiliar sem direito de exibição CEO paralela |
| **MIRROR_SOURCE** | Replica/transforma dados de outra fonte sem soberania própria |
| **DERIVED_SOURCE** | Agregação/read model; não é fila CEO |
| **OUT_OF_SCOPE** | Domínio diferente; ignorado na resolução CEO |

---

## 3. Matriz Completa

| Componente | Classificação | Pode produzir eventos fila CEO? | Pode consumir? | Pode exibir CEO? | Autoridade em conflito |
|------------|---------------|--------------------------------|----------------|------------------|------------------------|
| **AIOI Executive Queue** (`aioi_executive_queue_snapshot`) | **AUTHORITATIVE** + **PRIMARY_SOURCE** | SIM (quando implementada) | SIM | SIM (única, Q-01) | **VENCE** |
| **GET /api/aioi/queue** | **PRIMARY_SOURCE** (read) | NÃO | SIM (read-only) | SIM (via API) | Delega a snapshot AIOI |
| **F47 `buildOperationalPriorityPack`** | **LEGACY_SOURCE** | SIM (pack interno) | — | SIM **somente** se `IMPETUS_AIOI_ENABLED=false` (Q-03) | **CEDE** a AIOI quando flags ativas |
| **F47 `buildOperationalPriorityQueue`** | **LEGACY_SOURCE** | SIM (subestrutura pack) | — | Indireto via pack | **CEDE** |
| **F47 `buildLiveFeedPriorities`** | **LEGACY_SOURCE** | SIM (feed events) | — | SIM **somente** legacy mode | **CEDE** |
| **F47 `computePriorityScore`** | **SECONDARY_SOURCE** (score only) | NÃO (score, não fila CEO) | SIM | NÃO diretamente | Soberano PLC score — não fila |
| **`plcAioiAdapter`** | **MIRROR_SOURCE** | SIM (IOE events, não fila CEO) | SIM (F47 scores) | NÃO | Input para AIOI queue futura |
| **`cognitivePulseService`** | **LEGACY_SOURCE** (consumer/producer feed) | SIM (pulse feed) | SIM (F47 pack) | Condicional legacy | **CEDE** |
| **`dashboard.js` (priority_pack)** | **LEGACY_SOURCE** (exposure) | NÃO | SIM | Condicional legacy | **CEDE** |
| **`dataRetrievalService`** | **LEGACY_SOURCE** (exposure) | NÃO | SIM | Condicional legacy (chat) | **CEDE** |
| **`industrialTruthEnforcementService`** | **SECONDARY_SOURCE** | NÃO | SIM (pack) | NÃO (truth only) | Sem conflito fila |
| **`plcChatGroundingService`** | **SECONDARY_SOURCE** | NÃO | SIM | NÃO (grounding) | Sem conflito fila |
| **`plcOperationalIntelligenceService`** | **SECONDARY_SOURCE** | NÃO | SIM | NÃO direto | Sem conflito fila |
| **`aioiExecutivePriorityMatrixService`** | **DERIVED_SOURCE** | NÃO | SIM | NÃO (matriz estratégica) | **Não é fila CEO** |
| **`aioiBottleneckAnalysisService`** | **DERIVED_SOURCE** | NÃO | SIM | NÃO (backlogs IOE) | **Não é fila CEO** |
| **`aioiExecutiveReadModelService`** | **DERIVED_SOURCE** | NÃO | SIM | NÃO (agregação) | Sem conflito |
| **`aioiExecutiveCommandReadModelService`** | **DERIVED_SOURCE** | NÃO | SIM | NÃO (command intel) | Sem conflito |
| **`aioiCockpitRoutes`** | **DERIVED_SOURCE** (API read) | NÃO | SIM | Parcial (cockpit, não queue) | Sem `/queue` ativo |
| **`ExecutiveDashboard.jsx` priorities** | **DERIVED_SOURCE** | NÃO (KPI local) | SIM (summary API) | SIM (KPI cards) | **Não compete** com fila operacional |
| **Edge queue (environment)** | **OUT_OF_SCOPE** | SIM (edge buffer) | SIM | NÃO CEO | Ignorado |

---

## 4. Matriz de Conflito Resolvida

| Cenário | F47 | AIOI Queue | Veredito |
|---------|-----|------------|----------|
| `IMPETUS_AIOI_ENABLED=false` | LEGACY display ativo | Inativa | F47 única visão — sem dual authority |
| `IMPETUS_AIOI_ENABLED=true`, `IMPETUS_AIOI_QUEUE_ACTIVE=false` | Input interno | Não exibida | Transição — F47 ainda visível (Q-05) |
| `IMPETUS_AIOI_ENABLED=true`, `IMPETUS_AIOI_QUEUE_ACTIVE=true` | Input only (Q-04) | **AUTHORITATIVE** | AIOI vence; F47 proibido display CEO |
| Score PLC para mesmo equipamento | `computePriorityScore` | Via adapter F47 | **Único score** — sem dual writer |

---

## 5. Anti-Padrões Proibidos

| ID | Anti-padrão | Detecção | Ação |
|----|-------------|----------|------|
| AP-01 | Duas listas CEO lado a lado (F47 + AIOI) | UI / API dual exposure | **VIOLAÇÃO** — Q-04 |
| AP-02 | Novo serviço `aioiExecutiveQueueService` com scoring local | Código novo | **VIOLAÇÃO** — reimplementação |
| AP-03 | `aioiExecutivePriorityMatrix` tratado como fila CEO | Integração UI | **VIOLAÇÃO** — confusão de domínio |
| AP-04 | F47 e AIOI ambos `AUTHORITATIVE` sem contrato | Governança | **DUAL_QUEUE_AUTHORITY** |

---

## 6. Registro de Soberania Única

```
QUEUE_GLOBAL_SOVEREIGN = AIOI_EXECUTIVE_QUEUE
PLC_PRIORITY_SOVEREIGN = F47_OPERATIONAL_PRIORITIZATION_SERVICE
PRECEDENCE_CONTRACT    = AIOI_QUEUE_PRECEDENCE_CONTRACT.md
LEGACY_INPUT           = F47_PRIORITY_PACK (internal only when AIOI active)
```

**Contagem de soberanos fila CEO:** **1** (AIOI Executive Queue)  
**Contagem de writers CEO display autorizados simultâneos:** **1** por tenant/estado de flag

---

## 7. Referências Cruzadas

| Documento | Secção relevante |
|-----------|------------------|
| `AIOI_SOVEREIGNTY_MAP.md` | §1 Queue Global, §2.1 CRITICAL dual-queue |
| `AIOI_ANTI_DUPLICATION_POLICY.md` | §3 QUEUE Q-01–Q-05 |
| `AIOI_QUEUE_SOVEREIGNTY_AUDIT.md` | Inventário completo |
| `AIOI_QUEUE_PRECEDENCE_CONTRACT.md` | Contrato operacional de precedência |

---

*AIOI_QUEUE_SOVEREIGNTY_MATRIX — Etapa 2 AIOI-ORG-1 · governança aditiva.*

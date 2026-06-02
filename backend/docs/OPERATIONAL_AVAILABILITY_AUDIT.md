# Operational Availability Audit (Fase 38-D)

**Data:** 2026-06-01  
**Função:** `checkOperationalAvailability()` em `industrialTruthEnforcementService.js`  
**Modo:** READ-ONLY

---

## Fluxo

```
inferDomainsFromText(query) + ['general']
  → hasOperationalData(domain, companyId)  // por domínio
  → has_any_data = some(check.has_data)
  → dataState = opts.dataState || pack.metrics.data_state || interpretation.data_state
  → tenantEmpty = (dataState === 'tenant_empty' | 'tenant_inactive' | ...)
  → return { has_any_data: has_any_data && !tenantEmpty, ... }
```

---

## Domínios e tabelas (`hasOperationalData`)

| Domínio | Tabela principal | Janela |
|---------|------------------|--------|
| telemetria / plc | `plc_collected_data` | 30 dias |
| manutencao | `maintenance_orders` (+ cards fallback) | 90 dias |
| proaction | `proposals` | all |
| comunicacoes | `communications` | all |
| kpis / summary / general / producao / qualidade | `communications` 30d, fallback **PLC** 30d | 30 dias |

Para pergunta «OEE» / «produção», `inferDomainsFromText` inclui `producao` → fallback PLC em `hasOperationalData`.

**Evidência F37:** domain check PLC `has_data: true`, `count: 42114`.

---

## Semântica de flags

| Flag | Definição actual |
|------|------------------|
| `has_any_data` (bruto) | Algum `domain_checks[].has_data === true` |
| `tenant_empty` | `dataState === 'tenant_empty'` (ou inactive / paused rule) |
| **`has_any_data` (efectivo)** | `has_any_data && !tenantEmpty` |
| `snapshot_backed` (evidence) | `confidence` em `buildEvidenceBinding` se `has_any_data` OU evidence numbers no pack |
| `no_operational_data` | Mensagem enforcement quando replace |

---

## Pergunta: exige máquina cadastrada?

| Camada | Exige registry MES? |
|--------|---------------------|
| `classifyDataState` | **Sim** (`machines.length`) |
| `hasOperationalData('plc')` | **Não** — só COUNT em `plc_collected_data` |
| `checkOperationalAvailability` (efectivo) | **Sim, indirectamente** — se `data_state=tenant_empty`, anula PLC |
| `buildNoDataPrompt` | **Sim** — narrativa consultiva sem dados |

**Resposta:** o sistema **não exige** máquina cadastrada para detectar PLC na camada de domínio, mas **exige** para não propagar `tenant_empty` e para não usar prompt NO_DATA.

---

## `equipment_id` com telemetria é ignorado?

| Etapa | Ignorado? |
|-------|-----------|
| PLC COUNT | **Não** — telemetria conta |
| Registry → machines[] | **Sim** — órfão |
| `tenant_empty` | **Sim** — trata como sem operação |
| Prompt LLM | **Sim** — `buildNoDataPrompt` |

---

## Comportamento `enforceTextResponse` com tenant_empty

```javascript
effectiveHasData = availability.has_any_data || hasSnapshotEvidence;
```

Com `tenant_empty`:

- `availability.has_any_data` → **false** (forçado)
- `hasSnapshotEvidence` → só se números no `contextualPack` (KPIs/events) — pack vazio em tenant_empty
- Pergunta operacional + sem effectiveHasData → poderia `replace_no_data`
- F37: `action: pass` — resposta consultiva **sem** percentagens inventadas (passa porque não há números na resposta)

**Truth enforcement protege contra invenção; não corrige grounding.**

---

## Modo shadow vs enforce

Inalterado nesta fase. `IMPETUS_INDUSTRIAL_TRUTH_MODE` default `enforce`.

---

## Veredito 38-D

| Classificação | Detalhe |
|---------------|---------|
| Detecção PLC | **VERIFIED** em `domain_checks` |
| Disponibilidade cognitiva efectiva | **NOT VERIFIED** — anulada por `tenant_empty` |
| Causa | Propagação de `data_state` do `dataRetrievalService`, não lógica PLC |

**Recomendação mínima (documentada, não implementada):** não aplicar `!tenantEmpty` a `has_any_data` quando `domain_checks` PLC/telemetria `has_data === true`, **ou** corrigir origem de `data_state` (preferível).

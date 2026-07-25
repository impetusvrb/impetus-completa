# EV-001 — Technical Debt Assessment

**Identificador:** `EV-001-TECHNICAL-DEBT`  
**Data:** 2026-07-17  
**Modo:** READ ONLY  
**Fontes:** AUD-001 · WMS-002 · ARC-001 manifest · varredura documental

---

## Resumo por severidade

| Severidade | Contagem | Bloqueia GF-021? |
|------------|:--------:|:----------------:|
| **Alta** | 0 | — |
| **Média** | 5 | Não |
| **Baixa** | 6 | Não |

---

## Alta — Bloqueante

*Nenhum item classificado como Alta bloqueante para GF-021.*

---

## Média

| ID | Componente | Descrição | Classificação | Mitigação |
|----|------------|-----------|:-------------:|-----------|
| TD-M01 | Dual stack `warehouse_*` / `wms_*` | Coexistência legado + SSOT novo | **Em migração** | OCL WMS-002; routing híbrido |
| TD-M02 | WMS operacional incompleto | 4/6 fases pendentes (APIs, FE, RBAC, validation) | **Módulo incompleto** | WMS-003→006; flags OFF |
| TD-M03 | FE mocks KPIs | `LogisticsOperationalWorkspace` — AUD-001 G-LOG-002 | **Dependência temporária** | WMS-003/004 |
| TD-M04 | ARC-001 golden manifest | Referencia v1.2; MSA/Ishikawa como foundation não homologado | **Doc/test drift** | INC manifest v1.4 |
| TD-M05 | CI PostgreSQL | Testes WMS + ARC-001 timeout sem BD | **Dependência infra** | Ambiente CI com BD |

---

## Baixa

| ID | Componente | Descrição | Classificação |
|----|------------|-----------|:-------------:|
| TD-L01 | `warehouseService.js` | Admin legacy activo | **Reaproveitado** |
| TD-L02 | `warehouseIntelligenceService` | Dashboard legacy | **Reaproveitado** |
| TD-L03 | TMS path FE | `/admin/logistics/intelligence/*` desalinhado | **Integração pendente** |
| TD-L04 | `logistics_intelligence` moduleRegistry | Ausente — AUD-001 | **Módulo incompleto** |
| TD-L05 | WMS-001 sem Conformidade ARC-002 | Documento pré-norma | **Documentação** |
| TD-L06 | EVOLUTION-TAXONOMY duplicada | evidence/ + architecture/ | **Documentação** |

---

## Adapters existentes

| Adapter | Local | Função | Estado |
|---------|-------|--------|:------:|
| `warehouseLegacyAdapter` | `logistics-operational/adapters/` | Único acesso SQL `warehouse_*` | ✅ WMS-002 |
| `logisticsFoundationAdapter` | — | M1.2 bridge (planeado) | **Não criado** — reaproveitar `logisticsFoundationService` |
| Cognitive bridges | `cognitiveRuntime/domains/logistics/` | Signal loader · block bridge | **LOCKED** — reaproveitar |

---

## Dual stacks

| Stack | Tabelas/APIs | Consumidor | Destino |
|-------|--------------|------------|---------|
| Legado warehouse | `warehouse_*`, `/admin/warehouse/*` | Admin · intelligence | Migração via OCL |
| WMS SSOT | `wms_*`, `/api/logistics-operational/*` | Core Services | Canónico |
| Cognitive | `logistics_native` | CC · promotion | **LOCKED** — separado |

---

## Módulos incompletos (operacional logistics)

| Módulo | Estado AUD-001 | Pós WMS-002 |
|--------|------------------|-------------|
| Receiving operacional | Incompleto | Core Service ✅ · API parcial |
| Picking | Incompleto | Core Service ✅ · workflow pendente |
| Shipping | Incompleto | Core Service ✅ · API parcial |
| Conferência / Romaneio | Ausente | WMS-004+ |
| Inventário rotativo | Ausente | WMS-004+ |
| TMS intelligence path | Quebrado | WMS-004 / integração |

---

## Dependências temporárias

| Dependência | Remover quando |
|-------------|----------------|
| Merge híbrido OCL inventory | Migração items > 80% |
| Admin `warehouse_*` writes | WMS-004 paridade |
| Mock KPIs FE | WMS-003/004 |
| Flags WMS OFF | WMS-005 homologation |

---

## Recomendações

1. **Não** expandir acesso directo a `warehouse_*` — manter OCL.
2. Priorizar WMS-003 para reduzir TD-M02/TD-M03.
3. Abrir INC para ARC-001 manifest v1.4 (TD-M04).
4. GF-021 **não deve** depender de conclusão WMS — domínios independentes.

---

*Referência:* [WMS-LEGACY-WAREHOUSE-INVENTORY.md](./WMS-LEGACY-WAREHOUSE-INVENTORY.md) · [AUD-001](../audit/AUD-001-LOGISTICS-OPERATIONAL-AUDIT.md)

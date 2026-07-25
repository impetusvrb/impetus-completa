# OPM-000 — WMS Coverage Audit

**Modo:** READ ONLY · **Data:** 2026-07-19

---

## Metodologia de contagem

**Previsto** = capacidades funcionais de produto derivadas de AUD-001, WMS Roadmap, expectativa enterprise WMS (listagem, CRUD UI, filtros, workflows, KPIs, IA, integrações).

**Implementado** = funcionalidade completa ponta-a-ponta (UI + API + fluxo utilizável).

**Parcial** = API certificada sem UI equivalente, ou UI shell sem CRUD/workflow.

**Faltando** = não presente no código nem documentado como entregue.

---

## Matriz por módulo WMS operacional

| Módulo | Previsto | Implementado | Parcial | Faltando | Maturidade Produto |
|--------|:--------:|:------------:|:-------:|:--------:|:------------------:|
| **Warehouse** | 72 | 22 | 16 | 34 | **39%** |
| **Inventory** | 68 | 20 | 14 | 34 | **41%** |
| **Receiving** | 65 | 18 | 17 | 30 | **43%** |
| **Picking** | 62 | 16 | 15 | 31 | **42%** |
| **Shipping** | 60 | 17 | 14 | 29 | **43%** |
| **Transfers** | 58 | 16 | 13 | 29 | **41%** |
| **Landing / CC bridge** | 40 | 28 | 8 | 4 | **70%** |
| **Cognitive Logistics (native)** | 85 | 38 | 27 | 20 | **45%** |

---

## Detalhe por módulo

### Warehouse

| Área | Estado | Evidência |
|------|--------|-----------|
| Estrutura (módulo standalone) | ✅ Completo | WMS-007A `WarehouseModulePage` |
| API list/create/get/locations/capacity | ✅ Completo | `wmsV1Routes.js` |
| UI listagem + estados industriais | ✅ Completo | `WmsStandaloneModuleFrame` |
| UI cadastro / edição armazém | ❌ Inexistente | FE client só `listWarehouses` |
| Filtros / pesquisa | ❌ | — |
| KPIs módulo | ⚠️ Parcial | count registos apenas |
| Endereçamento / LPN | ❌ | AUD-001: placeholder legacy |
| Histórico / auditoria UI | ❌ | API observability only |
| IA / recomendações | ❌ | CC separado (logistics_native) |

### Inventory

| Área | Estado | Evidência |
|------|--------|-----------|
| API items/balances/movements CRUD | ✅ | WMS-003 |
| UI listagem itens | ✅ | `InventoryModulePage` |
| UI movimentos / saldos | ❌ | API exists; FE não expõe |
| Inventário rotativo | ❌ | AUD-001 gap explícito |
| Filtros / pesquisa | ❌ | — |

### Receiving / Picking / Shipping / Transfers

| Padrão comum | Backend | Frontend |
|--------------|:-------:|:--------:|
| Listagem | ✅ | ✅ |
| Create / workflow (POST, execute, dispatch, complete) | ✅ | ❌ sem formulários |
| Detalhe documento | ✅ GET `:id` | ❌ |
| Conferência / romaneio | ❌ | ❌ AUD-001 |

---

## Classificação dimensional WMS

| Dimensão | % | Justificação |
|----------|:-:|--------------|
| **Arquitectura** | 100% | WMS-001→006, REV-002, OCL, contratos |
| **Navegação** | 100% | WMS-007A standalone + NAV-001 segregação |
| **Segurança (RBAC/Flags)** | 100% | Certificado; fail-closed |
| **Runtime / APIs** | 92% | v1 completo; persistência tenant-dependent |
| **Produto Operacional (UI)** | **41%** | Média módulos — list-only |
| **UX Industrial** | 55% | DS aplicado; falta densidade operacional |
| **Industry 4.0** | 45% | logistics_native CC homologado; ops WMS sem IA |

---

## Go Live Readiness — WMS

## **GO LIVE COM RESTRIÇÕES (PILOTO OPERACIONAL)**

**Justificação:** Infra certificada e navegável; operador pode **consultar** listas via APIs reais. Fluxos transaccionais (receber, pick, expedir, transferir) **requerem UI ou cliente externo** — não estão completos como produto autónomo IMPETUS.

**Permanece em piloto:** flags tenant-scoped; OPS-002 activação controlada.

**Não iniciar WMS-008 arquitectural** — expansão via **OPM-001+**.

# LOGISTICS — Inventário Funcional (AUD-001)

**Auditoria:** AUD-001 — Logistics Operational Completion Audit  
**Data:** 2026-07-17  
**Modo:** READ ONLY  
**Escopo:** domínio Logistics integral (WMS · TMS · runtime cognitivo · legacy)

---

## Metodologia

Inventário derivado de:

- `backend/src/domains/logistics/`
- `backend/src/cognitiveRuntime/domains/logistics/`
- `frontend/src/domains/logistics/`
- `frontend/src/pages/{AlmoxarifadoInteligente,LogisticaInteligente,AdminLogistics}.jsx`
- Rotas em `backend/src/server.js` e `frontend/src/App.jsx`
- Evidências INC-036 → INC-043 · BASELINE-LOGISTICS-v1.1

---

## Módulos identificados no código (efetivos)

| # | Módulo | Descrição | Implementado | Publicado | Visível | Utilizado | Dependências |
|---|--------|-----------|:------------:|:---------:|:-------:|:---------:|--------------|
| 1 | **Runtime cognitivo `logistics_native`** | Z.19→Z.23: signal loader, promotion CC, 7 hubs, 8 centers | ✅ SIM | ❌ NÃO (flags OFF) | ⚠️ CC: widgets genéricos se runtime OFF | ⚠️ Testes homologação | `manager_logistics`, flags `IMPETUS_LOGISTICS_*`, binding ≥0.35 |
| 2 | **Centro de Comando — LogisticsNativeCockpitPromotion** | 7 hubs lazy (WarehouseGovernance, Inventory, Telemetry, Fleet, Distribution, Supplier, Cognitive) | ✅ SIM | ❌ NÃO | ⚠️ Só com promotion + flags | Homologado INC-042/043 | `/dashboard/me`, `logistics_cognitive_runtime` |
| 3 | **Workspace operacional WMS** | `/app/logistics/operational` — receiving, storage, picking, shipping, dock, telemetry, governance, rollout, maturity | ⚠️ PARCIAL (UI shell) | ❌ NÃO | ❌ NÃO (gate VITE operational OFF) | ❌ NÃO | `VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED`, APIs `/logistics-operational/*` **ausentes** |
| 4 | **Foundation M1.2** | Inventário, recebimentos, expedições, lotes via `/api/logistics/*` | ✅ SIM (service) | ✅ Rota registada | ❌ Sem UI dedicada | ⚠️ Contagens 0 tenant ref. | Tabelas `logistics_inventory`, `logistics_receipts`, `logistics_shipments`, `logistics_lot_tracking` |
| 5 | **Logística Inteligente (legacy TMS)** | `/app/logistica-inteligente` — expedições, frota, alertas | ⚠️ PARCIAL | ✅ Rota FE | ⚠️ RBAC + módulo | ⚠️ API path desalinhado | `/api/logistics-intelligence/*` vs FE `/admin/logistics/intelligence/*` |
| 6 | **Almoxarifado Inteligente (legacy WMS)** | `/app/almoxarifado-inteligente` — estoque, alertas, previsões | ✅ SIM | ✅ Rota FE | ⚠️ RBAC + módulo | ✅ API warehouse | `/api/admin/warehouse/intelligence/*` |
| 7 | **Admin Logistics (TMS CRUD)** | `/app/admin/logistics` — veículos, pontos, rotas, motoristas | ✅ SIM | ✅ Rota FE | ⚠️ Admin only | Admin | `/api/admin/logistics/*` |
| 8 | **Navegação enterprise logistics** | Manifesto 11 entradas, merge menu lateral | ✅ SIM | ❌ NÃO (flags OFF) | ❌ NÃO | ❌ NÃO | `logistics_intelligence` + VITE navigation/publication ON |
| 9 | **Activation / rollout** | Readiness, flags snapshot, estágios shadow→full | ✅ SIM | ✅ API | ❌ Oculto | Interno | `/api/logistics-activation/*` |
| 10 | **Operational validation pack** | Behavior analytics, validation pack enterprise | ✅ SIM | ✅ API | ❌ Oculto | Testes internos | `/api/logistics-operational-validation/*` |
| 11 | **Recebimento (view)** | Form NF/fornecedor/qtde | ⚠️ UI only | ❌ NÃO | Gate operational | Mock offline queue | POST `/logistics-operational/receiving/register` **404** |
| 12 | **Picking / separação** | View estática zonas A/B/C | ❌ NÃO (schema) | ❌ NÃO | Gate operational | Placeholder | INC-040: `logistics.picking_efficiency` = NOT_IMPLEMENTED |
| 13 | **Expedição / OTIF (view)** | KPIs estáticos + docas mock | ⚠️ UI only | ❌ NÃO | Gate operational | — | Sem API operacional |
| 14 | **Armazenagem / LPN / endereçamento** | Mapa ruas placeholder | ⚠️ UI only | ❌ NÃO | Gate operational | — | Sem API operacional |
| 15 | **Inventário / inventário rotativo** | Foundation POST `/inventory`; sem UI rotativo | ⚠️ PARCIAL | API only | ❌ NÃO | ❌ NÃO | Sem workflow inventário cíclico |
| 16 | **Movimentações / transferências** | Legacy `warehouse_movements`; foundation receipts | ⚠️ PARCIAL | Legacy warehouse | ❌ Sem UI logistics | 0 registos | Dual stack WMS não reconciliado |
| 17 | **Conferência / romaneio** | — | ❌ NÃO | ❌ NÃO | ❌ NÃO | — | Não encontrado no código |
| 18 | **Telemetria logística (hub + view)** | Hub `logistics.dock_flow`; view TMS GPS | ⚠️ PARCIAL | ❌ NÃO | Gate governance | INSUFFICIENT_DATA | `logistics_points` vazio; PLC separado (dashboard global) |
| 19 | **Integração ERP/MQTT/filas** | Documentado manual; sem binding logistics dedicado | ⚠️ Infra global | Parcial | Dashboard live | ERP connectors count | Não simulado em logistics_native |

---

## Módulos esperados vs encontrados

| Esperado (lista referência) | Encontrado | Nota |
|----------------------------|:----------:|------|
| Recebimento | ⚠️ UI + foundation API | Sem rota operacional dedicada |
| Almoxarifado | ✅ Legacy page | Paralelo a foundation |
| Inventário | ⚠️ Foundation only | Sem UI rotativo |
| Movimentações | ⚠️ Legacy warehouse | 0 dados tenant ref. |
| Picking | ❌ | NOT_IMPLEMENTED (INC-040) |
| Expedição | ⚠️ UI + TMS legacy | Operacional incompleto |
| Transferências | ❌ | Não modelado em logistics domain |
| Endereçamento | ⚠️ UI placeholder | Sem backend |
| Separação | ❌ (= picking) | — |
| Conferência | ❌ | — |
| Romaneio | ❌ | — |
| Inventário rotativo | ❌ | — |

---

## Resumo quantitativo

| Métrica | Valor |
|---------|-------|
| Módulos identificados | **19** |
| Com implementação substantiva | **8** |
| Parcialmente implementados | **9** |
| Não implementados | **2** (+ 4 ausentes da lista esperada) |
| Publicados em produção (operacional) | **0** |
| Visíveis ao utilizador típico | **0–2** (legacy se RBAC permitir) |

---

## Critério AUD-001

```
LOGISTICS_MODULES_INVENTORIED = YES
```

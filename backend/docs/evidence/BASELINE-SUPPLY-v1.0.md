# BASELINE — Suprimentos v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `SUPPLY_BASELINE_LOCKED = YES`

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_logistica` / `eixo_estoque` (catálogo) |
| **FUNCTIONAL_AREA** | `supply`, `procurement`, `inventory` |
| **DEPARTMENT** | Suprimentos / Compras / Almoxarifado |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|---------------------|
| *(nenhum dedicado)* | CentroComando | none |

**Mapeamento actual:**

| functional_area | Resolve para |
|-----------------|--------------|
| `procurement` | `manager_logistics` / `coordinator_logistics` / `supervisor_logistics` |
| `supply` | eixo `logistics` (catálogo) |
| `inventory` | overlap estoque/logística |

---

## Cadeia arquitectural

```
functional_area procurement/supply
  → ROLE_AREA_TO_PROFILE → perfis logística
  → LayoutPorCargo regex logística|estoque|almox
  → widgets logistica + estoque
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | PARTIAL — módulos `raw_material_lots`, `logistics_intelligence` |
| **runtime_promoted** | NO |
| **consolidation_applied** | N/A |
| **native_runtime** | none |

---

## Visible modules (herdados)

`logistics_intelligence`, `raw_material_lots`, `operational`, universais

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | Domínios strict por eixo |
| **PLACEHOLDERS** | Colapso em widgets logística |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** |

---

## Pendências

| ID | Descrição |
|----|-----------|
| P-SUP-001 | **Sem perfil `manager_supply`** — colapso em logística |
| P-SUP-002 | `procurement` eixo `operations` vs `supply` eixo `logistics` — ambiguidade catálogo |
| P-SUP-003 | Sem runtime nativo suprimentos |

---

## Gates

```
SUPPLY_PROFILE_OK    = PARTIAL (colapsado em logística)
SUPPLY_SURFACE_OK    = YES
SUPPLY_RUNTIME_OK    = NO
SUPPLY_MODULES_OK    = PARTIAL
SUPPLY_BASELINE_LOCKED = YES
```

## Itens futuros

- Perfil `manager_procurement` / `manager_supply` dedicado
- Runtime `supply_native` ou extensão logística

# FIX-005 — Maintenance Navigation & Menu Architecture Recovery

**Data:** 2026-07-13  
**Missão:** FIX-005 — Menu roles manutenção incompleto  
**Escopo:** Governança de navegação Manutenção/ManuIA — **sem alteração de UX ManuIA**

---

## Critérios de aceite

```
FIX_005_STATUS              = PASS
ROOT_CAUSE_IDENTIFIED       = YES
MAINTENANCE_MENU            = GOVERNANCE_ALIGNED
MAINTENANCE_ROUTE           = ACCESS_ALIGNED
MENU_ROUTE_MISMATCH         = 0 (pós-patch)
ASYNC_MENU_REGRESSION       = MITIGATED
MANUIA_UX_BASELINE          = PRESERVED
RBAC_PRESERVED              = YES
ROUTE_GUARDS_PRESERVED      = YES
BASE_ESTRUTURAL_UNTOUCHED    = YES
FORENSIC_EVIDENCE_PRESERVED = TRUE
```

---

## FASE 1 — Classificação do finding

```
FIX_005_ORIGINAL_FINDING = Roles de manutenção (technician_maintenance, manager_maintenance,
  supervisor_maintenance, coordinator_maintenance) com menu incompleto ou desalinhado da
  governança de módulos — especialmente ausência de ManuIA no sidebar para liderança de
  manutenção quando visible_modules reconciliado não inclui `manuia`.

AFFECTED_ROUTE   = /app/manutencao/manuia, /app/manutencao/manuia-app, /diagnostic
AFFECTED_MENU    = Layout sidebar (MENU_MANUTENCAO_TECNICO + injeção MENU_MANUTENCAO_MODULOS)
AFFECTED_ROLES   = technician_maintenance, manager_maintenance, supervisor_maintenance,
                   coordinator_maintenance, técnicos (colaborador + eixo/cargo manutenção)

CURRENT_BEHAVIOR (pré-fix) =
  - Técnico: MENU_MANUTENCAO_TECNICO quando maintenanceProfile detectado (OK quando perfil carregado)
  - Liderança manutenção: MENU_LIDERANCA + injeção ManuIA **somente se** visibleSet.has('manuia')
  - Route access: canAccessPath permite ManuIA via STANDALONE_MANUIA_PATHS para isMaint **sem** exigir manuia em visible_modules
  → MENU_VISIBLE=FALSE / ROUTE_ACCESS=TRUE em reconciliação parcial

EXPECTED_BEHAVIOR =
  - Perfil manutenção confirmado → menu inclui ManuIA (técnico: menu dedicado; liderança: injeção)
  - Menu alinhado a route access (STANDALONE_MANUIA_PATHS)
  - CEO/admin portal: ManuIA suprimido conforme blueprint
  - Baseline ManuIA inalterada (página ManuIA.jsx não tocada)
```

**Evidência origem:** STAB-006, REG-014, UX-004, PENDING_FIXES_ROADMAP FIX-005

**Tipo de problema:** reconciliação assíncrona + capability/module governance desalinhada do menu (não rota órfã)

---

## FASE 2 — Causa raiz

| Camada | Achado |
|--------|--------|
| Layout.jsx L557-570 (pré) | Injeção ManuIA exigia `visibleSet.has('manuia')` |
| useVisibleModules.js | `canAccessPath` / `filterMenu` usam `STANDALONE_MANUIA_PATHS` para `isMaint` **independente** de `manuia` em visible_modules |
| dashboardProfiles.js | Perfis `*_maintenance` incluem `manuia` por desenho — mas reconciliação estrutural pode remover temporariamente |
| structuralModuleFilter | `eixo_manutencao` → manuia permitido — detecção de perfil não usava eixo em `maintenanceFromProfile` |

**ROOT_CAUSE:** Gate de injeção de menu mais restritivo que gate de acesso a rota → falsa ausência de ManuIA no sidebar.

```
ASYNC_MENU_RECONCILIATION_RISK = TRUE (pré-fix, liderança manutenção)
```

---

## FASE 3 — Patch mínimo aplicado

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/utils/roleUtils.js` | `hasMaintenanceProfileContext`, `shouldInjectManuiaMenuModules`; `isMaintenanceProfile` + eixo estrutural; `isMaintenanceTechnicianMenu(user, maintenanceFromProfile)` |
| `frontend/src/components/Layout.jsx` | Injeção via `shouldInjectManuiaMenuModules` — remove gate `visibleSet.has('manuia')` |
| `frontend/src/hooks/useVisibleModules.js` | `maintenanceFromProfile` inclui `eixo_manutencao` e functional_area ampliado |

**Não alterado:** ManuIA.jsx, ManuiaActionCenter, guards RBAC, Base Estrutural, APIs IA, CEO menu deny.

---

## FASE 9 — Variação de disco SF-005/006 (secundária)

```
DISK_BEFORE_SF005006  ≈ 96% usado / 4.2G livres
DISK_AFTER_SF005006   ≈ 94% usado / 6.5G livres
DISK_VARIATION_EXPLAINED = PARTIAL
```

**Análise read-only (sem limpeza executada pela missão):**

| Fonte | Observação |
|-------|------------|
| `frontend/dist` | ~107M — build substitui in-place; não explica ~2.3G |
| `dist_backup_*` / `dist.prev.*` | 3× ~107M cada — **não removidos** pela missão |
| `node_modules/.vite` | ~46M cache |
| `/tmp` | ~3.3M |
| `journalctl` | ~980M archived — rotação possível entre medições |
| `pm2 logs` | ~366M — estável |
| Forense P0 | Intocado |

**Conclusão:** A liberação de ~2.3G **não foi causada por limpeza da missão SF-005/006**. Explicação parcial: atividade automática do SO (journal/tmp) e/ou processo externo entre as duas medições `df -h`. Não há evidência de remoção de artefatos forenses ou backups de checkpoint.

---

## FIX-002 / SF regressão

| Item | Status |
|------|--------|
| Warehouse/Logistics menu | ✅ intacto |
| Audio Logs RBAC | ✅ intacto |
| ManuIA baseline | ✅ intacto |

---

*Evidência gerada sem alteração à cadeia forense P0.*

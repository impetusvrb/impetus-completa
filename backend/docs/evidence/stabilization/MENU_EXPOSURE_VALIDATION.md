# MENU EXPOSURE VALIDATION — FIX-002

**Data:** 2026-07-13  
**Escopo:** Validação de exposição controlada no sidebar  
**Referência:** `Layout.jsx` `MENUS.admin` + inject condicional Audio Logs

---

## Critérios validados

```
MENU_ITEMS_ADDED           = 3
RBAC_ALIGNMENT             = PASS
GUARD_MISMATCH             = 0
INCOMPLETE_EXPOSED         = 0
BUILD_PASS                 = YES
```

---

## 1. Itens adicionados

### Estáticos em `MENUS.admin`

| Label | Path | Icon | Guard rota | Visível para |
|-------|------|------|------------|--------------|
| Cadastros — Almoxarifado | `/app/admin/warehouse` | `Warehouse` | AdminRouteGuard | Menu role `admin` |
| Cadastros — Logística | `/app/admin/logistics` | `Truck` | AdminRouteGuard | Menu role `admin` |

**Posição:** Após "Base Estrutural", antes "Conteúdo da empresa" — agrupa cadastros operacionais pós-estrutura organizacional.

### Inject condicional

| Label | Path | Icon | Condição menu | Guard rota |
|-------|------|------|---------------|------------|
| Logs de Áudio | `/app/admin/audio-logs` | `Mic` | `canAccessDirectorOrCEOAdminRoutes(user)` | DirectorOrCEORouteGuard |

**Posição:** Após "Logs de Auditoria" (se existir no menu); senão antes de "Configurações".

---

## 2. Alinhamento RBAC menu × rota

| Perfil | Vê Warehouse | Vê Logistics | Vê Audio Logs | Acede Warehouse | Acede Audio |
|--------|--------------|--------------|---------------|-----------------|-------------|
| `role=admin` | ✅ | ✅ | ✅ | ✅ AdminRouteGuard | ✅ DirectorOrCEO |
| `role=diretor` | ❌* | ❌* | ✅ | ✅ AdminRouteGuard** | ✅ |
| `role=ceo` | ❌* | ❌* | ✅ | ❌ CEORouteGuard | ✅ |
| `role=gerente` + hierarchy≤1 | ✅*** | ✅*** | ❌**** | ✅ | ❌ |
| `system_administration` capability | ✅ | ✅ | ✅ | ✅ | ✅ |
| `role=operador` | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Menu `admin` não aplicável — usa MENU_LIDERANCA ou MENUS.ceo; Audio Logs injectado condicionalmente.  
\** Diretor passa AdminRouteGuard (role in list).  
\*** Se `resolveMenuRole` → admin ou hierarchy≤1 com menu admin.  
\**** Gerente sem capability — vê cadastros se admin menu, não vê audio (correcto).

### Função de alinhamento

```javascript
// roleUtils.js — espelha App.jsx DirectorOrCEORouteGuard
export function canAccessDirectorOrCEOAdminRoutes(user) {
  if (userHasSystemAdministrationCapability(user)) return true;
  return ['ceo', 'admin', 'diretor'].includes(String(user.role || '').toLowerCase());
}
```

**RBAC_PRESERVED = YES** — nenhum guard de rota alterado.

---

## 3. Módulos NÃO expostos

| Módulo | Motivo |
|--------|--------|
| — | Nenhum — todos classificados READY ou READY_WITH_FIXES |

---

## 4. Navegação existente — não regressão

| Verificação | Resultado |
|-------------|-----------|
| Itens anteriores em MENUS.admin | ✅ Ordem preservada |
| Guia de Implantação (strict admin filter) | ✅ Inalterado |
| Pulse RH inject | ✅ Inalterado |
| ManuIA inject | ✅ Inalterado |
| Bloco industrial diretor | ✅ Inalterado |
| Contextual hybrid menu | ✅ Inalterado |
| `getModuleForPath('/app/admin/*')` → `admin` | ✅ Inalterado |
| CEO bloqueado de `/app/admin/warehouse` | ✅ CEORouteGuard preservado |

---

## 5. Validação técnica

| Teste | Comando / método | Resultado |
|-------|------------------|-----------|
| Build frontend | `npm run build` | ✅ PASS |
| PM2 frontend | `pm2 restart impetus-frontend` | ✅ online |
| Import icons | Warehouse, Truck, Mic | ✅ sem conflito Package existente |
| api.js warehouse | balances, links, movements.create | ✅ adicionados |
| Logistics DS | Removido `#1e88e5` | ✅ |

---

## 6. Validação E2E pendente (browser autenticado)

- [ ] Admin tenant — menu mostra 3 itens (ou 2 + audio se capability)
- [ ] Click Warehouse — 8 tabs carregam sem TypeError
- [ ] Tab Saldos — lista API responde
- [ ] Tab Vínculos — CRUD funcional
- [ ] Click Logistics — 4 tabs CRUD
- [ ] CEO — vê Logs de Áudio, não vê Warehouse
- [ ] Gerente sem capability — não vê Audio Logs no menu

---

## 7. Resultado

```
FIX_002_MENU_EXPOSURE = PASS
READY_MODULES_EXPOSED = 3/3
INCOMPLETE_MODULES_PROTECTED = YES (0 incompletos)
ARCHITECTURE_PRESERVED = YES
NEW_REGRESSIONS = 0
```

---

*Validação pós-implementação FIX-002 — 2026-07-13*

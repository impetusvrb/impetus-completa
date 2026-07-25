# FIX-002 — Recuperação Arquitetural das Rotas Órfãs Administrativas

**Data:** 2026-07-13  
**Auditoria origem:** STABILIZATION_AUDIT_001 / REG-015 / STAB-001  
**Metodologia:** Fase 1 (arquitectural) → Fase 2 (funcional) → Fase 3 (exposição controlada)

---

## Critérios de aceite

```
FIX_002_STATUS                = PASS
ORPHAN_ROUTES_ANALYZED        = YES
READY_MODULES_EXPOSED         = YES
INCOMPLETE_MODULES_PROTECTED  = YES
RBAC_PRESERVED                = YES
ARCHITECTURE_PRESERVED        = YES
NEW_REGRESSIONS               = 0
```

---

## 1. Resumo executivo

Três rotas administrativas existiam em `App.jsx` e no backend, mas **não apareciam no menu** `MENUS.admin`. Após auditoria arquitectural e funcional:

| Módulo | Classificação | Exposto no menu |
|--------|---------------|----------------|
| Warehouse (Almoxarifado) | **READY_WITH_FIXES** | ✅ Sim |
| Logistics (Logística) | **READY** | ✅ Sim |
| Audio Logs | **READY** | ✅ Sim (condicional RBAC) |

**Causa da orfandade:** omissão na evolução do sidebar admin — rotas e APIs foram implementadas; o menu cresceu com módulos de governança (2026) sem backfill dos cadastros operacionais. **Não** foi remoção intencional nem feature flag.

---

## 2. FASE 1 — Auditoria arquitectural

Ver detalhes completos em `ORPHAN_MODULE_AUDIT.md`.

### Por que ficaram órfãs

| Factor | Evidência |
|--------|-----------|
| Rotas activas | `App.jsx` L681, L685-686 |
| APIs montadas | `server.js` — `/api/admin/warehouse`, `/logistics`, `/audio-logs` |
| Menu ausente | `Layout.jsx` `MENUS.admin` — entradas não adicionadas |
| Documentação | `FUNCTIONAL_MATRIX.md` lista as 3 rotas como `NAO_VALIDADO` |
| Help Center | `AdminHelpCenter.jsx` — **não** indexa estas páginas |
| Feature flag | **Nenhuma** — rotas sempre acessíveis por URL directa |
| Depreciação | **Nenhuma** evidência de `DEPRECATED` |

### Guards e RBAC (preservados)

| Rota | Guard frontend | Middleware backend |
|------|----------------|-------------------|
| `/app/admin/warehouse` | AdminRouteGuard + CEORouteGuard | `requireHierarchy(1)` |
| `/app/admin/logistics` | AdminRouteGuard + CEORouteGuard | `requireHierarchy(1)` |
| `/app/admin/audio-logs` | **DirectorOrCEORouteGuard** (sem CEORouteGuard) | `requireRole('ceo','admin','diretor')` |

**Nota arquitectural:** Audio Logs usa guard **mais restritivo** — CEO pode aceder (sem CEORouteGuard na rota), mas warehouse/logistics bloqueiam CEO via CEORouteGuard.

---

## 3. FASE 2 — Classificação funcional

| Módulo | Verdicto | Bloqueadores encontrados | Acção |
|--------|----------|--------------------------|-------|
| Warehouse | READY_WITH_FIXES | `api.js` sem `balances`, `links`, `movements.create` | Corrigido |
| Logistics | READY | Referências: `console.error` silencioso (P3) | Expor |
| Audio Logs | READY | Nenhum | Expor condicional |

Módulos **INCOMPLETE** ou **DEPRECATED:** nenhum — todos expostos após fixes.

---

## 4. FASE 3 — Exposição controlada

### Alterações realizadas

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/components/Layout.jsx` | Warehouse + Logistics em `MENUS.admin` após Base Estrutural; Audio Logs injectado condicionalmente |
| `frontend/src/utils/roleUtils.js` | `canAccessDirectorOrCEOAdminRoutes()` — alinhado a `DirectorOrCEORouteGuard` |
| `frontend/src/services/api.js` | Métodos warehouse: `balances`, `links`, `movements.create` |
| `frontend/src/pages/AdminLogistics.jsx` | Ícone header — removido gradiente Material `#1e88e5` (DS) |

### Posição no menu admin

```
…
Base Estrutural
Cadastros — Almoxarifado    → /app/admin/warehouse
Cadastros — Logística       → /app/admin/logistics
Conteúdo da empresa
…
Logs de Auditoria
Logs de Áudio               → /app/admin/audio-logs (se canAccessDirectorOrCEOAdminRoutes)
…
```

### Audio Logs — visibilidade condicional

Injectado via `canAccessDirectorOrCEOAdminRoutes(user)`:
- Roles: `ceo`, `admin`, `diretor`
- OU capability `system_administration`

Alinhado a `App.jsx` `DirectorOrCEORouteGuard` — **sem alteração de RBAC**.

Para CEO/diretor (menu não-admin): item injectado antes de Configurações ou após Logs de Auditoria (se presente).

---

## 5. Regressão

| Teste | Resultado |
|-------|-----------|
| `npm run build` (frontend) | ✅ PASS (~1m, 0 erros) |
| PM2 `impetus-frontend` restart | ✅ online |
| APIs probe (401 sem auth) | ✅ rotas existem |
| RBAC guards | ✅ inalterados |
| Dashboard Engine / Domain Registry | ✅ não alterados |
| Navegação existente | ✅ aditiva apenas |

---

## 6. Ficheiros de evidência

- `ORPHAN_MODULE_AUDIT.md` — auditoria detalhada por módulo
- `MENU_EXPOSURE_VALIDATION.md` — validação de exposição e RBAC

---

## 7. Próximo passo recomendado

FIX-003 / FIX-004 — eliminar `catch {}` silenciosos em AdminAuditLogs e AdminEquipmentLibrary.

---

*Nenhum artefato forense, backup ou cadeia de custódia P0 foi alterado.*

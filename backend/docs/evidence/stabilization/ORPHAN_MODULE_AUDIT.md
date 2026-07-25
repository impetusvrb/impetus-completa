# ORPHAN MODULE AUDIT — Warehouse · Logistics · Audio Logs

**Auditoria:** FIX-002 / STABILIZATION_AUDIT_001  
**Data:** 2026-07-13  
**Método:** Análise estática + probe HTTP + cruzamento FUNCTIONAL_MATRIX

---

## Legenda de classificação

| Status | Critério |
|--------|----------|
| **READY** | Renderiza, APIs wired, RBAC coerente, sem bloqueadores |
| **READY_WITH_FIXES** | Funcional após correção mínima documentada |
| **INCOMPLETE** | Módulo parcial — **não expor** |
| **DEPRECATED** | Obsoleto — **não expor** |

---

## Módulo 1 — Warehouse (Almoxarifado)

### Arquitectura

| Item | Valor |
|------|-------|
| Rota | `/app/admin/warehouse` |
| Componente | `frontend/src/pages/AdminWarehouse.jsx` (984 linhas) |
| CSS | `AdminWarehouse.css` |
| API mount | `/api/admin/warehouse` → `backend/src/routes/admin/warehouse.js` |
| Guard frontend | AdminRouteGuard, CEORouteGuard, ColaboradorRouteGuard |
| Guard backend | `requireAuth` + `requireHierarchy(1)` |
| Module key | `admin` (via `getModuleForPath`) |
| Feature flag | Nenhuma |

### Sub-módulos (8 tabs)

| Tab | API frontend | API backend | Estado |
|-----|--------------|-------------|--------|
| Categorias | `adminWarehouse.categories.*` | CRUD ✅ | ✅ |
| Materiais | `adminWarehouse.materials.*` | CRUD ✅ | ✅ |
| Fornecedores | `adminWarehouse.suppliers.*` | CRUD ✅ | ✅ |
| Localizações | `adminWarehouse.locations.*` | CRUD ✅ | ✅ |
| Parâmetros | `adminWarehouse.params.*` | GET/PUT ✅ | ✅ |
| Movimentações | `movements.list/create` | GET/POST ✅ | ⚠ **create ausente em api.js** |
| Saldos | `balances.list` | GET ✅ | ⚠ **ausente em api.js** |
| Vínculos | `links.list/create/delete` | GET/POST/DELETE ✅ | ⚠ **ausente em api.js** |

### Achados funcionais

| ID | Problema | Severidade | Fix |
|----|----------|------------|-----|
| WH-001 | `adminWarehouse.balances` undefined → runtime error ao abrir tab Saldos | P1 | Adicionado em `api.js` |
| WH-002 | `adminWarehouse.links` undefined → runtime error tab Vínculos | P1 | Adicionado em `api.js` |
| WH-003 | `adminWarehouse.movements.create` undefined → não registra movimento | P1 | Adicionado em `api.js` |
| WH-004 | `loadReferences()` falha silenciosa (`console.error`) | P3 | Documentado — FIX-004 |
| WH-005 | Orfandade menu | P2 | Corrigido FIX-002 |

### UX / Layout

- ✅ Usa `Layout`, tokens DS, sidebar interna
- ✅ Modais CRUD, tabelas, loading states
- ✅ Empty states técnicos

### Classificação

```
WAREHOUSE_STATUS = READY_WITH_FIXES → READY (pós api.js)
```

---

## Módulo 2 — Logistics (Logística)

### Arquitectura

| Item | Valor |
|------|-------|
| Rota | `/app/admin/logistics` |
| Componente | `frontend/src/pages/AdminLogistics.jsx` (660 linhas) |
| CSS | Reutiliza `AdminWarehouse.css` |
| API mount | `/api/admin/logistics` → `backend/src/routes/admin/logistics.js` |
| Guard frontend | AdminRouteGuard, CEORouteGuard |
| Guard backend | `requireHierarchy(1)` |
| Distinção | `/app/logistics/operational` = domínio operacional (separado) |

### Sub-módulos (4 tabs)

| Tab | API | Backend | Estado |
|-----|-----|---------|--------|
| Veículos | `adminLogistics.vehicles.*` | CRUD ✅ | ✅ |
| Pontos | `adminLogistics.points.*` | CRUD ✅ | ✅ |
| Rotas | `adminLogistics.routes.*` | CRUD ✅ | ✅ |
| Motoristas | `adminLogistics.drivers.*` | CRUD ✅ | ✅ |

### Achados funcionais

| ID | Problema | Severidade | Fix |
|----|----------|------------|-----|
| LG-001 | `loadReferences()` — `console.error` silencioso | P3 | Documentado |
| LG-002 | Ícone header `#1e88e5` Material (viola DS) | P3 | Corrigido — ícone DS |
| LG-003 | Orfandade menu | P2 | Corrigido FIX-002 |

### UX / Layout

- ✅ Padrão idêntico ao Warehouse (sidebar + content)
- ✅ CRUD completo com modais, validação, notify.error
- ✅ Zod schemas no backend alinhados aos forms

### Classificação

```
LOGISTICS_STATUS = READY
```

---

## Módulo 3 — Audio Logs

### Arquitectura

| Item | Valor |
|------|-------|
| Rota | `/app/admin/audio-logs` |
| Componente | `frontend/src/pages/AdminAudioLogs.jsx` (230 linhas) |
| API | `audioLogs.list` → `GET /api/admin/audio-logs` |
| Backend | `backend/src/routes/admin/audioLogs.js` |
| Service | `backend/src/services/audioLogsService.js` |
| Guard frontend | **DirectorOrCEORouteGuard** (ceo/admin/diretor + capability) |
| Guard backend | `requireRole('ceo','admin','diretor')` + tenant scope |
| Sensibilidade | Dados de transcrição de áudio — LGPD |

### Funcionalidades validadas

| Feature | Estado |
|---------|--------|
| Listagem paginada (25/página) | ✅ |
| Filtro por origem (5 sources) | ✅ |
| Busca por transcrição/remetente | ✅ |
| Player áudio protegido (`useProtectedMediaSrc`) | ✅ |
| Loading / error / empty states | ✅ |
| Error visível ao utilizador | ✅ |
| Inline styles DS (Rajdhani + Share Tech Mono) | ✅ |

### Achados

| ID | Problema | Severidade |
|----|----------|------------|
| AL-001 | Orfandade menu | P2 — corrigido |
| AL-002 | Paginação disabled sem title | P3 — cosmético |

### RBAC especial

- **Não** usar AdminRouteGuard alone — gerente com hierarchy≤1 acede warehouse mas **não** audio logs (correcto)
- Menu item **condicional** — não listado para perfis sem `canAccessDirectorOrCEOAdminRoutes`

### Classificação

```
AUDIO_LOGS_STATUS = READY
```

---

## Matriz consolidada

| Módulo | Linhas | APIs backend | APIs frontend (pré-fix) | Classificação | Expor? |
|--------|--------|--------------|-------------------------|---------------|--------|
| Warehouse | 984 | 20+ endpoints | 3 tabs quebradas | READY_WITH_FIXES | ✅ após fix |
| Logistics | 660 | 16 endpoints | Completo | READY | ✅ |
| Audio Logs | 230 | 1 endpoint | Completo | READY | ✅ condicional |

---

## Por que não INCOMPLETE / DEPRECATED

Nenhum módulo apresentou:
- Rotas 404 no backend
- Componentes stub / "Em breve"
- APIs removidas ou comentadas como legacy
- Documentação de depreciação

Warehouse estava **READY_WITH_FIXES** apenas por gap de wiring em `api.js` — padrão de implementação incompleta no cliente, não módulo abandonado.

---

## Probe HTTP (2026-07-13)

```
GET /api/admin/warehouse/references  → 401 (existe)
GET /api/admin/warehouse/balances    → 401 (existe)
GET /api/admin/warehouse/links       → 401 (existe)
GET /api/admin/logistics/vehicles    → 401 (existe)
GET /api/admin/audio-logs            → 401 (existe)
```

401 = autenticação requerida — comportamento esperado.

---

*Auditoria read-only excepto fixes documentados em FIX_002_ORPHAN_ROUTES_RECOVERY.md*

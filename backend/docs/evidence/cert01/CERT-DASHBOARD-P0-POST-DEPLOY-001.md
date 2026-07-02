# DASHBOARD-P0-POST-DEPLOY-001 — Auditoria de Falha Pós-Deploy

**Data:** 2026-07-01  
**Severidade:** P0  
**Status:** CORRIGIDO

---

## ETAPA 1 — Exceção real

```
ReferenceError: Cannot access 'normalizedPath' before initialization
```

| Campo | Valor |
|-------|-------|
| **Arquivo** | `frontend/src/components/Layout.jsx` |
| **Linha (pré-fix)** | 266–268 (`isManuiaRoute` usava `normalizedPath`) |
| **Declaração** | linha 320 (`const normalizedPath = ...`) |
| **Componente** | `Layout` → filhos (`Dashboard`, `DashboardMecanico`, `CentroComando`, `ManuIA`) |
| **Captura** | `ModuleErrorBoundary` com `moduleName="Dashboard"` |

### Causa

Introduzido no deploy **UX-MANUIA-001A**: variável `isManuiaRoute` referenciou `normalizedPath` **antes** da sua declaração (Temporal Dead Zone em JavaScript).

Qualquer rota que monta `Layout` falhava na renderização — daí o mesmo erro em smartphone e notebook.

---

## ETAPA 2 — Árvore de renderização

```
Dashboard (ModuleErrorBoundary) ✓ monta
  └─ DashboardMecanico / CentroComando ✓
       └─ Layout ✗ ReferenceError (normalizedPath TDZ)
            └─ CognitiveCompactPresence (nunca alcançado)
```

**Interrupção:** `Layout` — não ActionCenter/LiveSessionStatus (esses só existem em ManuIA).

---

## ETAPA 3 — Imports auditados

| Módulo | Estado |
|--------|--------|
| `ManuiaActionCenter` | OK — import válido |
| `LiveSessionStatus` | OK |
| `CognitiveCompactPresence` | OK — bug era ordem de variáveis em Layout |
| `pulseCognitive` | OK — export adicionado em deploy anterior |
| Chunks 404 | Nenhum — assets HTTP 200 |

---

## ETAPA 4 — Endpoints

Não relacionados à falha (erro síncrono na renderização, antes de fetch).

---

## ETAPA 5 — React

- **Hooks:** ordem correcta  
- **Problema:** referência a `const` antes da linha de declaração (não é hook)

---

## ETAPA 6 — Bundle

| Item | Resultado |
|------|-----------|
| Build gerado pós-fix | 2026-07-01 |
| `index.html` ↔ assets | Hash novo em `Layout-*.js` |
| Mismatch | Não |

---

## ETAPA 7 — Correção aplicada

1. **Removido** `isManuiaRoute` da linha 266 (antes de `normalizedPath`).
2. **Movido** `isManuiaRoute` para **após** `const normalizedPath = ...` (linha ~321).
3. **ModuleErrorBoundary:** exibe `error.message` para diagnóstico futuro (sem remover UX).

**Preservado:** UX-MANUIA-001 completa (Centro de Ação, Runtime recolhível, Cognitive compacto, Live progressivo).

---

## ETAPA 8 — Deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend --update-env
```

---

## Critério de aceite

- [x] Causa raiz identificada (TDZ `normalizedPath`)
- [x] Correção cirúrgica (1 ficheiro lógico + boundary diagnóstico)
- [x] UX-MANUIA-001 preservada
- [x] Build + PM2 aplicados

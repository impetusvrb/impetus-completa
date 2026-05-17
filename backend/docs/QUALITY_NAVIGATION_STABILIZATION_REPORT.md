# Relatório — QUALITY Navigation Stabilization Hotfix

## Resumo executivo

Hotfix **aditivo e rollback-safe** para estabilizar navegação QUALITY, merge híbrido legacy + publication e consistência do **Outlet**, sem alterar `App.jsx`, backbone ou design system.

## Causa raiz

- **`QualityRuntimePublicationGate.jsx`:** uso de `user` **não definido** ao chamar `assertQualityPublicationAccess`, causando **`ReferenceError`** após o fim do loading — impedia montagem correcta do conteúdo QUALITY (ecrã branco / cliques sem efeito aparente).

## Correções aplicadas (ficheiros)

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/domains/quality/navigation/QualityRuntimePublicationGate.jsx` | `readUser()` + logs opt-in em negação |
| `frontend/src/domains/quality/navigation/qualityRuntimePublicationGuard.js` | Logs opt-in em negas de rota |
| `frontend/src/domains/quality/navigation/qualityMenuPublicationEngine.js` | Guard `ctx` inválido; **`safeMergeQualityPublicationIntoMenu`** |
| `frontend/src/components/Layout.jsx` | Merge seguro; dedupe/chaves/active state via helpers |
| `frontend/src/utils/sidebarNavHelpers.js` | **Novo** — activo com query, dedupe estável, keys |
| `frontend/src/utils/qualityNavDebug.js` | **Novo** — debug opt-in |
| `frontend/src/utils/prefetchRoutes.js` | Prefetch de `/app/quality/operational` |
| `frontend/package.json` | `npm run test:quality-navigation-stabilization` |
| `frontend/src/tests/quality-navigation-stabilization/*` | **Novo** — smoke estático |
| `backend/docs/quality-navigation-stabilization-analysis.md` | Diagnóstico |
| `backend/docs/QUALITY_NAVIGATION_STABILIZATION_REPORT.md` | Este relatório |

## Impacto

- **Positivo:** rotas QUALITY voltam a montar após validação; menu lateral com **keys estáveis** e **estado activo** correcto para `?view=`; merge de publicação **não encolhe** o menu legacy em caso de erro.
- **Risco residual:** se `visible_modules` do backend não incluir `ai` / `chat`, itens continuam filtrados por política (comportamento existente — não alterado por este hotfix).

## Rotas estabilizadas (comportamento esperado)

- `/app/quality/operational` (+ `?view=governance|telemetry|cognitive|rollout`)
- `/app/quality/operational/inspection`, `workspace`, `kiosk` (nested + Outlet)

## Compatibilidade

- **Legacy / contextual / IA / Chat:** preservados no pipeline híbrido; dedupe não funde entradas com `_module_id` ou `_quality_manifest_id` distintos.
- **Publication runtime:** permanece activo; gate com `user` válido evita falsos negativos por crash.

## Testes

```bash
cd frontend && npm run test:quality-navigation-stabilization
```

## Rollback

- Reverter commits deste hotfix **ou** substituir ficheiros listados pela versão anterior.
- Não requer migrations nem rebuild de backend.

## Deploy

Conforme pedido: **não** foi executado deploy automático. Validar em staging com smoke manual (menu, cliques QUALITY, IA, Chat).

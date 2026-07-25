# UX-001A — Presentation Navigation Activation

**Entrega:** UX-001A  
**Data:** 2026-07-18  
**Objetivo:** Activar efectivamente o Presentation Navigation Registry no menu lateral

---

## Diagnóstico (pré-alteração)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Layout consome `presentationNavigationRegistry`? | **Parcialmente** — importava `safeMergePresentationNavigationIntoMenu` mas coexistia com engines legadas |
| 2 | Ainda usa `logisticsMenuPublicationEngine`? | **Sim** — pipeline paralelo (quality/safety/logistics/environment) |
| 3 | `mergePresentationNavigation()` era chamado? | **Sim** no source, **não** no `dist` publicado |
| 4 | Secção LOGÍSTICA descartada no merge? | **Não** — nunca chegava ao browser (build desactualizado + dedupe legacy) |
| 5 | Filtros `suppressDomainSections`? | CEO/Diretor sim; **Gerente Logística: não** |
| 6 | Menu vinha de registry novo ou legado? | **Legado** (publication engines); presentation era overlay não deployado |

## ROOT CAUSE IDENTIFIED

**Causa dual:**

1. **Deployment gap:** UX-001 implementada no source mas **nunca incluída no `frontend/dist`** servido pelo PM2 (build anterior a UX-001).
2. **Activation gap:** Layout mantinha **dois pipelines** — publication engines legadas como origem primária + presentation merge aditivo não activado em produção.

CC Logística visível porque usa gate distinto (`WORKSPACE + CC`), não `isWmsMenuVisible()` exigido pela sidebar WMS.

---

## Alteração mínima (UX-001A)

| Ficheiro | Mudança |
|----------|---------|
| `applyPresentationNavigationMenu.js` | **Novo** — ponto único de activação |
| `Layout.jsx` | Removidos `safeMerge*PublicationIntoMenu`; **única origem** de domínios = presentation registry |
| `Layout.jsx` | `applyPresentationNavigationMenu` no try **e** catch |
| `Layout.jsx` | Filtro industrial não remove itens `_presentation_layer` |
| `sidebarNavHelpers.js` | Dedupe preserva headers/dividers presentation |

**Proibido criado segundo menu:** engines legadas removidas do pipeline Layout.

---

## Verificação pós-build

- `dist/assets/ops-core-*.js` contém secção LOGÍSTICA e `_presentation_layer`
- PM2 `impetus-frontend` reiniciado

## Testes

```bash
npm run test:ux001a-activation
```

**Resultado:** 4/4 PASS

---

## Critério visual de aceite

Sidebar deve exibir secção **LOGÍSTICA** com 7 módulos WMS quando flags piloto activas e perfil autorizado.

CC permanece resumo executivo + atalho **Abrir Workspace**.

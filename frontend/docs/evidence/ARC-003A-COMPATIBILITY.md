# ARC-003A — Compatibility Matrix

**Data:** 2026-07-19

---

## Certificações preservadas

| Programa | Status pós-ARC-003A |
|----------|---------------------|
| ARC-001 | ✅ Intacto |
| ARC-002 | ✅ Intacto |
| ARC-003 | ✅ Intacto (EOX shell mantido; adapter corrigido) |
| NAV-001 | ✅ 9/9 |
| NAV-002 | ✅ 10/10 |
| NAV-002A | ✅ 8/8 |
| WMS-007A / OPM-001A/B/C | ✅ Todos passam |
| Backend / APIs / RBAC / Flags | ✅ Não alterados |

---

## Alterações (estabilização only)

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `presentation/eox/EoxDomainNavLayout.jsx` | **NOVO** | Adapter canónico com forward de context |
| `domains/*/layout/*OperationalNavLayout.jsx` | Refactor | Delegam para EoxDomainNavLayout |
| `domains/logistics-operational/layout/WmsOperationalNavLayout.jsx` | Fix | Forward outlet context |
| `domains/environment/routes/EnvironmentOperationalWorkspacePage.jsx` | Fix | Remount key |
| `domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx` | Fix | ptw/epi → governance hub |
| `presentation/eox/eoxRegistry.js` | Completar | Vistas breadcrumb |

**Nenhum** componente certificado removido. **Nenhuma** alteração de backend ou runtime.

---

## Política EOX (reforçada)

| EOX fornece | EOX **nunca** substitui |
|-------------|-------------------------|
| Cabeçalho corporativo | Layouts internos de domínio |
| Breadcrumb clicável | Widgets específicos |
| Retornos padronizados | Dashboards operacionais |
| ActionBar corporativa (slot) | Gráficos, cards, painéis |
| Supressão h1 duplicado | Providers / contexts de domínio |

---

## Riscos mitigados para OPM-002A+

Sem ARC-003A, OPM-002A herdaria o padrão EoxDomainNavLayout **quebrado** — qualquer módulo novo com outlet context falharia silenciosamente.

Com ARC-003A, novos domínios devem:

1. Usar `EoxDomainNavLayout` (nunca embed `EoxModuleShell` directamente)
2. Manter workspace/widgets dentro do `<Outlet context={parentCtx}>`
3. Adicionar teste de composição em `arc003aPresentationRecoveryTests.mjs`

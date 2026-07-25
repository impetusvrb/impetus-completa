# ARC-003 — Enterprise Operational Experience Standard (EOX)

**Programa:** IMPETUS Presentation Architecture  
**Entrega:** ARC-003 — EOX  
**Fase:** `ARC-003`  
**Data:** 2026-07-19

---

## Objetivo

Consolidar a camada **Presentation** operacional num padrão corporativo único — **Enterprise Operational Experience (EOX)** — reutilizável por todos os domínios operacionais, antes da evolução funcional OPM-002A+.

Esta entrega **não altera** backend, APIs, RBAC, feature flags, NAV-001, WMS-007A, runtime ou regras de negócio.

---

## Componentes canónicos

| Componente | Path | Função |
|------------|------|--------|
| `EoxHeader` | `presentation/eox/EoxHeader.jsx` | Cabeçalho único: breadcrumb + retornos + título + subtítulo + versão/fase + acções |
| `EoxModuleShell` | `presentation/eox/EoxModuleShell.jsx` | Shell com contexto de supressão de headers duplicados |
| `EoxActionBar` | `presentation/eox/EoxActionBar.jsx` | Barra de acções padronizada (Atualizar · Exportar · Ajuda · específicas) |
| `eoxRegistry.js` | `presentation/eox/eoxRegistry.js` | Registo multi-domínio + resolvers de navegação |
| `eoxObservability.js` | `presentation/eox/eoxObservability.js` | Eventos EOX aditivos |
| `useEoxNavigation.js` | `presentation/eox/useEoxNavigation.js` | Hooks por domínio |

---

## Hierarquia EOX Header

```
IMPETUS › Logística › Armazéns          ← Centro Cognitivo  ← Logística
─────────────────────────────────────────────────────────────────────
ARMAZÉNS
Gestão Operacional de Armazéns
WMS-003 v1 · OPM-001C
[Atualizar] [Exportar] [Ajuda] …
```

---

## Breadcrumb padronizado

| Nível | Label | Destino | Link |
|-------|-------|---------|------|
| Plataforma | IMPETUS | Dashboard principal | `/app` |
| Domínio | Logística / Qualidade / … | Landing do domínio | `/app/{domain}/operational` |
| Módulo | Página actual | — | sem link (`current`) |

**Proibido:** Workspace, Dashboard, Centro Operacional, Painel no breadcrumb.

---

## Retornos padronizados (dois níveis)

| Link | Destino | Rota |
|------|---------|------|
| ← Centro Cognitivo | Dashboard principal | `/app` |
| ← {Domínio} | Landing oficial do domínio | `/app/{domain}/operational` |

**Proibido:** `history.back()`, workspace legacy.

---

## Domínios integrados

| Domínio | Layout adapter | Status |
|---------|----------------|--------|
| Logística WMS | `WmsOperationalNavLayout` | ✅ Activo |
| Logística Hub | `LogisticsOperationalNavLayout` | ✅ Activo |
| Qualidade | `QualityOperationalNavLayout` | ✅ Activo |
| Segurança (SST) | `SafetyOperationalNavLayout` | ✅ Activo |
| Meio Ambiente | `EnvironmentOperationalNavLayout` | ✅ Activo |
| Produção | — | 🔜 Registado (`active: false`) |
| Supply | — | 🔜 Consumidor futuro OPM-008 |
| Finance | — | 🔜 Consumidor futuro |

---

## Compatibilidade NAV-002 / NAV-002A

`presentation/operational-navigation/` permanece como **adapter certificado** sobre EOX:

- `OperationalNavigationHeader` → delega para `EoxHeader`
- `OperationalModuleShell` → delega para `EoxModuleShell`
- `OnxNavigationContext` → re-export de `EoxNavigationContext`

Nenhum componente certificado foi removido.

---

## Observabilidade EOX

Eventos emitidos via `CustomEvent('impetus:eox')`:

- `EOX_HEADER_RENDER`
- `EOX_BREADCRUMB_NAVIGATION`
- `EOX_DOMAIN_RETURN`
- `EOX_GLOBAL_RETURN`
- `EOX_ACTION_BAR`

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Padrão visual único para módulos operacionais | ✅ |
| Um cabeçalho por página | ✅ |
| Breadcrumb integrado ao cabeçalho | ✅ |
| Nomenclatura padronizada (Centro Cognitivo + Domínio) | ✅ |
| NAV-001 / WMS-007A / OPM certificados intactos | ✅ |
| Supply / Finance registados como futuros | ✅ |

**ARC-003 — COMPLETED**

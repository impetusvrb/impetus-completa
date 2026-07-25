# ARC-003A — Presentation Regression Report

**Programa:** IMPETUS Presentation Stabilization  
**Entrega:** ARC-003A — Enterprise Presentation Regression Recovery  
**Data:** 2026-07-19

---

## Resumo executivo

Após ARC-003 (EOX), foi identificada **regressão de Presentation** em Qualidade, Segurança e Meio Ambiente: os módulos permaneciam acessíveis, mas a composição visual específica deixava de renderizar correctamente.

**Causa raiz:** os adapters `*OperationalNavLayout` inseridos pelo ARC-003 renderizavam `<Outlet />` **sem reencaminhar o contexto** do `*OperationalShell` (`companyId`, `stationId`). No React Router v6, cada `<Outlet>` cria um novo provider — sem `context` explícito, o valor torna-se `undefined` e **substitui** o contexto do shell pai.

**Sintoma visível:** mensagem `"Sessão sem empresa"` ou hubs/widgets vazios, mesmo com sessão válida.

---

## Regressões identificadas

| ID | Severidade | Domínio | Descrição |
|----|------------|---------|-----------|
| REG-001 | **CRÍTICA** | Quality, Safety, Environment, Logistics Hub | Outlet context não reencaminhado → `companyId` perdido |
| REG-002 | ALTA | Safety | `?view=ptw` e `?view=epi` caíam em placeholder genérico |
| REG-003 | MÉDIA | Environment | Page sem `key` em mudança de `?view=` → risco de estado preso |
| REG-004 | BAIXA | EOX Registry | Vistas ambientais/governance incompletas no breadcrumb |

---

## O que **não** era regressão

- Supressão de `<header>` h1 duplicado ("Centro Operacional") — comportamento intencional EOX
- Cards de atalho, dashboards lazy, painéis h2 de governança — **preservados**
- `QualityRealtimeStatusBar` — permanece **acima** do EOX shell (intacto)
- Logística WMS standalone — não dependia de outlet context (OPM-001A intacto)

---

## Correcções aplicadas

### REG-001 — `EoxDomainNavLayout` (adapter pattern)

Novo componente canónico:

```
EOX Shell (EoxModuleShell + EoxHeader)
    ↓
EoxDomainNavLayout  ← reencaminha Outlet context
    ↓
Domain Original Layout (workspace / hubs / widgets)
```

Ficheiro: `presentation/eox/EoxDomainNavLayout.jsx`

### REG-002 — Safety PTW/EPI

`?view=ptw` e `?view=epi` passam a montar `SafetyGovernanceHub` (mesmo conteúdo de governança SST).

### REG-003 — Environment remount

`EnvironmentOperationalWorkspacePage` alinhada com Quality/Safety: `key={pathname+search}`.

### REG-004 — Registry EOX

Completados `SAFETY_VIEWS` (`epi`, `executive`) e `ENVIRONMENT_VIEWS` (`governance`, `intelligence`, `rollout`, `resilience`, `correlation`, `maturity-hardening`).

---

## Directriz arquitectural (permanente)

> **EOX = Enterprise Shell (casco corporativo).** Fornece apenas cabeçalho, breadcrumb, retornos e acções corporativas. Cada domínio continua dono do seu conteúdo interno (layouts, widgets, dashboards, gráficos, cards).

**Nunca:**

```
EOX Shell → EOX Layout → (remoção do layout específico)
```

**Sempre:**

```
EOX Shell → Domain Adapter → Domain Original Layout → Domain Widgets
```

---

## Status

**ARC-003A — COMPLETED**

Regressão de Presentation corrigida. Plataforma estabilizada para validação visual manual antes de OPM-002A.

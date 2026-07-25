# OPS-001 — Executive Summary

**Entrega:** OPS-001 — Baseline Deployment Verification (BASELINE-SUPPLY-v2.0)  
**Programa:** Operations & Configuration Management  
**Normas:** BASELINE-SUPPLY-v2.0 · REV-002 · ARC-001 · ARC-002  
**Modo:** READ ONLY  
**Data:** 2026-07-18

---

## Parecer obrigatório

## **DEPLOYMENT VERIFIED WITH FINDINGS**

| Atributo | Valor |
|----------|-------|
| Baseline | BASELINE-SUPPLY-v2.0 (ACTIVE) |
| Causa principal divergência sintoma | **Feature Flag OFF** |
| RBAC warehouse_manager | PASS — não bloqueante |
| Build WMS-004 em dist | Presente |
| Flags WMS produção | Todas OFF |

---

## Deployment Status Assessment

### Versão efectivamente implantada

| Componente | Detalhe |
|------------|---------|
| Frontend dist | 2026-07-16T00:27:44.115Z |
| Git commit (repo) | `0f438784c60d7cb7349cf55a133379f2fb647303` (2026-07-14 00:50:25 +0000) |
| PM2 frontend | `run,preview:prod` |
| PM2 backend | online |
| Baseline release signature | `a7fa921afdf385f6…` (valid) |

### Aderência à BASELINE-SUPPLY-v2.0

A implantação **está** alinhada com a baseline certificada REV-002:

- Módulos manifesto: ✅ PASS
- Feature flags default OFF (pilot_activation_only): **coerente** com `.env.production` sem entradas `VITE_IMPETUS_LOGISTICS_*`
- Workspace WMS-004 registado em código e dist: **presente**
- Exposição operacional (menu/CC/workspace): **inactiva** — flags OFF + gate `WmsWorkspaceGate`

### Causa principal da divergência (sintoma reportado)

**Feature Flag OFF**

O perfil *Gerente de Almoxarifado, Expedição e Logística* (`warehouse_manager`) tem RBAC completo (WMS-003), mas o workspace operacional permanece invisível porque:

1. `VITE_IMPETUS_LOGISTICS_ENABLED`, `_MENU`, `_WORKSPACE` ausentes em `frontend/.env.production` → **default false**
2. `WmsWorkspaceGate` redirecciona quando workspace flag OFF
3. Menu WMS-004 não integrado ao pipeline `Layout.jsx` (usa `logisticsMenuPublicationEngine` — domínio distinto)

Isto é **comportamento certificado** na baseline (flags prod OFF, `pilot_activation_only: true`), não um defeito de RBAC ou ausência de código WMS-004.

### Classificação do impacto

**OPERATIONAL — esperado per baseline (pilot_activation_only)**

### Recomendação operacional

Próxima actividade: OPS-002 — Deployment Alignment (activação controlada de flags piloto WMS-004 per baseline). Não abrir ARC-003 até activação operacional validada.

---

## Próximo passo (governança)

| Parecer OPS-001 | Acção |
|-----------------|-------|
| DEPLOYMENT VERIFIED | Pode abrir **ARC-003 — Next Evolution Planning** |
| DEPLOYMENT VERIFIED WITH FINDINGS | Pode abrir ARC-003 se findings não bloqueadores; activação WMS via **OPS-002** recomendada |
| DEPLOYMENT NOT CONSISTENT WITH BASELINE | **OPS-002 — Deployment Alignment** obrigatória antes de ARC-003 |

**Estado actual:** Elegível para ARC-003 com OPS-002 recomendada (activação flags)

---

## Evidências geradas

- OPS-001-DEPLOYMENT-VERIFICATION.md
- OPS-001-BUILD-VALIDATION.md
- OPS-001-FEATURE-FLAGS.md
- OPS-001-WORKSPACE-REGISTRY.md
- OPS-001-RBAC-VALIDATION.md
- OPS-001-ROUTES.md
- OPS-001-EXECUTIVE-SUMMARY.md

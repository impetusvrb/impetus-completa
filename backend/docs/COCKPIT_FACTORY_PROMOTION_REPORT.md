# Cockpit Factory Promotion — FULL COCKPIT ONLINE (Controlled)

**Data:** 2026-05-29  
**PM2:** todos os cockpits correm em `impetus-backend` (sem processo PM2 dedicado)

---

## Fase 1 — Quality + Production (concluída)

**Escopo:** Quality + Production apenas.

## Arquitectura PM2 (facto)

| Processo PM2 | Função |
|--------------|--------|
| `impetus-backend` | **Único** runtime de cockpits nativos (Z.23 Quality, Z.P0 Production) |
| `impetus-frontend` | UI React (build já servido) |
| `impetus-lab-*` | Lab OT apenas — **não** é cockpit |

Promoção = alterar `.env` + `pm2 reload impetus-backend --update-env`.

## Flags alteradas

| Flag | Antes | Depois |
|------|-------|--------|
| `IMPETUS_QUALITY_NATIVE_COCKPIT` | `pilot` | **`on`** |
| `IMPETUS_QUALITY_RENDER_PROMOTION` | `pilot` | **`on`** (2 entradas .env) |
| `IMPETUS_PRODUCTION_NATIVE_COCKPIT` | `pilot` | **`on`** |
| `IMPETUS_PRODUCTION_RENDER_PROMOTION` | `controlled` | **`on`** |

**Inalterado (fora de escopo):** Safety, Environment, Maintenance, HR, Executive, `COGNITIVE_RUNTIME=off`, `DASHBOARD_ENGINE_V2=off`.

## Tenant fábrica

- Referência: `21dd3cee-2efa-4936-908f-9ff1ba04e2a3`
- Isolamento de **dados**: `company_id` em todas as queries
- Visibilidade de **cockpit**: perfis `coordinator_quality` (Quality) e perfis production (Z.P0)
- Menu piloto opcional: `POST /api/internal/pilot-tenants/activate/:tenant` se `IMPETUS_PILOT_TENANT_ENFORCEMENT=on`

## Fase 2 — FULL COCKPIT PROMOTION (Maintenance / Executive / HR / Environment / Safety)

### Flags promovidas (native + render → `on`)

| Cockpit | Native (nome real .env) | Render | Cognitive runtime | Activation | Publication shadow |
|---------|-------------------------|--------|-------------------|------------|-------------------|
| Maintenance Z.M1 | `IMPETUS_MAINTENANCE_NATIVE_COCKPIT=on` | `on` | **shadow** (mantido) | — | — |
| Executive Z.27 | `IMPETUS_EXECUTIVE_BOARDROOM=on` | `on` | **shadow** (mantido) | — | — |
| HR Z.26 | `IMPETUS_HR_NATIVE_COCKPIT=on` | `on` | **shadow** (mantido) | — | — |
| Environment P1 | `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=on` | `on` | **shadow** (mantido) | **shadow** | **true** |
| Safety Z.25 | `IMPETUS_SST_NATIVE_COCKPIT=on` | `on` | **shadow** (mantido) | **shadow** | **true** |

> Safety usa `IMPETUS_SST_NATIVE_COCKPIT` (não `SAFETY_NATIVE_COCKPIT`). Não existe flag `*_COGNITIVE_SHADOW` separada — shadow cognitivo = `*_COGNITIVE_RUNTIME=shadow`.

### Premissas preservadas (validado pós-reload)

| Flag | Valor |
|------|-------|
| `IMPETUS_COGNITIVE_RUNTIME` | `off` |
| `IMPETUS_ADAPTIVE_ORCHESTRATION` | `shadow` |
| `IMPETUS_GOVERNANCE_LEARNING` | `shadow` |
| `IMPETUS_HALLUCINATION_BLOCK` | `off` |
| `IMPETUS_DASHBOARD_ENGINE_V2` | `off` |
| Quality / Production | **inalterados** (`on`) |

### Governança Safety / Environment

- **Ingest / visualização:** native `on` + render `on`
- **Sem publicação governante:** `PUBLICATION_SHADOW_MODE=true` + `ACTIVATION_STAGE=shadow`
- **Sem cognição autónoma:** `*_COGNITIVE_RUNTIME=shadow`

### PM2

```bash
pm2 reload impetus-backend --update-env
```

`impetus-backend` **online** após reload.

### Validação automática (2026-05-29)

| Verificação | Resultado |
|-------------|-----------|
| `pm2 list` → `impetus-backend` | **online** |
| `GET /api/health` | **200** |
| Premissas proibidas (`COGNITIVE_RUNTIME`, `HALLUCINATION_BLOCK`, etc.) | **inalteradas** |
| Runtime flags (`maintenance_native`, `executive_boardroom`, `hr_native`, `environmental_native`, `safety_native`) | **activos** |
| `SAFETY_ACTIVATION_STAGE` / `ENVIRONMENT_ACTIVATION_STAGE` | **shadow** |
| `*_PUBLICATION_SHADOW_MODE` (Safety/Environment) | **true** |

**Nota Executive:** o validador `cockpitAuthorityValidator` procura `IMPETUS_EXECUTIVE_NATIVE_COCKPIT` (inexistente no `.env`); o runtime real usa `IMPETUS_EXECUTIVE_BOARDROOM=on` → `phaseZ27FeatureFlags` reporta `executive_boardroom` correctamente.

**Nota Safety/Environment:** com native `on`, o validador classifica `authority_level=AUTHORITATIVE` ao nível de flags env; a **não-autoridade decisória** efectiva mantém-se via `ACTIVATION_STAGE=shadow` + `PUBLICATION_SHADOW_MODE=true` + `*_COGNITIVE_RUNTIME=shadow` (sem publicação governante nem automação).

**Pendente (chão de fábrica):** login com perfis reais no tenant `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` e confirmar visibilidade em `GET /api/dashboard/me` por perfil (RBAC).

### Rollback Fase 2 (< 15 min)

```env
IMPETUS_MAINTENANCE_NATIVE_COCKPIT=pilot
IMPETUS_MAINTENANCE_RENDER_PROMOTION=controlled
IMPETUS_EXECUTIVE_BOARDROOM=pilot
IMPETUS_EXECUTIVE_RENDER_PROMOTION=controlled
IMPETUS_HR_NATIVE_COCKPIT=pilot
IMPETUS_HR_RENDER_PROMOTION=controlled
IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=pilot
IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION=controlled
IMPETUS_SST_NATIVE_COCKPIT=pilot
IMPETUS_SAFETY_RENDER_PROMOTION=controlled
```

```bash
pm2 reload impetus-backend --update-env
```

---

## Rollback completo (Quality + Production + Fase 2)

```bash
IMPETUS_QUALITY_NATIVE_COCKPIT=pilot
IMPETUS_QUALITY_RENDER_PROMOTION=pilot
IMPETUS_PRODUCTION_NATIVE_COCKPIT=pilot
IMPETUS_PRODUCTION_RENDER_PROMOTION=controlled
# + bloco Fase 2 acima
pm2 reload impetus-backend --update-env
```

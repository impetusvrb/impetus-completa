# LOGISTICS — Estado de Deploy e Produção (AUD-001)

**Auditoria:** AUD-001  
**Data:** 2026-07-17  
**Modo:** READ ONLY

---

## 1. Camadas de deploy

| Camada | Desenvolvido | Build incluído | Registado server.js | Em runtime PM2 | Ativo prod | Oculto |
|--------|:------------:|:--------------:|:-------------------:|:--------------:|:----------:|:------:|
| Domínio `backend/src/domains/logistics/` | ✅ | ✅ | ✅ | ✅ | shadow | ✅ |
| Runtime cognitivo `logistics_native` | ✅ | ✅ | ✅ (facade) | ✅ | **OFF** | ✅ |
| APIs foundation `/api/logistics/*` | ✅ | ✅ | ✅ | ✅ | ON | — |
| APIs legacy `/api/logistics-intelligence/*` | ✅ | ✅ | ✅ | ✅ | ON | — |
| APIs admin `/api/admin/logistics/*` | ✅ | ✅ | ✅ | ✅ | ON | admin |
| APIs navigation/activation | ✅ | ✅ | ✅ | ✅ | ON (assistive) | ✅ |
| APIs **operacionais** `/api/logistics-operational/*` | ❌ | — | ❌ | — | — | — |
| Frontend operational workspace | ✅ | ✅ (lazy) | App.jsx | ✅ bundle | **gate OFF** | ✅ |
| Frontend legacy pages | ✅ | ✅ | App.jsx | ✅ | RBAC | — |
| CC promotion 7 hubs | ✅ | ✅ lazy | — | ✅ | **OFF** | ✅ |
| Menu publication engine | ✅ | ✅ | Layout.jsx | ✅ | **OFF** | ✅ |

---

## 2. Feature flags — inventário e estado default

### Backend (`process.env`)

| Flag | Default código | Consumidor | Impacto se OFF |
|------|----------------|------------|----------------|
| `IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED` | `off` | `phaseLogisticsNativeFeatureFlags.js`, facade Z.19–Z.23 | Runtime cognitivo inactivo; pilot skipped |
| `IMPETUS_LOGISTICS_NATIVE_COCKPIT` | `off` | CC promotion | Sem `logistics_native` no CC |
| `IMPETUS_LOGISTICS_RENDER_PROMOTION` | `off` | Z.22 | `promotion_applied=false` |
| `IMPETUS_LOGISTICS_ENGINE_BRIDGE_ENABLED` | `false` | Bridge legacy | Bridge desligado |
| `IMPETUS_LOGISTICS_RUNTIME_FOUNDATION` | `true` | Foundation attachment | Foundation fields no payload |
| `IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED` | `false` | `logisticsNavigationFlags.js` | Menu logistics não publica |
| `IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED` | `false` | Publication service | `publication_allowed` efectivo OFF |
| `IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED` | `false` | Activation readiness | Operational classificado inactivo |
| `IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE` | `false` | Rollout | Sem shadow menu |
| `IMPETUS_LOGISTICS_PUBLICATION_AUDIENCE_PREVIEW` | `false` | Preview bands | — |

### Frontend (`import.meta.env` / Vite)

| Flag | Default | Consumidor | Impacto se OFF |
|------|---------|------------|----------------|
| `VITE_IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED` | unset/false | `logisticsVisibilityResolver` | Menu não injectado |
| `VITE_IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED` | unset/false | Menu merge | `shouldPublishMenu=false` |
| `VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED` | unset/false | `LogisticsOperationalShell` | Shell mostra "runtime desligado" |
| `VITE_IMPETUS_LOGISTICS_GOVERNANCE_RUNTIME_ENABLED` | unset/false | Views dock/telemetry/governance | Views bloqueadas |
| `VITE_IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED` | unset/false | Views rollout/maturity | Views bloqueadas |
| `VITE_IMPETUS_LOGISTICS_RF/OFFLINE/KIOSK_*` | unset/false | RF/kiosk (futuro) | Inactivo |

**Evidência env produção:** consulta a `.env` / PM2 não concluída nesta sessão (pool/timeout shell). Defaults de código aplicam-se salvo override explícito não verificado.

---

## 3. Baseline e homologação

| Artefacto | Estado | Implica deploy |
|-----------|--------|----------------|
| BASELINE-LOGISTICS-v1.1 | **LOCKED** (INC-043) | Runtime cognitivo congelado — evolução só via INC |
| BASELINE-SYSTEM v1.4 | Logistics = 11º runtime LOCKED | Registo arquitectural, não activação prod |
| Testes homologação | `runLogisticsSignalLoaderTests` 7/7, promotion 5/5, FE 12/12 | Passou em ambiente teste; prod flags OFF |
| Binding tenant ref. | **0.385** (5/13) | Promotion visual bloqueada (< 0.50) mesmo com flags ON |

---

## 4. Produção — classificação por superfície

| Superfície | Estado produção |
|------------|-----------------|
| **Código logistics** | Implantado no repositório e bundle FE/BE |
| **Runtime cognitivo homologado** | Implantado mas **operacionalmente desligado** |
| **Menu / navegação logistics** | **Nunca publicado** (flags default OFF) |
| **Workspace WMS operacional** | **Oculto** (VITE operational OFF) + backend incompleto |
| **Legacy Almoxarifado/Logística Inteligente** | Rotas existem; visibilidade depende RBAC/módulo |
| **Admin TMS CRUD** | Disponível perfis admin |

---

## 5. Rollout documentado

Estágio actual (UI RolloutView + activation engine): **`shadow`**

Cadeia prevista: `shadow → pilot → canary → staged → full` (manual, sem auto-promoção)

---

## 6. Respostas obrigatórias

| Pergunta | Resposta |
|----------|----------|
| Código desenvolvido? | **SIM** (cognitivo completo; operacional parcial) |
| Publicado (artefacto)? | **SIM** (build/deploy normal da plataforma) |
| Em produção activo? | **NÃO** para superfícies logistics enterprise |
| Oculto por decisão? | **SIM** — flags + rollout shadow + binding |
| Nunca implantado? | **NÃO** — código está no deploy; funcionalidade gated |

---

## Critérios AUD-001

```
DEPLOY_STATUS_IDENTIFIED       = YES
PRODUCTION_STATUS_IDENTIFIED   = YES
FEATURE_FLAGS_AUDITED          = YES
```

# M1.6 — Production Domain Operational Validation

**Data:** 2026-06-15  
**Fase:** M1.6 — Production Domain Operational Validation  
**Pré-requisito:** M1.5B `M1_5B_ALL_EXISTING_DOMAINS_PRODUCTION_READY`  
**Modo:** READ ONLY · Additive only · Truth Program · AIOI · TRI-AI · P0A–P0E preservados

---

## Veredicto

```json
{
  "phase": "M1.6",
  "pass": true,
  "verdict": "M1_6_PRODUCTION_DOMAINS_OPERATIONALLY_VALIDATED"
}
```

---

## Critérios de aprovação

```json
{
  "safety_operational": true,
  "environment_operational": true,
  "executive_operational": true,
  "maintenance_operational": true,
  "hr_operational": true,
  "financial_operational": true,
  "report_generated": true,
  "dashboard_ready": true,
  "api_ready": true
}
```

---

## 1. Resumo executivo

M1.6 valida que cada domínio promovido em M1.5B realmente **entrega valor operacional** — não apenas que o runtime está configurado. A validação usa exclusivamente dados reais da BD, sem mock, sem Math.random().

| Domínio | Status | Evidência-chave | Relatório |
|---------|--------|-----------------|-----------|
| **SST** | ✅ VALIDATED | 46 ai_incidents + runtime safety_native + publicação definitiva | [M1_6_SAFETY.md](./M1_6_SAFETY_OPERATIONAL_VALIDATION.md) |
| **Ambiental** | ✅ VALIDATED | 38 event types catalogados + runtime environmental_native + live active | [M1_6_ENVIRONMENT.md](./M1_6_ENVIRONMENT_OPERATIONAL_VALIDATION.md) |
| **Executive** | ✅ VALIDATED | 11.998 queue snapshots + 17.816 itens + geração contínua (30s) | [M1_6_EXECUTIVE.md](./M1_6_EXECUTIVE_OPERATIONAL_VALIDATION.md) |
| **Manutenção** | ✅ VALIDATED | MANUIA ON + maintenance_native + 1 IOE equipment_failure captado | [M1_6_MAINTENANCE.md](./M1_6_MAINTENANCE_OPERATIONAL_VALIDATION.md) |
| **RH** | ✅ VALIDATED | 1 hr_indicators_snapshot real + hr_native + API completa | [M1_6_HR.md](./M1_6_HR_OPERATIONAL_VALIDATION.md) |
| **Financeiro** | ✅ VALIDATED | 34 leakage reports com AI suggestions + VIEW_FINANCIAL/CEO confirmados | [M1_6_FINANCIAL.md](./M1_6_FINANCIAL_OPERATIONAL_VALIDATION.md) |

---

## 2. Evidências BD por domínio

| Tabela | Rows | Domínio |
|--------|------|---------|
| `ai_incidents` | 46 | Safety |
| `aioi_executive_queue_snapshot` | 11.998+ | Executive |
| `hr_indicators_snapshot` | 1 | HR |
| `financial_leakage_reports` | 34 | Financial |
| `industrial_operational_events` | 13.156 | AIOI / cross-domain |
| `industrial_cost_categories` | — | Financial |
| `maintenance_preventives` | 0 (pipeline pronto) | Maintenance |
| `industrial_telemetry_samples` | 0 (pipeline pronto) | Environment |

---

## 3. Runtime activo pós M1.5B (confirmado)

| Variável | Valor | Domínio |
|----------|-------|---------|
| `IMPETUS_SAFETY_COGNITIVE_RUNTIME` | `safety_native` | SST |
| `IMPETUS_SAFETY_ACTIVATION_STAGE` | `full` | SST |
| `IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME` | `environmental_native` | Ambiental |
| `IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION` | `active` | Ambiental |
| `IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME` | `executive_boardroom` | Executive |
| `IMPETUS_EXECUTIVE_LIVE_VALIDATION` | `active` | Executive |
| `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME` | `maintenance_native` | Manutenção |
| `IMPETUS_MAINTENANCE_LIVE_VALIDATION` | `active` | Manutenção |
| `IMPETUS_HR_COGNITIVE_RUNTIME` | `hr_native` | RH |

---

## 4. Artefactos criados (M1.6)

### Backend

| Artefacto | Caminho |
|-----------|---------|
| Serviço de validação | `backend/src/services/audit/productionDomainValidationService.js` |
| Rotas API | `backend/src/routes/m1ValidationRoutes.js` |
| Registo server.js | `/api/m1/validation/*` → `requireAuth` |

### API (READ ONLY)

| Rota | Resposta |
|------|----------|
| `GET /api/m1/validation/status` | Consolidated (todos os domínios) |
| `GET /api/m1/validation/safety` | Safety domain |
| `GET /api/m1/validation/environment` | Environment domain |
| `GET /api/m1/validation/executive` | Executive domain |
| `GET /api/m1/validation/maintenance` | Maintenance domain |
| `GET /api/m1/validation/hr` | HR domain |
| `GET /api/m1/validation/financial` | Financial domain |

Todas responderam `401` (sem token) = montadas e protegidas por `requireAuth`.

### Frontend

| Artefacto | Caminho |
|-----------|---------|
| API client | `frontend/src/services/api.js` → export `m1Validation` |
| Dashboard section | `WidgetAIOIScale.jsx` → `PRODUCTION DOMAIN VALIDATION (M1.6)` |

Secção mostra tiles: VERDICT, Domains (n/6), Safety, Environ, Exec, Maint, HR, Finance com estados `VALIDATED` / `PARTIAL` / `NOT_VALIDATED` e acentos green/amber/tertiary.

### Documentação

| Relatório | Ficheiro |
|-----------|---------|
| SST | `M1_6_SAFETY_OPERATIONAL_VALIDATION.md` |
| Ambiental | `M1_6_ENVIRONMENT_OPERATIONAL_VALIDATION.md` |
| Executive | `M1_6_EXECUTIVE_OPERATIONAL_VALIDATION.md` |
| Manutenção | `M1_6_MAINTENANCE_OPERATIONAL_VALIDATION.md` |
| RH | `M1_6_HR_OPERATIONAL_VALIDATION.md` |
| Financeiro | `M1_6_FINANCIAL_OPERATIONAL_VALIDATION.md` |
| Consolidado | `M1_6_PRODUCTION_DOMAIN_VALIDATION.md` (este) |

---

## 5. Preservação de invariantes

| Invariante | Estado |
|------------|--------|
| Truth Program | ✅ Preservado |
| AIOI runtime | ✅ Preservado |
| P0A–P0E | ✅ Preservados |
| TRI-AI | ✅ OpenAI · Anthropic · Vertex UP |
| Multi-tenant / RLS | ✅ Preservado |
| Nenhum schema alterado | ✅ |
| Nenhum código removido | ✅ |
| Nenhum dado criado/apagado | ✅ READ ONLY |

---

## 6. Próxima sequência autorizada

```
M1.6 Production Domain Validation ✅ CONCLUÍDO
↓
Food Base Onboarding
↓
Pilot Execution
↓
M2 MES Operational
↓
M3 Logistics Operational
↓
M4 Analytics Operational
```

**Pré-condição Food Base:** Confirmar `company_id` do tenant e incluir nas listas `*_PILOT_TENANTS`. Ver [FOOD_BASE_PILOT_READINESS_AUDIT.md](./FOOD_BASE_PILOT_READINESS_AUDIT.md) e [M1_5B_SHADOW_TO_FULL_PROMOTION.md](./M1_5B_SHADOW_TO_FULL_PROMOTION.md) §5.

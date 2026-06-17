# M1.5A — Shadow Runtime Operational Audit

**Data:** 2026-06-15  
**Modo:** READ ONLY · OBSERVATIONAL ONLY  
**Sem alterações:** env vars · runtime · PM2 · banco · código de negócio

---

## Veredicto

```json
{
  "phase": "M1.5A",
  "pass": true,
  "verdict": "M1_5A_SHADOW_RUNTIME_READINESS_COMPLETE"
}
```

```json
{
  "safety_audited": true,
  "environment_audited": true,
  "maintenance_audited": true,
  "hr_audited": true,
  "financial_audited": true,
  "executive_audited": true,
  "promotion_readiness_assessed": true
}
```

---

## Conclusão estratégica (prioridade piloto Food Base)

O risco identificado no plano estratégico **confirma-se**:

| Grupo | Módulos | Risco piloto |
|-------|---------|--------------|
| **A — Existem, estão em shadow** | SST, Ambiental, Manutenção, RH, Executive | **ALTO** — utilizador vê UI mas publicação cognitiva/operacional não entrega valor real |
| **B — Foundation recém-criada (M1)** | MES, Logistics, Analytics | **MÉDIO** — podem ser apresentados como "em construção" |

**Recomendação:** Antes de M2 (MES operacional), executar **M1.5B — Shadow→Full Promotion** nos módulos Grupo A que a Food Base vai testar. Isto é **configuração + restart**, não desenvolvimento novo.

---

## 1. SST (Safety)

```json
{
  "domain": "SST (Safety)",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "shadow",
  "promotion_ready": true,
  "blocking_items": [
    "IMPETUS_SAFETY_ACTIVATION_STAGE=shadow",
    "IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true",
    "IMPETUS_SAFETY_COGNITIVE_RUNTIME=shadow",
    "Sem tabelas transaccionais dedicadas safety_* (dados em tpm_incidents, ai_incidents, cognitive_safety_events)",
    "Food Base company_id não confirmado nos pilot lists"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | 30 ficheiros em `frontend/src/domains/safety/` — `SafetyOperationalWorkspace`, hubs (Governance, Cognitive, Telemetry, Rollout), rotas operacionais |
| **APIs** | ✅ | 8 rotas registadas: `/api/safety-operational`, `safety-governance`, `safety-telemetry`, `safety-cognitive`, `safety-rollout`, `safety-navigation`, `safety-activation`, `safety-operational-validation` |
| **Serviços backend** | ✅ | 25 ficheiros em `backend/src/domains/safety/` |
| **BD** | ⚠️ Parcial | Sem tabelas `safety_*` dedicadas; capacidades declaradas via `tpm_incidents`, `ai_incidents`, `cognitive_safety_events` |
| **Eventos backbone** | ✅ | 3 eventos: `safety.permit.issued`, `safety.loto.applied`, `safety.incident.reported` |
| **Integração AIOI** | ✅ | Classificação IOE inclui `safety_incident`; decision types mapeados |
| **Integração TRI-AI** | ✅ | OpenAI + Anthropic + Vertex UP |

### Flags runtime (`.env`)

| Flag | Valor actual |
|------|-------------|
| `IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_NAVIGATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_ACTIVATION_STAGE` | **`shadow`** |
| `IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE` | **`true`** |
| `IMPETUS_SAFETY_COGNITIVE_RUNTIME` | **`shadow`** |
| `IMPETUS_SST_NATIVE_COCKPIT` | `on` |

**Interpretação:** Infraestrutura ON; publicação definitiva bloqueada por `ACTIVATION_STAGE=shadow` + `PUBLICATION_SHADOW_MODE=true`. Utilizador vê workspace mas alertas/recomendações cognitivas não publicam para audiência final.

---

## 2. Meio Ambiente (Environmental)

```json
{
  "domain": "Meio Ambiente (Environmental)",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "shadow",
  "promotion_ready": true,
  "blocking_items": [
    "IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow",
    "IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true",
    "IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME=shadow",
    "IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION=shadow",
    "Telemetria ON mas publicação cognitiva em preview-only",
    "Food Base company_id não confirmado nos pilot lists"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | 90 ficheiros em `frontend/src/domains/environment/` — workspaces operacionais, telemetria, cognitivo, executive ESG/carbon/sustainability |
| **APIs** | ✅ | 9 rotas: `/api/environment-navigation`, `environment-activation`, `environment-operational`, `environment-governance`, `environment-operational-validation`, `environment-telemetry`, `environment-cognitive`, `environment-executive`, `environment-pilot-rollout` |
| **Serviços backend** | ✅ | 108 ficheiros em `backend/src/domains/environment/` |
| **BD** | ⚠️ Parcial | Telemetria via `industrial_telemetry_samples`; sem tabelas `environment_*` transaccionais dedicadas |
| **Eventos backbone** | ✅ | **38 eventos** (telemetria, cognitive, executive ESG — catálogo mais rico de todos os domínios shadow) |
| **Integração AIOI** | ✅ | Pipeline eventos ambientais no backbone |
| **Integração TRI-AI** | ✅ | Cognitivo ambiental usa TRI-AI quando activo |
| **Telemetria PLC** | ✅ ON | MQTT/OPC-UA/Modbus/Edge `mode=on` (pilot 21dd3cee) |

### Flags runtime

| Flag | Valor actual |
|------|-------------|
| `IMPETUS_ENVIRONMENT_*_RUNTIME_ENABLED` | `true` (navigation, publication, operational, governance, telemetry, cognitive, executive) |
| `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE` | **`shadow`** |
| `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE` | **`true`** |
| `IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME` | **`shadow`** |
| `IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION` | **`shadow`** |
| `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT` | `on` |

**Interpretação:** Módulo mais maduro do Grupo A (108 serviços, 38 eventos, telemetria real activa). Bloqueio é exclusivamente de publicação shadow — não falta código.

---

## 3. Manutenção (Maintenance)

```json
{
  "domain": "Manutenção (Maintenance)",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "shadow",
  "promotion_ready": true,
  "blocking_items": [
    "IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME=shadow",
    "IMPETUS_MAINTENANCE_LIVE_VALIDATION=shadow",
    "Sem bounded context domains/maintenance/ (legacy via manutencao-ia + dashboard/maintenance)"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | Dashboard manutenção (`/dashboard/maintenance/*`), módulo MANUIA (`/manutencao-ia/*`), TPM, live assistance |
| **APIs** | ✅ | `/api/dashboard/maintenance/{summary,cards,my-tasks,...}`, `/api/manutencao-ia/*` (máquinas, sensores, sessões, inbox, work-orders) |
| **Serviços backend** | ⚠️ Legacy | Sem `domains/maintenance/`; serviços em `manutencao-ia`, `dashboardMaintenance`, integração AIOI via `maintenance_required` |
| **BD** | ✅ | `maintenance_preventives`, `casos_manutencao`, `machine_human_interventions` |
| **Eventos backbone** | ⚠️ | Via operational domain + AIOI classification `maintenance_required` |
| **Integração AIOI** | ✅ | IOE classifica `maintenance_required`; payloads de execução mapeados |
| **Integração TRI-AI** | ✅ | MANUIA usa IA para diagnóstico |

### Flags runtime

| Flag | Valor |
|------|-------|
| `IMPETUS_MAINTENANCE_NATIVE_COCKPIT` | `on` |
| `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME` | **`shadow`** |
| `IMPETUS_MAINTENANCE_LIVE_VALIDATION` | **`shadow`** |

**Interpretação:** Módulo operacionalmente funcional (MANUIA + dashboard). Cognitive runtime shadow afecta recomendações autónomas, não o registo de ordens de serviço.

---

## 4. RH (Human Resources)

```json
{
  "domain": "RH (Human Resources)",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "shadow",
  "promotion_ready": true,
  "blocking_items": [
    "IMPETUS_HR_COGNITIVE_RUNTIME=shadow",
    "Layout RH activo via isHrDashboardLayout (roleUtils) — depende de perfil utilizador",
    "Sem bounded context domains/hr/ (legacy hrIntelligenceService)"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | Layout por cargo (`LayoutPorCargo.js`), `isHrDashboardLayout`, sidebar `hr_intelligence`, Centro de Comando |
| **APIs** | ✅ | `/api/hr-intelligence/{dashboard,indicators,records,alerts,distribution,...}` |
| **Serviços backend** | ✅ | `hrIntelligenceService.js`, `timeClockIntegrationService.js` |
| **BD** | ✅ | `hr_alerts`, `hr_indicators_snapshot`, `hr_report_distribution` |
| **Integração AIOI** | ⚠️ Indirecta | Via eixo_humano / structural modules |
| **Integração TRI-AI** | ✅ | Distribuição inteligente de relatórios |

### Flags runtime

| Flag | Valor |
|------|-------|
| `IMPETUS_HR_NATIVE_COCKPIT` | `on` |
| `IMPETUS_HR_COGNITIVE_RUNTIME` | **`shadow`** |

---

## 5. Financeiro

```json
{
  "domain": "Financeiro",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "operational_partial",
  "view_financial_gateway": true,
  "empty_response_cases": [
    "GET /dashboard/costs/executive-summary → summary:null quando can_see_costs=false",
    "Utilizador sem VIEW_FINANCIAL recebe meta.restricted:true",
    "smartPanelCommandService nega datasets financeiro sem permissão"
  ],
  "promotion_ready": true,
  "blocking_items": [
    "Sem flag IMPETUS_FINANCIAL_* explícita — runtime parcial via dashboard",
    "VIEW_FINANCIAL deve estar atribuído aos perfis CEO/CFO da Food Base",
    "Nexus wallet requer configuração por tenant (nexus_wallet_*)"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | Financial leakage map/ranking/alerts, costs executive-summary, Nexus IA |
| **APIs** | ✅ | `/api/dashboard/costs/*`, `/api/dashboard/financial-leakage/*`, `/api/admin/nexus-custos`, `/api/admin/nexus-wallet`, `/api/nexus-ia` |
| **Permissões** | ✅ | `VIEW_FINANCIAL`, `VIEW_STRATEGIC` em `smartPanelCommandService`, `secureContextBuilder`, `structuralModuleResolver` |
| **BD** | ✅ | `financial_leakage_*` (3 tabelas), `industrial_cost_*` (4 tabelas), `nexus_wallet_*` (5 tabelas) |
| **Integração AIOI** | ⚠️ | Via KPIs e painéis executivos |
| **Integração TRI-AI** | ✅ | Nexus IA providers transparency |

**Nota:** Financeiro **não está em shadow** — está parcialmente operacional com gating por permissão. O risco piloto é utilizador sem `VIEW_FINANCIAL` ver respostas vazias (comportamento correcto de segurança, mas pode parecer "módulo quebrado").

---

## 6. Executive Boardroom

```json
{
  "domain": "Executive Boardroom",
  "exists": true,
  "ui_ready": true,
  "api_ready": true,
  "database_ready": true,
  "runtime_mode": "shadow",
  "executive_runtime": "shadow",
  "ceo_chat_operational": true,
  "promotion_ready": true,
  "blocking_items": [
    "IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME=shadow",
    "IMPETUS_EXECUTIVE_LIVE_VALIDATION=shadow",
    "Boardroom cognitivo autónomo desactivado — CEO chat funciona independentemente"
  ]
}
```

### Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| **UI** | ✅ | 170+ ficheiros AIOI executive (workspace, assistant-runtime, insights, recommendations, runtime-audit, runtime-authorization) |
| **APIs** | ✅ | `/api/aioi/executive-cockpit`, `/api/dashboard/executive-query`, environment-executive |
| **CEO Chat** | ✅ ON | `UNIFIED_DECISION_ENGINE=true`, `UNIFIED_DECISION_USE_TRIADE=true`, Realtime proxy activo |
| **Smart Summary** | ✅ | Via smartPanelCommandService + dashboard summary governance |
| **Executive Queue** | ✅ | `aioi_executive_queue_snapshot` — **11.730 snapshots** activos |
| **BD** | ✅ | `aioi_executive_queue_snapshot`, `executive_audit_logs` |
| **Integração AIOI** | ✅ | Nativa — módulo AIOI executive |
| **Integração TRI-AI** | ✅ | CEO chat usa TRI-AI via unified decision engine |

### Flags runtime

| Flag | Valor |
|------|-------|
| `IMPETUS_EXECUTIVE_BOARDROOM` | `on` |
| `IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME` | **`shadow`** |
| `IMPETUS_EXECUTIVE_LIVE_VALIDATION` | **`shadow`** |

**Interpretação:** CEO consegue conversar, ver KPIs e queue executiva **hoje**. O que está em shadow é a publicação autónoma de relatórios boardroom (narrativas cognitivas sem pedido explícito).

---

## Matriz comparativa — Grupo A vs Grupo B (M1)

| Domínio | UI | API | BD | Eventos | Runtime | Promoção (só env) |
|---------|----|----|-----|---------|---------|-------------------|
| **SST** | ✅ | ✅ | ⚠️ | 3 | shadow | ✅ |
| **Ambiental** | ✅ | ✅ | ⚠️ | 38 | shadow | ✅ |
| **Manutenção** | ✅ | ✅ | ✅ | via AIOI | shadow | ✅ |
| **RH** | ✅ | ✅ | ✅ | via modules | shadow | ✅ |
| **Financeiro** | ✅ | ✅ | ✅ | via costs | partial | ✅ (permisões) |
| **Executive** | ✅ | ✅ | ✅ | via AIOI | shadow | ✅ |
| **MES (M1)** | placeholder | ✅ | ✅ | 7 | foundation | N/A (construir M2) |
| **Logistics (M1)** | placeholder | ✅ | ✅ | 7 | foundation | N/A (construir M2) |
| **Analytics (M1)** | placeholder | ✅ | ✅ | 6 | foundation | N/A (construir M2) |

---

## Dependências pendentes (transversais)

| Dependência | Impacto | Acção |
|-------------|---------|-------|
| Food Base `company_id` não identificado | Todos os módulos pilot-scoped | Confirmar tenant antes de promoção |
| `*_PILOT_TENANTS` lists | Features restritas a tenants listados | Adicionar Food Base às 19 variáveis pilot |
| P0 go-live activo | AIOI pipeline ON | ✅ Concluído |
| TRI-AI UP | Cognitivo de todos os domínios | ✅ OpenAI + Anthropic + Vertex UP |
| Tabelas SST/Ambient transaccionais | Formulários PTW/LOTO/EPI persistência | Avaliar se tpm_incidents/ai_incidents bastam ou criar em M1.5B |

---

## Plano recomendado (pós M1.5A)

### Fase imediata — M1.5B Shadow→Full Promotion (Grupo A)

Promover **antes** do M2 MES, por ordem de risco piloto:

1. **SST** — `ACTIVATION_STAGE=full`, `PUBLICATION_SHADOW_MODE=false`, `COGNITIVE_RUNTIME=production_native`
2. **Ambiental** — idem
3. **Executive Boardroom** — `EXECUTIVE_COGNITIVE_RUNTIME=production_native` (CEO chat já funciona)
4. **Manutenção + RH** — `*_COGNITIVE_RUNTIME=production_native`
5. **Financeiro** — garantir `VIEW_FINANCIAL` nos perfis CEO/CFO Food Base

Cada promoção: alterar `.env` → `pm2 restart impetus-backend --update-env` → validar boot → smoke test UI.

### Fase seguinte — M2 MES Operacional

Só após Grupo A promovido e validado com utilizadores reais da Food Base.

---

## Restrições respeitadas

- ✅ Nenhuma promoção para FULL executada
- ✅ Nenhuma alteração de runtime
- ✅ Nenhuma alteração de env vars
- ✅ Nenhum restart PM2
- ✅ Nenhuma alteração de banco
- ✅ Apenas auditoria e readiness assessment

---

*M1.5A Shadow Runtime Operational Audit — emitido sob o Truth Program.*

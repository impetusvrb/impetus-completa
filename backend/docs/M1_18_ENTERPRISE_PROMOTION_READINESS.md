# M1.18 — Enterprise Promotion Readiness Assessment

**Data:** 2026-06-28  
**Modo:** READ ONLY · certificação arquitetural · **sem promoção de módulos**  
**Pré-requisitos:** M1.11–M1.17 concluídos (M1.17 via `pilotAdoptionClosureService.js` + `GET /api/m1/pilot-adoption-closure/*`)  
**Tenant referência:** Fresh & Fit `511f4819-fc48-479e-b11e-49ba4fb9c81b` · Lab OT `21dd3cee-2efa-4936-908f-9ff1ba04e2a3`

---

## Resumo executivo

A plataforma IMPETUS possui **building blocks enterprise-grade** (RBAC unificado M1.16, Truth Program, RLS/MFA/Federation ON, backbone de eventos com backpressure, telemetria ~4,16M rows em `telemetry_timeseries_v1`, health probes, audit logs). Contudo, **controles de segurança e OT permanecem em modo pilot-scoped** (`*_PILOT_ONLY=true` para RLS, MFA, Federation, listas OT) e **gaps de adopção Ambiental/Manutenção** persistem (M1.13/M1.17: `PILOT_ADOPTION_PENDING`).

**Nenhum módulo do escopo M1.18 está `READY_FOR_PROMOTION` sem condições.** A promoção para Enterprise Ready exige M1.19 com remediação de pilot-only gates, canais Truth não protegidos (F47) e validação multi-tenant além do tenant lab.

---

## Evidências base (read-only)

| Área | Fonte |
|------|-------|
| Segurança infra | `M1_8_SECURITY_READINESS.md`, `.env` (`IMPETUS_RLS/MFA/FEDERATION_*`) |
| RBAC unificado | `M1_16_CRITICAL_REMEDIATION.md`, `middleware/authorize.js`, `auth.js` |
| Closure audit | `M1_15_PLATFORM_CLOSURE_AUDIT.md`, `m1PlatformClosureAuditService.js` |
| Telemetria | `M1_15_TELEMETRY_AUDIT.md`, `environmentTelemetryIngestService.js` |
| Adopção piloto | `M1_13_PILOT_ADOPTION_ASSESSMENT.md`, `pilotAdoptionClosureService.js` |
| Truth / IA | `PHASE47_TRUTH_CERTIFICATION_REPORT.md`, `promptFirewall.js`, `secureContextBuilder.js` |
| Foundation | `M1_FOUNDATION_CERTIFICATION.md` |
| Classificação comercial | `RELATORIO_EXECUTIVO_IMPETUS.md`, `RESUMO_EXECUTIVO_DIRETORIA.md` |
| Resiliência | `eventPipeline/backpressure/`, `chatAIService.loader.js`, `PM2_STABILITY_AUDIT.md` |
| Governança dados | `governance/retentionPolicyRegistry.js`, `audit_logs`, `ai_interaction_traces` |

---

## ETAPA 1 — Security & Identity Certification

### Infraestrutura global (aplica-se a todos os módulos)

| Controlo | Estado código/flags | Enterprise |
|----------|---------------------|------------|
| MFA | `IMPETUS_MFA_MODE=on`, `IMPETUS_MFA_PILOT_ONLY=true` | ⚠️ Pilot-scoped |
| SSO/Federation | OIDC+SAML+SCIM ON, `IMPETUS_FEDERATION_PILOT_ONLY=true` | ⚠️ Pilot-scoped |
| RBAC | `roles` + `role_permissions` + `hydrateUserPermissions()` (M1.16) | ✅ |
| RLS | `IMPETUS_RLS_MODE=on`, `IMPETUS_RLS_PILOT_ONLY=true` | ⚠️ Pilot-scoped |
| Prompt firewall | `middleware/promptFirewall.js` + `aiPromptGuardService` | ✅ |
| Secure context | `services/secureContextBuilder.js` + `contextExposureSanitizer` | ✅ |
| AI auth path | `aiSecurityGateway.js`, envelope resolver | ⚠️ Canais F47 UNPROTECTED |

**Canais IA sem Truth closure completa (F47):** `/api/voz/conversa` (`impetusVoiceChatService.js`), chat CEO (`executiveMode.js`).

---

### Quality Cognitive

```json
{
  "module": "Quality Cognitive",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "RLS/MFA/Federation restritos a PILOT_TENANTS — tenants enterprise novos sem isolamento enforced",
    "Runtime cognitivo exposto via /api/quality-cognitive com dependência de RBAC global, não capability matrix dedicada",
    "Canais IA adjacentes (Smart Panel) com cobertura Truth parcial (F47 §2)"
  ]
}
```

**Rotas:** `server.js` → `/api/quality-cognitive`  
**Flags:** `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED=true`, publish events ON

---

### Safety Cognitive

```json
{
  "module": "Safety Cognitive",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "Mesmo gate pilot-only RLS/MFA/SSO",
    "IMPETUS_SAFETY_COGNITIVE_RUNTIME=safety_native — runtime live mas sem certificação ISO 45001 formal no código",
    "Cockpit Safety classificado shadow/preview em F47 para alguns fluxos executivos"
  ]
}
```

**Rotas:** `/api/safety-cognitive`  
**Flags:** Safety activation `full`, `IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=false`

---

### Environment Operational

```json
{
  "module": "Environment Operational",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "M1.13/M1.17: environment_adoption_confirmed=false no tenant Fresh Fit",
    "Pilot-only security gates",
    "Runtime ON (IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true) mas zero utilização tenant-scoped confirmada"
  ]
}
```

---

### Environment Telemetry

```json
{
  "module": "Environment Telemetry",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "OT pilot lists (MQTT/OPC-UA/Modbus/Edge) apontam para tenant lab 21dd3cee — Fresh Fit ausente",
    "Ingest isolado ON mas tenant routing não enterprise-wide",
    "RLS pilot-only"
  ]
}
```

**Pipeline:** `environmentTelemetryOrchestrator.js` → `environmentTelemetryIngestService.js` → `telemetry_timeseries_v1`

---

### Environment Governance

```json
{
  "module": "Environment Governance",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED=true sem evidência de adopção piloto",
    "Governança ISO 14001 referenciada em docs, não enforced por policy engine dedicado"
  ]
}
```

---

### Centro de Previsão

```json
{
  "module": "Centro de Previsão",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "Rotas /api/dashboard/forecasting/* — projeções financeiras sensíveis; RBAC financeiro corrigido M1.16 mas MFA/RLS pilot-only",
    "Dependência de dados operacionais com gaps de telemetria tenant piloto"
  ]
}
```

**Rotas:** `GET /api/dashboard/forecasting/projections`, `/alerts`, `/health`

---

### Centro de Custos

```json
{
  "module": "Centro de Custos",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "GET /api/dashboard/costs/by-origin, /costs/executive-summary — VIEW_FINANCIAL enforced pós-M1.16",
    "Pilot-only MFA/RLS impede rollout enterprise sem alteração de flags (fora do escopo M1.18)"
  ]
}
```

---

### Mapa de Vazamentos

```json
{
  "module": "Mapa de Vazamentos",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "Widget mapa_vazamentos em dashboardWidgetRegistry — eixos manutenção/segurança, minPriority 5",
    "dashboardAccessService teve histórico de vazamento cross-domain (corrigido); requer fuzz gate enterprise",
    "Dados financeiros — mesmas restrições pilot-only"
  ]
}
```

---

### Integrações MES/ERP

```json
{
  "module": "Integrações MES/ERP",
  "classification_current": "Pilot Ready",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": true,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "mesErpIntegrationService.js — webhook/api_key auth por connector, sem rate-limit enterprise documentado",
    "Persistência production_shift_data + mes_erp_sync_log — company_id scoped",
    "Sem fila async dedicada; processamento síncrono em push — risco sob carga multi-tenant"
  ]
}
```

**Serviço:** `backend/src/services/mesErpIntegrationService.js`  
**Rotas:** `routes/integrations.js`

---

### Environment Executive *(Em Consolidação)*

```json
{
  "module": "Environment Executive",
  "classification_current": "Em Consolidação",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true",
    "F47: Cockpits Environment/Executive em shadow/preview",
    "Zero traces ESG tenant-scoped Fresh Fit (M1.17)"
  ]
}
```

---

### Cockpits ESG *(Em Consolidação)*

```json
{
  "module": "Cockpits ESG",
  "classification_current": "Em Consolidação",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "Cockpit ambiental nativo ON mas adopção não confirmada",
    "Publicação audience preview ON — não enterprise publication mode",
    "ISO 14001 / compliance ESG não certificados por audit trail dedicado"
  ]
}
```

---

### Analytics Foundation *(Em Consolidação)*

```json
{
  "module": "Analytics Foundation",
  "classification_current": "Em Consolidação",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "M1_FOUNDATION_CERTIFICATION: 4 tabelas, /api/analytics/* — scaffolding foundation",
    "Sem workers async dedicados; bounded context sem auto-action",
    "Classificação comercial ★★★☆☆ scaffolding"
  ]
}
```

---

### Logistics Foundation *(Em Consolidação)*

```json
{
  "module": "Logistics Foundation",
  "classification_current": "Em Consolidação",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "M1 foundation: 4 tabelas, /api/logistics/*",
    "Rotas navigation/activation separadas — rollout parcial",
    "Sem evidência de carga multi-tenant"
  ]
}
```

---

### MES Foundation *(Foundation)*

```json
{
  "module": "MES Foundation",
  "classification_current": "Foundation",
  "rbac_ready": true,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "Foundation layer explícita — sem auto-action, sem enforcement operacional autónomo",
    "6 tabelas mes_*, eventos backbone integrados",
    "M2 gate aberto (M1.14) mas foundation ≠ enterprise operational"
  ]
}
```

---

### Workflow BPMN *(Foundation)*

```json
{
  "module": "Workflow BPMN",
  "classification_current": "Foundation",
  "rbac_ready": false,
  "mfa_ready": false,
  "sso_ready": false,
  "tenant_isolation_ready": false,
  "enterprise_security_ready": false,
  "blocking_findings": [
    "IMPETUS_WORKFLOW_PERMISSION_ENFORCE=false — permissões BPMN não enforced em runtime",
    "IMPETUS_WORKFLOW_ENGINE_MODE=on com PILOT_TENANTS limitados",
    "featureGovernanceService alerta: enforce=true sem CAPABILITY_MATRIX_ENABLED"
  ]
}
```

**Rotas:** `/api/workflow-engine`

---

## ETAPA 2 — Scalability Certification

### Infraestrutura global

```json
{
  "horizontal_scalability": "partial",
  "queue_architecture": "AIOI outbox + industrial event backbone — IMPETUS_AIOI_QUEUE_ACTIVE",
  "async_processing": "workers AIOI em PM2; ingest telemetria síncrono por sample",
  "worker_isolation": "telemetry isolated ingest ON; edge runtime separado",
  "backpressure": "industrialEventBackbone + backpressureController + cognitiveEventBackboneService",
  "storage_strategy": "telemetry_timeseries_v1 primary; STORAGE_V3 ON; retentionPolicyRegistry",
  "multi_tenant_scale": "blocked_by_pilot_lists_and_rls_pilot_only",
  "scalability_ready": false,
  "estimated_enterprise_capacity": "10–25 tenants industriais médios com telemetria moderada (<500K samples/dia agregados) após remediação pilot gates; atualmente ~1 tenant OT activo (lab) com ~4,16M rows acumulados",
  "blocking_findings": [
    "Listas IMPETUS_*_REAL_PILOT_TENANTS restringem ingest OT a 21dd3cee",
    "MES/ERP push síncrono sem fila dedicada",
    "PM2 single-process backend (348 restarts lifetime — risco MEDIUM)",
    "Workflow/Analytics/Logistics foundation sem sharding tenant"
  ]
}
```

### Environment Telemetry (detalhe)

| Verificação | Evidência | Estado |
|-------------|-----------|--------|
| `telemetry_timeseries_v1` | ~4,16M rows global (M1.15) | ✅ Throughput comprovado |
| Ingest throughput | MQTT/OPC/Modbus/Edge ON | ✅ |
| Retry queues | AIOI outbox retry; edge queue memory/sync | ⚠️ Parcial |
| Dead letter | `IMPETUS_INDUSTRIAL_DLQ_ENABLED=true` | ✅ Global |
| Tenant routing | Primary=timeseries; Fresh Fit 5 rows vs lab activo | ❌ Gap |
| Storage growth | retentionPolicyRegistry TTL definido | ⚠️ Monitorizar |

```json
{
  "module": "Environment Telemetry",
  "scalability_ready": false,
  "estimated_enterprise_capacity": "500K–2M samples/dia por tenant após expandir pilot lists + particionamento timeseries",
  "blocking_findings": [
    "Tenant piloto Fresh Fit ausente das listas OT",
    "Métricas M1 audit usam industrial_telemetry_samples=0 (routing mismatch)",
    "Orchestrator health retorna shadow:true"
  ]
}
```

---

## ETAPA 3 — Governance & Compliance Certification

### Infraestrutura global

| Controlo | Evidência | Estado |
|----------|-----------|--------|
| Audit logs | `audit_logs` table, queries M1.17 | ✅ |
| Immutable evidence | IOE `industrial_operational_events`, traces | ✅ |
| AI traceability | `ai_interaction_traces`, industrial_truth | ⚠️ ~79% traces sem industrial_truth (F47) |
| LGPD | `retentionPolicyRegistry.js`, DSR flags | ⚠️ Parcial |
| ISO 9001/14001/45001 | Referências docs; sem cert engine | ❌ Formal |
| SOC2 readiness | Logs + RBAC; sem controles SOC2 mapeados | ⚠️ |
| Executive auditability | Cockpit CEO enterprise; Environment executive shadow | ⚠️ |

---

### Certificação por módulo (amostra consolidada)

Todos os módulos **Pilot Ready** partilham:

```json
{
  "auditability_ready": true,
  "compliance_ready": false,
  "compliance_gaps": [
    "ISO/SOC2 não mapeados por módulo",
    "Adopção Ambiental não confirmada (M1.17)",
    "AI traceability incompleta em canais UNPROTECTED (F47)"
  ]
}
```

**Excepções:**

| Módulo | auditability_ready | compliance_ready | Nota |
|--------|-------------------|------------------|------|
| Quality/Safety Cognitive | true | false | Truth parcial em painéis adjacentes |
| Environment Telemetry | true | false | Evidência persistida globalmente |
| MES/ERP Integration | true | false | sync_log auditável |
| Workflow BPMN | false | false | permission enforce OFF |
| Analytics/Logistics Foundation | true | false | Foundation — audit mínimo |

---

## ETAPA 4 — Reliability & Resilience Certification

```json
{
  "resilience_ready": false,
  "components": {
    "circuit_breakers": "chatAIService.loader.js, contextualModules/index.js, liveDashboardService — presentes",
    "retry_policies": "AIOI outbox consumer, event pipeline — presentes",
    "fallback_execution": "edge sync memory fallback; chat legacy fallback",
    "shadow_runtime_safety": "Environment/Safety shadow=false; Production/Quality promovidos M1.16",
    "cache_strategy": "dashboard cache layers; invalidação parcial documentada",
    "failover": "single-node PM2 — sem failover cluster",
    "observability": "/health, /api/system/health/deep, module observability services",
    "health_probes": "GET /health, /api/health, /api/aioi/health, forecasting/health",
    "pm2_recovery": "348 restarts lifetime — MEDIUM risk (PM2_STABILITY_AUDIT)"
  },
  "blocking_findings": [
    "Single-process backend sem HA",
    "PM2 restart count elevado",
    "MES/ERP webhook sem circuit breaker dedicado",
    "Voice/Executive chat sem truth fail-safe completo"
  ]
}
```

---

## ETAPA 5 — Multi-Tenant Enterprise Validation

```json
{
  "multi_tenant_ready": false,
  "analysis": {
    "tenant_boundaries": "company_id em queries dominantes; RLS ON mas PILOT_ONLY",
    "tenant_leakage": "Histórico dashboardAccessService corrigido; INDUSTRIAL_READINESS_QA L3 — fuzz não é gate CI",
    "tenant_routing": "OT lists → lab tenant only; telemetria Fresh Fit=5 rows",
    "tenant_provisioning": "Manual via *_PILOT_TENANTS lists — não self-service enterprise",
    "tenant_onboarding": "M1.8 nota: adicionar company_id às listas pilot",
    "tenant_specific_ai_context": "secureContextBuilder company-scoped; envelope resolver presente"
  },
  "blocking_findings": [
    "IMPETUS_RLS_PILOT_ONLY=true — RLS não aplicado a todos os tenants",
    "IMPETUS_MFA_PILOT_ONLY=true",
    "IMPETUS_FEDERATION_PILOT_ONLY=true",
    "Fresh Fit ausente de listas OT",
    "tenantFuzzSuite existe mas não bloqueia release"
  ]
}
```

---

## ETAPA 6 — Enterprise Promotion Matrix

| Módulo | Atual | Security | Scale | Governance | Resilience | MultiTenant | Enterprise Ready |
|--------|-------|----------|-------|------------|------------|-------------|------------------|
| Quality Cognitive | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Safety Cognitive | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Environment Operational | Pilot Ready | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | **NOT_READY** |
| Environment Telemetry | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Environment Governance | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **NOT_READY** |
| Centro de Previsão | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Centro de Custos | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Mapa de Vazamentos | Pilot Ready | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **PROMOTION_WITH_CONDITIONS** |
| Integrações MES/ERP | Pilot Ready | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | **PROMOTION_WITH_CONDITIONS** |
| Environment Executive | Em Consolidação | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | **NOT_READY** |
| Cockpits ESG | Em Consolidação | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | **NOT_READY** |
| Analytics Foundation | Em Consolidação | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | **NOT_READY** |
| Logistics Foundation | Em Consolidação | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | **NOT_READY** |
| MES Foundation | Foundation | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | **NOT_READY** |
| Workflow BPMN | Foundation | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | **NOT_READY** |

**Legenda:** ✅ pronto · ⚠️ parcial · ❌ bloqueador

**Interpretação:**

- **PROMOTION_WITH_CONDITIONS (7):** arquitectura madura o suficiente para promoção após M1.19 corrigir pilot-only gates + canais Truth + validação carga.
- **NOT_READY (8):** requer adopção confirmada, foundation→operational, ou remediação estrutural (Workflow enforce, Analytics/Logistics scaffolding).

---

## ETAPA 7 — Promotion Roadmap (módulos não aprovados)

### GAP GLOBAL-01 — Pilot-only security gates

**Gap:** RLS, MFA e Federation activos apenas para `*_PILOT_TENANTS` (2–3 UUIDs). Tenants enterprise novos operam sem isolamento RLS enforced nem MFA obrigatório.

**Risco:** Vazamento cross-tenant; autenticação fraca em rollout multi-fábrica; não conformidade SOC2/ISO 27001.

**Correção:**
- Serviços: `middleware/tenantRls.js`, `services/mfaService.js`, `services/federationService.js`
- Middlewares: RLS session setter em `auth.js`
- Flags (M1.19): `IMPETUS_RLS_PILOT_ONLY=false` rollout faseado

**Esforço:** HIGH  
**Dependências:** Todos os módulos

---

### GAP GLOBAL-02 — Canais IA UNPROTECTED (F47)

**Gap:** `/api/voz/conversa` e Executive Chat sem Truth closure completa.

**Risco:** Alucinação operacional; responsabilidade regulatória (ISO/SST/ESG).

**Correção:**
- Serviços: `impetusVoiceChatService.js`, `executiveMode.js`
- Middlewares: `promptFirewall`, `aiSecurityGateway`
- Rotas: `/api/voz/*`, dashboard chat CEO

**Esforço:** MEDIUM  
**Dependências:** Quality Cognitive, Safety Cognitive, Centro Previsão, Cockpits ESG

---

### GAP ENV-01 — Adopção Ambiental não confirmada

**Gap:** M1.17 `environment_adoption_confirmed=false`; utilização index 66,67% (4/6 domínios).

**Risco:** Promoção enterprise de módulos Environment sem validação operacional real no tenant piloto.

**Correção:**
- Operacional: onboarding tenant Fresh Fit
- Rotas: `/api/environment-*`
- Evidência: traces + IOE + telemetry tenant-scoped

**Esforço:** MEDIUM (operacional, não código)  
**Dependências:** Environment Operational, Governance, Executive, Cockpits ESG

---

### GAP TEL-01 — Tenant routing OT

**Gap:** Listas `IMPETUS_*_REAL_PILOT_TENANTS=21dd3cee`; Fresh Fit ausente; audit mede tabela errada.

**Risco:** Falso negativo em auditorias; telemetria enterprise não roteada para tenant produção.

**Correção:**
- Serviços: `environmentTelemetryIngestService.js`, `m1PlatformClosureAuditService.js`
- Flags: expandir pilot lists ou remover pilot-only OT
- Tabelas: unificar métricas audit `telemetry_timeseries_v1`

**Esforço:** MEDIUM  
**Dependências:** Environment Telemetry, Environment Operational

---

### GAP WF-01 — Workflow permission enforce OFF

**Gap:** `IMPETUS_WORKFLOW_PERMISSION_ENFORCE=false`.

**Risco:** BPMN executa transições sem validação RBAC; violação segregation of duties.

**Correção:**
- Serviços: `workflowEngine/permissionGate.js`
- Flags: `IMPETUS_WORKFLOW_PERMISSION_ENFORCE=true` + `CAPABILITY_MATRIX_ENABLED=true`
- Middlewares: workflow route guards

**Esforço:** MEDIUM  
**Dependências:** Workflow BPMN, Quality Workflow Rollout

---

### GAP MES-01 — Integração síncrona MES/ERP

**Gap:** `mesErpIntegrationService.processPush` processa inline sem fila.

**Risco:** Timeout e perda de dados sob burst multi-tenant.

**Correção:**
- Serviços: novo `mesErpIngestQueueService.js` ou reutilizar industrial event backbone
- Rotas: `routes/integrations.js`
- Workers: consumer dedicado

**Esforço:** MEDIUM  
**Dependências:** Integrações MES/ERP, MES Foundation

---

### GAP FOUND-01 — Analytics/Logistics/MES foundation scaffolding

**Gap:** M1 foundation certificada mas sem operational maturity (★★★☆☆).

**Risco:** Promoção prematura para Enterprise Ready.

**Correção:**
- Domínios: `backend/src/domains/analytics/`, `logistics/`, `mes/`
- Workers async, testes carga, eventos críticos validados

**Esforço:** HIGH  
**Dependências:** M2 MES Operational gate

---

### Por módulo NOT_READY — resumo

| Módulo | Gap principal | Esforço |
|--------|---------------|---------|
| Environment Operational | ENV-01 adopção | MEDIUM |
| Environment Governance | ENV-01 + compliance ISO 14001 | HIGH |
| Environment Executive | ENV-01 + F47 shadow | HIGH |
| Cockpits ESG | ENV-01 + publication mode | HIGH |
| Analytics Foundation | FOUND-01 | HIGH |
| Logistics Foundation | FOUND-01 | HIGH |
| MES Foundation | FOUND-01 + M2 | HIGH |
| Workflow BPMN | WF-01 | MEDIUM |

---

## Critério final

```json
{
  "enterprise_promotion_assessment_complete": true,
  "assessment_phase": "M1.18",
  "mode": "READ_ONLY",
  "no_modules_promoted": true,
  "no_flags_altered": true,
  "no_maturity_classifications_changed": true,
  "modules_ready_for_promotion": [],
  "modules_promotion_with_conditions": [
    "Quality Cognitive",
    "Safety Cognitive",
    "Environment Telemetry",
    "Centro de Previsão",
    "Centro de Custos",
    "Mapa de Vazamentos",
    "Integrações MES/ERP"
  ],
  "modules_requiring_remediation": [
    "Environment Operational",
    "Environment Governance",
    "Environment Executive",
    "Cockpits ESG",
    "Analytics Foundation",
    "Logistics Foundation",
    "MES Foundation",
    "Workflow BPMN"
  ],
  "global_enterprise_readiness_score": "62/100",
  "score_breakdown": {
    "security_identity": "58/100 — infra ON, pilot-only gates",
    "scalability": "65/100 — telemetria provada, OT tenant-limited",
    "governance_compliance": "60/100 — audit OK, ISO/SOC2 gaps",
    "resilience": "68/100 — breakers OK, PM2 single-node",
    "multi_tenant": "55/100 — RLS/MFA pilot-only, fuzz não gate"
  },
  "recommended_next_phase": "M1.19_ENTERPRISE_PROMOTION",
  "m1_19_prerequisites": [
    "Remediar GLOBAL-01 pilot-only gates (rollout faseado)",
    "Remediar GLOBAL-02 canais Truth UNPROTECTED",
    "Confirmar adopção Environment (ENV-01) ou documentar excepção governance",
    "Expandir tenant OT routing (TEL-01)",
    "Activar WORKFLOW_PERMISSION_ENFORCE (WF-01)",
    "Executar tenant fuzz como gate CI",
    "Stress test multi-tenant telemetria pós-remediação"
  ],
  "generated_at": "2026-06-28T00:00:00.000Z"
}
```

---

## APIs de auditoria (read-only, existentes)

```
GET /api/m1/platform-closure/status
GET /api/m1/pilot-adoption-closure/status
GET /api/m1/pilot-readiness/*
GET /api/system/health/deep
GET /api/aioi/health
GET /api/dashboard/forecasting/health
GET /api/mes/health
GET /api/logistics/health  (via mesFoundation pattern)
GET /api/analytics/health
```

---

## Declaração de conformidade M1.18

- ✅ Nenhum módulo promovido  
- ✅ Nenhuma feature flag alterada  
- ✅ Nenhuma classificação de maturidade modificada  
- ✅ Nenhum código, BD, migration ou PM2 alterado  
- ✅ Conclusões baseadas exclusivamente em código, serviços, rotas, migrations, telemetria, auditorias M1.x e documentação existente  

**Próxima fase autorizada:** `M1.19_ENTERPRISE_PROMOTION` — execução controlada das remediações e promoções individuais com gate por módulo.

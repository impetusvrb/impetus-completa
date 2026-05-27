# IMPETUS — MASTER ENTERPRISE GAP AUDIT

**Data:** 2026-05-25
**Escopo:** SZ1 → SZ5 + todos os domínios industriais + ecossistema enterprise
**Tipo de auditoria:** consolidação estratégica (não-implementadora)
**Idioma:** Português
**Documentos irmãos:**
- `ENTERPRISE_COMPLIANCE_AUDIT.md`
- `TECHNICAL_DEBT_MASTER_REPORT.md`
- `MARKET_READINESS_ASSESSMENT.md`
- `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`
- `ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md`

---

## 0. Sumário executivo

O IMPETUS é um **runtime cognitivo híbrido em estado pós-foundation, pré-industrial-pleno**. As fundações soberanas (governança, identidade, RBAC, memória conversacional SZ5, cockpit cognitivo Z.18→Z.29) já estão em produção, mas grande parte da inteligência industrial (telemetria PLC/MQTT/OPC-UA, edge runtime, action runtime autónomo, observabilidade preditiva multi-domínio) permanece em **shadow** ou **enrich-only**.

O sistema está apto para **clientes piloto industriais brasileiros (ERP-like + cockpit operacional + IA conversacional governada)**, mas não para **operação industrial crítica em chão de fábrica** (telemetria realtime soberana, autonomia decisória, certificação ISO 27001/IEC 62443) nem para **comercialização internacional** sem hardening adicional.

**Estado de maturidade global:** **Stage 4 / 7** (Foundation Mature → Industrial Cognitive Pilot)
**Bloqueadores críticos:** 7 (detalhados em §Phase 5)
**Débitos técnicos críticos:** 11 (ver `TECHNICAL_DEBT_MASTER_REPORT.md`)
**Riscos de compliance ativos:** 6 (ver `ENTERPRISE_COMPLIANCE_AUDIT.md`)

---

## 1. PHASE 1 — Inventário completo de implementação

### 1.1 Core Runtime

| Componente | Local canónico | Estado | Evidência |
|------------|---------------|--------|-----------|
| **Motor A** (legado dashboards/menus/KPIs) | `backend/src/services/dashboardService.js`, `dashboardEngine/*` | **ACTIVE PRODUCTION** | Hot path em `routes/dashboard.js` `/me`; serve produção há vários ciclos |
| **Engine V2** (dashboards modulares contextuais) | `backend/src/dashboardEngineV2/` | **ACTIVE PRODUCTION** | `runtimeEngineV2.js`, `observability/dashboardUsageTelemetry`; coexiste com Motor A |
| **Runtime Z (foundation Z.13→Z.19)** | `backend/src/cognitiveRuntime/` | **ACTIVE PRODUCTION** (parcial) | `cognitiveRuntimeFacade.js`; `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY=on` força execução mesmo com `IMPETUS_COGNITIVE_RUNTIME=off` |
| **Runtime Z (composição Z.20→Z.22)** | `cognitiveRuntime/composition/`, `bridge/qualityEngineBridge.js`, `kpi-domain-adapter` | **ACTIVE PRODUCTION (Quality)** + **SHADOW (outros)** | `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED=true`; outros domínios `shadow` |
| **Runtime Z (cockpits especializados Z.23→Z.27)** | `cognitiveRuntime/domains/quality\|sst\|environmental\|production\|hr\|executive` | **PILOT (Quality, Executive, HR, SST)** + **SHADOW (resto)** | `IMPETUS_HR_NATIVE_COCKPIT=pilot`, `IMPETUS_SST_NATIVE_COCKPIT=pilot`, `IMPETUS_EXECUTIVE_BOARDROOM=pilot` |
| **Runtime Z (orquestração Z.28/Z.29)** | `cognitiveRuntime/orchestration/adaptive`, `governanceLearning` | **SHADOW** | `IMPETUS_ADAPTIVE_ORCHESTRATION=shadow`, `IMPETUS_GOVERNANCE_LEARNING=shadow` |
| **SZ1 (Sovereignty Consolidation)** | `backend/src/runtime-z-sovereign/sz1/` | **ACTIVE PRODUCTION (Z_ASSISTIVE)** | `IMPETUS_SZ1_SOVEREIGNTY=on` + 16 sub-flags `on`; estágio `Z_SHADOW` por defeito, promovidos `Z_ASSISTIVE` |
| **SZ2 (Cognitive Operating System)** | `backend/src/runtime-z-cognitive-os/` | **ACTIVE PRODUCTION** | `IMPETUS_SZ2_*=on` com `IMPETUS_SZ2_PERSISTENCE=on`; in-memory + file persistence |
| **SZ3 (Cognitive Maturation)** | `backend/src/runtime-z-cognitive-os/maturation/` | **ACTIVE PRODUCTION (CALIBRATION_ACTIVE)** | `IMPETUS_SZ3_*=on`; padrões com `IMPETUS_SZ3_PATTERN_MAX=200` |
| **SZ4 (Operational Nervous System)** | `backend/src/runtime-z-operational-nervous-system/` | **ACTIVE PRODUCTION** (sem persistência) | `IMPETUS_SZ4_*=on`; persistência `off`; 5 tenants promovidos |
| **SZ5 (Unified Operational Conversational Memory)** | `backend/src/runtime-z-sovereign/sz5/` | **ACTIVE PRODUCTION** | `IMPETUS_SZ5_ENABLED=on`; tabela `z_conversation_message_index`; injetor wired no `chatAIService.consolidated.js` e `chatSocket.js`; superseded `SZ5_OPERATIONAL_MEMORY_AUDIT.md` |

**Observações arquiteturais:**
- A coexistência **Motor A + Engine V2 + Runtime Z + SZ1–SZ5** é mantida por princípio aditivo (`additive-only`). O custo é **cognitive sprawl** (12 facades, vários adaptadores, registries paralelos) — abordado no Technical Debt Report.
- O `cognitiveBlockRegistry` declara blocos mas tem `delivery_active=false` (definitional). O **delivery real** acontece via Engine V2 / cockpit composition.
- O **chat AI hot path** está alinhado SZ5 (após a remediação documentada em `SZ5_UNIFIED_OPERATIONAL_CONVERSATIONAL_MEMORY.md`).

### 1.2 Governança

| Área | Estado | Evidência | Gaps |
|------|--------|-----------|------|
| **RBAC** (roles + scopes + tenants) | **ACTIVE PRODUCTION** | `middleware/auth.js`, `dashboardProfiles.js`, `chat_participants` | Sem policy-as-code formal (OPA/Rego) |
| **Contextual governance** | **ACTIVE PRODUCTION** | `contextualEnforcementActivation`, `featureGovernanceService.js`, `domainAuthority/guards/domainIsolationGuard.js` | Fragmentação em N camadas; difícil debug |
| **Identity governance** | **ACTIVE PRODUCTION** | `ENTERPRISE_IDENTITY_VISIBILITY_SOVEREIGNTY_REPORT.md` (cedilha, diacritics, sectorial mapping); `operationalIdentityGovernance` | Federation (SSO/SAML/OIDC) ausente |
| **Visibility reconciliation** | **PARTIALLY IMPLEMENTED** | `services/dashboardVisibility.js`; rota `/api/dashboard/visibility` ausente → fail-open `ALL_TRUE` no frontend | Rota e backend reconciliados pendente |
| **Sovereign governance (SZ1)** | **ACTIVE PRODUCTION** | `runtime-z-sovereign/sz1/`; promotion stages | OK para fundação |
| **Hierarchy governance** | **ACTIVE PRODUCTION** | `IMPETUS_HIERARCHY_AUTHORITY_VALIDATION=on`; `dashboardProfiles` por nível | KPIs cross-level ainda manuais |
| **Tenant governance** | **ACTIVE PRODUCTION** | `tenant-cognitive-rollout-implementation.md`; `IMPETUS_SZ4_PROMOTED_TENANTS=…` | Isolation testing rotina ausente |
| **Rollout governance** | **ACTIVE PRODUCTION (shadow-first)** | `qualityRolloutOrchestrator`, `safetyActivationRolloutEngine`, `environmentPublicationRuntime` | Sem dashboard rollout consolidado |
| **Publication governance** | **ACTIVE PRODUCTION (Quality full, outros shadow)** | `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE=false`, `IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true`, `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true` | — |
| **Audit governance** | **ACTIVE PRODUCTION** | `middleware/audit.js`, `ai_legal_audit_logs` (append-only com archive), `legal-audit-trail.md` | Cobertura por tabela não-uniforme |
| **AI governance** | **ACTIVE PRODUCTION (parcial)** | `chatAIService.consolidated.js` LGPD prompt, `structuralAIGovernanceService.js` (general-knowledge gate), `SEMANTIC_MEMORY_RUNTIME_GOVERNANCE.md` | Sem AI-card por modelo, sem human-in-the-loop estruturado |

### 1.3 Domínios industriais

| Domínio | #Ficheiros | Estado de cockpit | Estado de telemetria | Estado de rollout |
|---------|-----------|-------------------|----------------------|-------------------|
| **Quality** | 101 | **ACTIVE PRODUCTION (cockpit cognitivo nativo)** | **ACTIVE PRODUCTION (SPC, drift, anomaly)** com `IMPETUS_QUALITY_TELEMETRY_*=true` | Tenant/Plant/Workflow rollouts `enabled` |
| **Safety (SST)** | 25 | **PILOT** (`IMPETUS_SST_NATIVE_COCKPIT=pilot`) | **SHADOW** (`safetyTelemetryRuntimeFlags`) | `IMPETUS_SAFETY_ACTIVATION_STAGE=shadow` |
| **Environment** | 108 | **PILOT** | **SHADOW** com conectores MQTT/OPC-UA/Modbus em `environmentTelemetry` (estado: simulação) | `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow` |
| **Logistics** | 12 | **SCAFFOLDING / NOT IMPLEMENTED** | **NOT IMPLEMENTED** | Scaffold só |
| **HR (People)** | (em `cognitiveRuntime/domains/hr`) | **PILOT** (`IMPETUS_HR_NATIVE_COCKPIT=pilot`) | n/a | Shadow rendering |
| **Production** | (em `cognitiveRuntime/domains/production` + `domains/operational`) | **ACTIVE PRODUCTION (cockpit Z.P0/Z.P1)** | **PARTIAL** (`IMPETUS_TELEMETRY_GOVERNANCE=on`, sem conectores reais) | Live validation `shadow` |
| **Maintenance (ManuIA)** | (em `cognitiveRuntime/domains/maintenance` + `routes/manuia*`) | **PILOT (cockpit ZM1)** | **PARTIAL** (`plc-alerts` REST) | — |
| **Executive (Boardroom)** | em `cognitiveRuntime/domains/executive` | **PILOT** (`IMPETUS_EXECUTIVE_BOARDROOM=pilot`) | n/a | Live validation `shadow` |
| **Environmental (ESG/Carbon)** | em `cognitiveRuntime/domains/environmental` + `executive/carbon` | **PILOT** | **SHADOW** | — |

**Observações:**
- A profundidade de código em `domains/environment/` (108 ficheiros) e `domains/quality/` (101 ficheiros) supera massivamente a de `domains/logistics/` (12, só scaffold) e `domains/safety/` (25, foco em rollout/governance — falta SPC equivalente).
- Há um **descompasso entre código existente e operacionalidade**: ~108 ficheiros de Environment em produção/shadow servem tipicamente um conjunto reduzido de painéis frontend de pilot.

### 1.4 Cross-domain

| Capacidade | Estado | Evidência |
|------------|--------|-----------|
| **Ecosystem correlation** | **ACTIVE PRODUCTION** | `ECOSYSTEM_CORRELATION_REPORT.md`; `cognitiveRuntime/composition/runtimeCockpitComposer.js` |
| **Telemetry fusion** | **PARTIAL** | Eventos `industrial_event_outbox`, mas sem fusão SCADA/PLC/MES real |
| **Operational continuity** | **PARTIAL** | SZ2 `continuity` + SZ5 `cross-thread`; sem playbooks operacionais formais |
| **Executive runtime** | **PILOT** | `domains/executive`, `domains/environment/executive` |
| **Contextual reasoning** | **ACTIVE PRODUCTION** | SZ3 `CALIBRATION_ACTIVE` + structural AI governance |
| **Conversational memory** | **ACTIVE PRODUCTION (SZ5)** | tabela `z_conversation_message_index`, `zUnifiedConversationalContextInjector` |
| **Workflow runtime** | **PARTIAL (assistive)** | SZ4 `IMPETUS_SZ4_WORKFLOW=on`; sem executor autónomo (sem BPMN/state machine industrial) |

### 1.5 AI / Cognitive

| Capacidade | Estado | Notas |
|------------|--------|-------|
| Contextual reasoning | **ACTIVE PRODUCTION** | SZ3 + structuralAIGovernanceService |
| Operational memory | **ACTIVE PRODUCTION** | SZ2 + SZ5 |
| Industrial reasoning | **PARTIAL** | Quality reasoning ativo; Safety/Environment reasoning em shadow |
| Action runtime | **NÃO IMPLEMENTADO (autónomo)** | Tool calling existe (`operationalToolRegistry.js`), mas `OPERATIONAL_TOOL_CALLING_ENABLED=false` |
| Follow-ups / reminders | **PARTIAL (assistive)** | `zOperationalFollowupRuntime` (SZ5) gera estruturas sem execução |
| Operational workflows | **PARTIAL** | SZ4 prepara; sem orquestrador autónomo |
| Continuity | **ACTIVE PRODUCTION** | SZ2/SZ5 |
| Cognitive ergonomics | **ACTIVE PRODUCTION** | SZ3 ergonomics + `cockpit-density-governor` |
| Operational language | **ACTIVE PRODUCTION** | SZ3 language + `industrial-language` |
| Intent continuity | **ACTIVE PRODUCTION** | SZ5 cross-thread |
| Cross-thread retrieval | **ACTIVE PRODUCTION (SZ5)** | `z_operational_memory_links` + graph |
| Operational memory query | **ACTIVE PRODUCTION (SZ5)** | `zOperationalConversationalQueryRuntime` |

### 1.6 Telemetria

| Componente | Estado | Evidência |
|------------|--------|-----------|
| **MQTT connector** | **PRESENTE MAS SIMULADO** | `domains/environment/telemetry/connectors/environmentMqttConnector.js` (`simulateReconnect`) |
| **OPC-UA connector** | **PRESENTE MAS SIMULADO** | `environmentOpcUaConnector.js` |
| **Modbus connector** | **PRESENTE MAS SIMULADO** | `environmentModbusConnector.js` |
| **Edge runtime** | **PRESENTE MAS NÃO PRODUÇÃO** | `routes/api/integrations/edge/register` + `edge-agents`; sem agente edge físico documentado |
| **Telemetry ingestion** | **PARTIAL** | `qualityTelemetryIngestService.js` ativo; restante shadow |
| **Realtime analytics** | **PARTIAL** | `qualitySpcRuntime`, `qualityDriftPrediction` ativos; multidomínio shadow |
| **Anomaly detection** | **PARTIAL** | `qualityPredictiveAnomalyEngine` ativo; outros shadow |
| **Drift detection** | **PARTIAL** | `qualityDriftPredictionEngine` ativo; outros shadow |

**Conclusão telemetria:** o **scaffolding de conectores industriais está implementado**, mas nenhum atualmente faz I/O real com hardware (estado de simulação / staging). Esta é uma fronteira crítica para entrar em **chão de fábrica real**.

### 1.7 UX / Frontend

| Capacidade | Estado | Evidência |
|------------|--------|-----------|
| **Operational UX** | **ACTIVE PRODUCTION** | `DashboardInteligente.jsx`, `Layout.jsx`, design system Industrial 4.0 (`.cursorrules`) |
| **Adaptive UX** | **ACTIVE PRODUCTION** | `IMPETUS_ADAPTIVE_DENSITY_RUNTIME=on`, `cockpit-density-governor` |
| **Mobile runtime** | **PARTIAL (PWA leve)** | `AppMobile`, `ManuIA App` (PWA) — não é runtime industrial offline robusto |
| **Offline runtime** | **PARTIAL** | `IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED=true` em quality; sem service-worker industrial robusto |
| **Ergonomics** | **ACTIVE PRODUCTION** | SZ3 ergonomics + density governor |
| **Command center UX** | **PILOT (Executive Boardroom)** | `IMPETUS_EXECUTIVE_BOARDROOM=pilot` |
| **Visualization density** | **ACTIVE PRODUCTION** | `IMPETUS_EXECUTIVE_DENSITY_GOVERNOR=on` |

### 1.8 Observabilidade

| Sub-domínio | Estado | Evidência |
|-------------|--------|-----------|
| Cognitive observability | **ACTIVE PRODUCTION** | `cockpit-cognitive-health.md`, `safety-cognitive-health.md`, `IMPETUS_*_OBSERVABILITY=on` |
| Telemetry observability | **PARTIAL** | `IMPETUS_TELEMETRY_GOVERNANCE=on`, `telemetryGovernance` route; observability sem dashboard externo (sem Prometheus/Grafana documentado) |
| Governance observability | **ACTIVE PRODUCTION** | `governance-load-protection.md`, `IMPETUS_RUNTIME_GOVERNANCE_MONITORING=on` |
| Operational observability | **ACTIVE PRODUCTION** | dashboardUsageTelemetry + `/v2/modules/telemetry` |
| Runtime health | **ACTIVE PRODUCTION** | `IMPETUS_INDUSTRIAL_RUNTIME_HEALTH=on`, `IMPETUS_ENVIRONMENTAL_RUNTIME_HEALTH=on` |
| AI confidence | **PARTIAL** | structuralAIGovernance retorna `confidence`, não exposto sistematicamente |
| Hallucination detection | **PARTIAL** | regras heurísticas via `GENERAL_KNOWLEDGE_PATTERNS`; sem detector formal |

**Gap crítico:** **observabilidade externa (APM)** — sem evidência de OpenTelemetry/Prometheus/Datadog integrados ao runtime de produção. Toda observabilidade é interna (PostgreSQL + logs PM2).

### 1.9 Segurança / Compliance

| Item | Estado | Evidência |
|------|--------|-----------|
| LGPD (consentimento) | **ACTIVE PRODUCTION** | `middleware/lgpd.js` (`registerConsent`, `revokeConsent`, `consent_logs`); rota `/api/lgpd` |
| Consent management | **ACTIVE PRODUCTION** | `consent_logs`, `users.lgpd_consent` |
| Data governance | **ACTIVE PRODUCTION (parcial)** | `services/dataLifecycleService.runRetentionCycle()` agendado; políticas em código |
| Audit trails | **ACTIVE PRODUCTION** | `ai_legal_audit_logs` append-only com arquivo lógico |
| Encryption | **PARTIAL (em repouso)** | `services/encryptionService` AES-256; KMS suportado mas opt-in (`DATA_ENCRYPTION_KMS_PROVIDER`) |
| Sensitive data exposure | **ACTIVE PRODUCTION** | `security/contextExposureSanitizer.js` (sanitiza `mqtt`, `modbus`, `opcua`); `eventProcessor/anonymize.js` (CPF, e-mail, telefone) |
| Operational privacy | **ACTIVE PRODUCTION** | `policyEngine/channels/secureChatContextBuilder.js` + sanitização |
| Tenant isolation | **ACTIVE PRODUCTION** | `domainIsolationGuard.js`, `tenant-cognitive-rollout`; teste rotineiro pendente |
| Access governance | **ACTIVE PRODUCTION** | `moduleAccessGovernanceEngine.js` (categoriza `lgpd_scope`) |
| Retention policies | **PARTIAL** | `DATA_RETENTION_AUDIT_LOG_DAYS` + lifecycle service; nem todas as tabelas operacionais têm política explícita |
| Explainability governance | **ACTIVE PRODUCTION** | `qualityCognitiveExplainability.js`, `environmentExplainabilityRuntimes.js`, `qualityCognitiveAuditEnvelope` |

---

## 2. PHASE 2 — Estado por categoria (resumo macro)

### Distribuição global das 90+ áreas auditadas

- **FULLY IMPLEMENTED:** 18 (20%) — Motor A, Engine V2, SZ1, SZ2, SZ3, SZ4, SZ5, RBAC, audit trails, LGPD consent core, design system, identity governance, sanitização cross-domain, Engine V2 telemetry, Quality publication, Quality cognitive runtime, dashboardProfiles, hierarchy governance.
- **PARTIALLY IMPLEMENTED / IMPLEMENTED BUT INCOMPLETE:** 38 (42%) — Visibility reconciliation, Industrial Event Backbone (W1 entregue, W2–W7 planos), Safety cockpit (pilot), Environment cockpit (pilot), Maintenance ManuIA (pilot), telemetry connectors (simulados), realtime analytics multi-domínio, edge runtime, offline runtime, action runtime, hallucination detection, AI confidence exposure, retention policies, etc.
- **ARCHITECTURALLY PRESENT BUT NOT OPERATIONAL:** 12 (13%) — Z.28 adaptive orchestration `shadow`, Z.29 governance learning `shadow`, multi-domain foundation `shadow`, cognitive block registry (definitional), event backbone industrial (W2–W7), AI tool calling autónomo, etc.
- **SHADOW ONLY:** 9 (10%) — Safety publication, Environment publication, Logistics scaffold, executive cognitive runtime `shadow`, governance learning `shadow`, adaptive orchestration `shadow`.
- **ACTIVE PRODUCTION (limitado):** 8 (9%) — Quality cockpit Z.23, executive boardroom pilot, HR Z.26 pilot, SST Z.25 pilot, production Z.P0/P1, ManuIA ZM1 pilot.
- **NOT IMPLEMENTED:** 4 (4%) — Logistics domain pleno, SSO/federation, formal action runtime industrial, OPA/Rego policy engine.
- **OBSOLETE / NEEDS REFACTOR:** ~5 — `chatAIService.js` legado (vs `consolidated`); `chatService.js` duplicado entre HTTP/socket; `cognitive-migration-state.md` referencia migrações inconclusas.

Detalhamento item-a-item consta em `TECHNICAL_DEBT_MASTER_REPORT.md`.

---

## 3. PHASE 6 — Assessment arquitetural final

### 3.1 O que foi conquistado arquiteturalmente

1. **Soberania operacional do dashboard** — `dashboardEngineV2` + Engine V2 + cockpit cognitivo Z.18-Z.23 entregam contexto, KPIs, módulos e summaries por perfil/tenant com isolamento e fallback robusto.
2. **Memória conversacional soberana** — SZ5 transforma o chat numa **memória operacional indexada e governada**, com `z_conversation_message_index` em PostgreSQL e injeção de factos antes do LLM.
3. **Disciplina arquitetural rara** — *shadow-first*, *additive-only*, *deterministic governance*, *anti-leakage*, *terminal governance* operacionalizados via flags (`IMPETUS_*`, ~244 flags), com promotion-by-tenant.
4. **Cockpit cognitivo nativo de domínio** — Quality (Z.23) entrega SPC + drift + CAPA + supplier + executive narratives com explainability formal.
5. **Identity & RBAC enterprise-grade** — diacritics, sectorial mapping, hierarchy authority, tenant isolation testados; pronto para LGPD operacional.
6. **LGPD foundation pronta** — consent_logs, anonimização, lifecycle service, sanitização de payloads sensíveis (MQTT/OPC-UA/Modbus mascarados em prompts).
7. **AI safety architecture** — LGPD protocol obrigatório no prompt, structural governance separa `operational_data` vs `general_knowledge`, audit logs legais, explainability runtimes.

### 3.2 Maiores problemas de engenharia resolvidos

- **Coexistência Motor A ↔ Engine V2** sem regressão (`additive-only`).
- **Drift entre PM2-env e dotenv** documentado (override controlado).
- **Histórico chat → LLM** desconectado: resolvido em SZ5 (`operationalChatHistoryFormatter`).
- **Composição cockpit cognitivo sem leakage de domínio**: `domainIsolationGuard.js` previne HR receber industrial telemetry, etc.
- **Sanitização de payloads industriais** (MQTT/OPC-UA/Modbus) antes de chegar a prompts LLM.

### 3.3 Riscos arquiteturais ainda existentes

1. **Cognitive sprawl** — 12+ facades, vários registries paralelos; manutenção custosa.
2. **Edge runtime ausente** — sem agente físico/embedded para fábrica desconectada.
3. **Sem orquestrador autónomo de workflows industriais** (BPMN ou state-machine).
4. **Observabilidade externa ausente** — sem OpenTelemetry/APM padrão de indústria.
5. **Federation/SSO ausente** — bloqueia enterprise multi-tenant >100 colaboradores.
6. **Telemetria industrial real** — conectores existem mas operam em simulação; sem hardware loop validado.
7. **AI hallucination detection formal** ainda ausente (heurísticas apenas).

### 3.4 Estágio de maturidade actual

**Stage 4 / 7** — **Industrial Cognitive Pilot Mature**.

Escala usada:
1. Spike / Demo
2. SaaS funcional não industrial
3. SaaS funcional com domínio industrial parcial
4. **Foundation cognitiva soberana + cockpit nativo de domínio piloto (Quality) + memória conversacional governada** ← *estado actual*
5. Multi-domain cognitive production (Quality + SST + Environment full)
6. Industrial autonomy (action runtime + edge + workflows autónomos)
7. Internationally certified industrial cognitive platform (ISO 27001, IEC 62443, SOC 2)

### 3.5 Fronteira remanescente real

- **Edge / chão de fábrica** (drivers reais + agente offline + buffer + sync).
- **Action runtime industrial** (workflows operacionais autónomos).
- **Observabilidade externa** (OpenTelemetry → Prometheus/Datadog/Grafana).
- **Federation enterprise** (SSO SAML/OIDC + SCIM).
- **Internacionalização real** (i18n, fusos, normas técnicas regionais).
- **Certificações** (ISO 27001, SOC 2 Type II, IEC 62443 para chão de fábrica).
- **AI safety profissional** (AI cards, model registry, drift detection do próprio LLM, red-team contínuo).

### 3.6 O que falta para ser:

| Padrão | Faltam |
|--------|--------|
| **Enterprise-grade** | SSO/SCIM, OPA-policy, externa APM, dashboard rollout consolidado, retention policies completas, e2e suite robusta |
| **Industrial-grade** | Telemetria realtime soberana, edge runtime, workflow runtime autónomo, IEC 62443 compliance, validation de hardware loop |
| **Internationally marketable** | i18n, fusos, multi-currency, normas técnicas (CE/UL), data residency, ISO 27001/SOC 2 |
| **Operationally trustworthy** | AI hallucination detection formal, runbooks operacionais, SLO/SLA medidos com APM externo, chaos testing, DR/BCP completo |

---

## 4. Mapa estratégico final

Ver:
- **Prioridades:** `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`
- **Maturidade quantificada:** `ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md`
- **Compliance:** `ENTERPRISE_COMPLIANCE_AUDIT.md`
- **Débitos:** `TECHNICAL_DEBT_MASTER_REPORT.md`
- **Readiness comercial:** `MARKET_READINESS_ASSESSMENT.md`

---
*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*

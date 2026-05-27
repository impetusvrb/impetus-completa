# IMPETUS — FINAL STRATEGIC DEVELOPMENT ROADMAP

**Data:** 2026-05-25
**Escopo:** priorização tier 1/2/3 consolidada de todo o ecossistema
**Tipo:** auditoria não-implementadora (recomendações)

> Este roadmap consolida débitos (`TECHNICAL_DEBT_MASTER_REPORT.md`), gaps de compliance (`ENTERPRISE_COMPLIANCE_AUDIT.md`), gaps funcionais (`MASTER_ENTERPRISE_GAP_AUDIT.md`) e bloqueios de mercado (`MARKET_READINESS_ASSESSMENT.md`).

---

## 0. Sumário executivo

| Tier | Descrição | Itens | Tempo estimado | Investimento |
|------|-----------|-------|----------------|--------------|
| **TIER 1 — CRITICAL NOW** | Indispensável para segurança operacional, compliance, market readiness e estabilidade de produção. | 14 itens | 3–5 meses | Médio |
| **TIER 2 — ENTERPRISE MATURITY** | Necessário para operação enterprise em larga escala, maturidade industrial e governança avançada. | 12 itens | +4–6 meses | Médio-Alto |
| **TIER 3 — STRATEGIC EVOLUTION** | Diferenciação futura, IA avançada, autonomia industrial, superioridade cognitiva. | 10 itens | +6–12 meses | Alto |

Cada item está mapeado para o débito-fonte (`Dxx`), gap de compliance (`Cxx`) e segmento de mercado afetado.

---

## 1. TIER 1 — CRITICAL NOW

**Objetivo macro:** completar foundation enterprise para clientes piloto + 1–2 referências industriais brasileiras grandes em 6 meses.

### Wave A.1 — Estabilização de visibilidade & governança (3–4 semanas)

| # | Item | Fonte | Critério "feito" |
|---|------|-------|------------------|
| T1.1 | **Implementar `GET /api/dashboard/visibility`** e ligar `useDashboardVisibility.js` | D14 | Frontend deixa de cair em `ALL_TRUE`; backend reconcilia por perfil/tenant |
| T1.2 | **Migrar `DashboardInteligente.jsx` para `dashboardPayload.sections`** | D15 | UI consome backend payload, sem fallback local |
| T1.3 | **`auditMiddleware` universal em rotas mutantes (POST/PUT/PATCH/DELETE)** | D21, A4 | 100% das rotas write logam em `ai_legal_audit_logs`; allowlist explícita |
| T1.4 | **Flag-reconciler boot-check** (PM2 vs dotenv) | D19 | App regista divergências; em prod, bloqueia start se divergir critically |
| T1.5 | **Separar `OBSERVABILITY` vs `EXECUTION` em flags cognitive runtime** | D22, G2 | Z.18 executa só com flag explícita `IMPETUS_COGNITIVE_RUNTIME_EXEC=on` |

### Wave A.2 — LGPD & retenção (4–5 semanas)

| # | Item | Fonte | Critério "feito" |
|---|------|-------|------------------|
| T1.6 | **DSR (Data Subject Request) workflow + SLA 15 dias** | C1, L3 | `GET /api/lgpd/subject/me/export`, `POST /api/lgpd/subject/me/erase`, UI no perfil utilizador, audit completo |
| T1.7 | **Retention policies uniformes** (`chat_messages`, `z_conversation_message_index`, `eventos_empresa`) | C2, D11 | Lifecycle service estendido; TTL configurável por tenant e tipo; documentado em `/api/lgpd/policy` |
| T1.8 | **Anonimização SZ5** ao revogar consentimento | C5, P1 | `anonymizeUserData` varre `z_conversation_message_index` e marca threads anonimizadas |
| T1.9 | **KMS por defeito em produção + warm na startup** | C3 | `warmKmsEncryptionKey` invocado em boot pré-aceite de tráfego; fallback env só staging |
| T1.10 | **DPO formal + processo documentado** | L3 | RACI; SLA por tipo de pedido |

### Wave A.3 — AI safety crítica & observabilidade externa (4–6 semanas)

| # | Item | Fonte | Critério "feito" |
|---|------|-------|------------------|
| T1.11 | **Model registry + AI-cards** (ISO 42001) | D24 | Tabela `ai_model_registry`; AI-card por modelo (desc, dados, métricas, limitations); `chat_messages` + `ai_legal_audit_logs` persistem `model_version` |
| T1.12 | **APM externo (OpenTelemetry → Prometheus/Grafana)** | D12 | Spans p50/p95 do `dashboardEngineV2`, chat hot path, SZ5 query; dashboard externo operacional |
| T1.13 | **Hallucination detection v1** (cross-check com SZ5 facts) | D23 | Score de fidelidade por resposta; respostas com score baixo marcadas para review |
| T1.14 | **SZ4 persistence em pilot** | D6, A1 | `IMPETUS_SZ4_PERSISTENCE=on` num tenant pilot; tabela com TTL 90 dias |

**Gate T1 → T2:**
- 0 críticos de segurança em pen-test interno.
- LGPD compliance externa validada por advogado especialista.
- APM mostra SLO p95 < 1500ms em chat e dashboard `/me`.
- AI safety: ≥ 95% de respostas operacionais com facts SZ5 grounding.

---

## 2. TIER 2 — ENTERPRISE MATURITY

**Objetivo macro:** habilitar venda enterprise (>500 utilizadores), 1ª referência industrial com telemetria real, ISO 27001 + ISO 42001 preparação.

### Wave B.1 — Federation, SSO, MFA, multi-tenant scaling (5–7 semanas)

| # | Item | Bloqueio |
|---|------|----------|
| T2.1 | **SSO SAML/OIDC + SCIM** (provisioning) | Adoção enterprise |
| T2.2 | **MFA universal obrigatório** (TOTP + WebAuthn opcional) | Enterprise + LGPD §46 |
| T2.3 | **RLS PostgreSQL como defesa em profundidade** | SaaS scaling |
| T2.4 | **Suite e2e de fuzzing multi-tenant** | D27 |
| T2.5 | **Onboarding self-service de tenants** (provisioning + roles + perfis) | SaaS scaling |

### Wave B.2 — Telemetria industrial real (8–10 semanas)

| # | Item | Bloqueio |
|---|------|----------|
| T2.6 | **Lab industrial com hardware loop** (PLC Siemens/AB + broker MQTT + OPC-UA simulator) e validação de `domains/environment/telemetry/connectors/*` end-to-end | D9 |
| T2.7 | **Edge agent v0** (Go ou Rust): store-and-forward, WireGuard, mTLS, assinatura eventos | D10 |
| T2.8 | **Particionamento `industrial_event_outbox`** por mês + tenant + archive | D11 (uniforme com T1.7) |
| T2.9 | **Fusão SCADA/MES real** via adapters REST + webhook | D13 |

### Wave B.3 — Consolidação cognitive (4–6 semanas)

| # | Item | Bloqueio |
|---|------|----------|
| T2.10 | **Cognitive block registry consolidado** (decisão: registry-as-source-of-truth ou metadata-only) | D3 |
| T2.11 | **Deprecação `chatAIService.js` legado** | D4 |
| T2.12 | **Unificar `impetusChatOperationalContextService` no SZ5 (modo voice/panel adapter)** | D5 |
| T2.13 | **Action runtime IA com HITL** (`require_approval` por tool) | D25 |

### Wave B.4 — Governance UX & ops (3–4 semanas)

| # | Item | Bloqueio |
|---|------|----------|
| T2.14 | **Flag dashboard interno** (`/admin/flags/effective`) com grouping por runtime-stage | D18 |
| T2.15 | **Dashboard rollout consolidado** (`/admin/rollout-overview`) | D20 |
| T2.16 | **Promoção multi-domain foundation (Z.24)** após Safety/Environment saírem de shadow publication | D7 |

### Wave B.5 — Compliance ISO 27001 / ISO 42001 (paralelo, 6 meses)

| # | Item |
|---|------|
| T2.17 | SoA documentado |
| T2.18 | Pen-test externo + remediação |
| T2.19 | Operational evidence acumulada (SLO, incidentes, change mgmt) — pré-requisito SOC 2 |
| T2.20 | Risk register por modelo IA + HITL workflow formal |

**Gate T2 → T3:**
- ISO 27001 audit readiness ≥ 85%.
- ≥ 1 cliente industrial real com telemetria PLC ligada.
- ≥ 1 cliente enterprise >500 utilizadores em produção.
- AI governance maduro: model registry + hallucination detector ≥ 99% accuracy em validation set.

---

## 3. TIER 3 — STRATEGIC EVOLUTION

**Objetivo macro:** diferenciação internacional, IA agentic certificada, autonomia industrial, IEC 62443 ready.

### Wave C.1 — Autonomia cognitiva supervisionada (8–12 semanas)

| # | Item |
|---|------|
| T3.1 | **Z.28 Adaptive Orchestration → controlled** (com promotion gate KPI-based) |
| T3.2 | **Z.29 Governance Learning → controlled** (com HITL board-of-review) |
| T3.3 | **Workflow runtime autónomo industrial** (BPMN ou state-machine, com SIL-rating IEC 61508 onde aplicável) |
| T3.4 | **Action runtime IA promovido por persona/tool** (depende de T2.13) |

### Wave C.2 — Internacionalização (12–18 meses)

| # | Item |
|---|------|
| T3.5 | **i18n** (UI + dados + relatórios) |
| T3.6 | **Fusos consistentes** end-to-end (timestamps em UTC + display por user-pref) |
| T3.7 | **Data residency** UE (multi-region storage) + GDPR DPA padronizado |
| T3.8 | **Multi-currency** + multi-tax em ESG/financial executive |

### Wave C.3 — Certificações & expansão de domínio (paralelo)

| # | Item |
|---|------|
| T3.9 | **ISO 27001 certificado** (Q1 ou Q2 do ano seguinte) |
| T3.10 | **SOC 2 Type II** (após 6 meses operational evidence) |
| T3.11 | **IEC 62443 readiness** (chão de fábrica real) |
| T3.12 | **Logistics domain pleno** (clone blueprint Environment) |

### Wave C.4 — IA avançada & longa duração (12–24 meses)

| # | Item |
|---|------|
| T3.13 | **Federated learning** entre tenants (com privacy-preserving) |
| T3.14 | **Multi-modal IA** (imagem industrial, áudio, vibração, voltagem) |
| T3.15 | **Digital twin completo** por tenant/plant |
| T3.16 | **Deprecação Motor A** após Engine V2 + Runtime Z cobrirem 100% (longuíssimo prazo) |

### Wave C.5 — Diferenciadores produto (12–24 meses)

| # | Item |
|---|------|
| T3.17 | **Service-worker industrial robusto** (CRDT-merge offline) |
| T3.18 | **DS consistency completa** (audit visual + refactor) |
| T3.19 | **Marketplace de cognitive blocks** (3ºs podem publicar blocks com publication governance) |

---

## 4. Cronograma macro

```
Mês 1–2: Wave A.1 (visibility + governance reconciliation)
Mês 1–3: Wave A.2 (LGPD + retention)
Mês 2–4: Wave A.3 (AI safety + APM)
─── Gate T1 ───
Mês 4–6: Wave B.1 (SSO/MFA/RLS)
Mês 5–8: Wave B.2 (telemetria industrial real)
Mês 6–9: Wave B.3 (consolidação cognitive)
Mês 7–10: Wave B.4 (governance UX & ops)
Mês 5–11: Wave B.5 (ISO compliance preparation, paralela)
─── Gate T2 ───
Mês 11–18: Wave C.1–C.5 (autonomia, i18n, certificações, IA avançada)
```

---

## 5. Riscos do roadmap

| Risco | Mitigação |
|-------|-----------|
| **Wave A atrasa por carga de manutenção quotidiana** | Capacity guard: pelo menos 60% do effort de eng. dedicado a Wave A nos primeiros 3 meses |
| **Wave B telemetria depende de hardware lab** | Iniciar aquisição/setup de lab no mês 1 (procurement leadtime) |
| **AI safety vs. velocidade de produto** | Não promover action runtime autónomo antes de T1.11 + T1.13 entregues |
| **Compliance escopo escapa** | Designar DPO + comité jurídico desde mês 1 |
| **Cognitive sprawl agrava** | Wave B.3 (consolidação) **não pode atrasar** mais que 2 sprints; freezing de novas facades cognitivas até consolidação |

---

## 6. Decisões pendentes para o board

1. **Investimento em lab industrial físico** vs. partnerships com integradores (Wave B.2).
2. **Construção de edge agent in-house** vs. integração com edge-PaaS existente (AWS IoT Greengrass, Azure IoT Edge).
3. **Path de certificação ISO 27001 → SOC 2** vs. priorizar IEC 62443 (depende do segmento-alvo).
4. **Mercado internacional: UE-first ou US-first** (UE alinha-se com LGPD/GDPR; US exige SOC 2).
5. **Deprecação Motor A: timeline de 12 vs. 18 vs. 24 meses** (impacto em manutenção dupla).

---

## 7. KPIs de progresso

| KPI | Tier 1 alvo | Tier 2 alvo | Tier 3 alvo |
|-----|-------------|-------------|-------------|
| LGPD compliance gaps (C1–C6) | 6 → 0 | 0 | 0 |
| Débitos críticos (D1–D27) | 11 críticos → 2 | 2 → 0 | 0 |
| Cobertura `auditMiddleware` em rotas write | ~40% → 100% | 100% | 100% |
| SLO p95 chat | medir + < 2000ms | < 1500ms | < 1000ms |
| Tenants em produção | 5 → 15 | 15 → 50 | 50+ |
| Domínios em ACTIVE PRODUCTION (cockpit completo) | Quality | + Safety + Environment | + Logistics |
| Maturity stage (`ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md`) | 4 → 5 | 5 → 6 | 6 → 7 |

---

*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*

# IMPETUS — MARKET READINESS ASSESSMENT

**Data:** 2026-05-25
**Escopo:** adequação a piloto, operação industrial, operação enterprise, multi-tenant SaaS, comercialização internacional
**Tipo:** auditoria não-implementadora

---

## 0. Sumário executivo

| Segmento de mercado | Veredito | Confiança |
|---------------------|----------|-----------|
| **Pilot customers** (Brasil, 3–10 utilizadores por tenant, governança supervisionada) | **APTO** | Alta |
| **Operação industrial enterprise SEM telemetria realtime de chão de fábrica** (ERP industrial leve + cockpit + IA conversacional) | **APTO COM RESSALVAS** | Alta |
| **Operação industrial enterprise COM telemetria realtime de PLC/SCADA/IoT** | **NÃO APTO HOJE** | Alta |
| **Multi-tenant SaaS Brasil** (>50 tenants concorrentes) | **APTO COM HARDENING** | Média |
| **Comercialização internacional** (UE, US, América Latina ex-Brasil) | **NÃO APTO HOJE** | Alta |

A diferença entre "apto" e "apto com ressalvas/hardening" refere-se essencialmente à **lista de débitos críticos** (`TECHNICAL_DEBT_MASTER_REPORT.md` Wave A + B) e aos **gaps de compliance** (`ENTERPRISE_COMPLIANCE_AUDIT.md` §2.1 C1–C6).

---

## 1. PHASE 2 — Pergunta-a-pergunta

### 1.1 Adequação por segmento

#### 1.1.1 Pilot customers
**APTO.**

Evidência:
- `IMPETUS_SZ4_PROMOTED_TENANTS=…` já lista 5 tenants pilot promovidos.
- Quality `IMPETUS_QUALITY_ACTIVATION_STAGE=full` — cockpit cognitivo nativo em produção.
- LGPD foundation cobre o essencial.
- Identity governance + diacritics testados.
- AI conversacional governada (SZ5 + LGPD prompt + structuralAIGovernance).
- Audit trail apropriada (`ai_legal_audit_logs`).

Limitação:
- Pilot supervisionado, não autosserviço.
- Suporte síncrono required (não há onboarding self-service maduro).

#### 1.1.2 Operação industrial
**APTO COM RESSALVAS** para indústrias **administrative-heavy** (gestão de qualidade, SST gestão documental, RH industrial, manutenção planeada).

**NÃO APTO** para indústrias com **chão de fábrica realtime** (linha de produção contínua, processo químico/farmacêutico, energia).

Evidência apto:
- Quality SPC + drift + supplier + CAPA em produção.
- ManuIA PWA cockpit ZM1.
- Maintenance runtime cognitivo.
- ESG/Carbon executive runtime em pilot.

Evidência não apto:
- Conectores MQTT/OPC-UA/Modbus em simulação (`D9`).
- Sem agente edge físico (`D10`).
- Sem fusão SCADA/MES (`D13`).
- Sem certificação IEC 62443.
- Sem APM externo (`D12`) para SLO industrial.

#### 1.1.3 Operação enterprise (organizações >500 utilizadores)
**APTO COM RESSALVAS.**

Apto:
- RBAC + tenant isolation + hierarchy governance.
- Engine V2 dashboards modulares contextuais.
- Memória conversacional SZ5.
- LGPD foundation.

Ressalvas:
- **Sem SSO/Federation** (SAML/OIDC ausentes) — bloqueador típico em RFP enterprise.
- **MFA não obrigatório universal**.
- **APM externo ausente** — RFP enterprise pede SLO mensurável.
- **OPA/Rego ausente** — governance policy fragmentada.

#### 1.1.4 Multi-tenant SaaS
**APTO COM HARDENING.**

Apto:
- Tenant isolation a nível aplicação.
- Domain isolation guard cross-domain.
- Tenant promotion lists.

Hardening necessário:
- RLS PostgreSQL opcional como defesa em profundidade.
- Suite e2e de fuzzing multi-tenant (`D27`).
- KMS por defeito + chaves por tenant (envelope encryption).
- Particionamento `industrial_event_outbox` por tenant + tempo.
- Retention policy uniforme.

#### 1.1.5 Internacional
**NÃO APTO HOJE.**

Bloqueadores:
- **i18n ausente** (UI e dados em PT-BR; sem catálogo de strings).
- **Fusos** (timezone awareness inconsistente entre `chat_messages.created_at`, audit logs, telemetria).
- **Data residency** UE não suportada (sem multi-region).
- **GDPR** (substantivamente equivalente a LGPD mas requer DPA + data residency).
- **Multi-currency** ausente para ESG/financial executive.
- **Normas técnicas regionais** (CE/UL, ISO 27001/SOC 2 não certificados).

### 1.2 Que áreas já satisfazem expectativas?

#### Brazilian enterprise software expectations
**Sim, na maior parte.**

Cobertos:
- Português nativo, terminologia industrial brasileira.
- LGPD foundation.
- Audit trail.
- Cockpit cognitivo.
- Memória conversacional governada.
- ANPD-friendly (consent + revocation + anonymization).
- ESG/Carbon executive (Pacto Global, B3 listing).

Não cobertos ainda:
- DSR self-service portal.
- Integration com eSocial / SPED (citação `eventos_empresa` mas sem integração formal documentada).

#### LGPD
**Substantivamente sim.** Ver `ENTERPRISE_COMPLIANCE_AUDIT.md` §1.1.

Gaps táticos (C1–C6 do compliance audit):
- DSR workflow + SLA;
- Retention uniforme;
- Encryption-at-rest expandida;
- DPO formal.

#### ISO-style governance
**Foundation incipiente.**

ISO 42001 (AI):
- ✅ Audit trail legal
- ✅ Explainability runtimes
- ✅ LGPD-aware prompts
- ❌ Model registry / AI-cards
- ❌ Risk register por modelo
- ❌ HITL formal

ISO 27001 (SGSI):
- ✅ Encryption AES-256 + KMS opt-in
- ✅ RBAC + tenant isolation
- ✅ Audit logs
- ✅ Sanitização de dados sensíveis
- ❌ SoA documentado
- ❌ Pen-test externo recente
- ❌ Operational evidence acumulado (>6 meses)

#### Industrial software expectations
**Parcialmente.**

Cobertos:
- Cockpit cognitivo nativo por domínio (Quality, ManuIA, ESG).
- SPC + drift + anomaly (Quality em produção).
- Operacional ergonomics (`cockpit-density-governor`).
- Multi-tenant + multi-plant rollout.

Não cobertos:
- Telemetria realtime PLC/SCADA real (`D9`).
- Edge runtime offline (`D10`, `D16`).
- IEC 62443 industrial cybersecurity.
- Hardware-in-the-loop testing.
- Redundância industrial (HA) documentada.

### 1.3 Áreas que ainda impedem adoção/scaling/internacional

#### Bloqueia adoção enterprise
- SSO/Federation (SAML/OIDC).
- MFA obrigatório.
- APM externo (OpenTelemetry).
- OPA/Rego policy engine.
- Dashboard rollout consolidado.

#### Bloqueia deployment industrial
- Telemetria PLC/SCADA real (D9).
- Edge agent (D10).
- Service-worker offline robusto (D16).
- Workflow runtime autónomo industrial.
- Retention industrial (D11).
- Validação loop hardware real.

#### Bloqueia SaaS scaling
- RLS PostgreSQL (defesa em profundidade).
- Particionamento industrial outbox.
- Onboarding self-service (provisioning de tenant + roles + perfis).
- Cobrança / billing (não auditado mas tipicamente ausente em estágio actual).
- KMS por defeito + envelope encryption por tenant.

#### Bloqueia readiness internacional
- i18n.
- Fusos consistentes.
- Multi-region storage (data residency UE).
- Multi-currency.
- GDPR DPA padronizado.
- ISO 27001 + SOC 2 Type II certificados.
- IEC 62443 (chão de fábrica).
- CE/UL (sensores edge se IMPETUS distribuir hardware).

### 1.4 Classificação de criticidade dos itens em falta

#### Críticos (bloqueadores imediatos para o segmento-alvo declarado)
- D14/D15 (visibility reconciliation) — qualquer cliente enterprise.
- D9 (telemetria real) — qualquer cliente industrial real.
- D10 (edge agent) — qualquer cliente chão de fábrica.
- D24 (model registry / AI-cards) — ISO 42001 + clientes regulados.
- SSO/Federation — qualquer enterprise >500 utilizadores.
- D12 (APM externo) — SLO contractual.

#### Médio risco
- D6, D11, D19, D21, D22, D23 (compliance + observabilidade + auditabilidade).
- D5, D7, D13, D16, D18, D20, D25, D27 (consolidação + ergonomia).
- MFA universal.
- RLS PostgreSQL.

#### Baixo risco / estratégicos
- D1, D2 (promoção Z.28/Z.29 — requer maturação prévia).
- D8 (deprecação Motor A — longo prazo).
- D26 (Logistics pleno).
- D17 (DS consistency).
- i18n / fusos / multi-currency (para mercado internacional).

#### Future enhancements (não imediatos)
- Federated learning entre tenants.
- Multi-modal IA (audio/imagem industrial).
- IA agentic com action runtime autónomo certificado.
- Digital twin completo.

---

## 2. Análise de Go-to-Market por arquétipo de cliente

### 2.1 Arquétipo A — Indústria média brasileira (50–300 colaboradores, gestão de qualidade/SST/RH/manutenção)

**Adequação:** **APTO (com pilot supervisionado).**
**Time-to-value:** 4–8 semanas.
**Bloqueadores:** nenhum crítico; recomenda-se completar Wave A do roadmap antes de scale.
**Diferenciação:** cockpit cognitivo nativo + memória conversacional SZ5 + LGPD foundation.

### 2.2 Arquétipo B — Grande indústria brasileira (500+ colaboradores, chão de fábrica realtime)

**Adequação:** **NÃO APTO HOJE.**
**Bloqueadores:** D9, D10, D12, D16, D24, SSO, IEC 62443.
**Tempo estimado para readiness:** 6–9 meses (Wave A + B + C parciais).

### 2.3 Arquétipo C — Holding/Corporate com governança formal (multinacional brasileira, ESG)

**Adequação:** **APTO COM HARDENING.**
**Bloqueadores:** SSO + D24 + APM externo + DSR portal.
**Tempo estimado:** 3–5 meses.

### 2.4 Arquétipo D — Cliente internacional (UE/US)

**Adequação:** **NÃO APTO HOJE.**
**Bloqueadores:** i18n, GDPR DPA + data residency, ISO 27001/SOC 2 certificados, SSO/SCIM.
**Tempo estimado:** 12–18 meses + investimento certificação.

---

## 3. SWOT comercial

### Strengths
- Cockpit cognitivo nativo de domínio (Quality em produção; raro no mercado brasileiro).
- Memória conversacional indexada e governada (SZ5).
- Disciplina arquitetural rara (shadow-first, additive-only).
- LGPD foundation pronta.
- Design system Industrial 4.0 distinto (não-genérico).

### Weaknesses
- Cognitive sprawl (3 motores em produção).
- Telemetria industrial real ausente.
- Sem SSO/Federation.
- Sem APM externo.
- Sem internacionalização.

### Opportunities
- Indústria brasileira média/grande com pressão ESG/ANPD.
- Mercado de qualidade industrial (SPC + CAPA + supplier).
- Memória conversacional sovereign como diferenciador IA-com-ROI.
- Pacto Global / B3 / ANBIMA — ESG/Carbon executive runtime.

### Threats
- Concorrentes verticais com integrações PLC reais (PI System, AVEVA, Wonderware, Cognex).
- Big SaaS (SAP, Oracle, Microsoft) com SSO + SOC 2 nativos.
- Plataformas IA-first (OpenAI Enterprise, Anthropic) com governance comparável e budget de marketing maior.
- Risco regulatório (ANPD escalando enforcement; UE AI Act).

---

## 4. Conclusão executiva

O IMPETUS é **comercialmente vendável** **hoje** para o **arquétipo A** (indústria média brasileira com gestão administrativa industrial) em formato **pilot supervisionado**. Para **enterprise scaling no Brasil** precisa de 3–5 meses adicionais de Wave A + parte da Wave C (SSO + APM + DSR + model registry). Para **chão de fábrica realtime** precisa de 6–9 meses (Wave B). Para **mercado internacional** precisa de 12–18 meses + investimento em certificação.

O sistema **não tem falsos positivos arquiteturais** (capacidades declaradas-mas-inertes que não funcionam) — toda a base soberana realmente funciona. Os gaps são **honestos** e correspondem ao estágio 4/7 (Industrial Cognitive Pilot Mature).

---
*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*

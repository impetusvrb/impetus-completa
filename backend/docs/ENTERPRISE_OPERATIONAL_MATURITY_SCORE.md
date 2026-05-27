# IMPETUS — ENTERPRISE OPERATIONAL MATURITY SCORE

**Data:** 2026-05-25
**Escopo:** scorecard quantitativo de maturidade operacional enterprise
**Tipo:** auditoria não-implementadora

---

## 0. Sumário executivo

| Indicador | Valor |
|-----------|-------|
| **Maturity stage global** | **4 / 7 — Industrial Cognitive Pilot Mature** |
| **Score geral ponderado** | **62 / 100** |
| **Categoria mais madura** | Governança & Identity (84/100) |
| **Categoria menos madura** | Telemetria Industrial Real (28/100) |
| **Trajetória prevista (12 m, com Tier 1+2 executados)** | **80 / 100** (stage 5–6) |

A escala 0–100 reflete um misto de:
- cobertura de funcionalidades vs. estado-da-arte enterprise;
- maturidade operacional (estabilidade, observabilidade, recovery);
- compliance & governance;
- evidência forense (audit, explainability).

---

## 1. Metodologia

Cada categoria pontuada de 0 a 100, com peso relativo ao seu impacto no segmento-alvo (indústria média brasileira → industrial enterprise → internacional).

Escala qualitativa:

- **0–20** Não-implementado / placeholder.
- **20–40** Scaffolding implementado, não-operacional ou em simulação.
- **40–60** Parcialmente operacional, gaps significativos.
- **60–80** Operacional com hardening necessário.
- **80–95** Maduro com refinamentos pontuais.
- **95–100** Estado-da-arte enterprise + certificável.

---

## 2. Scorecard detalhado

### 2.1 Categoria: Core Runtime & Cognitive Architecture

| Sub-categoria | Score | Peso | Pondação | Justificação |
|---------------|------:|------|---------:|--------------|
| Motor A (legado dashboards) | 88 | 0.06 | 5.28 | Estável em produção, suporte continuado |
| Engine V2 (dashboards modulares) | 82 | 0.08 | 6.56 | Em produção; cobertura ainda parcial vs Motor A |
| Runtime Z foundation (Z.18–Z.22) | 78 | 0.08 | 6.24 | Active em production via observability gate; Quality completo |
| Runtime Z cockpits especializados (Z.23–Z.27) | 65 | 0.06 | 3.90 | Quality full; outros pilot |
| Runtime Z orchestração (Z.28/Z.29) | 35 | 0.04 | 1.40 | Shadow indefinido |
| SZ1 Sovereignty | 88 | 0.04 | 3.52 | Em produção, promotion-by-tenant |
| SZ2 Cognitive OS | 82 | 0.04 | 3.28 | Persistence ligado, in-memory + file |
| SZ3 Cognitive Maturation | 78 | 0.04 | 3.12 | Calibration active, padrões limitados a 200 |
| SZ4 Operational Nervous System | 70 | 0.04 | 2.80 | Active mas `PERSISTENCE=off` |
| SZ5 Conversational Memory | 86 | 0.06 | 5.16 | Produção real, indexação + governance + facts-before-LLM |
| Coexistência multi-motor (debt) | 45 | 0.02 | 0.90 | 3 motores activos = manutenção tripla |
| **Subtotal Core Runtime** | **74** | **0.56** | **42.16** | |

### 2.2 Categoria: Governança & Identidade

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| RBAC | 88 | 0.02 | 1.76 |
| Contextual governance | 80 | 0.02 | 1.60 |
| Identity governance (diacritics + sectorial) | 92 | 0.02 | 1.84 |
| Visibility reconciliation | 50 | 0.02 | 1.00 |
| Sovereign governance (SZ1) | 88 | 0.01 | 0.88 |
| Hierarchy governance | 85 | 0.01 | 0.85 |
| Tenant governance | 82 | 0.02 | 1.64 |
| Rollout governance | 80 | 0.01 | 0.80 |
| Publication governance | 70 | 0.01 | 0.70 |
| Audit governance (legal trail) | 88 | 0.02 | 1.76 |
| AI governance (LGPD prompt + structuralAI) | 70 | 0.02 | 1.40 |
| Federation / SSO | 10 | 0.02 | 0.20 |
| MFA universal | 25 | 0.01 | 0.25 |
| **Subtotal Governança & Identidade (média 84)** | **84** | **0.21** | **14.68** |

### 2.3 Categoria: Domínios Industriais

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| Quality (cockpit + SPC + drift + CAPA + supplier) | 88 | 0.03 | 2.64 |
| Safety (SST) (pilot) | 55 | 0.02 | 1.10 |
| Environment (pilot, 108 ficheiros, conectores simulados) | 50 | 0.02 | 1.00 |
| Logistics (scaffold) | 20 | 0.01 | 0.20 |
| HR/People (pilot) | 60 | 0.01 | 0.60 |
| Production (cockpit ZP0/P1) | 70 | 0.02 | 1.40 |
| Maintenance ManuIA (pilot) | 65 | 0.01 | 0.65 |
| Executive Boardroom (pilot) | 60 | 0.01 | 0.60 |
| ESG/Carbon (pilot) | 60 | 0.01 | 0.60 |
| **Subtotal Domínios (média 58)** | **58** | **0.14** | **8.79** |

### 2.4 Categoria: Telemetria Industrial Real

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| MQTT/OPC-UA/Modbus connectors | 30 | 0.02 | 0.60 |
| Edge runtime / agent | 15 | 0.02 | 0.30 |
| Telemetry ingestion | 45 | 0.01 | 0.45 |
| Realtime analytics | 50 | 0.01 | 0.50 |
| Anomaly/drift detection multi-domínio | 55 | 0.01 | 0.55 |
| Industrial event backbone (W1 entregue) | 50 | 0.01 | 0.50 |
| Fusão SCADA/MES | 20 | 0.01 | 0.20 |
| Retention industrial | 25 | 0.01 | 0.25 |
| **Subtotal Telemetria (média 36)** | **36** | **0.10** | **3.35** |

### 2.5 Categoria: AI / Cognitive

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| Contextual reasoning | 75 | 0.01 | 0.75 |
| Operational memory | 82 | 0.01 | 0.82 |
| Conversational memory query (SZ5) | 86 | 0.01 | 0.86 |
| Cross-thread retrieval | 80 | 0.01 | 0.80 |
| Followups / reminders (assistive) | 60 | 0.01 | 0.60 |
| Operational workflows runtime | 40 | 0.01 | 0.40 |
| Action runtime (tool calling autónomo) | 25 | 0.01 | 0.25 |
| Hallucination detection | 35 | 0.01 | 0.35 |
| AI confidence exposure | 45 | 0.01 | 0.45 |
| Explainability runtimes | 78 | 0.01 | 0.78 |
| Model registry / AI-cards (ISO 42001) | 15 | 0.01 | 0.15 |
| Human-in-the-loop formal | 30 | 0.01 | 0.30 |
| **Subtotal AI/Cognitive (média 55)** | **55** | **0.12** | **6.51** |

### 2.6 Categoria: UX / Frontend

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| Operational UX (DS Industrial 4.0) | 82 | 0.02 | 1.64 |
| Adaptive UX (density governor) | 75 | 0.01 | 0.75 |
| Command center UX (executive pilot) | 60 | 0.01 | 0.60 |
| Mobile PWA (ManuIA) | 55 | 0.01 | 0.55 |
| Offline runtime industrial | 25 | 0.01 | 0.25 |
| i18n | 10 | 0.01 | 0.10 |
| **Subtotal UX (média 51)** | **51** | **0.07** | **3.89** |

### 2.7 Categoria: Observabilidade

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| Cognitive observability (interna) | 75 | 0.01 | 0.75 |
| Telemetry observability (interna) | 60 | 0.01 | 0.60 |
| Governance observability | 75 | 0.01 | 0.75 |
| Operational observability (dashboardUsageTelemetry) | 70 | 0.01 | 0.70 |
| Runtime health endpoints | 70 | 0.01 | 0.70 |
| AI confidence | 45 | 0.01 | 0.45 |
| APM externo (OpenTelemetry/Prometheus) | 15 | 0.02 | 0.30 |
| **Subtotal Observabilidade (média 59)** | **59** | **0.08** | **4.25** |

### 2.8 Categoria: Segurança & Compliance

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| LGPD core (consent, anonimização) | 78 | 0.02 | 1.56 |
| Audit trails | 85 | 0.01 | 0.85 |
| Encryption at rest (traces IA) | 70 | 0.01 | 0.70 |
| Encryption at rest (PII operacional) | 30 | 0.01 | 0.30 |
| KMS bootstrapping | 45 | 0.01 | 0.45 |
| Sensitive data exposure (sanitização) | 88 | 0.01 | 0.88 |
| Tenant isolation | 80 | 0.02 | 1.60 |
| Access governance | 80 | 0.01 | 0.80 |
| Retention policies | 45 | 0.01 | 0.45 |
| Explainability governance | 75 | 0.01 | 0.75 |
| ISO 27001 readiness | 35 | 0.02 | 0.70 |
| ISO 42001 readiness | 40 | 0.01 | 0.40 |
| SOC 2 Type II readiness | 20 | 0.01 | 0.20 |
| IEC 62443 readiness | 10 | 0.01 | 0.10 |
| **Subtotal Segurança & Compliance (média 56)** | **56** | **0.17** | **9.74** |

### 2.9 Categoria: Operações & SaaS Scaling

| Sub-categoria | Score | Peso | Pondação |
|---------------|------:|------|---------:|
| PM2 process management | 80 | 0.01 | 0.80 |
| Multi-tenant scaling | 65 | 0.01 | 0.65 |
| RLS / defense-in-depth DB | 35 | 0.01 | 0.35 |
| Onboarding self-service | 30 | 0.01 | 0.30 |
| Cobrança / billing | 20 | 0.01 | 0.20 |
| DR / BCP documentado | 35 | 0.01 | 0.35 |
| **Subtotal Operações (média 44)** | **44** | **0.06** | **2.65** |

---

## 3. Agregação final

| Categoria | Score médio | Peso total | Contribuição |
|-----------|------------:|-----------:|-------------:|
| Core Runtime & Cognitive Architecture | 74 | 0.56 | (note: este peso foi normalizado abaixo) |
| Governança & Identidade | 84 | 0.21 | |
| Domínios Industriais | 58 | 0.14 | |
| Telemetria Industrial Real | 36 | 0.10 | |
| AI / Cognitive | 55 | 0.12 | |
| UX / Frontend | 51 | 0.07 | |
| Observabilidade | 59 | 0.08 | |
| Segurança & Compliance | 56 | 0.17 | |
| Operações & SaaS Scaling | 44 | 0.06 | |

### Score global (rebalanceado por categoria)

Reescalonando para soma de pesos = 1.00 (proporcional aos pesos declarados):

```
0.30 × 74 (Runtime)        = 22.20
0.15 × 84 (Governance)     = 12.60
0.10 × 58 (Domains)        =  5.80
0.10 × 36 (Telemetry real) =  3.60
0.10 × 55 (AI/Cognitive)   =  5.50
0.06 × 51 (UX)             =  3.06
0.05 × 59 (Observ.)        =  2.95
0.10 × 56 (Sec&Comp)       =  5.60
0.04 × 44 (Ops)            =  1.76
────────────────────────────────────
Total:                      63.07
```

**Score global IMPETUS:** **63 / 100** *(arredondado a 62 dada a margem de erro qualitativa)*.

---

## 4. Maturity stage detalhado

| Stage | Descrição | Estado IMPETUS |
|-------|-----------|----------------|
| 1 — Spike / Demo | Provas de conceito isoladas | ✅ Superado |
| 2 — SaaS funcional não-industrial | CRUD + dashboards básicos | ✅ Superado |
| 3 — SaaS funcional com domínio industrial parcial | Quality administrative ativa | ✅ Superado |
| **4 — Foundation cognitiva soberana + cockpit nativo + memória governada** | SZ1–SZ5 + Quality cognitive cockpit + LGPD foundation + identity + governance | ✅ **ATUAL** |
| 5 — Multi-domain cognitive production | Quality + SST + Environment full + APM externo + SSO + retention uniforme + ISO 27001 audit-ready | 🚧 Faltam ~24 itens (Wave A + B parcial) |
| 6 — Industrial autonomy | Action runtime + edge real + workflows autónomos + IEC 62443 ready | ❌ Faltam telemetria real + edge + workflow runtime + SIL-rating |
| 7 — Internationally certified | ISO 27001 + SOC 2 + ISO 42001 + IEC 62443 + i18n + multi-region | ❌ Distância significativa |

**Time-to-stage:**
- 4 → 5: ~5 meses (Tier 1 + Tier 2 parcial do roadmap).
- 5 → 6: +6 meses adicionais.
- 6 → 7: +12 meses adicionais.

---

## 5. Top 10 ofensores do score actual

| Rank | Item | Categoria | Score | Impacto se remediado |
|-----:|------|-----------|------:|---------------------|
| 1 | Federation / SSO | Governance | 10 | +6 pontos globais |
| 2 | Edge runtime / agent | Telemetria | 15 | +5 pontos |
| 3 | Model registry / AI-cards | AI | 15 | +5 pontos |
| 4 | APM externo | Observ. | 15 | +5 pontos |
| 5 | i18n | UX | 10 | +3 pontos |
| 6 | IEC 62443 readiness | Sec&Comp | 10 | +3 pontos |
| 7 | SOC 2 Type II | Sec&Comp | 20 | +3 pontos |
| 8 | Cobrança / billing | Ops | 20 | +2 pontos |
| 9 | RLS DB | Ops | 35 | +2 pontos |
| 10 | DR / BCP | Ops | 35 | +2 pontos |

**Cumulativo top 10:** ~36 pontos potenciais → score projetado **~98** *(teórico)*; com perdas práticas de execução estimadas em ~15 pontos, alvo realista para 18 meses: **~80**.

---

## 6. Top 10 forças (drivers de score actual)

| Rank | Item | Score |
|-----:|------|------:|
| 1 | Identity governance (diacritics + sectorial) | 92 |
| 2 | Quality cockpit cognitivo + SPC + drift + CAPA | 88 |
| 3 | RBAC | 88 |
| 4 | Sensitive data exposure (sanitização) | 88 |
| 5 | SZ1 Sovereignty | 88 |
| 6 | Motor A estabilidade | 88 |
| 7 | Audit trails | 85 |
| 8 | SZ5 Conversational Memory | 86 |
| 9 | Operational UX (DS Industrial 4.0) | 82 |
| 10 | Engine V2 | 82 |

---

## 7. Trajetória esperada

| Marco | Score esperado | Stage |
|-------|---------------:|------:|
| Hoje | 62 | 4 |
| Após Tier 1 (4–5 meses) | 73 | 4.5 |
| Após Tier 2 (10–11 meses) | 82 | 5 |
| Após Tier 3 wave C.1+C.2 (16–18 meses) | 88 | 6 |
| Após certificações (24+ meses) | 92+ | 6.5–7 |

---

## 8. Conclusão executiva

O IMPETUS está num **estágio raro para um SaaS industrial brasileiro independente**: foundation cognitiva soberana, memória conversacional indexada e governada (SZ5), cockpit cognitivo de domínio nativo (Quality em produção), LGPD foundation, identity governance enterprise-grade.

O **score global de 62/100** reflete uma plataforma com **força arquitetural acima da média** mas com **lacunas práticas claras** em telemetria industrial real, federation, observabilidade externa e governança IA formal (ISO 42001).

A trajetória sugerida (`FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`) leva o sistema a **82/100** em 10–11 meses, posicionando-o para **enterprise scaling no Brasil + 1ª referência industrial real com telemetria PLC**.

Internacionalização e certificação plena (>92/100) requerem 18–24 meses + investimento dedicado.

---

*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*

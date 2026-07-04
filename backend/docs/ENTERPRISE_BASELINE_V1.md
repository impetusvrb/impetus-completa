# Enterprise Baseline v1 — Documento Oficial

**Programa:** BASELINE-LOCK-01  
**Versão:** Enterprise v1  
**Data de encerramento:** 2026-07-03  
**Decisão:** **BASELINE ENCERRADA COM RESSALVAS**

---

## 1. Escopo

Esta baseline define a **arquitectura certificada e congelada** do IMPETUS Enterprise On-Premise v1, incluindo:

- Event Governance v1 (EG-01 → EG-20)
- Integração e promoção runtime (INTEG-01, PROMOTION-01/02)
- Convergência cognitiva (ECO-01 → ECO-08)
- Infraestrutura enterprise (FORENSICS → BACKUP, ARCHITECTURE, INFRA, DATA, LICENSE, CONTAINER)
- Adapters ECO certificados (shadow mode, flags OFF)

**Fora do escopo v1 (evolução futura):** Event Governance v2, activação consumer em produção, retirement legacy (ADR-ECO-005), homologação operacional pendente.

---

## 2. Arquitectura certificada

```text
┌─────────────────────────────────────────────────────────────┐
│              Event Governance v1 (CONGELADO)                  │
│  Pipeline exec · Políticas · Learning · Memory · Explain    │
│  Intelligence · PolicyOpt · Executive Insights · KB         │
└──────────────────────────┬──────────────────────────────────┘
                           │ read-only / evaluate (adapters)
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
 ECO-03 Bypasses      ECO-04 Controller    ECO-05 Pulse
 ECO-06 Context+KB    ECO-07 Executive Dashboards
     │                     │                     │
     └─────────────────────┴─────────────────────┘
                           │
              Shadow (flags OFF) — rollback independente
                           │
              UX · Dashboards · Chat · Notificações
```

Referência: [`ECO_08_ARCHITECTURE_BASELINE.md`](./ECO_08_ARCHITECTURE_BASELINE.md)

---

## 3. Componentes congelados

| Componente | Certificação | Alteração permitida |
|------------|--------------|-------------------|
| Event Governance core | EG-20 | **Proibida** (v1) |
| governanceLearningService | EG-13 | **Proibida** |
| governanceOperationalMemoryService | EG-14 | **Proibida** |
| governanceExplainabilityService | EG-15 | **Proibida** |
| governanceIntelligenceService | EG-16 | **Proibida** |
| governancePolicyOptimizationService | EG-17 | **Proibida** |
| governanceExecutiveInsightsService | EG-18 | **Proibida** |
| governanceKnowledgeBaseService | EG-19 | **Proibida** |
| eventGovernanceExecutionService | EG pipeline | **Proibida** |
| Integrações domain adapters (11) | PROMOTION | Apenas via flags domínio |
| Infraestrutura (ADR-010…019) | CERT-* | Patch operacional apenas |
| Persistência / Licenciamento | DATA-01, LICENSE-01 | Migração controlada |
| Containerização | CONTAINER-01 | Sem alterar runtime EG |

---

## 4. Componentes evolutivos (sem alterar baseline v1)

| Módulo | Evolução permitida |
|--------|-------------------|
| Adapters ECO (6) | Activar consumer flags; observabilidade |
| Frontend dashboards | Consumir audit APIs; UI observabilidade |
| AIOI read-models | Domínio separado |
| Cognitive Pulse operacional | Métricas vivo (não KPIs EG) |
| Enterprise v2 / novos módulos | **Novo ciclo** com adapters |
| Legacy retirement | ADR-ECO-005 — pós-activação flags |

---

## 5. Regras para Enterprise v2

Toda evolução futura **deve**:

1. **Preservar** a baseline v1 documentada neste ficheiro
2. **Utilizar adapters** — nunca alterar núcleo EG v1 directamente
3. **Manter rollback** — feature flag independente por fluxo
4. **Manter observabilidade** — endpoint audit dedicado
5. **Manter feature flags** — shadow antes de consumer em produção
6. **Registar ADR** antes de implementação
7. **Não misturar** alterações v2 com código certificado v1 sem revisão formal

---

## 6. Feature flags baseline (estado oficial 2026-07-03)

| Flag | Classificação | Valor |
|------|---------------|-------|
| `EVENT_GOVERNANCE_*` (Grupo A) | baseline / produção | `true` |
| `ECO_OAE_VIA_EG` | shadow / staging | `false` |
| `ECO_CHAT_VIA_EG` | shadow / staging | `false` |
| `ECO_ORG_AI_VIA_EG` | shadow / staging | `false` |
| `ECO_CONTROLLER_VIA_EG` | shadow / staging | `false` |
| `ECO_PULSE_VIA_EG` | shadow / staging | `false` |
| `ECO_CONTEXT_VIA_EG` | shadow / staging | `false` |
| `ECO_EXECUTIVE_VIA_EG` | shadow / staging | `false` |

---

## 7. Observabilidade oficial

| Endpoint | Propósito |
|----------|-----------|
| `/api/audit/event-governance/*` | EG-01…20 (21 rotas) |
| `/api/audit/eco-convergence/status` | ECO-03 |
| `/api/audit/eco-controller/status` | ECO-04 |
| `/api/audit/eco-pulse/status` | ECO-05 |
| `/api/audit/eco-context/status` | ECO-06 |
| `/api/audit/eco-executive/status` | ECO-07 |

---

## 8. Ponto de corte

A partir de **2026-07-03**, qualquer alteração que afecte componentes congelados requer:

- Nova certificação (v2), ou
- Excepção formal documentada (NC + ADR)

A engenharia Enterprise v1 está **encerrada**. Evoluções entram em ciclo v2.

---

## Referências

- [`BASELINE_LOCK_REPORT.md`](./BASELINE_LOCK_REPORT.md)
- [`BASELINE_LOCK_MATRIX.md`](./BASELINE_LOCK_MATRIX.md)
- [`CERTIFICATIONS-INDEX.md`](./CERTIFICATIONS-INDEX.md)
- [`ECO_08_ENTERPRISE_CERTIFICATION.md`](./ECO_08_ENTERPRISE_CERTIFICATION.md)

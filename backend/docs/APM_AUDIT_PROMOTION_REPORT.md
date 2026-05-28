# APM Enterprise — Relatório de Promoção `shadow → audit`

**Data:** 2026-05-27  
**Escopo:** PROMPT 14 — OpenTelemetry / Prometheus / Grafana (camada APM)  
**Resultado:** `APPROVED` — modo `audit` activo, OTLP desligado, alertas observe-only

---

## 1. Evidência de sucesso do APM

### 1.1 Alterações aplicadas

| Artefacto | Alteração |
|-----------|-----------|
| `backend/.env` | `IMPETUS_APM_ENTERPRISE_MODE=audit`, `IMPETUS_APM_SHADOW_MODE=false`, `IMPETUS_OTEL_EXPORTER_ENABLED=false` explícito |
| `backend/src/governance/flagReconcilerRuntime.js` | `IMPETUS_APM_ENTERPRISE_MODE` em `CRITICAL_FLAGS` |
| `backend/src/observability/apmEnterpriseBridge.js` | `enterprise_mode` em diagnostics + `emitBootAuditTrail()` |
| `backend/src/server.js` | Boot chama `emitBootAuditTrail()` (non-blocking) |
| `backend/scripts/verify-apm-audit-evidence.js` | Verificação automatizada |
| `backend/scripts/apply-apm-audit-promotion.js` | Aplicação + PM2 `--update-env` |

### 1.2 Comportamento em modo `audit` (assíncrono, sampling 10%)

```
Requisição HTTP / Chat / Dashboard
        │
        ▼ (resposta entregue — sem esperar APM)
        │
        └── Hooks existentes (finish handler / pós-trace):
                apmEnterpriseBridge.recordSpan(...)
                    ├── shouldSample() → ~10% (Math.random < 0.1)
                    ├── enterpriseObservabilityRuntime (trace in-memory)
                    ├── tenantMetricsRegistry (Prometheus text)
                    ├── sloSliRegistry (SLI burn)
                    └── otlpExporter → SKIP (OTEL=false)
```

**Garantias:**

- Sem SDK OpenTelemetry no hot path.
- Sem mutação de payload de resposta IA ou dashboard.
- OTLP só activa se `IMPETUS_OTEL_EXPORTER_ENABLED=true` **e** `APM_SHADOW_MODE=false`; ambos controlados — hoje OTLP **off**.
- Cardinalidade tenant limitada (`IMPETUS_TENANT_METRICS_CARDINALITY_CAP=25`).

### 1.3 Flags efectivas (canónico PROMPT 14)

```env
IMPETUS_OBSERVABILITY_V2_ENABLED=true
IMPETUS_APM_ENTERPRISE_ENABLED=true
IMPETUS_APM_ENTERPRISE_MODE=audit
IMPETUS_APM_SHADOW_MODE=false
IMPETUS_OTEL_EXPORTER_ENABLED=false
IMPETUS_APM_SAMPLING_RATE=0.1
IMPETUS_OBSERVABILITY_ALERTS_ENFORCE=false
```

### 1.4 Rotas e serviços afectados

| Tipo | Path / serviço |
|------|----------------|
| Hot path (read-only metrics) | `middleware/observabilityMiddleware.js` |
| Hot path | `dashboardCompositionGateway.js` → `recordDashboardLatency` |
| Hot path | `aiAnalyticsService.js` → `recordAiLatency` |
| Hot path | `zUnifiedConversationalContextInjector.js` → `recordSz5Latency` |
| Hot path | `hallucinationDetectionService.js` → `recordHallucinationAssessment` |
| Admin | `GET /api/admin/runtime/observability-apm` |
| Admin | `GET /api/admin/runtime/observability-prometheus-preview` |
| Internal | `GET /api/internal/observability/metrics` |
| Internal | `GET /api/internal/observability/apm` |

### 1.5 Rollback

```bash
IMPETUS_APM_ENTERPRISE_MODE=shadow
IMPETUS_APM_SHADOW_MODE=true
pm2 restart impetus-backend --update-env
```

### 1.6 Verificação

```bash
cd /var/www/impetus-completa/backend
node scripts/verify-apm-audit-evidence.js
# ou promoção completa:
node scripts/apply-apm-audit-promotion.js
```

---

## 2. Justificativa de bloqueio — Cockpits cognitivos e orchestration

Os módulos abaixo permanecem em **`shadow`** (ou `pilot`) **de propósito**. Não possuem modo `audit` equivalente ao APM/Hallucination; “promover” significaria activar **execução ou publicação cognitiva** visível ao utilizador.

| Flag (exemplos) | Significado de `shadow` | Impacto se forçado para `audit`/`on` |
|-----------------|-------------------------|--------------------------------------|
| `IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME=shadow` | Cockpit executivo não publica runtime completo | Mudança de widgets, narrativas e KPIs no boardroom |
| `IMPETUS_QUALITY_COGNITIVE_RUNTIME=shadow` | Quality cognitivo limitado | Divergência Motor A vs Engine V2, risco em SPC/CAPA |
| `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow` | Publicação ambiental em shadow | Painéis ambientais inconsistentes entre tenants |
| `IMPETUS_ADAPTIVE_ORCHESTRATION=shadow` | Orquestração adaptativa observa, não actua | Auto-mutação de fluxos cognitivos |
| `IMPETUS_GOVERNANCE_LEARNING=shadow` | Aprendizagem de governança sem HITL | Sugestões de política sem aprovação formal |
| `IMPETUS_MULTI_DOMAIN_FOUNDATION=shadow` | Fundação multi-domínio não consolidada | Cross-domain leakage ou KPIs incoerentes |

**Porque APM foi diferente:** APM é **observabilidade passiva** (métricas/spans), alinhada a SRE — não altera decisões de negócio nem UX.

**Risco destrutivo evitado:** regressão visual, decisões IA autónomas, e violação do princípio *shadow-first* documentado em `MASTER_ENTERPRISE_GAP_AUDIT.md` e `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md` (Z.28/Z.29 exigem HITL antes de promoção).

---

## 3. Plano de promoção para modo `on` (fase próxima)

Módulos **já em `audit`** cujo passo seguinte é **`on`** (mutação ou persistência plena):

### 3.1 AI Governance Persistence (lineage)

| Item | Detalhe |
|------|---------|
| Flag | `IMPETUS_AI_GOVERNANCE_PERSISTENCE=on` |
| Efeito | INSERT em `ai_prompt_lineage`; enrich `model_info` em traces; metadata em `chat_messages` |
| Pré-requisitos | DPO review; schema `ai_prompt_lineage` bootstrapped; 7d em `audit` com lineage logs |
| Riscos | Volume BD; hashes de prompt — confirmar sem PII em claro |
| Checklist | ☐ Taxa de erro persist &lt; 0.1% ☐ Tenant isolation fuzz ☐ Rollback para `audit` ☐ ISO 42001 gap fechado |

### 3.2 KMS Column Encryption

| Item | Detalhe |
|------|---------|
| Flag | `IMPETUS_KMS_COLUMN_ENCRYPTION=on` |
| Efeito | Cifra colunas PII configuradas em runtime |
| Pré-requisitos | `IMPETUS_KMS_GOVERNANCE=on`; rotação testada; backup/DR validado |
| Riscos | Dados legados em plaintext; falha de decrypt bloqueia leitura |
| Checklist | ☐ Staging round-trip ☐ Performance p95 &lt; +5ms ☐ Runbook rotação ☐ Rollback staging key |

### 3.3 SZ5 Purge / Anonymization

| Item | Detalhe |
|------|---------|
| Flag | `IMPETUS_SZ5_ANONYMIZATION_MODE=on` (Phase 1 via `sz5ActivationGovernance`) |
| Efeito | Purge embeddings, summaries, graph edges — **irreversível** |
| Pré-requisitos | `IMPETUS_RETENTION_MODE=enforce`; worker activo; Phase 1 governance PASS |
| Riscos | Perda de contexto conversacional; LGPD erase incompleto se mal scoped |
| Checklist | ☐ Phase 1 preconditions ☐ Tenant pilot único ☐ 48h em `audit` counts ☐ DPO sign-off ☐ `PURGE_GRAPH` separado |

### 3.4 APM — fase `on` / OTLP (após audit estável)

| Item | Detalhe |
|------|---------|
| Flags | `IMPETUS_OTEL_EXPORTER_ENABLED=true` + `IMPETUS_OTEL_ENDPOINT` + collector validado |
| Pré-requisitos | 7d em `audit`; Grafana/Prometheus scrape estável; custo rede aceite |
| Riscos | Overhead export; cardinalidade no collector |
| Checklist | ☐ Collector HA ☐ Circuit breaker testado ☐ p95 HTTP sem regressão &gt; 5% |

---

## 4. Mapa de estados (.env) — pós-promoção

| Mecanismo | Estado | Acção |
|-----------|--------|-------|
| Hallucination Detection | `audit` | Manter |
| SZ5 Anonymization | `audit` | Manter até Phase 1 `on` |
| KMS Governance | `audit` | Manter até `on` |
| AI Model Registry | `audit` | Manter |
| **APM Enterprise** | **`audit`** | **Promovido nesta acção** |
| Cockpits / Orchestration | `shadow` | **Bloqueado** |
| Lineage / KMS encrypt / SZ5 purge | `audit` → plano `on` | Fase seguinte |

---

## 5. Riscos residuais (APM audit)

| Risco | Mitigação |
|-------|-----------|
| Duplicatas `.env` (OTEL/PROMETHEUS em duas secções) | Secção PROMPT 14 é canónica; último valor em dotenv override |
| Sampling 10% perde incidentes raros | Aceitável em audit; aumentar após baseline |
| Prometheus endpoint exposto | Auth internal + rede restrita |
| PM2 restart breve | `--update-env`; janela sub-segundo típica |

---

*Relatório gerado no âmbito da instrução de auditoria e promoção shadow→audit — IMPETUS Comunica IA.*

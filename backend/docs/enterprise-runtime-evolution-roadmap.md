# Roadmap Estrutural de Evolução do Runtime Enterprise — Impetus

> Documento **operacional**: traduz o `enterprise-evolution-master-plan.md` em fases, dependências, *rollout strategy*, *feature flags* e estratégia de *fallback*. Nada aqui é implementação; é planeamento executável.

---

## 1. Visão de horizonte (12 meses, em waves)

```
WAVE 0 — fundações já entregues (preservar e validar)
    └── hardening enterprise concluído (relatório dedicado)

WAVE 1 — backbone de eventos industrial (3–4 sprints)
    └── catálogo + outbox + DLQ + correlation enriquecido + replay shadow

WAVE 2 — observabilidade enterprise (2 sprints, paralelo a Wave 1 final)
    └── OTLP opcional + workflow tracing + SLOs + saturation panel

WAVE 3 — storage temporal & retention (3 sprints)
    └── piloto Timescale + partition strategy + cold storage + archival

WAVE 4 — AI context budget & summarization (2 sprints)
    └── budgets per persona/tenant/module + summarizer + autoloop guard

WAVE 5 — bounded contexts estruturados (3 sprints)
    └── topologia domains/* + ACLs + shared kernel + workspaces internos

WAVE 6 — frontend enterprise (paralelo a Wave 5)
    └── dual-layer UX + lazy domains + offline operacional

WAVE 7 — governance/security industrial (1–2 sprints, contínuo)
    └── workflow capabilities + auditoria estendida + LGPD industrial

CHECKPOINT GERAL — readiness gate para os módulos industriais
    └── então (e só então) iniciar Qualidade → Logística → Ambiental → SST
```

---

## 2. Tabela mestra — ordem exata, dependências e pré-requisitos

| # | Wave | Item | Pré-requisitos | Dependentes | Esforço (sprints) | ROI | Risco |
|---|---|---|---|---|---|---|---|
| 1 | W1 | Catálogo industrial de eventos (`<domain>.<entity>.<verb>`) | Envelope atual + `featureGovernanceService` | Outbox, replay, IA budget | 1 | Alto | Baixo |
| 2 | W1 | Outbox industrial multi-domínio (extensão do `auditOutboxService`) | Catálogo + migrations aditivas | DLQ, replay, workflow tracing | 1.5 | Alto | Médio |
| 3 | W1 | DLQ + retry/backoff por evento crítico | Outbox | Observabilidade | 0.5 | Alto | Baixo |
| 4 | W1 | Correlation + causation + trace ids no envelope | `correlationIdMiddleware` | Tracing distribuído | 0.5 | Alto | Baixo |
| 5 | W1 | Replay shadow (worker dedicado, kill switch) | Outbox, catálogo | IA budget, frontend tracing | 0.5 | Médio | Médio |
| 6 | W2 | Exportador OTLP opcional (Tempo/Jaeger/Datadog) | Tracing in-memory atual | SLOs, dashboards externos | 0.5 | Médio | Baixo |
| 7 | W2 | Workflow tracing (`workflow_id` propagado) | Catálogo (W1) | Tracing por caso (NCR, CAPA, PT) | 1 | Alto | Baixo |
| 8 | W2 | SLO/SLI dashboard interno + alertas | Tracing + métricas | Promoção do pipeline | 0.5 | Médio | Baixo |
| 9 | W3 | Decisão piloto Timescale (opt-in, staging) | Postgres atual | Telemetria, SPC, RTLS | 1 | Alto | Médio |
| 10 | W3 | Partition strategy para `eventos_empresa` + futuras tabelas | Postgres + `migrationGovernanceService` | Todos os domínios | 1 | Médio | Médio |
| 11 | W3 | Cold storage + archival workers | Partition strategy | Custos/long-term | 1 | Médio | Baixo |
| 12 | W4 | `aiContextBudgetService` (per persona/tenant/module) | Pressure service atual | IA segura em escala | 1 | Alto | Médio |
| 13 | W4 | Summarization engine (hierárquica) | Catálogo + outbox | IA pronto para SPC/RTLS | 1 | Alto | Médio |
| 14 | W4 | Autoloop guard (cool-down + debouncer) | Pipeline + ai entrypoints | Anti-loop cognitivo | 0.5 | Alto | Baixo |
| 15 | W5 | Topologia `backend/src/domains/*` (esqueleto sem código de negócio) | Hardening + W1 | Todos módulos futuros | 1 | Alto | Baixo |
| 16 | W5 | Workspaces internos (`@impetus/shared`, `@impetus/event-pipeline`, `@impetus/domain-base`) | Build tooling | Velocidade de equipa | 1 | Médio | Baixo |
| 17 | W5 | ACLs e shared kernel formalizados | Topologia | Comunicação cross-domain | 1 | Alto | Baixo |
| 18 | W6 | Lazy-load por domínio no frontend | Topologia backend | UX em escala | 1 | Alto | Baixo |
| 19 | W6 | Realtime channel único + topics por workflow | Socket.io atual | UX operacional offline | 1 | Médio | Médio |
| 20 | W6 | Offline-first para operadores (IndexedDB + sync queue) | Mobile UI atual | UX de campo | 1.5 | Alto | Médio |
| 21 | W7 | Workflow capability matrix + ABAC estendido | RBAC atual | Compliance por workflow | 1 | Alto | Baixo |
| 22 | W7 | Auditoria estendida para tabelas industriais (triggers imutabilidade) | `migrationGovernanceService` | LGPD, ISO, legal | 0.5 | Alto | Baixo |
| 23 | W7 | DSAR pipeline (exportador LGPD) | Auditoria estendida | Direito do titular | 1 | Médio | Baixo |

---

## 3. Estratégia detalhada por Wave

### 3.1 Wave 1 — backbone de eventos

**Objetivo:** transformar o pipeline atual num **backbone industrial** sem alterar o que já corre.

**Modo de entrega:** *shadow-first*, *additive-only*.

**Flags propostas (default seguro):**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_INDUSTRIAL_EVENTS_ENABLED` | `false` | Liga publicação/consumo dos novos eventos industriais |
| `IMPETUS_INDUSTRIAL_OUTBOX_ENABLED` | `false` | Liga *outbox* multi-domínio aditiva |
| `IMPETUS_INDUSTRIAL_DLQ_ENABLED` | `false` | Liga DLQ para eventos com falha permanente |
| `IMPETUS_INDUSTRIAL_REPLAY_SHADOW` | `true` | Replay corre em shadow (sem efeito lateral) |
| `IMPETUS_EVENT_CATALOG_STRICT` | `false` (sobe para `true` em W2) | Rejeita eventos fora do catálogo |
| `IMPETUS_EVENT_THROTTLE_PER_TENANT` | `false` | Throttling per-tenant em modo observe primeiro |

**Rollout:**
1. Catálogo declarativo + envelope estendido (apenas leitura).
2. Outbox aditiva (escrita dupla: legado + outbox).
3. DLQ ligada após 7 dias sem regressão.
4. Replay worker em *shadow* — apenas conta divergências, não age.
5. Promoção para *enrich* apenas em domínios já cobertos.

**Fallback:** *flags off* devolvem comportamento atual; tabelas outbox/DLQ ficam aditivas mas inertes.

**Critérios de saída (gate W1→W2):**
- Cobertura ≥ 80 % dos eventos atuais já espelhados em outbox.
- Divergência observada < 1 % por 7 dias.
- Replay shadow não gera *false positives* > 0,1 %.

---

### 3.2 Wave 2 — observabilidade

**Objetivo:** ver o que se passa antes de mexer no que se passa.

**Flags propostas:**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_OTEL_EXPORTER_ENABLED` | `false` | Liga export OTLP |
| `IMPETUS_OTEL_ENDPOINT` | (vazio) | Endpoint OTLP |
| `IMPETUS_WORKFLOW_TRACING_ENABLED` | `false` | Liga workflow tracing |
| `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED` | `false` (interno apenas) | Liga `/metrics` interno |
| `IMPETUS_TENANT_METRICS_CARDINALITY_CAP` | `25` | Top-N tenants nas métricas; resto vai a bucket "others" |

**Rollout:** OTLP opcional → workflow tracing → SLO panel → alertas → revisão de cardinalidade.

**Fallback:** desligar exportador; métricas in-memory continuam funcionando como hoje.

**Critérios de saída:** SLO panel funcional; 1 alerta crítico provado em *drill* sem falsos positivos.

---

### 3.3 Wave 3 — storage temporal

**Objetivo:** preparar a fundação de dados para SPC, RTLS, wearables.

**Decisões a tomar (não tomar agora):**
- Timescale como extensão Postgres **ou** TSDB externo (Influx, VictoriaMetrics).
- Quantos *retention tiers* (mínimo 3: quente / morno / frio).
- Política de compressão por tabela.

**Flags propostas:**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_TIMESCALE_ENABLED` | `false` | Liga uso de hypertables (staging primeiro) |
| `IMPETUS_PARTITIONING_STRATEGY` | `none` | `none | monthly | weekly` |
| `IMPETUS_COLD_STORAGE_ENABLED` | `false` | Liga workers de cold storage |
| `IMPETUS_RETENTION_PROFILE` | `default` | Perfis nomeados (telemetry, audit, workflow, …) |

**Rollout:**
1. Decisão e PoC isolada em staging.
2. Hypertables **novas** apenas (nada de converter tabelas em produção na primeira fase).
3. Migração de telemetria recente para hypertable nova com *dual write* por janela curta.
4. *Continuous aggregates* habilitados após 7 dias estáveis.
5. Cold storage tier ativado por *tenant-opt-in*.

**Fallback:** flags *off* mantêm Postgres puro; hypertables novas não afetam tabelas legadas.

**Critérios de saída:** 30 dias com hypertable nova em staging sem incidentes; medição de ganho de query ≥ 5×.

---

### 3.4 Wave 4 — AI context budget

**Objetivo:** garantir que a IA escala com 4 domínios densos sem saturar.

**Flags propostas:**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_AI_CONTEXT_BUDGET_ENABLED` | `false` (sobe para `true` após validação) | Aplica budgets por persona/tenant/módulo |
| `IMPETUS_AI_SUMMARIZER_ENABLED` | `false` | Liga summarization engine |
| `IMPETUS_AI_AUTOLOOP_GUARD` | `true` | Bloqueia auto-prompting reentrante |
| `IMPETUS_AI_TOKEN_QUOTA_PER_TENANT` | (default por env) | Quota agregada por tenant/24h |

**Rollout:**
1. Métricas: medir hoje (`tokens/call` por tenant e persona).
2. Definir budgets via percentil 90 + folga 30 %.
3. Summarizer entra em *passive mode* — gera *facts* mas IA ainda consome legado.
4. Cutover gradual por persona (operador → supervisor → gerente → diretor).

**Fallback:** flag *off* devolve comportamento atual; *autoloop guard* permanece sempre on (proteção universal).

**Critérios de saída:** redução média ≥ 30 % de tokens/call sem queda de qualidade percebida (medida via thumbs e divergência de respostas).

---

### 3.5 Wave 5 — bounded contexts

**Objetivo:** evitar acoplamento antes de adicionar 4 domínios densos.

**Flags propostas:** nenhuma de runtime; mudança é **estrutural** (build/lint/CODEOWNERS).

**Rollout:**
1. Criar `backend/src/domains/<nome>/` vazios + `README.md` + ACL placeholder.
2. Mover *contracts* já existentes (`qualityIntelligenceService` etc.) para o domínio sem mudar comportamento — wrappers de compatibilidade nos *call sites*.
3. Promover `eventPipeline/`, `shared/` a workspaces internos.
4. CODEOWNERS por domínio.
5. Lint rule: `no-cross-domain-import` (avisa, depois falha CI).

**Fallback:** reverter wrappers; código antigo permanece intacto.

**Critérios de saída:** zero imports cross-domain fora de ACLs; CI verde com regra ativa.

---

### 3.6 Wave 6 — frontend enterprise

**Objetivo:** preparar UX para a explosão de domínios e dispositivos.

**Flags propostas:**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_FRONTEND_LAZY_DOMAINS` | `true` | Lazy-load por domínio |
| `IMPETUS_FRONTEND_OFFLINE_MODE` | `false` | Liga IndexedDB + sync queue |
| `IMPETUS_FRONTEND_DUAL_LAYER` | `true` | Habilita UI operacional vs gestão |
| `IMPETUS_REALTIME_SINGLE_CHANNEL` | `true` | Um canal Socket.io por sessão |

**Rollout:** lazy → dual layer → offline (último, mais arriscado).

**Fallback:** flags *off* devolvem rotas tradicionais.

**Critérios de saída:** bundle inicial ≤ 350 KB gzip; tempo até *interactive* < 3 s em 3G simulado.

---

### 3.7 Wave 7 — governance/security

**Objetivo:** ABAC por workflow + auditoria industrial + LGPD industrial.

**Flags propostas:**

| Flag | Default | Função |
|---|---|---|
| `IMPETUS_WORKFLOW_ABAC_ENABLED` | `false` | Liga ABAC por workflow |
| `IMPETUS_INDUSTRIAL_AUDIT_LEDGER` | `false` | Liga ledger industrial estendido |
| `IMPETUS_DSAR_PIPELINE_ENABLED` | `false` | Liga exportador LGPD |
| `IMPETUS_WEARABLE_PII_ENCRYPTION` | `true` (preventivo) | Cifragem em coluna para PII biométrico |

---

## 4. Rollout strategy global

### 4.1 Tipos de rollout aceites

| Tipo | Uso |
|---|---|
| **Shadow** | Subsistema novo corre em paralelo, mede divergência, não age. |
| **Per-tenant pilot** | Um tenant de baixo risco (interno/staging-tenant) recebe a feature antes dos outros. |
| **Per-plant pilot** | Quando aplicável, uma planta dentro do tenant é o piloto. |
| **Per-domain rollout** | Liga domínio a domínio (ex.: Qualidade primeiro). |
| **Per-percentage rollout** | Apenas X % dos *callers* recebem (raro; só após shadow estável). |
| **Big-bang** | **Proibido nesta fase.** |

### 4.2 Fluxo padrão por feature

```
1. Especificação (este documento) ───────► aprovada
2. Implementação (PRs aditivos, flag default off) ───────► CI verde
3. Deploy (flag off) ───────► smoke tests
4. Shadow (flag on, sem efeito) ───────► 7 dias de métricas
5. Pilot tenant (interno) ───────► 7 dias
6. Pilot tenants reais (1–3) ───────► 14 dias
7. Promoção gradual ───────► 30 % → 50 % → 100 %
8. Cleanup ───────► flag default-on, depois remoção do toggle
```

### 4.3 Governance de promoção

- Cada promoção exige aprovação de pelo menos um *internal_admin* e registro em `ai_decision_logs` ou `feature_promotion_audit` (a criar).
- Promoções de autoridade (`pipelineAuthorityConsolidation`, `cognitiveAuthorityRouter`) exigem **dupla aprovação**.
- Cada promoção tem **plano de rollback escrito** anexado.

---

## 5. Feature flag strategy consolidada

| Categoria | Padrão de naming | Default |
|---|---|---|
| Backbone | `IMPETUS_INDUSTRIAL_<feature>_<state>` | `false` |
| Observabilidade | `IMPETUS_OTEL_*`, `IMPETUS_PROMETHEUS_*` | `false` |
| Storage | `IMPETUS_TIMESCALE_*`, `IMPETUS_PARTITION*`, `IMPETUS_COLD_*` | `false` |
| IA | `IMPETUS_AI_<feature>` | `false` exceto guards (default `true`) |
| Frontend | `IMPETUS_FRONTEND_*` | maioria `true` para ganhos de UX, `false` para offline |
| Governance | `IMPETUS_WORKFLOW_ABAC_*`, `IMPETUS_INDUSTRIAL_AUDIT_*`, `IMPETUS_DSAR_*` | `false` |

Todas registadas em `featureGovernanceService` no boot, com validação de dependências (ex.: `IMPETUS_AI_SUMMARIZER_ENABLED=true` sem `IMPETUS_INDUSTRIAL_EVENTS_ENABLED=true` ⇒ WARN).

---

## 6. Estratégia de fallback (universal)

Para cada Wave:

| Camada | Fallback |
|---|---|
| Flag | Desligar imediatamente (instant rollback). |
| Migration | Migration de rollback gerada por defeito; idempotente. |
| Schema | Mudanças sempre aditivas; reversão = `DROP` ou marcação como deprecada. |
| Worker | Drain explícito + *kill switch*. |
| Pipeline | Modo `shadow` é o fallback natural para *partial_authority* / *full_authority*. |
| IA | Permanece em modo legado se budget service falhar (degradação graciosa). |
| Frontend | Toggle de lazy/offline; *route fallback* para versão clássica. |

---

## 7. Estimativas globais (sprints de 2 semanas)

| Wave | Sprints | Pessoas-chave |
|---|---|---|
| W1 — backbone | 3–4 | 2 backend |
| W2 — observabilidade | 2 | 1 backend + 1 SRE |
| W3 — storage temporal | 3 | 1 DBA + 1 backend |
| W4 — AI context budget | 2 | 1 backend + 1 ML/AI engineer |
| W5 — bounded contexts | 3 | 1 arquiteto + 1 backend |
| W6 — frontend enterprise | 3 | 2 frontend |
| W7 — governance | 1–2 (contínuo) | 1 backend + 1 segurança |
| **Total** | **17–19 sprints** | **~6–8 meses calendar com sobreposições** |

Antes da Wave 8 (módulos industriais), recomenda-se **um sprint inteiro de *readiness gate*** com testes de carga, *chaos drills* e *DR drills*.

---

## 8. Readiness Gate antes dos módulos industriais

Checklist obrigatório (todos verdes antes de começar Qualidade):

- [ ] Backbone com catálogo + outbox + DLQ + replay shadow estável ≥ 30 dias.
- [ ] Tracing distribuído operacional (OTLP exportando para coletor).
- [ ] SLO panel com 5 SLOs críticos verdes ≥ 14 dias.
- [ ] Piloto Timescale em staging com agregados contínuos provados.
- [ ] AI context budget on por persona, com tokens/call -30 %.
- [ ] Topologia `domains/*` criada com lint rule ativa.
- [ ] CI inclui testes de divergência shadow.
- [ ] *Chaos drill* de DLQ overflow executado.
- [ ] *DR drill* de Postgres failover executado.
- [ ] *Runbook* de cada Wave revisto.

---

## 9. Ordem cronológica recomendada para os módulos industriais (após gate)

1. **Qualidade** — alto ROI imediato, baixo risco regulatório agudo, alimenta IA com facts estruturados.
2. **Logística** — segundo ROI mais alto; OTIF e FEFO já são *quick-wins*; integra com qualidade (rastreabilidade).
3. **Ambiental** — exigência crescente; MTR/CDF + GEE são "compliance moats"; depende da maturidade do storage temporal.
4. **SST** — maior risco regulatório, maior peso emocional, exige LGPD industrial maduro (wearables); o último por dependência da W7.

Esta ordem está alinhada com o resultado do `enterprise-industrial-modules-impact-audit`.

---

## 10. Riscos do roadmap (resumo; detalhe em `enterprise-industrial-risk-matrix.md`)

- **Subestimar storage temporal** → mitigado pela Wave 3 dedicada.
- **AI saturada** → mitigado pela Wave 4 com summarizer + budgets.
- **Acoplamento cross-domain** → mitigado pela Wave 5 com lint + CODEOWNERS.
- **Promoção prematura de autoridade do pipeline** → mitigado pela política de dupla aprovação + critérios de saída quantitativos.
- **Atraso por gold-plating arquitetural** → mitigado por flags default *off* e shadow rápido.
- **Equipa sobrecarregada** → mitigado por waves paralelas onde possível (W1 + W2; W5 + W6).

---

## 11. Conclusão operacional

Este roadmap entrega o que o plano mestre promete: **um caminho enterprise sustentável**, sem big-bang, sem regressões, sem dívida cognitiva escondida. Cada Wave é independente o suficiente para parar e reavaliar; cada flag é reversível; cada migration é aditiva. Em 6–8 meses, o Impetus terá o **runtime industrial real** que os módulos exigem — e somente então o desenvolvimento de Qualidade, Logística, Ambiental e SST começa em terreno firme.

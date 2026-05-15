# Plano Mestre de Evolução Enterprise — preparação estrutural do Impetus

> **Modo:** documento estratégico, arquitetural, incremental e enterprise-grade.
> **Restrição absoluta:** ZERO breaking changes, ZERO alterações destrutivas, ZERO modificações de runtime nesta fase.
> **Objetivo:** preparar o ecossistema Impetus para suportar com segurança, escalabilidade e estabilidade os futuros módulos industriais (Qualidade, SST/EHS, Ambiental, Logística/WMS/TMS) — **sem** implementá-los nesta etapa.

---

## 0. Princípios reguladores da evolução

| Princípio | Tradução prática |
|---|---|
| **Aditivo, nunca destrutivo** | Toda nova capacidade nasce em paralelo aos serviços existentes; nenhum serviço atual é substituído enquanto o novo não estiver provado em shadow. |
| **Shadow-first** | Cada novo subsistema (backbone, storage temporal, context budget) corre em modo *observe*/*shadow* antes de qualquer autoridade efetiva sobre o runtime. |
| **Feature-flagged por defeito** | Cada evolução tem uma flag dedicada com default seguro (em geral *off* ou *shadow*) e governada via `featureGovernanceService`. |
| **Bounded contexts** | Cada novo domínio operacional (Qualidade, SST, Ambiental, Logística) é desenhado como contexto isolado com contratos explícitos — não monólito interno. |
| **Multi-tenant safe** | Toda nova entidade, fila, índice e métrica nasce particionável por `company_id` (mesmo que a partição ativa só apareça em fase posterior). |
| **Rollback-safe** | Cada mudança traz a sua reversão (flag *off*, migration de rollback, drain de fila). |
| **Observável e auditável** | Nada entra em produção sem correlation id, métrica, log estruturado e — onde aplicável — registo imutável. |
| **Cognitivamente sustentável** | A IA recebe contexto **summarizado e bounded**; *jamais* dump bruto de telemetria/SPC/RTLS. |

---

## 1. Estado atual relevante (linha de base, evidência do repositório)

A evolução parte de um runtime já maduro. Os blocos abaixo já existem e devem ser **preservados intactos** — a evolução acontece **em torno** deles, não **em cima** deles:

- **Pipeline unificado operacional** — `backend/src/services/operational/unifiedOperationalPipeline.js` (estágios `communication → ingestion → cognition → governance → orchestration → assistance → reminder → execution → audit → replay`).
- **Event pipeline** — `backend/src/eventPipeline/` (envelope canónico com `EVENT_TYPES = ['chat_message','sensor_alert','task_update','external_data','system_health_snapshot']`, *in-process bus* com 3 prioridades, modo shadow gated por `IMPETUS_EVENT_PIPELINE_SHADOW`).
- **Contextual modules** — `backend/src/contextualModules/` (registry declarativo com categorias `quality | environment | safety | hr | operational | financial | …`, flags `off | shadow | enrich | replace`, *circuit breaker per-tenant* opt-in).
- **Densidade operacional** — `backend/src/services/operational/operationalDensityAdapters.js` (adapters `plc`, `erp`, `telemetry`, `quality`).
- **Camada enterprise** — `backend/src/services/enterprise/` (`pipelineAuthorityConsolidation`, `cognitiveAuthorityRouter`, `cognitivePressureService`, `eventPipelineAuthorityService`, `enterpriseObservabilityService`).
- **Observabilidade interna** — `enterpriseObservabilityRuntime.js` (traces in-memory OpenTelemetry-like, métricas estilo Prometheus, retenção configurável).
- **Hardening recente** — `internalRouteGuard`, `tenantIsolationGuard`, `correlationId`, `featureGovernanceService`, `migrationGovernanceService`, `auditOutboxService`, `authorityResolutionService` (ver `ENTERPRISE_HARDENING_REMEDIATION_REPORT.md`).
- **Auditoria imutável** — triggers `IMPETUS_AUDIT_IMMUTABLE` aplicados a `ai_decision_logs` e `support_recovery_audit_events`.

Estes pilares já oferecem uma base sólida: **a evolução enterprise é uma extensão deles, não uma reescrita**.

---

## 2. Fase 1 — evolução do backbone de eventos

### 2.1 O que existe hoje
- Envelope canónico (`backend/src/eventPipeline/envelope.js`) com `EVENT_TYPES` fechado, `priority ∈ {high, medium, low}`, validação `zod` *strict*.
- *In-memory adapter* com 3 filas e *drain* por `setImmediate` (medium) e `setInterval` (low).
- Modo *shadow* (`IMPETUS_EVENT_PIPELINE_SHADOW=true`) com handlers NOOP, sem auditoria DB; *bootstrap* via `eventPipelineBootstrapService.bootIfEnabled()`.
- Camada de **autoridade** (`pipelineAuthorityConsolidation`) com 5 modos `observe → shadow → assist → partial_authority → full_authority` (default seguro: `shadow`).

### 2.2 O que precisa nascer (sem alterar o que existe)

| Capacidade | Forma aditiva proposta |
|---|---|
| **Taxonomia industrial de eventos** | Vocabulário canónico hierárquico `<domain>.<entity>.<verb>` (ex.: `quality.ncr.opened`, `quality.spc.sample_recorded`, `safety.permit.issued`, `safety.loto.applied`, `env.emission.snapshot`, `env.waste.shipment`, `logistics.wave.started`, `logistics.dock.assigned`). Registado num **catálogo declarativo** análogo ao `moduleRegistry`. |
| **Versionamento de contratos** | Campo `schema_version` no envelope (ex.: `quality.ncr.opened.v1`); compatibilidade *backward* obrigatória; *deprecation window* explícita por evento. |
| **Segmentação por domínio** | Sub-buses lógicos `quality`, `safety`, `env`, `logistics` — implementados como *subjects* dentro do mesmo bus (ou *streams* no futuro broker). Cada domínio publica/consome via *namespace*. |
| **Correlation IDs end-to-end** | Já há `correlationIdMiddleware`; falta **propagação no envelope** (`correlation_id`, `causation_id`, `trace_id`) e nos *workers* dos novos domínios. |
| **Replay industrial** | *Outbox table* `industrial_event_outbox` (aditiva) com `idempotency_key`, `partition_key=company_id`, `attempts`, `status`. *Replay worker* lê *outbox* e reentrega para *handlers* específicos (não para o bus principal). |
| **Retention & DLQ** | `industrial_event_dlq` para eventos com falha permanente (após N retries); TTL configurável por domínio. |
| **Backpressure & throttling** | Quotas por `company_id` × domínio (ex.: máx N eventos/s) — primeiro em modo *observe* (mede e alerta), depois em *enforce*. |
| **Event summarization** | *Summarizer* que produz *facts* compactos para o cognitive layer (ex.: 1.000 amostras SPC → 1 fact agregado “processo X: Cp=1.30, fora de controle 2× nas últimas 24 h”). |
| **Pipeline partitioning** | Particionamento por `(company_id, domain)`; nenhum *handler* vê eventos cross-tenant nem cross-domain por acidente. |

### 2.3 Avaliação de broker / streaming

> Decisão **não** é tomada agora. É **roadmap**. Mas a recomendação técnica fundamentada é:

| Tecnologia | Adequação | Comentário |
|---|---|---|
| **Outbox + cron worker (Postgres)** | ✅ Fase 1 | Zero infra nova; já existe padrão `auditOutboxService`. Suporta *replay* e *idempotency*. **Recomendado como primeiro passo.** |
| **Redis Streams** | ✅ Fase 2 | Quando Redis entrar para cache distribuído e *circuit breakers* externos (ver hardening report); ótimo para *streams* de baixa latência e *consumer groups*. **Recomendado para horizonte 6–12 meses.** |
| **NATS JetStream** | 🟡 Fase 3 | Excelente *throughput*/latência, *subjects* hierárquicos casam com a taxonomia. Considerar se IoT/RTLS crescer. |
| **Kafka** | 🟡 Fase 3+ | Recomendado **apenas** quando houver múltiplas plantas com telemetria contínua e necessidade de retenção longa + *replay* histórico. Custo operacional alto. |
| **RabbitMQ** | 🟠 Fase 3 | Adequado para *workflows* longos (CAPA, LOTO) com confirmação; menos adequado para *streaming* denso. |
| **Híbrido** | ✅ Fase 2–3 | Outbox (Postgres) para domínio operacional + Redis Streams para realtime + Kafka/NATS para telemetria massiva. |

**Política recomendada:** o backbone permanece **logicamente único** (mesma taxonomia, mesmo envelope, mesmo correlation id) — apenas o *transport* muda por fase.

### 2.4 Governance do backbone

- Modo de autoridade do pipeline mantém-se em `shadow` até **cobertura ≥ 95 %** de testes de divergência (decisão do pipeline = decisão do runtime atual) por **2 semanas** sem alertas críticos.
- *Kill switch* global e per-domínio (já há `eventPipelineAuthorityService._killSwitchState`).
- Promoção de modo é manual e auditada (`ai_decision_logs` ou tabela equivalente imutável).

---

## 3. Fase 2 — evolução do storage e banco de dados

### 3.1 Diagnóstico
- Postgres atual é o *system of record* para tudo, incluindo `eventos_empresa`, `operational_alerts`, `operational_insights`, `ai_decision_logs`.
- Não há **particionamento por tempo** ativo nas tabelas operacionais (verificado via lista de migrations em `backend/src/models/`).
- Não há TSDB. Telemetria atual é leve; SPC/RTLS/wearables explodirão a cardinalidade.

### 3.2 Estratégia por classe de dado

| Classe | Volume esperado | Estratégia recomendada |
|---|---|---|
| **Eventos de domínio** (NCR, CAPA, PT, MTR, expedição) | Milhares/dia/tenant | Postgres particionado por `(company_id, mês)`; índices BRIN por tempo, B-tree por `company_id, entity_id`. |
| **Telemetria** (PLC, sensores, RTLS) | Milhões/dia/tenant | **TimescaleDB hypertables** sob o mesmo Postgres (extensão), com *continuous aggregates* (1 min, 5 min, 1 h) e *compression policy* (após 7 dias). Alternativa futura: TSDB dedicado (Influx/VictoriaMetrics) se SLA exigir. |
| **SPC samples** | Centenas de milhares/dia | Hypertable Timescale ou tabela particionada com retenção quente curta (90 dias) + agregados frios (anos). |
| **Wearables / IoT pessoal** | Variável, sensível | Hypertable Timescale + cifragem em coluna + retenção curta + anonimização agressiva (LGPD). |
| **Checklists / inspeções** | Dezenas de milhares/dia/tenant | Postgres normal com índices funcionais (jsonb) + cold storage após 12 meses. |
| **Auditoria imutável** | Linear, append-only | Mantém `ai_decision_logs` + extensão para `industrial_audit_ledger`; triggers de imutabilidade já existem. |
| **Anexos (fotos, evidências, assinaturas)** | Pesado em bytes | Object storage externo (S3-compatível) + tabela Postgres apenas com metadados/URI/hash. **Não armazenar binários no Postgres.** |

### 3.3 Plano de evolução temporal

1. **Preparação (sem migração):** auditar tabelas candidatas a particionamento; rascunhar *partition schema* e *retention policies* sem aplicar.
2. **Habilitar extensão Timescale (opt-in):** em ambiente *staging* primeiro; *hypertables* novas, **nunca** converter tabelas críticas existentes na primeira passada.
3. **Cold storage tier:** tabela auxiliar `*_cold` ou *Postgres logical replica* com retenção longa + compressão; *workers* migram dados antigos.
4. **Snapshotting / archival:** *dump* periódico (LGPD-safe, com PII removida) para object storage; *catalogo de snapshots* num índice consultável.

### 3.4 Política de retenção (rascunho)

| Dado | Quente (acesso < 100 ms) | Morno (acesso < 1 s) | Frio (archival) |
|---|---|---|---|
| Telemetria PLC | 7 dias | 90 dias agregados | 5+ anos comprimido |
| SPC | 90 dias | 2 anos agregados | 10 anos (regulado) |
| NCR/CAPA | enquanto aberto | 2 anos | 10 anos (qualidade) |
| MTR/CDF | enquanto aberto | 2 anos | 20 anos (ambiental) |
| Wearables (HR, posição) | 30 dias | 6 meses (agregados) | LGPD-aware: anonimização ou expurgo |
| Auditoria imutável | sempre | sempre | sempre (legal) |

### 3.5 Throughput esperado (ordem de grandeza)

| Categoria | Por tenant médio | Por tenant grande |
|---|---|---|
| Eventos de domínio | ~10–100/min | ~1.000/min |
| Telemetria | ~1k/min | ~100k/min |
| Wearables (~10 operadores) | ~100/min | ~10k/min |

Conclusão: Postgres puro é adequado para domínio; **telemetria exige hypertables ou TSDB**. Decisão final só após piloto.

---

## 4. Fase 3 — governança de contexto da IA

### 4.1 Problema
A IA atual já recebe contexto através do `cognitiveOrchestrator`, `cognitivePressureService` e `operationalMemoryBindingService`. Com 4 novos domínios densos, o risco é claro: **token explosion + saturation + hallucination em FMEA/CAPA/PT**.

### 4.2 Sistema proposto (aditivo)

**`aiContextBudgetService`** (novo módulo a desenhar, **não a implementar agora**):

- **Context budget por persona** (operador, supervisor, gerente, diretor) — número máximo de *facts* injetados.
- **Context budget por tenant** — proteção contra prompt-bombing por tenant abusivo/anómalo.
- **Context budget por módulo** — Qualidade pode receber 30 facts SPC; SST recebe 10 facts de incidentes; etc.
- **Cognitive pressure feedback loop** — quando `cognitivePressureService` reportar saturação (já existe `_measureSaturation`), o budget contrai automaticamente.
- **Token governance** — *meter* de tokens por *call* IA, agregado por tenant; alerta a 80%, *throttle* a 100%.

### 4.3 Summarization engine

- **Fact compression:** transformar *raw events* em *facts* estáveis e curtos.
  - Exemplo: `quality.spc.sample_recorded` × 1.000 → `{process: 'P12', cp: 1.30, cpk: 1.10, out_of_control_24h: 2, trend: 'stable'}`.
- **Hierarchical summarization:** evento → janela curta (5 min) → janela média (1 h) → janela longa (24 h). IA consome a janela apropriada ao intent.
- **AI context segmentation:** mesmo prompt, dois envelopes — *facts duros* (números) + *narrativa contextual* (texto curto explicando significado).

### 4.4 Contratos de contexto por domínio

| Domínio | Facts típicos | Limite default | Frescor exigido |
|---|---|---|---|
| Qualidade | Cp/Cpk, NCRs abertas, CAPAs em atraso, Pareto top-N causas | 30 facts | < 1 h |
| SST | Acidentes 30d, near-miss 7d, PTs ativas, EPIs vencendo | 20 facts | < 24 h |
| Ambiental | Emissões diárias, % reciclagem, MTRs pendentes, água/efluentes | 20 facts | < 24 h |
| Logística | OTIF 7d, waves do dia, *dock occupancy*, FEFO em risco | 25 facts | < 15 min |

### 4.5 Anti-padrões a evitar

| Anti-padrão | Mitigação |
|---|---|
| Dump cru de telemetria no prompt | Sumarização obrigatória antes de qualquer chamada de IA. |
| Auto-prompting em loop (evento → IA → evento → IA) | *Cool-down* por entidade + *debouncer*; flag `IMPETUS_AI_AUTOLOOP_GUARD`. |
| Mistura de domínios sem necessidade | Segmentação por domínio no contrato de contexto; IA só recebe domínio relevante ao intent detectado. |
| Hallucination em normas (FMEA, ISO) | Modo *only-known-data*: prompt instrui a IA a citar apenas fontes internas ou recusar. |
| Drift por crescimento silencioso de tokens | *Monitor* de média de tokens/call por tenant; alerta a desvios >2σ. |

---

## 5. Fase 4 — bounded contexts enterprise

### 5.1 Topologia recomendada

```
backend/src/domains/
├── quality/           ← futuro (vazio agora)
│   ├── api/           (rotas HTTP)
│   ├── domain/        (entidades, value objects, regras)
│   ├── events/        (eventos publicados/consumidos)
│   ├── workflows/     (state machines: NCR lifecycle, CAPA lifecycle)
│   └── projections/   (read models para dashboards)
├── safety/
├── environment/
└── logistics/
```

Aditivo: existe hoje `routes/qualityIntelligence.js` + `services/qualityIntelligenceService.js` (parcial). Será **encapsulado**, não removido — o novo contexto importa o antigo internamente até deprecação suave.

### 5.2 Limites de domínio e contratos partilhados

| Tipo de contrato | Quem define | Onde mora |
|---|---|---|
| **Domain events** (publicados) | O domínio dono | `domains/<dom>/events/*.contract.json` (com schema) |
| **Read projections** (consumidas) | O domínio consumidor | `domains/<consumer>/projections/from_<producer>.js` |
| **Shared kernel** | Equipa de plataforma | `backend/src/shared/` (ex.: `tenant`, `correlation`, `time`, `units`) |
| **Anti-corruption layers (ACL)** | O consumidor | `domains/<consumer>/acl/<producer>_adapter.js` |

> **Regra de ouro:** nenhum domínio importa diretamente *services* de outro domínio. Toda dependência cruzada passa por *event* ou *ACL*.

### 5.3 Comunicação entre domínios

- **Síncrona (HTTP/RPC interno):** apenas para *read models* via ACL.
- **Assíncrona (eventos):** padrão para escrita/efeito secundário.
- **Nunca:** *joins* SQL atravessando schemas de domínios diferentes em produção. Para BI, *materialized views* explícitas.

### 5.4 Monorepo, modular monolith ou microsserviços?

| Opção | Verdict |
|---|---|
| **Monorepo modular monolith** (atual + bounded contexts) | ✅ **Recomendado para 18–24 meses.** Maior velocidade, menor custo operacional. *Bounded contexts* dão isolamento lógico sem fragmentar deploy. |
| **Packages internos (workspaces)** | ✅ Adoptar progressivamente para `shared/`, `eventPipeline/` e cada domínio — facilita publicação interna e versionamento. |
| **Microsserviços por domínio** | 🟡 Apenas quando uma das condições for verdadeira: SLA divergente, equipa dedicada, escala assimétrica. Não antes do piloto Qualidade + Logística estabilizar. |

---

## 6. Fase 5 — evolução da observabilidade

### 6.1 Capacidades a maturar

| Eixo | Estado atual | Evolução proposta |
|---|---|---|
| **Tracing distribuído** | Traces in-memory (`enterpriseObservabilityRuntime`) | Exportador OTLP opcional (gated por `IMPETUS_OTEL_EXPORTER_ENABLED`); compatível com Tempo, Jaeger, Datadog. |
| **Workflow tracing** | Ad-hoc | `workflow_id` propagado em eventos: NCR, CAPA, PT, LOTO, OTIF — tracing por *case-id* (estilo *Saga*). |
| **Métricas** | In-memory + alguns endpoints | Endpoint Prometheus `/metrics` (interno, gated); *cardinality budget* por tenant. |
| **Logs estruturados** | JSON em stdout | Manter; opcional *ship* para Loki/ELK via *side-car*. |
| **AI tracing** | `ai_decision_logs` | Espelhar campos OpenTelemetry (`trace_id`, `span_id`, `parent_span_id`) já presentes em correlation id. |
| **Saturation monitoring** | `cognitivePressureService` (parcial) | Painel dedicado: *queue lag*, *event lag*, *DLQ size*, *AI tokens/s*, *DB connections*, *pg_stat_statements top queries*. |
| **Realtime metrics** | Métricas globais | Métricas **por tenant** com *cardinality cap* (top-N tenants + bucket "others"). |

### 6.2 SLOs e SLIs (rascunho)

| Workflow | SLI | SLO |
|---|---|---|
| Login | latência p95 | < 800 ms |
| Dashboard inicial | latência p95 | < 1.5 s |
| IA conselho cognitivo | latência p95 | < 6 s |
| Evento operacional → ack | latência p95 | < 1 s |
| Replay de NCR / CAPA | sucesso | > 99,9 % |
| Pipeline shadow→divergência | divergência | < 1 % por 14 dias antes de promoção |
| Audit outbox | drain | 100 % em < 10 min |

### 6.3 Alertas críticos

- *DLQ* > 50 eventos em 5 min.
- *Event lag* > 30 s.
- *AI tokens* > 80 % do budget de um tenant.
- *Cognitive pressure* `alert_level = 'critical'`.
- *Migration lock* preso > 60 s.
- *DB pool saturation* > 90 %.

---

## 7. Fase 6 — evolução do frontend enterprise

### 7.1 Princípios

- **Dual-layer UI:**
  - **Operacional**: rotas curtas, *form-first*, offline-friendly, design *task-first*.
  - **Gestão**: dashboards, drill-down, exportação, IA narrativa.
- **Lazy loading por domínio:** *route chunks* `quality.*`, `safety.*`, `env.*`, `logistics.*`.
- **Modular routing:** o `App.jsx` consome um *registry* (espelho do backend `moduleRegistry`) para evitar listagem manual de rotas.
- **Menu scalability:** o contextual registry já existe; quando atingir > 50 entradas, adoptar agrupamento por *categoria* + *busca contextual*.
- **Realtime orchestration:** **um único** canal Socket.io por sessão, com *topics* (rooms) por *workflow_id* e por *company_id*. Nada de canais múltiplos por componente.

### 7.2 UX por persona

| Persona | Foco | Padrões obrigatórios |
|---|---|---|
| Operador | Coletar, executar, registar | Botão grande, voz/foto, validação local, offline cache (IndexedDB) |
| Inspetor | Checklists, fotos, assinaturas | Wizard linear, *required-fields* claros |
| Supervisor | KPIs do turno, exceções | Dashboards curtos com 3–5 KPIs |
| Coordenador/Gerente | Tendências, comparações | Filtros, exportação, drill-down |
| Diretor | Narrativa estratégica | IA narrativa + visão executiva (1 página) |

### 7.3 Riscos frontend e mitigações

| Risco | Mitigação |
|---|---|
| *Menu explosion* | Agrupamento + favoritos pessoais + *quick search* |
| Bundle bloat | Lazy load por domínio + análise *bundle analyzer* obrigatória |
| Saturação WebSocket | Canal único, *backoff* + reconect, *typing-throttling* |
| Offline em campo | IndexedDB + *sync queue* + UI clara de "pendente sincronizar" |
| *Mobile complexity* | UI separada `/m` (já existe) com componentes específicos |

---

## 8. Fase 7 — governança e segurança

### 8.1 Modelo de autorização recomendado

| Camada | Hoje | Evolução |
|---|---|---|
| **RBAC** | Roles fixas (`admin`, `gerente`, `colaborador`, `operador`, …) | Manter; *backend é fonte da verdade* (já reforçado no hardening). |
| **ABAC** | Capabilities + área/eixo | Estender com atributos de *workflow* (`workflow.role: 'reviewer'`, `workflow.signoff_required: true`). |
| **Contextual permissions** | `contextualModules` | Adicionar *capability* por **operação** (não só por módulo): `quality.ncr.open`, `quality.capa.close`, `safety.permit.sign`. |
| **Workflow permissions** | Implícito | Tornar explícito via *workflow capability matrix*. |

### 8.2 Auditoria, LGPD e compliance industrial

- **Imutabilidade** já aplicada a `ai_decision_logs` e `support_recovery_audit_events`. Estender (em fase futura, aditiva) a:
  - `quality_ncr_events`
  - `quality_capa_events`
  - `safety_permit_events`
  - `safety_incident_events`
  - `env_emission_records`
  - `logistics_dispatch_events`
- **LGPD industrial:**
  - Wearables / dados biométricos → coluna cifrada + retenção curta + finalidade explícita registada.
  - DSAR pipeline (Data Subject Access Request) — desenhado mas não implementado: *exporter* lê outbox + bases + arquivos.
- **Legal traceability:** correlation id obrigatório em toda transição de workflow regulado.

### 8.3 Risco de autoridade excessiva da IA

- IA **nunca** fecha NCR/CAPA/PT por si só nesta fase. Permanece *assistente*; assinaturas humanas obrigatórias.
- *Authority router* (`cognitiveAuthorityRouter`) permanece em modo conservador.
- Toda recomendação de IA carrega *trace* (origem dos dados, modelo, versão, tokens).

---

## 9. Cross-cutting — onde encaixar a evolução

| Capacidade transversal | Onde nasce | Onde toca |
|---|---|---|
| Industrial event catalog | `backend/src/eventPipeline/catalog/industrial.js` (futuro) | Todos os domínios |
| Industrial outbox + DLQ | `backend/src/services/eventOutboxService.js` (extensão do `auditOutboxService`) | Todos os domínios |
| AI context budget | `backend/src/services/aiContextBudgetService.js` (futuro) | `cognitiveOrchestrator`, gateways de IA |
| Workflow tracing | `backend/src/services/workflowTraceService.js` (futuro) | NCR/CAPA/PT/OTIF/etc. |
| Object storage SDK interno | `backend/src/services/objectStorageService.js` (futuro) | Anexos, evidências, exports |
| Industrial audit ledger | Migration aditiva (futura) | Todos os workflows regulados |

---

## 10. Resposta direta — checklist “estamos prontos?”

| Pergunta | Resposta honesta |
|---|---|
| 1. Impetus está pronto para esta evolução? | **Sim, para iniciá-la.** O runtime está estável, *hardened* e tem alicerces parciais (qualidade, logística, registry contextual, pipeline shadow). Não está pronto para *big-bang* dos 4 domínios. |
| 2. O que precisa amadurecer antes? | (a) **Backbone de eventos** (outbox industrial + catálogo + DLQ); (b) **storage temporal** (decisão Timescale vs Postgres particionado); (c) **context budget IA**; (d) **bounded contexts** estruturados; (e) **workflow tracing**. |
| 3. Riscos reais | Saturação de tokens IA; explosão de cardinalidade em telemetria; acoplamento por *shortcuts* entre domínios; auditoria silenciosa de evento crítico (mitigada pelo outbox já existente). |
| 4. Riscos aceitáveis | Latência ligeiramente maior em fluxos novos durante shadow; uso adicional de memória in-process pelos contadores de pressão; aumento moderado de tamanho de payload por correlation/causation ids. |
| 5. O que NÃO devemos fazer | Reescrever pipeline atual; converter tabelas em hypertables sem piloto; introduzir Kafka antes de Redis; deixar IA fechar workflows regulados; permitir cross-domain via *joins* SQL. |
| 6. O que seria perigoso | Ativar `pipelineAuthorityConsolidation: full_authority` antes de cobertura de divergência; remover flags de fallback; dump cru de SPC/RTLS no prompt IA; substituir tabelas operacionais sem janela de coexistência. |
| 7. Ordem mais segura | Backbone (outbox + catálogo) → Observabilidade (tracing por workflow) → Storage temporal (piloto Timescale opt-in) → AI context budget → Bounded contexts → Frontend modular. |
| 8. Ordem mais inteligente | A ordem segura é também a inteligente; ela maximiza ROI ao desbloquear Qualidade + Logística cedo (alto valor) antes de SST/Ambiental (alto risco legal, exige base maior). |
| 9. O que deve permanecer *bounded* | Autoridade do pipeline; autoridade da IA; capabilities por workflow; *cardinality budget* das métricas; tokens por tenant. |
| 10. Limite atual do runtime | *In-process bus*, Postgres único, métricas em memória, IA com contexto manual. Suporta SaaS atual; **não** suporta densidade industrial completa sem evolução. |
| 11. Suporta escala industrial enterprise? | **Não no estado atual**, **sim com este plano** executado em ordem. |
| 12. O que evoluir antes dos módulos? | Os itens da resposta 2. Sem eles, qualquer módulo industrial introduz dívida arquitetural significativa. |

---

## 11. O que **não** mudará nesta fase (garantias explícitas)

- Comportamento cognitivo do `cognitiveOrchestrator` permanece.
- `pipelineAuthorityConsolidation` permanece em `shadow`.
- `contextualModules` mantém *flags*, *defaults* e modos atuais (`off | shadow | enrich | replace`).
- Schemas atuais ficam intactos; eventuais migrations são *additive-only*.
- Nenhuma rota é removida nem reescrita.
- Nenhum *secret*, *feature flag* ou *endpoint* tem comportamento alterado por este documento.

---

## 12. Conclusão executiva

O Impetus **tem o esqueleto certo** — pipeline unificado, registry contextual, governance bounded, hardening enterprise — para receber Qualidade, SST, Ambiental e Logística. Falta-lhe **músculo de escala industrial**: *backbone de eventos com replay e DLQ*, *storage temporal*, *context budget da IA* e *bounded contexts formais*.

Este plano organiza essa evolução em fases **incrementais, aditivas, shadow-first e flag-gated**, sem qualquer perturbação ao runtime atual. Detalhamento de execução (ordem, dependências, *rollout*, *fallback*) está em `enterprise-runtime-evolution-roadmap.md`. Matriz de risco em `enterprise-industrial-risk-matrix.md`. Topologia técnica em `future-industrial-architecture-boundaries.md`.

> **Frase-guia:** “preparar a casa antes do mobiliário — fundações antes dos andares.”

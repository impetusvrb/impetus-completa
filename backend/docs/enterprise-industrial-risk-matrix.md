# Matriz de Riscos — Evolução Enterprise para Módulos Industriais

> Classificação: **LOW | MODERATE | HIGH | CRITICAL**.
> Cada risco traz: descrição, gatilho, mitigação **preventiva**, **fallback** (degradação), **rollback** (reverter) e **monitoramento** (como detectar antes da explosão).
> Documento associado a `enterprise-evolution-master-plan.md` e `enterprise-runtime-evolution-roadmap.md`.

---

## Tabela mestra — riscos por eixo

| # | Eixo | Risco | Severidade | Probabilidade | Janela | Donos |
|---|---|---|---|---|---|---|
| R01 | Backend | Backbone de eventos saturado por explosão de cardinalidade industrial | HIGH | MODERATE | Wave 1–3 | Backend + SRE |
| R02 | Backend | Outbox industrial cresce sem drain (DLQ overflow) | HIGH | MODERATE | Wave 1 | Backend + SRE |
| R03 | Backend | Acoplamento cross-domain por *shortcut* de import | HIGH | HIGH | Wave 5 | Arquitetura + CI |
| R04 | Backend | Race conditions em workflows críticos (NCR, CAPA, PT) | CRITICAL | LOW | Wave 1–4 | Backend |
| R05 | Backend | Migrations frágeis em ambiente multi-instância | HIGH | LOW (já mitigado) | Contínuo | Backend + DBA |
| R06 | Frontend | *Bundle bloat* com 4 novos domínios | MODERATE | HIGH | Wave 6 | Frontend |
| R07 | Frontend | Saturação WebSocket por múltiplos canais por componente | HIGH | MODERATE | Wave 6 | Frontend |
| R08 | Frontend | Offline-first introduzido sem sync queue robusta | HIGH | MODERATE | Wave 6 | Frontend |
| R09 | Frontend | UX confusa por *menu explosion* | MODERATE | HIGH | Wave 5–6 | Produto + UX |
| R10 | Database | Postgres não suportar telemetria/SPC/RTLS em produção | CRITICAL | HIGH (sem evolução) | Wave 3 | DBA |
| R11 | Database | Conversão de tabelas existentes em hypertables (perda de dados / lock longo) | CRITICAL | LOW (se piloto for seguido) | Wave 3 | DBA |
| R12 | Database | Cold storage com retenção mal definida (LGPD/legal) | HIGH | MODERATE | Wave 3 + 7 | DBA + Jurídico |
| R13 | Database | Write amplification por *materialized views* mal indexadas | HIGH | MODERATE | Wave 3 | DBA |
| R14 | Database | Anexos binários no Postgres saturando IO | HIGH | MODERATE | Wave 5–6 | DBA + Backend |
| R15 | Runtime | Promoção prematura de `pipelineAuthorityConsolidation` para *full_authority* | CRITICAL | LOW (com gate) | Wave 1–7 | Backend + Produto |
| R16 | Runtime | *Replay storm* (replay incorreto reentregando eventos) | HIGH | LOW | Wave 1 | Backend |
| R17 | Runtime | Graceful shutdown insuficiente para workers industriais | HIGH | LOW (já mitigado) | Contínuo | Backend |
| R18 | Governance | RBAC simples não cobre workflows industriais | HIGH | HIGH | Wave 7 | Backend + Segurança |
| R19 | Governance | Auditoria silenciosa de evento crítico industrial | CRITICAL | LOW (já mitigado pelo outbox) | Contínuo | Backend |
| R20 | Governance | Imutabilidade não estendida a tabelas industriais futuras | HIGH | MODERATE | Wave 7 | Backend |
| R21 | Governance | LGPD industrial frágil (wearables/biométrico) | CRITICAL | MODERATE | Wave 7 | Backend + Jurídico |
| R22 | AI Saturation | Token blowup com 4 domínios densos no prompt | CRITICAL | HIGH (sem W4) | Wave 4 | AI engineer + Backend |
| R23 | AI Saturation | *Loop cognitivo* (evento → IA → ação → evento → IA) | HIGH | MODERATE | Wave 1 + 4 | AI engineer |
| R24 | AI Saturation | Hallucination em normas técnicas (FMEA, ISO 14001, ISO 45001) | CRITICAL | HIGH (sem guardrails) | Wave 4 | AI engineer + Especialista |
| R25 | AI Saturation | Drift por crescimento silencioso de tokens/call | MODERATE | HIGH | Contínuo | AI engineer |
| R26 | Observability | Cardinalidade explodida das métricas por tenant × domínio × workflow | HIGH | HIGH | Wave 2 | SRE |
| R27 | Observability | Trace span órfão por correlation id quebrado em pontos legados | MODERATE | MODERATE | Wave 1–2 | Backend |
| R28 | Observability | Custos de Datadog/observability vendor explodirem | HIGH | MODERATE | Wave 2+ | SRE + Financeiro |
| R29 | Multi-tenant | Vazamento cross-tenant em *event handler* novo | CRITICAL | LOW (com tenantIsolationGuard) | Wave 1–7 | Backend |
| R30 | Multi-tenant | Tenant ruidoso degradando outros (noisy neighbor) | HIGH | HIGH | Wave 1–3 | Backend + SRE |
| R31 | Multi-tenant | Circuit breaker global derruba todos por falha de um | HIGH | MODERATE (mitigado por per-tenant flag) | Contínuo | Backend |
| R32 | Operational | Equipa pequena absorvendo 7 waves em paralelo | HIGH | HIGH | Todo o horizonte | Liderança |
| R33 | Operational | Falta de runbook para incidentes industriais | HIGH | MODERATE | Wave 2+ | SRE |
| R34 | Operational | Dependência de fornecedor único (cloud, broker) | MODERATE | MODERATE | Wave 3+ | Infra |
| R35 | Scalability | Crescimento exponencial de tenants antes da W3 concluir | CRITICAL | MODERATE | Externo | Comercial + Produto |
| R36 | Scalability | IoT massivo (RTLS, wearables) chega antes do storage temporal | CRITICAL | MODERATE | Wave 3 | Produto + DBA |

---

## Detalhamento risco a risco

### R01 — Backbone saturado por cardinalidade industrial
- **Gatilho:** ingestão sem catálogo + summarizer.
- **Mitigação:** catálogo declarativo, *throttling per-tenant*, *summarization engine*, particionamento por domínio.
- **Fallback:** *backpressure* devolve `429` ao publisher; eventos passam para *low priority queue*; ack assíncrono.
- **Rollback:** flag `IMPETUS_INDUSTRIAL_EVENTS_ENABLED=false`.
- **Monitoramento:** *event lag* (p95), *DLQ size*, taxa de eventos/s por tenant.

### R02 — Outbox industrial sem drain (DLQ overflow)
- **Gatilho:** worker travado ou retry exponencial mal configurado.
- **Mitigação:** *retry com backoff* + máx tentativas + DLQ + alerta antes do limite.
- **Fallback:** evento permanece em outbox; alarmes; *replay* manual via tooling interno.
- **Rollback:** parar worker; *drain* manual; *re-enqueue*.
- **Monitoramento:** *DLQ size*, *outbox lag*, *retry count*.

### R03 — Acoplamento cross-domain
- **Gatilho:** PR que importa diretamente serviço de outro domínio.
- **Mitigação:** lint rule `no-cross-domain-import` + CODEOWNERS + ACL obrigatório.
- **Fallback:** revisão arquitetural bloqueia merge.
- **Rollback:** refactor para ACL.
- **Monitoramento:** CI fail count, *PR review checklist*.

### R04 — Race conditions em workflows críticos
- **Gatilho:** dois usuários atuando no mesmo NCR/CAPA/PT.
- **Mitigação:** *atomic claim* (`UPDATE … WHERE status=… RETURNING`) — padrão já provado em `supportRecoveryGovernanceService`.
- **Fallback:** transição rejeitada com 409; UI mostra "estado mudou; recarregar".
- **Rollback:** mudança de estado revertida via *compensating event*.
- **Monitoramento:** contador de conflitos 409 por workflow.

### R05 — Migrations frágeis multi-instância
- **Gatilho:** dois pods aplicando migration simultânea.
- **Mitigação:** já mitigado via `migrationGovernanceService` com `pg_advisory_lock` global.
- **Fallback:** segundo runner aborta limpamente.
- **Rollback:** migration de rollback dedicada.
- **Monitoramento:** logs `[MIGRATION_LOCK]`.

### R06 — Bundle bloat
- **Gatilho:** import síncrono de todos domínios.
- **Mitigação:** lazy load por domínio, *bundle analyzer* em CI, orçamento (350 KB gzip inicial).
- **Fallback:** *route-level code splitting* automático.
- **Rollback:** *vendor chunking* + análise pontual.
- **Monitoramento:** *bundle size budget* falha CI ao exceder.

### R07 — Saturação WebSocket
- **Gatilho:** múltiplos componentes abrindo sockets próprios.
- **Mitigação:** canal único + *rooms* por workflow; já há padrão em `useChatSocket.js`.
- **Fallback:** *backoff* + degradar para *polling*.
- **Rollback:** reverter para canais separados (flag).
- **Monitoramento:** *connections count* por usuário, *throughput* por canal.

### R08 — Offline sem sync queue robusta
- **Gatilho:** operador grava dado offline, sincroniza em duplicidade.
- **Mitigação:** *client UUID* + *idempotency key* + outbox local IndexedDB.
- **Fallback:** UI mostra "pendente"; impede duplicar até sincronizar.
- **Rollback:** flag `IMPETUS_FRONTEND_OFFLINE_MODE=false`.
- **Monitoramento:** *sync queue size*, *duplicate detection count*.

### R09 — *Menu explosion*
- **Gatilho:** > 50 entradas no menu lateral.
- **Mitigação:** agrupamento por categoria, favoritos, busca contextual.
- **Fallback:** "menu compacto" como default em mobile.
- **Rollback:** voltar a estrutura plana via flag.
- **Monitoramento:** UX feedback, *time-to-first-click*.

### R10 — Postgres não suporta densidade industrial
- **Gatilho:** SPC/RTLS/wearables ingeridos sem TSDB.
- **Mitigação:** Wave 3 (Timescale opt-in) + summarizer + agregados.
- **Fallback:** *backpressure* + ingest seletivo (amostragem) até evolução.
- **Rollback:** desligar adapters de telemetria por tenant (flag).
- **Monitoramento:** queries lentas (`pg_stat_statements`), tamanho de tabelas, IOPS.

### R11 — Conversão destrutiva de tabelas em hypertables
- **Gatilho:** `create_hypertable('big_legacy_table')` em produção.
- **Mitigação:** **proibido**: hypertables apenas para tabelas **novas** na primeira fase; *dual write* para migrar.
- **Fallback:** N/A (não se faz).
- **Rollback:** *backup* prévio + *point-in-time recovery*.
- **Monitoramento:** revisão obrigatória de toda migration que mencione Timescale.

### R12 — Retenção mal definida (LGPD/legal)
- **Gatilho:** dados pessoais retidos além do necessário.
- **Mitigação:** *retention profiles* nomeados + revisão jurídica por domínio.
- **Fallback:** *purge job* manual via runbook.
- **Rollback:** restaurar de archival se purga for indevida.
- **Monitoramento:** auditoria periódica de tabelas com PII.

### R13 — Write amplification por *views materializadas*
- **Gatilho:** muitas MVs refresh-on-write.
- **Mitigação:** *continuous aggregates* (Timescale) ou *incremental* MVs; revisar custo de refresh.
- **Fallback:** desligar MV problemática.
- **Rollback:** drop MV.
- **Monitoramento:** *write IOPS* + *MV refresh duration*.

### R14 — Anexos binários no Postgres
- **Gatilho:** salvar fotos, PDFs, assinaturas em coluna `bytea`.
- **Mitigação:** **regra**: binários vão para object storage (S3-compat); Postgres só guarda URI + hash + metadata.
- **Fallback:** *streaming* via signed URLs.
- **Rollback:** migrar binários atuais para object storage progressivamente.
- **Monitoramento:** tamanho médio de linhas, top-N tabelas por tamanho.

### R15 — Promoção prematura de autoridade do pipeline
- **Gatilho:** mudança apressada para `partial_authority`/`full_authority`.
- **Mitigação:** gate quantitativo (divergência < 1 %, 14 dias) + dupla aprovação + audit log.
- **Fallback:** voltar a `shadow` imediatamente.
- **Rollback:** flag + kill switch.
- **Monitoramento:** taxa de divergência shadow vs runtime; *alert level* do `cognitivePressureService`.

### R16 — Replay storm
- **Gatilho:** replay sem *idempotency key* ou sem janela limitada.
- **Mitigação:** *idempotency key* obrigatória + janela máxima + dry-run mode antes de execute.
- **Fallback:** *kill switch* do replay worker.
- **Rollback:** *flag off* + drain.
- **Monitoramento:** *replay rate*, *idempotency hit ratio*.

### R17 — Graceful shutdown insuficiente
- **Gatilho:** SIGTERM derruba workers no meio de transação.
- **Mitigação:** já mitigado no hardening; estender padrão aos novos workers.
- **Fallback:** transação revertida; retry pelo outbox.
- **Rollback:** N/A.
- **Monitoramento:** *shutdown duration* (deve estar < watchdog 12 s).

### R18 — RBAC simples insuficiente para workflows industriais
- **Gatilho:** "assinou PT mas não tinha autoridade" / "fechou CAPA sem revisão".
- **Mitigação:** Wave 7 — *workflow capability matrix* + ABAC por estado.
- **Fallback:** workflow exige assinatura humana adicional.
- **Rollback:** desligar ABAC e voltar a RBAC simples (flag).
- **Monitoramento:** rejeições por capability ausente; pedidos de override.

### R19 — Auditoria silenciosa de evento crítico
- **Gatilho:** falha transitória de DB suprime `INSERT` em audit.
- **Mitigação:** já mitigado por `auditOutboxService` + retry.
- **Fallback:** evento permanece em outbox até persistir.
- **Rollback:** N/A.
- **Monitoramento:** `AUDIT_OUTBOX_PERMANENT_FAIL` count.

### R20 — Imutabilidade não estendida a tabelas industriais
- **Gatilho:** novo workflow grava em tabela mutável.
- **Mitigação:** template de migration industrial inclui triggers `IMPETUS_AUDIT_IMMUTABLE`.
- **Fallback:** auditor detecta tabela industrial sem trigger e abre incidente.
- **Rollback:** trigger adicional via migration aditiva.
- **Monitoramento:** scan periódico de tabelas industriais sem trigger.

### R21 — LGPD industrial frágil (wearables/biométrico)
- **Gatilho:** ingestão de batimentos cardíacos / localização sem cifragem.
- **Mitigação:** Wave 7 — cifragem em coluna; retenção curta; finalidade documentada; DSAR pipeline.
- **Fallback:** wearables desligados por tenant até remediação.
- **Rollback:** anonimização / expurgo retrospetivo.
- **Monitoramento:** auditoria LGPD trimestral + alertas em ingest sem cifragem.

### R22 — Token blowup com 4 domínios densos
- **Gatilho:** prompt com dump de SPC + telemetria + NCRs + PTs + checklists.
- **Mitigação:** Wave 4 — *context budget* + summarizer + segmentação por domínio.
- **Fallback:** prompt truncado com aviso "contexto reduzido"; modo conservador.
- **Rollback:** flag `IMPETUS_AI_CONTEXT_BUDGET_ENABLED=true` com budgets agressivos.
- **Monitoramento:** tokens/call por persona × tenant × domínio; média móvel 7d.

### R23 — Loop cognitivo
- **Gatilho:** IA gera ação → ação dispara evento → evento aciona IA → repete.
- **Mitigação:** `IMPETUS_AI_AUTOLOOP_GUARD=true` por defeito; cool-down por entidade; *causation chain* limitada.
- **Fallback:** loop detectado → abort + alarme + entidade marcada para inspeção.
- **Rollback:** N/A (guard é universal).
- **Monitoramento:** *causation depth* (deve ser ≤ N), *loop detection count*.

### R24 — Hallucination em normas técnicas
- **Gatilho:** IA inventa cláusulas ISO ou recomendações FMEA inexistentes.
- **Mitigação:** prompt em modo "cite-ou-recuse"; *retrieval grounding* obrigatório; banco interno de normas verificadas; revisão humana antes de fechar workflow regulado.
- **Fallback:** IA responde "não sei" em vez de inventar.
- **Rollback:** desligar IA daquele workflow (flag por workflow).
- **Monitoramento:** taxa de "não sei"; auditoria amostral por especialista.

### R25 — Drift por tokens crescentes
- **Gatilho:** *prompt template* crescendo a cada release.
- **Mitigação:** baseline + revisão obrigatória se tokens médio > +15 % vs mês anterior.
- **Fallback:** rollback do template.
- **Monitoramento:** *prompt template version* + tokens/call.

### R26 — Cardinalidade explodida nas métricas
- **Gatilho:** label `workflow_id` em métrica → milhões de séries.
- **Mitigação:** *cardinality budget* + *top-N tenants* + buckets "others".
- **Fallback:** desligar labels caros; agregação em vez de detalhe.
- **Rollback:** flag por métrica.
- **Monitoramento:** *active series count* no backend de métricas.

### R27 — Trace span órfão
- **Gatilho:** ponto legado não propaga correlation id.
- **Mitigação:** `correlationIdMiddleware` no topo da stack; auditoria de pontos sem propagação.
- **Fallback:** *fallback trace id* gerado, marcando span como "incomplete".
- **Rollback:** N/A.
- **Monitoramento:** % spans com `parent_span_id` ausente.

### R28 — Custos de observability vendor
- **Gatilho:** OTLP sem *sampling* + retenção longa.
- **Mitigação:** *head-based sampling* + *tail-based sampling* para casos raros; retenção tier (7d hot / 30d warm / arquivo).
- **Fallback:** desligar exporter por janelas críticas.
- **Rollback:** flag.
- **Monitoramento:** alerta de orçamento mensal.

### R29 — Vazamento cross-tenant
- **Gatilho:** handler novo esquece `WHERE company_id`.
- **Mitigação:** `tenantIsolationGuard` em rotas críticas + revisão obrigatória + testes de regressão multi-tenant.
- **Fallback:** rejeição da query com 403.
- **Rollback:** patch imediato + comunicação aos tenants afetados.
- **Monitoramento:** auditoria automática de queries (linter + runtime guard).

### R30 — Noisy neighbor
- **Gatilho:** tenant gera milhões de eventos por bug.
- **Mitigação:** *throttling per-tenant* (W1) + *circuit breaker per-tenant* (já opt-in) + isolamento de filas low priority.
- **Fallback:** *demote* eventos do tenant para `low` priority; alerta ao operador.
- **Rollback:** *quarantine* do tenant.
- **Monitoramento:** eventos/s por tenant.

### R31 — Circuit breaker global derruba todos
- **Gatilho:** flag `IMPETUS_CONTEXTUAL_BREAKER_PER_TENANT=false` + tenant problemático.
- **Mitigação:** ativar per-tenant em produção (já existe).
- **Fallback:** kill switch específico do módulo.
- **Rollback:** flag.
- **Monitoramento:** *breaker open count* global vs per-tenant.

### R32 — Equipa sobrecarregada
- **Gatilho:** waves correndo em paralelo sem fôlego.
- **Mitigação:** sequenciamento (W1→W2 prioritários; W3 paralelo a W4; W5+W6 paralelos; W7 contínuo).
- **Fallback:** desacelerar waves de menor ROI; manter W1/W2/W3/W4 prioridade.
- **Monitoramento:** *velocity* por sprint; *burn-down* por wave.

### R33 — Falta de runbook industrial
- **Gatilho:** incidente em workflow regulado sem playbook.
- **Mitigação:** runbook por wave + drill semestral.
- **Fallback:** *escalation matrix* + on-call.
- **Monitoramento:** drills executados, incidentes sem runbook.

### R34 — Dependência de fornecedor único
- **Gatilho:** vendor lock-in em broker ou observability.
- **Mitigação:** abstrair via interfaces (event bus, métricas) — já feito em parte.
- **Fallback:** trocar adapter sem reescrever consumidores.
- **Monitoramento:** percentual de código diretamente acoplado ao vendor.

### R35 — Crescimento exponencial de tenants antes da W3
- **Gatilho:** sucesso comercial antes da fundação de storage estar pronta.
- **Mitigação:** *gate* comercial em volumes muito altos até W3; oferecer plano "lite" para early adopters; coordenação com Produto/Comercial.
- **Fallback:** *amostragem* + *backpressure* per-tenant.
- **Monitoramento:** *tenant count*, *events/s total*.

### R36 — IoT massivo antes do storage temporal
- **Gatilho:** cliente exige RTLS/wearables antes de W3.
- **Mitigação:** dizer *não* ou aceitar com **plano explícito** (Timescale acelerada para staging primeiro; piloto bounded por planta).
- **Fallback:** *amostragem* + agregação no edge.
- **Monitoramento:** *ingest rate IoT* por tenant.

---

## Heatmap consolidado

| Severidade × Probabilidade | LOW Prob | MODERATE Prob | HIGH Prob |
|---|---|---|---|
| **CRITICAL** | R04, R11, R15, R19, R29 | R21, R35, R36 | R10, R22, R24 |
| **HIGH** | R05, R17, R16 | R01, R02, R12, R13, R14, R20, R23, R27, R28, R31, R33 | R03, R18, R26, R30, R32 |
| **MODERATE** | — | R27, R34 | R06, R09, R25 |
| **LOW** | — | — | — |

> Coluna HIGH × CRITICAL é a **prioridade absoluta** do roadmap. Estão todas endereçadas pelas Waves 1–4 do `enterprise-runtime-evolution-roadmap.md`.

---

## Política de aceitação de riscos

| Aceito? | Quando? |
|---|---|
| LOW | Aceito por defeito; monitorado. |
| MODERATE | Aceito com mitigação documentada e responsável nomeado. |
| HIGH | Requer aprovação do *internal_admin* + monitoramento ativo + plano de rollback. |
| CRITICAL | Requer aprovação dupla + dry-run em staging + chaos drill antes de produção. |

---

## Resumo executivo de riscos

1. O risco **mais crítico** é a IA saturar com 4 domínios densos (R22, R24) — totalmente endereçável pela Wave 4.
2. O risco **estrutural mais perigoso** é Postgres único para telemetria/SPC/RTLS (R10) — endereçável pela Wave 3.
3. O risco **silencioso mais grave** é vazamento cross-tenant (R29) — em parte mitigado mas exige vigilância contínua.
4. O risco **político** é promover autoridade do pipeline cedo demais (R15) — apenas disciplina + gates evitam.
5. Todos os riscos CRITICAL têm **mitigação preventiva e rollback** definidos neste documento.

> **Conclusão:** o Impetus pode evoluir com segurança industrial — desde que respeite a ordem deste roadmap e a política de aceitação de riscos acima.

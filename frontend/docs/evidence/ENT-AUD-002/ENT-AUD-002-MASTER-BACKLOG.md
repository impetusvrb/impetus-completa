# ENT-AUD-002 — Master Backlog

Lista única e acionável. Esforço: `S` até 3 dias, `M` até 2 semanas, `L` acima de 2 semanas. Owners são propostas.

## P0 — Integridade e segurança

| ID | Ação | Impacto | Dependência | Esforço | Owner sugerido |
|---|---|---|---|---|---|
| MB-001 | Substituir `/api/voz/*` simulado por `unavailable/not_configured` até existir fonte real | Crítico | Nenhuma | S | Backend/Produto |
| MB-002 | Remover KPIs fixos do Logistics e apresentar estado vazio técnico | Crítico | Nenhuma | S | Logistics |
| MB-003 | Remover riscos fictícios de `InsightsList` | Crítico | Nenhuma | S | Dashboard |
| MB-004 | Remover/segregar defaults sintéticos Safety telemetry/cognitive | Crítico | Nenhuma | S | Safety |
| MB-005 | Rotacionar segredo exposto e reduzir visibilidade do diagnóstico PM2 | Crítico | Gestão de segredos | S | Security/SRE |
| MB-006 | Alinhar `NODE_ENV`, ecosystem e runtime PM2 canônico | Crítico | Janela operacional | S | SRE |
| MB-007 | Diagnosticar 483 reinícios e estabilizar processos PM2 | Crítico | MB-006 | M | SRE |
| MB-008 | Dimensionar/corrigir pool PostgreSQL e concorrência | Crítico | Métricas reais | M | Backend/DBA |
| MB-009 | Tornar falha de bootstrap SEC-05 explícita e observável | Alto | Security review | S | Security |

## P1 — Homologação e fontes de verdade

| ID | Ação | Impacto | Dependência | Esforço | Owner sugerido |
|---|---|---|---|---|---|
| MB-010 | Fechar ENV qualification | Alto | P0 | M | SRE/QA |
| MB-011 | Executar staging certification | Alto | MB-010 | M | SRE/QA |
| MB-012 | Corrigir e repetir rollback certification | Alto | MB-011 | M | SRE |
| MB-013 | Corrigir e repetir production validation | Alto | MB-011 | M | QA/Platform |
| MB-014 | Emitir ou rejeitar formalmente operational go-live | Alto | MB-012/013 | S | Architecture Board |
| MB-015 | Criar runner global de testes com inventário sem aliases duplicados | Alto | Nenhuma | M | QA/Platform |
| MB-016 | Adicionar cobertura instrumentada frontend/backend | Alto | MB-015 | M | QA |
| MB-017 | Criar smoke E2E browser + HTTP real para journeys críticos | Alto | MB-015 | L | QA |
| MB-018 | Substituir stubs “hardware-valid” por classificação explícita e testes de infraestrutura | Alto | Hardware/ambiente | L | OT/QA |
| MB-019 | Gerar catálogo OpenAPI/mount/owner/consumer para os 291 mounts | Alto | Backend inventory | L | Platform API |
| MB-020 | Criar registry `implemented/mounted/enabled/running` por capability | Alto | MB-019 | M | Architecture |
| MB-021 | Reconciliar docs canônicas, históricas e superseded | Alto | MB-020 | M | Architecture/Docs |
| MB-022 | Decidir e documentar flags reais Supply/INC-048/Q/S/E/L | Alto | MB-020 | S | Domain owners |

## P2 — Fechamento de módulos

| ID | Ação | Impacto | Dependência | Esforço | Owner sugerido |
|---|---|---|---|---|---|
| MB-023 | Completar/retirar Logistics dock, telemetry, governance e rollout | Médio | MB-002 | M | Logistics |
| MB-024 | Corrigir `catch` Receiving e conflito Environment rollout | Médio | Nenhuma | S | Frontend |
| MB-025 | Corrigir deep-link Finance Twin → ManuIA | Médio | Nenhuma | S | Finance/Maintenance |
| MB-026 | Endurecer guards Settings, Finance parent e ManuIA | Alto | RBAC review | M | Security/Frontend |
| MB-027 | Definir retirement do dual stack WMS | Médio | Operação WMS | M | WMS |
| MB-028 | Cobrir Maintenance, Digital Twin, Production, Admin Portal e Lipsync | Médio | MB-015 | M | QA/domain owners |
| MB-029 | Resolver endpoints 501 do CRUD industrial ou ocultar feature | Médio | Business owner | M | Industrial |
| MB-030 | Persistir Environment production signals ou declarar shadow | Médio | Infra | M | Environment |
| MB-031 | Ativar e provar OTEL/Grafana/sink frontend com retenção | Alto | MB-006 | L | Observability |
| MB-032 | Formalizar queue precedence dos workers cognitivos | Alto | AIOI governance | M | Cognitive Platform |
| MB-033 | Executar AIOI pilot antes de P17–P20 | Alto | P0/P1/MB-032 | L | AIOI |
| MB-034 | Produzir histórico energético certificado | Médio | Owner de energia | L | Data/Environment |
| MB-035 | ADR para tendência linear client-side de Finance Prediction | Médio | PRED governance | S | Finance/Prediction |
| MB-036 | Fechar join Finance↔ordem e gaps HIGH FIN 2.1 | Médio | Contratos operacionais | M | Finance |

## P3 — Consolidação e arquivo

| ID | Ação | Impacto | Dependência | Esforço | Owner sugerido |
|---|---|---|---|---|---|
| MB-037 | Arquivar baselines v1.0–v1.3 e FIN-ROADMAP-001 | Baixo | MB-021 | S | Docs |
| MB-038 | Migrar itens válidos dos roadmaps de maio e marcar superseded | Médio | MB-021 | M | Architecture |
| MB-039 | Retirar aliases/scripts duplicados | Baixo | MB-015 | S | QA |
| MB-040 | Classificar TODO/FIXME/HACK restantes por owner/severidade | Baixo | Nenhuma | M | Domain owners |
| MB-041 | Eliminar `console.*` residual de produção ou enviá-lo ao sink | Baixo | MB-031 | M | Frontend/Backend |
| MB-042 | Criar política de revalidação/expiração de certificados | Médio | DOMAIN-GOV-001 | M | Governance |

## Itens suspensos

- novo domínio Gestão de Projetos;
- novos motores/runtimes;
- AIOI activation P17–P20;
- verticais nominalmente planeados sem Business Case;
- expansão energética de Prediction, salvo como workstream de dados.

## Gate de desbloqueio

Novo domínio somente após `MB-001→022` concluídos ou formalmente aceites por Architecture Board, com `MB-014` fechado.


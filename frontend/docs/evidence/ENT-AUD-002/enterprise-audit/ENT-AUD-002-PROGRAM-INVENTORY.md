# ENT-AUD-002 — Program Inventory

Classificação exclusiva: `CERTIFIED`, `COMPLETED`, `IN_PROGRESS`, `PARTIALLY_COMPLETED`, `PLANNED`, `NOT_STARTED`, `TECHNICAL_DEBT`, `DEPRECATED`.

| Programa/família | Categoria | Objetivo e evidência principal | Dependências/observações |
|---|---|---|---|
| PLATFORM-2026.1 | CERTIFIED | Baseline, freeze e roadmap corporativo; `frontend/src/platform/release/` | Fonte canônica de governança vertical |
| BASELINE-SYSTEM v1.4 | CERTIFIED | 13 baselines e 11 runtimes LOCKED | Substitui v1.0–v1.3 |
| ARC | CERTIFIED | Conformidade e Presentation Recovery | Família congelada |
| NAV / EOX / UX | CERTIFIED | Navegação operacional e apresentação EOX | Preservar rotas e compatibilidade |
| GF-000→020 | CERTIFIED | Quality extensions: PPAP, MSA, Ishikawa | Registrados no SYSTEM v1.4 |
| GF-021→027 / Supply | CERTIFIED | Supply runtime, promotion e pilot foundation | Runtime efetivo permanece flag-default-off |
| WMS-001→007A | CERTIFIED | WMS transacional, publicação e navegação | Dual stack legacy permanece dívida |
| OPM-001D→008 | CERTIFIED | Operational baseline, warehouse intelligence e advisory | Suites e evidências presentes |
| OPM-E2E-001 | CERTIFIED | Fluxo operacional end-to-end in-process | Não equivale a browser/produção real |
| OPM-GOV-001 | CERTIFIED | Contratos, lifecycle, handoffs e observabilidade | Família congelada |
| WMS-REF-001 | CERTIFIED | Componentes de referência | Família congelada |
| CPL-001→003 | CERTIFIED | Discovery, adapters e governança cognitiva | Sem novos motores horizontais |
| REG-001 | COMPLETED | Auditoria e plano de recovery | Materializado por REG-002 |
| REG-002 | CERTIFIED | Sete recoveries de wiring | Teste “HTTP 200” é estático |
| ENT-001 | CERTIFIED | Catálogo corporativo de conhecimento | Catálogo de domínios está desatualizado |
| ARCH-PLAN-001 | CERTIFIED | Planeamento corporativo priorizado | Roadmap nominal diverge de baselines posteriores |
| FIN-AUD-001 | CERTIFIED | Descoberta Finance | Família congelada |
| FIN-CONCEPT-001 | COMPLETED | Assessment conceitual read-only | Substituído pela execução posterior |
| FIN-PLAN-001 | COMPLETED | Planeamento Finance | Substitui FIN-ROADMAP-001 |
| FIN-EVOLVE-001 / 001A | COMPLETED | Integração e experiência Finance | Sem certificado release-specific final |
| FIN-STAB-001 | CERTIFIED | Estabilização Finance | Gate concluído |
| FIN-EVOLVE-002 | CERTIFIED | Hub Finance | Integrado ao workspace |
| FIN-DATA-001 | COMPLETED | Auditoria de dados | Gaps classificados |
| FIN-READY-001 | COMPLETED | Contratos driver/rate, asset map e valuation | Sem feature de produto |
| FIN-EVOLVE-2.1 | COMPLETED | Economic Intelligence Engine | Três gaps HIGH não bloqueantes |
| FIN-TWIN-READY-001 | COMPLETED | Readiness do Twin | Preparação read-only |
| FIN-EVOLVE-2.2 | CERTIFIED | Financial Twin overlay | Sem Twin paralelo |
| FIN-VAL-001 | CERTIFIED | Validação operacional Finance | Gate What-if PASS |
| FIN-EVOLVE-2.3 | CERTIFIED | What-if sem mutação | Cenários em memória |
| FIN-PRED-READY-001 | PARTIALLY_COMPLETED | Readiness preditivo Finance | Superado por PRED-BASE-002 |
| PRED-BASE-001 | PARTIALLY_COMPLETED | Baseline corporativa de previsão | Energia permaneceu parcial |
| PRED-BASE-002 | CERTIFIED | `platform.prediction.v0` e API pública | `GAP-PB-003` diferido |
| FIN-EVOLVE-2.4 | CERTIFIED | Predictive Financial Intelligence | Composição client-side |
| FIN-CERT-001 | CERTIFIED | Certificado enterprise Finance | Roadmap horizontal encerrado |
| DOMAIN-GOV-001 | CERTIFIED | Governança de evolução por Business Case | Primeiro certificado: Finance |
| Truth F47→F49-F | CERTIFIED | Encerramento Truth | 8/8 fases documentadas |
| AIOI foundation P0→P16 | PARTIALLY_COMPLETED | Foundation/UI/runtime stack | 73/82 completos; execução cognitiva ativa bloqueada |
| AIOI P17→P20 | NOT_STARTED | Activation/governance/certificação cognitiva | Explicitamente proibidos no roadmap M1 |
| Enterprise Security SEC-01→21C | CERTIFIED | Segurança e go-live | Certificações com ressalvas em etapas |
| APPSEC-01→02A | PARTIALLY_COMPLETED | AppSec e readiness para Red Team | Red Team externo ainda pendente |
| Event Governance 01→20 | CERTIFIED | Event governance enterprise | Certificado com ressalvas |
| ECO-01→08 | CERTIFIED | Convergência do ecossistema cognitivo | Certificado com ressalvas; retirement aberto |
| BASELINE-LOCK-01 | CERTIFIED | Enterprise baseline lock | Encerrado com ressalvas |
| Enterprise Operational Homologation | TECHNICAL_DEBT | ENV qualification, staging, rollback, validation, go-live | Existem gates reprovados/pendentes |
| M1.11→M1.21 | COMPLETED | Enterprise core e adoption readiness | Evidência operacional é o gargalo |
| M1.22→M2.0 | PLANNED | Ativação ESG/workflow/MES e certificação | Depende de dados e operação real |
| SUP-EVOLVE-001 | PLANNED | Programa vertical nominal Supply | Capacidade equivalente já existe sob GF/Supply |
| PPAP-EVOLVE-001 | PLANNED | Programa vertical nominal PPAP | Runtime PPAP já LOCKED; reconciliar/arquivar |
| MSA-EVOLVE-001 | PLANNED | Programa vertical nominal MSA | Runtime MSA já LOCKED |
| ISH-EVOLVE-001 | PLANNED | Programa vertical nominal Ishikawa | Runtime Ishikawa já LOCKED |
| PROC-EVOLVE-001 | PLANNED | Procurement | Depende de Supply |
| EXEC-EVOLVE-001 | PLANNED | Executive hub consolidado | AIOI/boardroom já existem parcialmente |
| PRD-EVOLVE-001 | PLANNED | Production workspace | Runtime existe; workspace não |
| MNT-EVOLVE-001 | PLANNED | Maintenance domain evolution | ManuIA/runtime já existem |
| HR-EVOLVE-001 | PLANNED | HR domain evolution | Pulse/runtime já existem |
| COMP-EVOLVE-001 | PLANNED | Compliance consolidado | Depende de Q/S/E |
| Gestão de Projetos | NOT_STARTED | Intenção futura | Bloqueado por ENT-AUD-002 |
| Logistics legacy / warehouse dual stack | TECHNICAL_DEBT | Compatibilidade e workspace Wave 6 incompleto | WMS canônico deve prevalecer |
| BASELINE-SYSTEM v1.0→v1.3 | DEPRECATED | Baselines históricas | Substituídas por v1.4 |
| FIN-ROADMAP-001 | DEPRECATED | Roadmap Finance antigo | Substituído por FIN-PLAN-001 |
| `impetus_complete/` mirror | DEPRECATED | Cópia histórica | Não é produção PM2 |

## Regra de leitura

`LOCKED` ou `CERTIFIED` descreve conformidade arquitetural. Não prova que a feature esteja `ENABLED`, `RUNNING`, homologada com dados reais ou operacionalmente adotada.


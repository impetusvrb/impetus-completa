# ENT-AUD-002 — Technical Debt Audit

## Criticidade crítica

| ID | Finding | Evidência | Impacto |
|---|---|---|---|
| TD-001 | Voz devolve factos/ações simulados como operacionais | `backend/src/routes/voz.js` | Decisões baseadas em dados falsos |
| TD-002 | Logistics usa KPIs fixos em falha de API | `frontend/src/domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx` | Estado saudável fictício |
| TD-003 | Insights injeta riscos fictícios sem dados | `frontend/src/components/InsightsList.jsx` | Distorção executiva |
| TD-004 | Segredo sensível exposto em diagnóstico PM2 | Processo `impetus-backend` observado | Comprometimento de credenciais |
| TD-005 | Drift PM2/ambiente e instabilidade | `ecosystem.config.js`, processos observados | 483 reinícios e comportamento não determinístico |
| TD-006 | Pressão PostgreSQL recorrente | logs e métricas do pool | Indisponibilidade/timeout |

## Criticidade alta

| ID | Finding | Impacto |
|---|---|---|
| TD-007 | SEC-05 falha no bootstrap e é absorvido | Defesa ativa não inicializada |
| TD-008 | Homologação operacional não fechada | Go-live não comprovado |
| TD-009 | Testes hardware-valid usam stubs locais | Falsa prova de integração industrial |
| TD-010 | 666 scripts sem runner global/cobertura | Estado verde não reproduzível |
| TD-011 | 303 routers/291 mounts sem OpenAPI canônico | Contratos e ownership opacos |
| TD-012 | Mocks/defaults em Safety telemetry/cognitive | Indisponibilidade mascarada |
| TD-013 | Distância aleatória no radar cognitivo | UI executiva não determinística |
| TD-014 | Supply/INC-048 homologados em docs, off em runtime | Divergência certificação-operação |
| TD-015 | Worker/job precedence implícita | Runtime cognitivo errado pode executar |
| TD-016 | CRUD industrial chama endpoints 501 | Feature incompleta em superfície ativa |
| TD-017 | Environment usa in-memory nos sinais de produção | Perda de durabilidade |

## Criticidade média

- deep-link Finance Twin → ManuIA não seleciona a aba;
- `SettingsAccessGuard` vazio;
- ManuIA com RBAC de rota assimétrico;
- Logistics `dock` sem render branch;
- `catch` de Receiving referencia `res` fora de escopo;
- Environment `rollout` com branch conflitante;
- ErrorBoundary promete notificação, mas só usa console;
- Admin Portal e Lipsync sem cobertura adequada;
- adapters de protocolo não têm I/O industrial real provado;
- OTEL/Grafana existem em código/manifests, mas ativação não foi confirmada;
- Finance Prediction executa tendência linear client-side;
- Finance hub recalcula por request e depende de contratos runtime;
- reconciliação Finance↔ordem não está garantida;
- três gaps HIGH residuais de FIN-EVOLVE-2.1;
- teste backend contém skip/placeholder;
- aliases de scripts inflacionam o mapa de cobertura.

## Criticidade baixa

- `console.*` residual em superfícies operacionais;
- comentários TODO/FIXME/HACK não classificados;
- CSS/TODOs e adapters vazios;
- rotas legacy e documentação histórica sem marca consistente;
- scripts de teste duplicados;
- snapshots certificados sem data de expiração/revalidação.

## Dívida evolutiva, não defeito imediato

- histórico energético para Prediction;
- rollout de capacidades flag-default-off;
- retirement formal do dual stack WMS;
- P17–P20 AIOI;
- expansão de domínios via Business Case.

## Regra de remediação

Nenhum item pode ser “corrigido” alterando baseline certificada fora de escopo. Usar adapters, wrappers, estados vazios e rotas aditivas; mudanças de baseline exigem programa e avaliação DOMAIN-GOV-001.


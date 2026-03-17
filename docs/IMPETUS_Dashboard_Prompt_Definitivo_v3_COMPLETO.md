# IMPETUS — Dashboard Inteligente Dinâmico — Centro de Inteligência Industrial  
# Prompt Definitivo para o Cursor — Versão 3.0

## 🎯 Objetivo Central

Substituir o dashboard fixo e igual para todos os usuários por um sistema dinâmico onde a IA monta automaticamente a interface correta para cada cargo, setor e função — transformando o IMPETUS em um Centro de Comando Industrial Inteligente.

---

## ÍNDICE

- PARTE 0 — Visão Geral, Stack e Arquitetura
- PARTE 1 — Remoção do Dashboard Atual e Migração
- PARTE 2 — Identificação e Perfil do Usuário
- PARTE 3 — Engine de Widgets e Dashboard Dinâmico
- PARTE 4 — Catálogo Completo de Centros Inteligentes (19 centros)
- PARTE 5 — Dashboards por Cargo — Indicadores e Gráficos
- PARTE 6 — Cérebro Operacional — IA Central
- PARTE 7 — Fluxo de Dados, Tempo Real e Contratos de API
- PARTE 8 — Sistema de Alertas Inteligentes
- PARTE 9 — Interação com IA — Perguntas Livres
- PARTE 10 — Motor de IA, Scoring e Aprendizado Contínuo
- PARTE 11 — Performance, Segurança e Escalabilidade
- PARTE 12 — Roadmap, Critérios de Aceite e Non-Goals

---

## PARTE 0 — VISÃO GERAL, STACK E ARQUITETURA

- **Stack:** React 18+ (TypeScript opcional), Tailwind, React Query, Zustand, Recharts/D3, Socket.io-client, React.lazy + Suspense (frontend); Node + Express, PostgreSQL, Redis, WebSocket, Claude API, Bull/BullMQ, Docker, Sentry (backend).
- **Princípios:** Separação dados ↔ engine IA ↔ UI; widgets como micro-frontends lazy-loaded; IA sugere, sistema valida; estado reconstruível por URL/sessão; fallback determinístico; validação de permissões sempre no backend.
- **Fluxo:** Login → Enriquecimento UserProfile → Engine de Widgets (3 camadas: regras, scoring, LLM) → DashboardLayout → Frontend monta grid 4 colunas → WebSocket para tempo real.

---

## PARTE 1 — REMOÇÃO DO DASHBOARD ATUAL E MIGRAÇÃO

- Remover: gráficos estáticos hardcoded, layouts fixos, lógica de UI fora do engine de widgets.
- Migração: branch separado, feature flag `ENABLE_DYNAMIC_DASHBOARD=true`, canary 5%, monitorar 72h, depois 100% e remoção do legado. Manter legado via flag até estabilização; preservar dados e documentar componentes removidos.

---

## PARTE 2 — IDENTIFICAÇÃO E PERFIL DO USUÁRIO

- **UserProfile:** id, name, role (CEO, DirectorIndustrial, ProductionManager, MaintenanceManager, QualityManager, LogisticsManager, FinanceManager, ProductionSupervisor, MaintenanceSupervisor, MaintenanceTech, StockSupervisor, Operator…), department, permissions[], hierarchyLevel (1–5), associatedAssets[], activeModules[], preferredWidgets?, lastLogin, timezone.
- **Comportamento:** rastrear widgets acessados, filtros, alertas ignorados/clicados, exportações.
- **Cold start:** `resolveInitialWidgets(profile)` usando `WIDGET_DEFAULTS_MAP[role][department]` ou `generic`.

---

## PARTE 3 — ENGINE DE WIDGETS E DASHBOARD DINÂMICO

- **Widget:** id, name, type (analytics|map|alert|forecast|operational|financial|quality|safety), component (lazy), permissionsRequired[], departments[], hierarchyMin/Max?, defaultParams, refreshInterval?, supportsRealtime, minWidth (1|2).
- **API:** `POST /api/v1/dashboard/generate` com userProfile + context → retorna dashboardLayout (version, generatedAt, ttl, widgets[], alerts[], aiSummary). `GET /api/v1/widgets/:widgetId/data` com userId, period, from, to, sector, machineId → retorna data, metadata (generatedAt, freshness, nextRefreshAt), aiInsights opcional.
- **Estados de widget:** loading (skeleton), empty (mensagem + ação), error (card + “Tentar novamente” + Sentry), stale (banner amarelo), no_permission (oculto), first_load (default + “Personalizando...”).

---

## PARTE 4 — CATÁLOGO DE 19 CENTROS INTELIGENTES

1. Cérebro Operacional — operational_brain  
2. Centro de Previsão — prediction_center  
3. Centro de Operações — operations_center  
4. Mapa Industrial Interativo — industrial_map  
5. Mapa de Vazamentos — leak_map  
6. Centro de Custos — cost_center  
7. Centro de Energia — energy_center  
8. Centro de Produção — production_center  
9. Centro de Manutenção — maintenance_center  
10. Centro de Qualidade — quality_center  
11. Centro de Estoque — stock_center  
12. Centro Logístico — logistics_center  
13. Centro de Seg. do Trabalho — safety_center  
14. Centro Ambiental — environmental_center  
15. Centro de Performance — performance_center  
16. Centro de Gargalos — bottleneck_center  
17. Centro de Desperdício — waste_center  
18. Centro de Rastreabilidade — traceability_center  
19. Centro de Receitas — recipes_center  

Cada centro = conjunto de widgets no grid dinâmico; nenhum é página independente.

---

## PARTE 5 — DASHBOARDS POR CARGO

- CEO: faturamento, lucro, custo industrial, OEE, eficiência, desperdício, previsão 30d; gráficos crescimento, produção vs demanda, custos por setor, margem; centros Custos, Performance, Cérebro.
- Diretor Industrial: produção, eficiência linhas, paradas, gargalos, OEE, custo operacional; centros Operações, Gargalos, Performance, Cérebro, Mapa Industrial, Custos.
- Gerente Produção: prod/hora, turno, linha, produtividade, tempo ciclo, parada; tempo real linhas; centros Gargalos, Desperdício, Previsão, alertas.
- Supervisor Produção: produção linha/operador, velocidade, perdas, status máquinas; máquinas da linha, operadores turno, alertas, Rastreabilidade.
- Gerente Manutenção: MTBF, MTTR, custo por máquina, máquinas críticas, OEE; centros Manutenção, saúde máquinas, histórico, Mapa Vazamentos, Energia, Cérebro.
- Supervisor Manutenção: máquinas operando/alerta/paradas, OS abertas/atrasadas, temperatura, vibração, pressão, consumo; alertas automáticos (vibração, temperatura, risco falha, vazamento).
- Técnico Manutenção: OS atribuídas, histórico máquina, registrar manutenção/peças, anexar fotos/PDF.
- Gerente Qualidade: aprovados/reprovados, não conformidade, custo não qualidade, rejeição por linha, auditorias; tempo real temperatura, pH, contaminação, peso; centros Rastreabilidade, Receitas.
- Supervisor Estoque: estoque atual, min/max, vencimento, giro, cobertura; entradas/saídas tempo real; alertas crítico e validade; Rastreabilidade.
- Gerente Logístico: pedidos em transporte/atrasados, custo entrega, OTIF; rotas ativas, status veículos, Centro Logístico.
- Gerente Financeiro: faturamento, despesas, lucro, custos industriais, ROI; fluxo de caixa, custos por setor, margem; centros Custos, Desperdício.

---

## PARTE 6 — CÉREBRO OPERACIONAL

- Funções: analisar dados multi-setor, detectar padrões/anomalias, prever falhas, sugerir decisões, alertas priorizados, causa raiz, perguntas em linguagem natural.
- Cruzamentos: Produção↔Manutenção, Qualidade↔Produção, Estoque↔Logística, Financeiro↔Produção, Energia↔Manutenção, Segurança↔Operações.
- Chat: perguntas como “qual setor gera mais custo?”, “qual máquina maior risco 24h?”, “impacto se linha 3 parar 4h?”.
- **AIResponse:** answer, data?, confidence, sources[], suggestedAction?, relatedWidgets[].

---

## PARTE 7 — FLUXO DE DADOS E TEMPO REAL

- REST (polling ≥30s) para financeiro/histórico; WebSocket para operacional/alertas/mapa; batch noturno para predição; webhook futuro ERP/SCADA/IoT/PLC.
- WebSocket `dashboard:inject_widget` para injetar widget urgente (id, type, priority, ttl, params, aiReason).
- Centro de Previsão: simular 7/14/30d, cenários (parada, demanda, custo), impacto produção/estoque/logística/financeiro/entregas/mão de obra; setor/máquina; export CSV/PDF. **PredictionConfig:** mode, period, scenario?, variables?, sector?, machineId?.

---

## PARTE 8 — ALERTAS INTELIGENTES

- **Alert:** id, type (operational|financial|quality|safety|environmental|maintenance), severity (low|medium|high|critical), title, message, affectedEntities[], detectedAt, expiresAt?, actions?, acknowledged, aiConfidence.
- Gatilhos: produção -15% horária (high); manutenção vibração/temp (high), MTBF previsto (critical); vazamento (critical); qualidade >3% não conformidade (high); estoque abaixo mínimo (medium); custo turno +20% (medium); energia anormal (medium); segurança incidente (critical); logística atraso >24h (high).

---

## PARTE 9 — INTERAÇÃO COM IA (PERGUNTAS LIVRES)

- Chat sempre visível no dashboard; resposta ≤5s com cache; histórico da sessão; botão “Ver no widget”; perguntas anonimizadas para melhoria.

---

## PARTE 10 — MOTOR DE IA E SCORING

- **Camada 1:** regras determinísticas cargo/depto → widgets; validação permissões; fallback sem IA.
- **Camada 2:** scoring por uso, alertas ativos, horário de pico; reordenação.
- **Camada 3:** LLM para insights e perguntas; se API falhar, 1 e 2 seguem.
- **scoreWidget(widgetId, ctx):** base depto, uso 2 semanas, alertas relacionados, horário pico.
- **Eventos:** widget_view, widget_interact, widget_dismiss, alert_acknowledge, alert_ignore, export_triggered, filter_changed, ai_question_asked.

---

## PARTE 11 — PERFORMANCE E SEGURANÇA

- Metas: /generate <800ms; widget <500ms; TTI <2s; WebSocket <200ms; chat IA <5s; até 12 widgets sem degradação.
- Cache: layout 5min Redis; widget histórico 2min; tempo real sem cache; perfil na sessão.
- Segurança: validação backend em toda rota de widget; rate limit 60 req/min por userId; auditoria financeiro/executivo; HTTPS; não expor aiReason interno.

---

## PARTE 12 — ROADMAP E NON-GOALS

- **Fases 1–6:** Engine + 5 widgets + flag; Scoring + alertas + 10 centros; LLM + chat + 19 centros; Mapas + Previsão + export; Cérebro completo; aprendizado e integrações.
- **Aceite Fase 1:** CEO ≠ Operador; flag de rollback; 5 widgets mock; 6 estados; grid 4 colunas.
- **Non-Goals:** ML próprio (usar APIs); redesenho design system; migração de schema; ERP/SCADA na Fase 6; mudar auth; app mobile nativo (apenas responsivo).

---

*Fim do documento. Escopo Cursor: alterar apenas dashboard; outros módulos não devem ser modificados.*

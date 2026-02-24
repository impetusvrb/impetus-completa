# Resumo Inteligente Diário/Semanal

## Visão geral

Ao fazer o **primeiro login do dia**, o sistema exibe um relatório das principais ocorrências, problemas em aberto e dados relevantes. Em **sexta-feira**, o relatório é **semanal** (últimos 7 dias). Nos demais dias, é **diário** (dia anterior).

---

## Componentes

### 1. Estrutura de dados

**Tabela `user_activity_logs`** – registro de atividades do usuário:
- `activity_type`: view, search, request
- `entity_type`: dashboard, proposals, communications, diagnostic, biblioteca
- `context`: JSON com busca, filtros, KPIs solicitados

**Migration:** `backend/src/models/user_activity_logs_migration.sql`

### 2. APIs

- **POST /api/dashboard/log-activity** – registra atividade
- **GET /api/dashboard/smart-summary** – gera resumo via IA

### 3. Modal no dashboard

Ao abrir o dashboard no primeiro login do dia, um modal exibe o resumo gerado pela IA.

### 4. Chat IA (Chatbot Interacionais)

Em `/app/chatbot`, a IA saúda o usuário e apresenta o resumo como primeira mensagem. O mesmo conteúdo do modal é mostrado no chat.

---

## Como aplicar a migration

```bash
psql -U postgres -d impetus_db -f backend/src/models/user_activity_logs_migration.sql
```

---

## Fluxo

1. Usuário faz login e acessa o dashboard
2. O sistema verifica se já mostrou o resumo hoje (`localStorage`)
3. Se não: chama GET `/api/dashboard/smart-summary`
4. A IA analisa: atividades do usuário, comunicações em aberto, propostas pró-ação
5. Gera resumo em markdown e exibe no modal
6. Ao fechar o modal, a data é salva para não exibir novamente no mesmo dia

# Plano de Correções — Varredura de Erros (Fev/2025)

Este documento descreve as correções implementadas após a varredura completa do software Impetus para identificar e corrigir erros que prejudicam o funcionamento.

---

## 1. Correções críticas implementadas

### 1.1 Multi-tenant — Pró-Ação (`proacao`)

**Problema:** Rotas de propostas aceitavam `company_id` do body (injeção) e não filtravam por empresa.

**Correções:**
- `company_id` passado sempre a partir de `req.user.company_id` (autenticado)
- `listProposals(limit, companyId)` — filtro por empresa
- `getProposal(id, companyId)` — verificação de pertencimento
- Todas as ações (evaluate, escalate, assign, record, finalize) validam `company_id` antes de executar

### 1.2 Multi-tenant — Tasks

**Problema:** `SELECT * FROM tasks` sem filtro por empresa.

**Correções:**
- Migration `tasks_company_migration.sql` — adiciona coluna `company_id` à tabela `tasks`
- Rota `GET /api/tasks` filtra por `company_id` do usuário
- `createTaskFromMessage` em `incomingMessageProcessor` inclui `companyId` no INSERT
- Fallback seguro quando a migration ainda não foi executada

### 1.3 IDOR — Relatório de diagnóstico (`diag_report`)

**Problema:** Busca em `proposal_actions` por `id` sem verificar `company_id`.

**Correção:** JOIN com `proposals` e filtro por `p.company_id = $2` para garantir acesso apenas a dados da própria empresa.

---

## 2. Correções de alta severidade

### 2.1 Validação de UUID

Adicionada validação `isValidUUID()` antes de queries em:
- `proacao.js` — todas as rotas com `:id`
- `admin/users.js` — GET `/:id`
- `admin/departments.js` — GET `/:id`
- `communications.js` — GET `/:id`
- `plcAlerts.js` — POST `/:id/acknowledge`

### 2.2 Parsing seguro de JSON (`communications`)

**Problema:** `JSON.parse(aiResponse)` lançava exceção quando a IA retornava texto não-JSON.

**Correção:** Try-catch com fallback para extrair objeto JSON da resposta (ex.: `{...}` em texto ou markdown).

### 2.3 Verificação de função IA (`proacao` service)

**Problema:** `if(ai && ai.chatCompletion)` — módulos são sempre truthy.

**Correção:** `typeof ai.chatCompletion === 'function'`.

### 2.4 Erro em catch (`admin/settings`)

**Problema:** GET `/whatsapp-contacts` retornava `{ ok: true, contacts: [] }` em caso de erro, sem log.

**Correção:** Log do erro e retorno `{ ok: false, error: '...', contacts: [] }`.

---

## 3. Correções de severidade média

### 3.1 Validação de inteiros (`communications`)

- `limit` e `offset` validados com `safeInteger()`
- `priority` validado com `safeInteger(priority, 3, 1, 5)`

### 3.2 Padronização de respostas de erro

- `diag_report.js` — `res.status(500).send('error')` → `res.json({ ok: false, error: '...' })`

---

## 4. Migration adicionada

**Arquivo:** `backend/src/models/tasks_company_migration.sql`

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
```

**Execução:** Incluída em `npm run migrate` (run-all-migrations.js).

---

## 5. Correções adicionais (varredura complementar)

### 5.1 Diagnostic — Autenticação (crítico)

**Problema:** A página de Diagnóstico usava `axios` diretamente, sem enviar o token Bearer. As rotas `/api/diagnostic` e `/api/diagnostic/validate` exigem autenticação (`requireAuth`), resultando em 401.

**Correções:**
- Uso do serviço `diagnostic` de `api.js` (com interceptor de token)
- Inclusão do método `validate` na API
- Envelope em `Layout` para manter o padrão visual
- Botão "Abrir relatório HTML" passa a usar `diagnostic.getReport()` (com auth) em vez de link direto que não enviava token

### 5.2 Login — Resposta inválida

**Problema:** Se a API retornasse estrutura inesperada (`token` ou `user` ausentes), o fluxo poderia falhar silenciosamente.

**Correção:** Validação explícita de `data?.token` e `data?.user` antes de gravar no `localStorage` e navegar.

---

## 6. Próximos passos recomendados

1. **Webhooks:** Validar assinatura/token conforme documentação Z-API
2. **Admin users:** Validar `hierarchy_level` com `safeInteger` ou Zod
3. **CORS:** Restringir origens em produção (`FRONTEND_URL`)
4. **Revisar** `req.file?.path` em uploads antes de uso

---

**Data da varredura:** Fevereiro 2025  
**Última atualização:** Correções de Diagnostic e Login  
**Status:** Correções implementadas e documentadas

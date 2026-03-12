# Plano de Implementação de Melhorias – IMPETUS

**Documento:** Plano de Melhorias Técnicas  
**Versão:** 1.0  
**Princípio:** Apenas melhorias e atualizações – modificações somente quando extremamente necessárias.

---

## Fase 1 – Infraestrutura e Observabilidade (Prioridade Alta)

### 1.1 Health Check Detalhado
- **Objetivo:** Expandir `/health` com status de dependências
- **Abordagem:** Adicionar campos opcionais (openai, pool size, migrations)
- **Risco:** Baixo – resposta JSON é aditiva
- **Status:** ✅ Implementado

### 1.2 Logs Estruturados
- **Objetivo:** Logger JSON para produção
- **Abordagem:** Novo utilitário `structuredLogger` – coexiste com `console`
- **Ativação:** `LOG_FORMAT=json` em produção
- **Risco:** Baixo – não substitui logs existentes
- **Status:** ✅ Implementado

### 1.3 Compressão HTTP (gzip)
- **Objetivo:** Reduzir banda e latência percebida
- **Abordagem:** Middleware `compression` em rotas JSON
- **Risco:** Baixo – padrão em produção
- **Status:** ✅ Implementado

---

## Fase 2 – Segurança e Resiliência (Prioridade Alta)

### 2.1 Rate Limit por Usuário
- **Objetivo:** Proteger contra abuso de contas
- **Abordagem:** Já implementado em `userRateLimit.js` (DB + janelas por ação)
- **Risco:** Baixo
- **Status:** ✅ Já existia

### 2.2 Feature Flags
- **Objetivo:** Habilitar/desabilitar funcionalidades sem deploy
- **Abordagem:** Serviço `featureFlags` lendo de `process.env` e/ou tabela `feature_flags`
- **Risco:** Baixo – opt-in
- **Status:** ✅ Implementado

### 2.3 Retry com Backoff na API
- **Objetivo:** Resiliência em chamadas externas
- **Abordagem:** Já existe no frontend `api.js` – revisar backoff e extensão
- **Risco:** Baixo
- **Status:** ✅ Verificação

---

## Fase 3 – Performance (Prioridade Média)

### 3.1 Índices de Banco
- **Objetivo:** Otimizar queries frequentes
- **Abordagem:** Migration opcional com `CREATE INDEX IF NOT EXISTS`
- **Tabelas:** `audit_logs(company_id, created_at)`, `communications(company_id)`, `proposals(company_id, status)`
- **Risco:** Baixo – índices não quebram queries existentes
- **Status:** ✅ Implementado

### 3.2 Validação Zod Estendida
- **Objetivo:** Garantir payloads válidos na API
- **Abordagem:** Adicionar schemas onde ausentes – rotas críticas
- **Risco:** Baixo – validação retorna 400, não altera lógica
- **Status:** 🔲 Planejado (Zod já usado em setup, admin/users)

---

## Fase 4 – UX Frontend (Prioridade Média)

### 4.1 Skeleton Loaders
- **Objetivo:** Melhorar percepção de carregamento
- **Abordagem:** Novo componente `Skeleton` – usar em Dashboard e listagens principais
- **Risco:** Baixo – substitui texto "Carregando..."
- **Status:** ✅ Implementado

### 4.2 ErrorBoundary Granulares
- **Objetivo:** Falha em um módulo não derruba toda a aplicação
- **Abordagem:** Wrapper por rota/módulo – fallback com mensagem e botão "Tentar novamente"
- **Risco:** Baixo – melhoria de resiliência
- **Status:** ✅ Implementado

---

## Fase 5 – DevOps e Próximos Passos (Prioridade Baixa)

### 5.1 Migrações Versionadas
- **Objetivo:** Rastrear execução de migrations
- **Abordagem:** Tabela `schema_migrations` – script adaptado
- **Risco:** Médio – requer coordenação
- **Status:** 🔲 Futuro

### 5.2 Cache Redis
- **Objetivo:** Cache distribuído para sessões e dashboard
- **Abordagem:** Opcional – habilitar via `REDIS_URL`
- **Risco:** Médio – nova dependência
- **Status:** 🔲 Futuro

---

## Ordem de Execução

1. Health check detalhado
2. Logs estruturados
3. Compressão gzip
4. Rate limit por usuário
5. Feature flags
6. Índices de banco
7. Skeleton loaders
8. ErrorBoundary granulares
9. Validação Zod (pontual)

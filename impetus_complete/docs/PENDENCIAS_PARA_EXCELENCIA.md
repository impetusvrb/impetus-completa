# IMPETUS COMUNICA IA — Pendências para Excelência

**Objetivo:** Lista do que ainda precisa ser implementado ou corrigido para o software operar com excelência.

**Última atualização:** Itens de prioridade alta foram implementados.

---

## 1. CORREÇÕES CRÍTICAS (banco e migrations) ✅ CONCLUÍDAS

### 1.1 Migrations no script único ✅
O `npm run migrate` agora executa, na ordem:
1. migrations.sql
2. complete_schema.sql
3. schema_fixes_migration.sql (active, title, policies)
4. doc_context_migration.sql (POPs, manuals, manual_type)
5. user_activity_logs_migration.sql
6. whatsapp_contacts_migration.sql
7. tpm_migration.sql
8. proacao_diag_migration.sql (índice ivfflat)

### 1.2 Coluna `active` em `monitored_points` ✅
Adicionada em `schema_fixes_migration.sql`.

### 1.3 Proposals coluna `title` ✅
Adicionada e preenchida em `schema_fixes_migration.sql`. Query em smartSummary usa COALESCE como fallback.

### 1.4 INSERT em `institutional_policies` ✅
Adicionado UNIQUE(policy_type, version) e `ON CONFLICT (policy_type, version) DO NOTHING`.

---

## 2. FUNCIONALIDADES INCOMPLETAS

### 2.1 Separação Manual Operacional vs Manual de Máquina ✅
- Coluna `manual_type` adicionada em `doc_context_migration.sql`
- Frontend (AdminSettings, BibliotecaPage, CategoriaSidebar) já implementado

### 2.2 Resumo Inteligente ao primeiro login
Requisito: modal com resumo ao logar, baseado em histórico dos últimos 7 dias.

**Status:** Parcialmente implementado (`smartSummary`, `SmartSummaryModal`). Falta:
- Garantir que `user_activity_logs` exista e seja preenchida
- Exibir automaticamente no primeiro acesso do dia
- Integrar com chat (disponibilizar o resumo no contexto)

### 2.3 Proação Worker
O script `proacao_worker.js` existe. Verificar:
- Se roda em cron/job
- Se as regras em `proacao_rules` estão sendo avaliadas corretamente
- Se os alerts são criados e notificam

### 2.4 Índice ivfflat em `manual_chunks` ✅
Incluído em `run-all-migrations.js` (proacao_diag_migration.sql).

---

## 3. SEGURANÇA E PRODUÇÃO

### 3.1 Variáveis sensíveis
- Garantir que `.env` esteja no `.gitignore`
- Não expor `OPENAI_API_KEY`, `ENCRYPTION_KEY`, tokens Z-API em logs

### 3.2 HTTPS em produção
- Documentar configuração de SSL/TLS
- `helmet` já ativado; validar headers de segurança

### 3.3 Backup do banco
- Documentar procedimento de backup (pg_dump)
- Sugerir rotina automática

### 3.4 Rate limiting
- Já implementado (login, registro, API global)
- Revisar limites para ambiente industrial (mais requisições?)

---

## 4. UX E FRONTEND

### 4.1 Tratamento de erros
- Páginas de erro 404, 500 já existem
- Garantir fallback quando API falha (ex.: "Falha ao carregar. Tente novamente.")
- Loading states consistentes

### 4.2 Responsividade
- Verificar layout em tablets e mobile
- Menu lateral em telas pequenas

### 4.3 Acessibilidade
- Labels em formulários
- Contraste de cores
- Navegação por teclado

---

## 5. ROADMAP (README)

Itens marcados como pendentes no README:
- [ ] Módulo Mobile (React Native)
- [ ] Integrações ERP (SAP, TOTVS)
- [ ] IA Preditiva Avançada
- [ ] Multi-idioma (EN, ES)

Esses são evoluções futuras; não impedem a excelência da versão atual.

---

## 6. TESTES

### 6.1 Testes automatizados
- README menciona `npm test` para backend e frontend
- Verificar se existem testes e qual a cobertura

### 6.2 Testes E2E
- Fluxo completo: login → dashboard → chat → diagnóstico
- Fluxo TPM via simulação de webhook Z-API

---

## 7. DOCUMENTAÇÃO E OPERAÇÃO

### 7.1 Já atendido
- [x] Documentação técnica completa
- [x] Guia de instalação
- [x] Script único de migrations
- [x] Seed inicial (admin + empresa demo)
- [x] Docker Compose dev e prod

### 7.2 Ainda pendente
- Runbook para incidentes (o que fazer quando X falha)
- Diagrama de arquitetura (imagem/diagrama)
- Guia de troubleshooting expandido

### 7.3 Guia de produção ✅
Criado [PRODUCAO.md](./PRODUCAO.md) com backup, HTTPS, variáveis e checklist.

---

## 8. PRIORIZAÇÃO SUGERIDA

| Prioridade | Item | Esforço |
|------------|------|---------|
| **Alta** | Incluir migrations faltando no script | Baixo |
| **Alta** | Corrigir `monitored_points.active` e `proposals.title` | Baixo |
| **Alta** | Garantir `user_activity_logs` para Resumo Inteligente | Baixo |
| **Média** | Separação Manual Operacional vs Máquina | Médio |
| **Média** | Índice ivfflat em manual_chunks | Baixo |
| **Média** | Documentar backup e HTTPS em produção | Baixo |
| **Baixa** | Lazy loading de rotas no frontend | Baixo |
| **Baixa** | Limite LRU no useCachedFetch | Baixo |
| **Baixa** | Mobile, ERP, Multi-idioma | Alto |

---

## 9. CONCLUSÃO

Para **excelência imediata**, as ações de **prioridade alta** são suficientes:

1. Expandir o script de migrations.
2. Corrigir inconsistências de schema (active, title).
3. Garantir que Resumo Inteligente e TPM notificações funcionem com as tabelas corretas.

Após isso, o sistema estará pronto para uso em produção com confiança.

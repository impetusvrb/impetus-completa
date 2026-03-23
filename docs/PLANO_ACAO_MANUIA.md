# Plano de Ação: Correção Segura do Módulo ManuIA

**Documento:** Plano de implementação  
**Versão:** 1.0  
**Data:** 2026-03-07  
**Escopo:** Restaurar funcionalidade do ManuIA no backend sem alterar design ou funcionalidades existentes do Impetus Comunica IA  

---

## 1. Contexto e Diagnóstico

### Situação atual
- O frontend ManuIA (`/app/manutencao/manuia`) está implementado e visível no menu para gerente, coordenador e supervisor.
- O backend em `backend/` (raiz) **não** monta a rota `/api/manutencao-ia`.
- O código das rotas e do serviço existe em `impetus_complete/backend/`.
- O backend já possui migration consolidada (`manuia_migration.sql`), rollback e dependência `openai`.

### O que falta no backend (raiz)
| Item | Localização atual | Ação |
|------|-------------------|------|
| `routes/manutencao-ia.js` | `impetus_complete/backend/src/routes/` | Copiar |
| `services/equipmentResearchService.js` | `impetus_complete/backend/src/services/` | Copiar |
| Registro da rota | — | Adicionar linha em `server.js` |
| Migrations executadas | `backend/src/models/manuia_migration.sql` existe | Executar se ainda não rodou |

---

## 2. Princípios do Plano

1. **Zero alteração** de design, UX ou funcionalidades existentes.
2. **Isolamento:** apenas novos arquivos + uma linha em `server.js`.
3. **Reversibilidade:** cada etapa em commit separado; feature flag opcional.
4. **Rollback:** código e banco com procedimento documentado.

---

## 3. Fases do Plano

### FASE 0 — Preparação (pré-requisitos)

| # | Ação | Responsável | Critério de sucesso |
|---|------|-------------|---------------------|
| 0.1 | Identificar qual backend está em produção (PM2, docker-compose, etc.) | DevOps/Equipe | Documentar processo de start e base URL da API |
| 0.2 | Backup do banco: `pg_dump -U $DB_USER -d $DB_NAME -Fc -f backup_pre_manuia_$(date +%Y%m%d_%H%M).dump` | DBA/DevOps | Arquivo .dump gerado e guardado |
| 0.3 | Criar branch: `git checkout -b fix/manuia-backend` | Dev | Branch criada a partir de `main` |
| 0.4 | Verificar se `openai` está em `backend/package.json` | Dev | Já confirmado: presente ✅ |
| 0.5 | Verificar se tabelas ManuIA existem: `SELECT tablename FROM pg_tables WHERE tablename LIKE 'manuia_%';` | DBA/Dev | Lista de tabelas ou vazio |

**Gate:** Aprovação para prosseguir à Fase 1.

---

### FASE 1 — Banco de dados (migrations)

**Condição:** Executar apenas se as tabelas `manuia_*` **não** existirem.

| # | Ação | Detalhes | Risco |
|---|------|----------|-------|
| 1.1 | Rodar migration em **staging/homologação** primeiro | `psql -f backend/src/models/manuia_migration.sql` ou script equivalente | Baixo |
| 1.2 | Conferir criação: `\dt manuia_*` no psql | Deve listar 7 tabelas ManuIA + `monitored_points` e `work_orders` se inexistentes | — |
| 1.3 | Em **produção**, executar `manuia_migration.sql` em transação | Todas as instruções usam `IF NOT EXISTS`; execução é idempotente | Baixo |
| 1.4 | Commit: `git add backend/src/models/ manuia_migration.sql && git commit -m "chore(manuia): garantir migration documentada"` | Só se houver alteração em arquivos de migration | Baixo |

**Nota:** O arquivo `backend/src/models/manuia_migration.sql` já existe e cobre:
- `monitored_points`, `work_orders` (se ausentes)
- `manuia_machines`, `manuia_sensors`, `manuia_sessions`
- `manuia_emergency_events`, `manuia_equipment_research`, `manuia_history`
- `manuia_work_order_links`

**Rollback:** Em emergência, usar `backend/src/models/rollback_manuia_migration.sql` (apenas em ambiente de teste primeiro).

---

### FASE 2 — Cópia de código (arquivos isolados)

| # | Ação | Arquivo origem → destino | Validação |
|---|------|--------------------------|-----------|
| 2.1 | Copiar roteador | `impetus_complete/backend/src/routes/manutencao-ia.js` → `backend/src/routes/manutencao-ia.js` | Imports `../db`, `../middleware/auth`, `../middleware/multiTenant`, `../services/dashboardProfileResolver`, `../services/equipmentResearchService` — paths já corretos |
| 2.2 | Copiar serviço de pesquisa | `impetus_complete/backend/src/services/equipmentResearchService.js` → `backend/src/services/equipmentResearchService.js` | Import `../db` — path correto |
| 2.3 | Teste estático: `node -e "require('./backend/src/routes/manutencao-ia')"` | Deve carregar sem `Module not found` | — |
| 2.4 | Commit: `git add backend/src/routes/manutencao-ia.js backend/src/services/equipmentResearchService.js && git commit -m "feat(manuia): adicionar rotas e serviço de pesquisa"` | Commit atômico | — |

**Regra:** Não alterar nenhum outro arquivo existente.

---

### FASE 3 — Registro da rota

| # | Ação | Detalhes | Risco |
|---|------|----------|-------|
| 3.1 | Editar `backend/src/server.js` | Inserir `useRoute('/api/manutencao-ia', './routes/manutencao-ia');` após as rotas existentes (ex.: após `useRoute('/api/diagnostic', ...)`) | Baixo |
| 3.2 | (Opcional) Feature flag: envolver em `if (process.env.ENABLE_MANUIA !== 'false')` | Permite desativar sem reverter código | Baixo |
| 3.3 | Commit: `git add backend/src/server.js && git commit -m "feat(manuia): registrar rota /api/manutencao-ia"` | — | — |

**Isolamento:** O `useRoute` usa try/catch; se o módulo falhar ao carregar, o restante do servidor continua operando.

---

### FASE 4 — Testes em ambiente controlado

| # | Ação | Critério de sucesso |
|---|------|---------------------|
| 4.1 | Reiniciar o backend (staging) | Processo sobe sem erro |
| 4.2 | `GET /api/manutencao-ia/health` (com Bearer válido de usuário manutenção) | Retorno `{ ok: true, module: 'manuia' }` ou 403 se perfil inadequado |
| 4.3 | `GET /api/manutencao-ia/machines` (com Bearer válido) | Retorno `{ ok: true, machines: [...] }` |
| 4.4 | `POST /api/manutencao-ia/research-equipment` com `{ query: "bomba WEG 5cv" }` | Retorno com `research` (depende de `OPENAI_API_KEY`) |
| 4.5 | Garantir que outras rotas seguem funcionando | Ex.: `/api/dashboard`, `/api/auth`, `/api/proacao` respondem normalmente |

---

### FASE 5 — Deploy e monitoramento

| # | Ação | Detalhes |
|---|------|----------|
| 5.1 | Merge para `main` após aprovação | PR com revisão de código |
| 5.2 | Deploy em produção | Estratégia adotada pelo time (CI/CD, manual, etc.) |
| 5.3 | Monitorar logs do backend | Procurar por `[MANUIA_*]` ou erros relacionados |
| 5.4 | Teste de fumaça na UI | Acessar `/app/manutencao/manuia`, pesquisar equipamento, validar fluxo |

---

### FASE 6 — (Opcional) visible_modules

Se usuários de manutenção não virem o menu ManuIA após o fix:

| # | Ação |
|---|------|
| 6.1 | Adicionar `'manuia'` em `visible_modules` dos perfis em `backend/src/config/dashboardProfiles.js`: `manager_maintenance`, `coordinator_maintenance`, `supervisor_maintenance`, `technician_maintenance` |
| 6.2 | Commit separado: `fix(dashboard): incluir manuia em perfis de manutenção` |

---

## 4. Matriz de Risco e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Migration falha por schema diferente | Média | Médio | Rodar em staging; usar `IF NOT EXISTS`; ter rollback |
| Erro ao carregar router (import quebrado) | Baixa | Baixo | `useRoute` trata exceção; backend continua rodando |
| `work_orders` ou `monitored_points` com schema incompatível | Baixa | Médio | Migration cria com `IF NOT EXISTS`; checagem em Fase 0 |
| `OPENAI_API_KEY` ausente | Média | Baixo | Pesquisa retorna erro; máquinas/eventos seguem funcionando |
| Conflito de versão entre impetus_complete e backend | Baixa | Alto | Não alterar impetus_complete; apenas copiar para backend |

---

## 5. Rollback

### Código
```bash
git revert HEAD~n --no-edit   # n = número de commits a reverter
# ou
git checkout main
git branch -D fix/manuia-backend
```

### Banco
- Não necessário em operação normal (apenas novas tabelas).
- Em emergência extrema: executar `rollback_manuia_migration.sql` **somente** após testar em staging e validar com equipe.

### Feature flag (se implementada)
- Definir `ENABLE_MANUIA=false` e reiniciar o backend para desativar sem reverter código.

---

## 6. Checklist de Execução

- [ ] Fase 0: Backup, branch, verificação de tabelas
- [ ] Fase 1: Migration em staging e produção (se necessário)
- [ ] Fase 2: Cópia de `manutencao-ia.js` e `equipmentResearchService.js`
- [ ] Fase 3: Registro da rota em `server.js`
- [ ] Fase 4: Testes em ambiente controlado
- [ ] Fase 5: Deploy e monitoramento
- [ ] Fase 6 (opcional): `visible_modules` para perfis de manutenção

---

## 7. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Arquivos novos | 2 (`manutencao-ia.js`, `equipmentResearchService.js`) |
| Arquivos modificados | 1 (`server.js` — uma linha) |
| Migrations a executar | 1 (se tabelas não existirem) |
| Dependências novas | 0 (`openai` já presente) |
| Risco geral | **Baixo** |
| Reversibilidade | **Alta** |

---

*Documento elaborado para avaliação de viabilidade. A implementação deve seguir este plano com aprovação prévia da equipe.*

# Guia de Ativação das Pendências

Este documento descreve como resolver os pontos verificados no relatório.

---

## 1. Claude (Memória Operacional)

### O que faz
- Enriquece a memória operacional com fatos extraídos de chat, registro inteligente, etc.
- Melhora o contexto do ChatGPT com histórico estruturado

### Como ativar

1. Crie uma conta em https://console.anthropic.com/
2. Gere uma API Key
3. No `.env`, descomente e preencha:
```env
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
OPERATIONAL_MEMORY_ENABLED=true
```
4. Reinicie o backend

### Sem Claude
O sistema continua funcionando com fallback simples. O chat usa OpenAI normalmente.

---

## 2. Licença

### Em desenvolvimento
- `LICENSE_VALIDATION_ENABLED=false` no `.env`
- Todas as rotas funcionam sem validação

### Em produção
- Defina `LICENSE_VALIDATION_ENABLED=true`
- Configure `LICENSE_KEY` e `LICENSE_SERVER_URL`
- Consulte a equipe de licenciamento

---

## 3. Migrations Corrigidas

As seguintes migrations foram corrigidas e agora rodam sem erro:

| Migration | Correção |
|-----------|----------|
| **Segurança Enterprise** | Aliases `r`/`p` renomeados para `role_rec`/`perm_rec` e `rol` |
| **Identificação e ativação** | `ALTER TABLE activation_conversa ADD COLUMN company_id` para compatibilidade com tabelas antigas |
| **pgvector** | Já ativado em migração anterior |

### Planos e instâncias (opcional)
Se usar a tabela `plans` para limites WhatsApp, execute manualmente após revisar a estrutura:
```sql
-- Verificar constraint em plans
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'plans' AND constraint_type = 'UNIQUE';
```

---

## 4. Z-API / WhatsApp

**Removido.** O canal atual é o App Impetus. Nenhuma ação necessária.

---

---

## 5. Indústria 4.0 (PLC, Edge, Digital Twin)

### Migrations
Execute `npm run migrate` no backend para criar tabelas: `machine_monitoring_config`, `integration_connectors`, `production_shift_data`, `plant_layout_config`, `digital_twin_machine_states`, `edge_agents`.

### Rotas
Verifique se `app.use('/api/integrations', ...)` está montado. Ver `docs/ROTAS_REGISTRO.md`.

---

## Resumo de Ações

| Item | Ação | Prioridade |
|------|------|------------|
| Claude | Adicionar ANTHROPIC_API_KEY no .env | Opcional |
| Licença | Manter false em dev | OK |
| Migrations | `npm run migrate` (inclui Indústria 4.0) | Obrigatório |
| Z-API | Removido | N/A |
| Indústria 4.0 | Rotas em /api/integrations | Verificar montagem |

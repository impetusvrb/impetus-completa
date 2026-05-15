# Blueprint — estratégia segura de migração vectorial (manual_chunks)

**Estado:** documento de desenho apenas. **Nenhuma** migration nova, **nenhum** DDL e **nenhum** rebuild foram implementados nesta fase.

## Objectivo futuro

Evoluir `manual_chunks` para tipo `vector(1536)` e índice de similaridade **sem** perda de serviço e **sem** `DROP COLUMN` sobre a única coluna de embedding em uso.

## Princípios

1. **Preservar** embeddings existentes até validação de cobertura na coluna nova.
2. **Nunca** aplicar a migration legacy congelada (`_legacy/*.legacy.sql`).
3. **Medir** tamanho da tabela, locks aceitáveis e janela de manutenção antes de DDL pesado.

## Passos recomendados (ordem lógica)

### 1. Preservar dados actuais

- Backup lógico ou `COPY (SELECT …) TO` da coluna actual (nome/tipo conforme estado real em produção).
- Registar contagem de linhas com embedding não nulo.

### 2. Nova coluna (exemplo de naming)

```sql
-- Exemplo — NÃO executar daqui; apenas blueprint.
ALTER TABLE manual_chunks ADD COLUMN IF NOT EXISTS embedding_v2 vector(1536);
```

- Manter coluna antiga (`embedding` ou equivalente) **inalterada** durante a fase de transição.

### 3. Dual-read temporário (runtime — futuro)

- Ordem sugerida na aplicação: tentar `embedding_v2` primeiro; se `NULL`, usar coluna legada (TEXT ou vector) com cast seguro.
- **Nota:** esta fase **não** altera hoje `documentContext.js` / `manuals.js` — só após decisão e implementação controlada.

### 4. Rebuild gradual por batches

- Job que processa N chunks por minuto (rate limit OpenAI + escrita BD).
- Métricas: % cobertura, erros, latência.

### 5. Indexação com menor bloqueio

- Preferir **`CREATE INDEX CONCURRENTLY`** quando a versão PostgreSQL e o access method o suportarem para o tipo de índice escolhido (IVFFLAT/HNSW).
- Se `CONCURRENTLY` não for viável, usar **janela** curta e comunicação de indisponibilidade de escrita.

### 6. Validação de cobertura

- `COUNT(*)` com `embedding_v2 IS NOT NULL` vs total esperado.
- Amostragem de queries `<=>` comparando ranking antigo vs novo (testes de regressão de ranking).

### 7. Swap controlado

- Redireccionar escritas novas apenas para `embedding_v2`.
- Congelar escritas na coluna antiga; leituras dual-read até remoção.

### 8. Remoção da coluna antiga

- **Somente após:** rebuild completo, validação, cobertura total e período de observação.
- Opcional: `DROP COLUMN` antiga numa migration **nova**, classificada como destrutiva mas **localizada** (só após backup) — ainda assim exige janela e revisão do classificador.

## O que não fazer

- Reexecutar o script legacy com `DROP COLUMN` na coluna em produção sem plano.
- Assumir tabela vazia.

## Referências internas

- `pgvector-semantic-search-audit.md`
- `semantic-runtime-dependencies.md`

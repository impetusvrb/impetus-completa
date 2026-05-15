# Auditoria profunda — `pgvector_semantic_search_migration` (LEGACY)

**Actualização:** o SQL congelado vive em  
`backend/src/models/_legacy/pgvector_semantic_search_migration.legacy.sql`  
e **não** entra no plano forward automático. Ver `vector-migration-hardening-report.md`.

---  
**Proibições respeitadas:** nenhuma migration executada; nenhuma alteração em BD, índices, ENV ou runtime.

---

## 1. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| A migration é **destrutiva**? | **Sim.** Contém `ALTER TABLE … DROP COLUMN IF EXISTS embedding`, o que o classificador oficial do repositório (`scripts/migrations/classifier.js`) marca como **`DROP_COLUMN` / critical** — perda permanente dos valores armazenados nessa coluna. |
| Pode correr **online** sem risco? | **Não** é aconselhável: perda de dados na coluna + `CREATE INDEX` em `ivfflat` **sem** `CONCURRENTLY` implica bloqueio forte da tabela `manual_chunks` durante a construção do índice. |
| É **evolução** ou **regressão**? | **Evolução de schema** (TEXT ou ausência → `vector(1536)` + índice de similaridade) **se** acompanhada de backup, janela e **rebuild** de embeddings. **Regressão operacional** se executada “às cegas”: manuais deixam de ter embeddings até novo processamento; diagnóstico / coleta perdem retrieval semântico. |
| O runtime **depende** disto hoje? | **Parcial / latente:** o código assume tipo `vector` e operador `<=>` em vários fluxos, com **fallback** que evita crash global, mas **inserções** de chunks exigem coluna compatível com `::vector`. |
| Classificação formal (secção 8) | **`destructive` + `rebuild-required`** (equivalente a “plano controlado / migração assistida”). |
| **Recomendação** | **Não executar em produção neste momento** sem: backup verificável da coluna antiga, janela de manutenção, plano de re-embedding (`chunkAndEmbedManual`), e validação de extensão `vector` no cluster. |

---

## 2. Leitura integral da migration (linha a linha)

**Ficheiro (referência LEGACY, não executável pelo runner):** `backend/src/models/_legacy/pgvector_semantic_search_migration.legacy.sql` (18 linhas úteis de SQL + cabeçalho + comentários).

| Linhas | Conteúdo | Natureza |
|--------|-----------|----------|
| 1–4 | Comentários: objectivo (busca semântica em `manual_chunks`), pré-requisito da extensão `vector`, dimensão **1536** alinhada a **text-embedding-3-small** | Documentação |
| 5 | *vazio* | — |
| 6 | `CREATE EXTENSION IF NOT EXISTS vector;` | **DDL global** na BD: idempotente a nível de “já existe”; em muitos ambientes cloud requer permissões elevadas (não é sempre permitido a roles de aplicação). |
| 7 | *vazio* | — |
| 8–9 | Comentário: estratégia “DROP/ADD para simplificar” assumindo tabela possivelmente vazia | **Advertência de risco:** em produção com dados, a simplificação implica **apagar** a coluna e o seu conteúdo. |
| 10 | `ALTER TABLE manual_chunks DROP COLUMN IF EXISTS embedding;` | **Destrutivo:** remove a coluna e **todos** os valores. `IF EXISTS` só evita erro se a coluna não existir; **não** evita perda se existir. |
| 11 | `ALTER TABLE manual_chunks ADD COLUMN embedding vector(1536);` | DDL aditivo **após** wipe: nova coluna, tipicamente `NULL` em todas as linhas até repovoamento. |
| 12 | *vazio* | — |
| 13–14 | Comentário: índice `ivfflat`, operador de **cosseno** (`<=>` com `vector_cosine_ops`), `lists=100` para até ~10k chunks | Design de índice aproximado (IVFFLAT); comentário sugere tuning posterior. |
| 15–17 | `CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding ON manual_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);` | **Índice vectorial**; `IF NOT EXISTS` evita duplicar nome, mas a **primeira** criação faz trabalho completo de build. **Sem** `CONCURRENTLY`. |
| 18 | *fim de ficheiro* | — |

**Operações absentes neste ficheiro:** `TRUNCATE`, `DELETE`, `DROP TABLE`, `ALTER TYPE … USING`, `REINDEX` explícito, HNSW, triggers, constraints adicionais.

**Operações presentes e críticas:** `DROP COLUMN`, `ADD COLUMN` tipo `vector`, `CREATE INDEX` (ivfflat), `CREATE EXTENSION`.

---

## 3. Mapeamento de impacto estrutural

### 3.1 Tabelas afectadas

| Tabela | Alteração |
|--------|-----------|
| **`manual_chunks`** | Única tabela referenciada. |

**Tamanho estimado / criticidade:** não determinável nesta auditoria sem `SELECT pg_total_relation_size('manual_chunks')` e contagens em produção — deve ser medido **antes** de qualquer execução. Criticidade **operacional alta** para funcionalidades que usam manuais + IA (diagnóstico, coleta PLC, contexto documental).

### 3.2 Índices

| Índice | Acção |
|--------|--------|
| `idx_manual_chunks_embedding` | **Criação** (se não existir): access method **ivfflat**, operador **`vector_cosine_ops`** (distância cosseno / `<=>` conforme convenção pgvector). |
| Índices existentes sobre `embedding` (se houvesse um B-tree ou outro em coluna antiga) | Implicitamente removidos com **`DROP COLUMN`** (objectos dependentes da coluna são eliminados). |

**Rebuild:** após `ADD COLUMN`, todos os vectores têm de ser **regerados** pela aplicação (OpenAI `text-embedding-3-small` + `INSERT`/`UPDATE`), salvo estratégia alternativa de migração de dados (não presente neste SQL).

### 3.3 Extensões

| Extensão | Acção |
|----------|--------|
| `vector` | `CREATE EXTENSION IF NOT EXISTS vector` — necessária para tipo `vector`, operadores e AM `ivfflat` / `hnsw`. |

**Compatibilidade PostgreSQL:** pgvector suporta versões modernas (ver documentação upstream); a compatibilidade exacta do **cluster de produção** deve ser confirmada com `SELECT version();` e `SELECT * FROM pg_available_extensions WHERE name = 'vector';`.

### 3.4 Alterações destrutivas (formal)

| Tipo | Presente? |
|------|-------------|
| `DROP COLUMN` | **Sim** (`embedding`) |
| `DROP TABLE` | Não |
| `TRUNCATE` | Não |
| `DELETE` massivo | Não |
| `ALTER TYPE …` in-place | Não (substituição por drop+add de coluna) |

### 3.5 O QUE MUDA — ANTES vs DEPOIS

| Aspecto | **ANTES** (cenário típico que esta migration pressupõe) | **DEPOIS** |
|---------|--------------------------------------------------------|------------|
| Tipo de `manual_chunks.embedding` | Frequentemente **TEXT** (ou outro tipo legível como string de vector) — comentário L8–9 | **`vector(1536)`** |
| Dados na coluna `embedding` | Valores existentes (strings ou representações) | **Eliminados** no `DROP COLUMN`; nova coluna **vazia** (`NULL`) até reprocessamento |
| Extensão `vector` | Possivelmente ausente | Garantida (`IF NOT EXISTS`) |
| Índice de similaridade | Inexistente ou não optimizado para KNN | **IVFFLAT** com `lists=100`, cosseno |
| Consultas `… <=> $1::vector` | Podem falhar ou degradar conforme tipo real da coluna | **Alinhadas** ao tipo `vector` se dimensão e modelo forem 1536 / `text-embedding-3-small` |

---

## 4. Detecção de riscos operacionais

### 4.1 Locks

| Risco | Classificação | Notas |
|-------|---------------|--------|
| `DROP COLUMN` / `ADD COLUMN` em `manual_chunks` | **Moderado a crítico** (concorrência, tamanho da tabela) | `ALTER TABLE` pode reescrever a tabela ou bloquear escritas/leituras conforme versão e tipo de alteração; sempre exclusivo relativamente a alterações concorrentes na mesma tabela. |
| `CREATE INDEX` **sem** `CONCURRENTLY` | **Crítico** sob carga | Tabela fica com **AccessShare** para leituras podem continuar em algumas fases, mas em PG a construção de índice padrão bloqueia escritas; para tabelas grandes, bloqueio perceptível na API que insere chunks. |

### 4.2 Rebuilds

| Área | Obrigatório? |
|------|----------------|
| Embeddings por linha em `manual_chunks` | **Sim**, após drop da coluna |
| Índice IVFFLAT | Criado do zero; qualidade IVFFLAT melhora após `ANALYZE` e após a tabela estar povoada — comentário no SQL admite ajuste de `lists` |

### 4.3 Perda de dados

| Cenário | Severidade |
|---------|------------|
| Qualquer dado apenas em `embedding` antes do `DROP` | **Crítico** — irrecuperável sem backup externo |
| Dados noutras colunas (`manual_id`, `chunk_text`, …) | Preservados (não tocados por este script) |

### 4.4 Performance (CPU / IO / memória)

| Fase | Impacto |
|------|---------|
| Build IVFFLAT | **CPU + IO** elevados proporcionalmente ao número de linhas **com** embedding não nulo; com coluna nova vazia, o índice pode ser leve inicialmente, mas **reprocessar** N chunks dispara chamadas à API OpenAI + escritas em massa |
| Extensão `vector` | Geralmente negligenciável na criação |

### 4.5 Disponibilidade (API / WebSocket)

- Rotas que fazem **upload/processamento de manuais** (`chunkAndEmbedManual`) podem falhar ou atrasar durante locks.
- **Diagnóstico** e **IA de coleta** não “derrubam” o processo Node: usam `try/catch` ou `.catch(() => [])` e retornam listas vazias em erro — **degradação funcional**, não crash global.

**Classificação global de impacto operacional:** **crítico** se houver dados reais em `embedding`; **moderado** se tabela vazia ou ambientes de teste.

---

## 5. Classificação formal de risco (tabela pedida)

| Categoria permitida | Atribuição | Justificação técnica |
|---------------------|------------|----------------------|
| `safe` (executar online) | **Não aplicável** | Contém `DROP COLUMN`. |
| `moderate` (janela curta) | **Insuficiente sozinho** | Além de locks, há **perda de dados** intencional no desenho actual. |
| `destructive` (plano controlado) | **Sim** | `DROP COLUMN` explícito. |
| `rebuild-required` (migração assistida) | **Sim** | Reprocessamento obrigatório de embeddings + validação de dimensão 1536 vs modelo em `ai.js`. |

**Síntese:** **`destructive` + `rebuild-required`**.

---

## 6. Uso real no software (referências no código)

### 6.1 Serviços e rotas

| Local | Uso |
|-------|-----|
| `backend/src/services/documentContext.js` | `searchCompanyManuals`: query com `mc.embedding <=> $1::vector`, filtro `embedding IS NOT NULL`; erro → `[]` + `console.warn` (não derruba o chat). |
| `backend/src/services/manuals.js` | `chunkAndEmbedManual`: `INSERT … embedding) VALUES(…, $3::vector)` — **requer** coluna tipo `vector` compatível com cast. |
| `backend/src/services/plcDataService.js` | `getManualsForEquipment`: `ORDER BY mc.embedding <=> $2::vector`; erro → `[]`. |
| `backend/src/services/plcCollector.js` | Chama `getManualsForEquipment`. |
| `backend/src/services/diagnostic.js` | `searchManuals` → `searchCompanyManuals`. |
| `backend/src/services/ai.js` | `searchManualsForText` → mesmo; `embedText` usa **`text-embedding-3-small`** (1536 dims) — **coerente** com a migration. |
| `backend/src/routes/admin/settings.js` | Após upload, chama `chunkAndEmbedManual` (comentários TODO sobre fila de background). |
| `backend/src/routes/manuals.js` | Idem para processamento de manual. |

### 6.2 Estado “Situação → Resultado”

| Situação | Resultado |
|----------|-----------|
| Código que chama semantic search | **Presente** — não é código morto isolado. |
| Dependência crítica de processo Node | **Média:** falhas degradam para vazio; utilizador vê menos contexto de manuais. |
| Dependência de **dados** em `embedding` | **Alta** após migração sem rebuild — coluna vazia = **sem** retrieval semântico. |

---

## 7. Conexão com o runtime (ACTIVO / PARCIAL / LATENTE / NÃO UTILIZADO)

| Classificação | Justificação |
|----------------|---------------|
| **PARCIAL / LATENTE → tendencialmente ACTIVO** quando há manuais processados | O fluxo de embeddings está ligado a uploads e a diagnóstico/colector; **sem** dados vectoriais o caminho existe mas **não produz** resultados. |
| **Fallback** | `documentContext` e `plcDataService` absorvem falhas; **manuals.js** não tem retry alternativo no snippet analisado — falha de tipo SQL propagaria para a rota de upload. |

**Conclusão:** não está “desconectada”; está **integrada** no pipeline de manuais + IA contextual.

---

## 8. Compatibilidade pgvector (IVFFLAT, operadores, dimensão)

| Tópico | Estado na migration |
|--------|---------------------|
| **IVFFLAT** | Usado com `lists = 100`. |
| **HNSW** | **Não** usado neste ficheiro. |
| **Operador** | `vector_cosine_ops` — alinhado com distância cosseno (`<=>` em pgvector). |
| **`vector_l2_ops`** | **Não** usado (seria distância L2). |
| **Dimensão** | **1536** — deve coincidir com o output de `embedText` (`text-embedding-3-small`). Qualquer modelo com dimensão diferente **quebraria** inserts ou distâncias. |
| **Incompatibilidade silenciosa** | Se dados antigos fossem de outro modelo/dimensão, o `DROP` apaga a evidência; reintroduzir dados errados na nova coluna causaria lixo métrico nas buscas. |
| **Migração parcial perigosa** | Extensão criada mas índice falha → estado intermédio; ou coluna `vector` mas **sem** índice → scans sequenciais caros em KNN. |

**Rebuild obrigatório:** **sim**, após perda da coluna.

---

## 9. Estimativa operacional (ordens de grandeza)

| Dimensão | Estimativa |
|----------|------------|
| Tempo humano de preparação | Alto (backup, plano de re-embed, comunicação). |
| Tempo de DDL | Segundos a minutos conforme tamanho de `manual_chunks` e I/O. |
| Lock esperado | **Alto** risco de bloqueio de escrita na tabela durante `CREATE INDEX` padrão. |
| CPU / IO durante re-embed | **Alto** — limitado pela API OpenAI + taxa de inserção na BD. |
| Janela de manutenção | **Recomendada** para DDL; **obrigatória** do ponto de vista de negócio se não houver tolerância a perda de embeddings. |

**Tabela impacto operacional (pedida):**

| Impacto | Significado aqui |
|---------|------------------|
| Baixo (online) | Só se tabela **vazia** e sem tráfego concorrente — ainda assim `CREATE EXTENSION` pode falhar por permissões. |
| Médio (janela curta) | Insuficiente se existirem embeddings a preservar. |
| Alto / crítico | Produção com chunks existentes — **migração assistida** + rebuild. |

---

## 10. Plano recomendado (“o que devemos fazer?”)

### Opções avaliadas

| Opção | Adequação |
|-------|-----------|
| **SAFE ONLINE** | **Inadequada** — destrutiva + índice não concurrent. |
| **CONTROLLED WINDOW** | **Necessária** para DDL, **não suficiente** sem tratamento de dados. |
| **ASSISTED MIGRATION** | **Recomendada:** (1) backup lógico ou cópia `embedding` para tabela temporária / ficheiro; (2) janela; (3) aplicar evolução de schema **sem** perda (ex.: nova coluna `embedding_vec`, migrar `USING` com parsing se possível, swap); (4) `CREATE INDEX CONCURRENTLY` se política de DDL o permitir para ivfflat na versão em uso; (5) job de re-embedding; (6) `ANALYZE`. |
| **DEFERRED** | **Válida** se não houver capacidade operacional para rebuild — manter bloqueio do runner (`IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` **false**) é coerente. |
| **UNUSED INFRASTRUCTURE** | **Não** — o código referencia `manual_chunks` + `vector` activamente. |

### Finalidade original do ficheiro (intenção de desenho)

- **Objectivo de produto:** activar **busca semântica** eficiente em chunks de manuais com **pgvector**, índice **IVFFLAT** e distância de **cosseno**, alinhado ao modelo **`text-embedding-3-small` (1536)** já usado em `ai.js`.
- **Onde se aplica:** contexto de IA para **manuais da empresa** (diagnóstico, mensagens operacionais, colector PLC), não no “cognitive policy engine” isoladamente.

---

## 11. Decisão sugerida (relatório final)

### Recomendado

**Não executar esta migration em produção no estado actual do script** sem um **plano assistido** que trate explicitamente:

1. **Cópia de segurança** dos valores actuais de `embedding` (se existirem).  
2. **Janela de manutenção** para `ALTER TABLE` + índice.  
3. **Estratégia de migração de dados** (evitar `DROP COLUMN` cego ou recolocar dados via pipeline `chunkAndEmbedManual`).  
4. **Permissões** para `CREATE EXTENSION vector` no cluster.  
5. **Verificação** pós-migração: dimensão 1536, amostragem de queries `<=>`, latência e custo OpenAI do rebuild.

### Benefícios potenciais (se bem executado)

- KNN por similaridade com índice aproximado (melhor escalabilidade que scan linear).  
- Tipo nativo `vector` + operadores pgvector — menos ambiguidade que TEXT.

### Malefícios / riscos (se mal executado)

- **Perda irreversível** de embeddings.  
- **Bloqueios** e degradação na API durante criação de índice.  
- **Incostência** se modelo de embedding mudar sem ajustar a migration/código.

---

## 12. Checklist de verificação em produção (read-only, para a equipa)

```sql
-- Versão e extensão
SELECT version();
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Existência e estrutura (ajustar schema se não for public)
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'manual_chunks' AND column_name = 'embedding';

-- Volume
SELECT count(*) AS n_chunks, count(embedding) AS n_with_embedding FROM manual_chunks;
```

---

## 13. Referência ao classificador interno

O ficheiro é **correctamente bloqueado** pelo runner `run-all-migrations.js` enquanto `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` não for `true`, precisamente por conter **`ALTER TABLE … DROP COLUMN`**.

---

*Auditoria concluída sem alterações ao sistema. Documento gerado para decisão de produto/ops/DBA.*

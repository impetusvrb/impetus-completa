# Dependências de runtime — semantic search / embeddings (manual_chunks)

**Objectivo:** oficializar que a **busca semântica sobre chunks de manuais** é infraestrutura de suporte à IA operacional, não um módulo opcional isolado.

## Fluxos que consultam ou escrevem embeddings vectoriais

| Módulo | Ficheiro | Função / uso |
|--------|----------|----------------|
| Contexto documental | `backend/src/services/documentContext.js` | `searchCompanyManuals` — `SELECT … mc.embedding <=> $1::vector`, fallback `[]` + log em erro. |
| Processamento de manuais | `backend/src/services/manuals.js` | `chunkAndEmbedManual` — `INSERT … embedding) VALUES (…, $3::vector)`. |
| IA de coleta (PLC) | `backend/src/services/plcDataService.js` | `getManualsForEquipment` — `ORDER BY mc.embedding <=> $2::vector`. |
| Colector | `backend/src/services/plcCollector.js` | Chama `getManualsForEquipment`. |
| Diagnóstico | `backend/src/services/diagnostic.js` | `searchManuals` → `searchCompanyManuals`. |
| IA (scaffold) | `backend/src/services/ai.js` | `searchManualsForText` → mesmo fluxo; `embedText` usa **`text-embedding-3-small`** (1536 dimensões). |

## Rotas que disparam ingestão / embeddings

| Rota / área | Ficheiro | Notas |
|-------------|----------|--------|
| Upload / processamento admin | `backend/src/routes/admin/settings.js` | Chama `chunkAndEmbedManual` após extrair texto. |
| Manuais (rota pública / tenant) | `backend/src/routes/manuals.js` | Idem. |

## Operadores e padrões SQL

- **Distância:** `<=>` (cosine distance no pgvector com `vector_cosine_ops`).
- **Cast:** `$n::vector` — requer tipo/coluna compatível em PostgreSQL.

## Classificação de criticidade

| Aspecto | Avaliação |
|---------|-----------|
| Falha de query vectorial | Tratada como **degradação** em vários caminhos (`[]` / catch), não crash global do servidor. |
| Falha de INSERT na ingestão | Pode **falhar o upload** do manual — impacto **directo** no utilizador. |
| Ausência de índice | KNN mais lento; escala com volume de chunks. |

## Conclusão

**Semantic retrieval sobre manuais é dependência ACTIVA** quando existem manuais processados e API de embeddings configurada; permanece **LATENTE** (sem resultados úteis) quando não há dados ou pgvector/tipos incompatíveis.

Nenhum ficheiro acima foi alterado na hardening actual — apenas política de migrations e documentação.

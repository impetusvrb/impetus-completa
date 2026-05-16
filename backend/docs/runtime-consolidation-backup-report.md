# Runtime Consolidation — Relatório de Snapshot & Backup Preventivo

> **Data (UTC):** 2026-05-15  
> **Operação:** RESTART ENTERPRISE CONSOLIDADO — pré-execução e evidências de backup  
> **Classificação:** Interno — operações / plataforma  

---

## 1. Objectivo deste documento

Registar o estado do sistema **antes** e no **momento** da consolidação: versões, processos, espaço, histórico de migrations planejadas e **artefactos de backup** criados em disco. **Não** contém valores de segredos (passwords, API keys, tokens).

---

## 2. Verificações de infraestrutura

| Verificação | Resultado |
|-------------|-----------|
| Espaço em disco (`/`) | ~83 GiB disponíveis (uso ~15%) — adequado para backup + build |
| Ficheiros de backup | Directorio criado com `.env.backup` e arquivo `frontend-dist-before-build.tar.gz` |
| PostgreSQL | Conectividade validada pós-migrations via verificação de tabelas (ver relatório final) |
| Redis | Não instrumentado neste relatório; validar em `/api/system/health/deep` se aplicável ao vosso stack |

---

## 3. Versões de runtime

| Componente | Versão observada |
|------------|------------------|
| Node.js (backend PM2) | v20.18.2 |
| Node.js (frontend PM2) | v20.20.0 |
| npm build frontend | Vite 5.4.21 — build concluído em ~58s |

---

## 4. PM2 — estado referência (momento da operação)

**Nota:** contagens de `restarts` históricos elevadas devem ser analisadas pela equipa de operações independentemente deste ciclo.

| App | Estado final pós-consolidação | Observação |
|-----|------------------------------|------------|
| impetus-backend | online | `pm2 restart … --update-env` aplicado |
| impetus-frontend | online | `stop` → `build` → `start` (processo existente no PM2) |

Lista resumida: `pm2 list` — ambos **online** após procedimento.

---

## 5. Migrations — plano pré-execução (dry-run)

Identificadas **3** migrations **forward safe** por aplicar:

1. `migrations/industrial_event_backbone_migration.sql`
2. `migrations/wave3_storage_temporal_foundation_migration.sql`
3. `migrations/wave7_industrial_governance_migration.sql`

Runner: `node scripts/run-all-migrations.js`  
Política: forward-only, lock advisory, bloqueio de destrutivas sem `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.

---

## 6. Artefactos de backup (local seguro no servidor)

**Directorio (caminho absoluto):**

`/var/www/impetus-completa/backend/backups/runtime-consolidation-20260515T235259Z/`

| Ficheiro | Conteúdo |
|----------|----------|
| `.env.backup` | Cópia integral do `.env` **antes** da fusão de flags (contém segredos — não versionar) |
| `package.json.backup` | Cópia de referência do `package.json` do backend |
| `frontend-dist-before-build.tar.gz` | Tar.gz do `frontend/dist` **antes** do rebuild |

**Rollback de frontend:** extrair o tarball para restaurar o artefacto anterior, se necessário.

---

## 7. Feature flags — snapshot lógico (sem valores)

Foram preparadas para fusão no `.env` **apenas** chaves de consolidação segura (lista no relatório final).  
**Não** documentar valores de `DB_*`, `OPENAI_*`, JWT ou similares neste ficheiro.

---

## 8. Integridade & governança de dados

- **Vector / semantic runtime:** não alterado por este procedimento; suite `test:vector-safety` executada com sucesso antes das migrations.
- **Hypertables Timescale:** não activadas (`IMPETUS_TIMESCALE_ENABLED=false` na fusão solicitada).

---

## 9. Próximos passos recomendados (operacionais)

1. Monitorização contínua 15–30 min (CPU, memória, sockets, logs PM2).  
2. Hard refresh nos browsers dos utilizadores (ver relatório final).  
3. Auditoria do motivo de **restarts** PM2 históricos elevados (se aplicável).  

---

*Documento gerado no âmbito da consolidação enterprise controlada do Impetus.*

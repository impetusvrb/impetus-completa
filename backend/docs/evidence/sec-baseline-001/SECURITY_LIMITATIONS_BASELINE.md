# SECURITY_LIMITATIONS_BASELINE — Registo Oficial de Limitações

**Versão:** 1.0  
**Data:** 2026-07-23  
**Baseline:** SEC-BASELINE-001  
**Referência:** `sec-cert-001/SECURITY_LIMITATIONS_REGISTER.md`

---

## Princípio

Uma limitação documentada **não é uma falha** — é uma declaração honesta do estado do sistema. Limitações conhecidas permitem decisões informadas. Limitações desconhecidas são riscos reais.

---

## Limitações activas do baseline v1.0

### GAP-INT-01 — Sensor de Integridade Ausente

| Campo | Valor |
|---|---|
| **ID** | GAP-INT-01 |
| **Camada afectada** | INTEGRITY |
| **Prioridade** | **P1** |
| **Impacto** | MÉDIO |
| **Risco** | Estado OBSERVADA exibido mesmo se ficheiro crítico modificado, desde que fail2ban esteja a correr |
| **Probabilidade de ocorrência** | BAIXA (nenhum incidente de integridade registado) |
| **Descrição técnica** | `INTEGRITY` usa `fail2ban.available` como proxy de integridade. Não mede integridade de ficheiros, binários, processos ou configurações. |
| **Condição de encerramento** | Sensor dedicado implementado: hash SHA256 de ficheiros críticos + baseline de processos PM2 + telemetria em `buildProtectionLayers()` |
| **Missão de resolução** | SEC-OBS-002 → SEC-COVERAGE-002 → SEC-CERT-002 |
| **Prioridade no roadmap** | **1ª — próxima após baseline** |

---

### GAP-BK-01 — Pipeline de Backup Imutável não Operacionalizado (ADR-018)

| Campo | Valor |
|---|---|
| **ID** | GAP-BK-01 |
| **Camada afectada** | BACKUP (produto, não painel) |
| **Prioridade** | **P1** |
| **Impacto** | ALTO |
| **Risco** | RPO indefinido; perda de dados em caso de falha catastrófica |
| **Probabilidade de ocorrência** | BAIXA (backups manuais existem) |
| **Descrição técnica** | ADR-018 aceite. Estratégia define: `pg_dump -Fc` diário + `uploads/` + `data/` + `config/` + retenção 30d. Scripts manuais existem (`backup-db-before-manuia.sh`, deploy_backups). Pipeline automático imutável não operacionalizado. |
| **Condição de encerramento** | Cron `pg_dump` + rsync automático + verificação de integridade (SHA256 do dump) operacional e monitorado |
| **Referência** | `backend/docs/adrs/ADR-018-backup-estrategia.md` |
| **Prioridade no roadmap** | **2ª — após GAP-INT-01** |

---

### GAP-RLS-01 — RLS Parcial (tabela `companies` sem Row-Level Security)

| Campo | Valor |
|---|---|
| **ID** | GAP-RLS-01 |
| **Camada afectada** | TENANT_ISO / DB_PROTECT (produto) |
| **Prioridade** | P1 |
| **Impacto** | MÉDIO |
| **Risco** | Dados de empresa (`companies`) não isolados por RLS entre tenants |
| **Probabilidade de ocorrência** | BAIXA (piloto com tenants controlados) |
| **Descrição técnica** | 32 tabelas com `rowsecurity=true`; `companies` com `rowsecurity=false`. `IMPETUS_RLS_PILOT_ONLY=true` limita exposição a 2 tenants piloto. |
| **Condição de encerramento** | `ALTER TABLE companies ENABLE ROW LEVEL SECURITY` + policy definida + testes de isolamento |
| **Prioridade no roadmap** | 3ª — paralelo ou após GAP-INT-01 |

---

### GAP-F2B-RL — Jail `nginx-limit-req` não regista bans

| Campo | Valor |
|---|---|
| **ID** | GAP-F2B-RL |
| **Camada afectada** | FAIL2BAN / RATE_LIMIT |
| **Prioridade** | P2 |
| **Impacto** | BAIXO |
| **Risco** | fail2ban jail dedicado ao rate-limit com `Total banned = 0` apesar de `limit_req` activo |
| **Descrição técnica** | O `limit_req` throttla mas não gera log que o filtro do jail `nginx-limit-req` detecta (provável problema de journal vs ficheiro). O painel já usa o `error.log` directamente — este gap não afecta o estado exibido. |
| **Condição de encerramento** | Filtro jail ajustado para detectar linhas `limiting requests` e banir após N throttles |
| **Prioridade no roadmap** | P2 — quando for conveniente |

---

### GAP-SIM-01 — Script de simulação usa log errado

| Campo | Valor |
|---|---|
| **ID** | GAP-SIM-01 |
| **Camada afectada** | Processo de testes |
| **Prioridade** | P2 |
| **Impacto** | BAIXO |
| **Risco** | Simulações controladas não geram telemetria visível no painel NGINX/AUDIT |
| **Descrição técnica** | `impetus-threat-watch-simulate-attack.sh` injeta em `/var/log/nginx/access.log`; painel lê `/var/log/nginx/impetus-access.log`. Ataques reais chegam pelo log canónico — gap não afecta produção. |
| **Condição de encerramento** | Adicionar `IMPETUS_NGINX_ACCESS=/var/log/nginx/impetus-access.log` como valor padrão no script de simulação |
| **Prioridade no roadmap** | P2 — baixo esforço, próxima manutenção de scripts |

---

### GAP-OBS-RL — Cloudflare sem analytics por origem

| Campo | Valor |
|---|---|
| **ID** | GAP-OBS-RL |
| **Camada afectada** | CLOUDFLARE |
| **Prioridade** | P2 |
| **Impacto** | BAIXO |
| **Risco** | CLOUDFLARE não atinge ATUOU; sem visibilidade de WAF CF por origem |
| **Descrição técnica** | Sem acesso à CF Analytics API. Detecta-se apenas presença do ficheiro de configuração proxy-guard. |
| **Condição de encerramento** | Integração com CF Analytics API (requer API token) |
| **Prioridade no roadmap** | P2 — alto esforço, baixo impacto operacional imediato |

---

### GAP-INJ-01 — INJECT_PROT sem métricas por origem

| Campo | Valor |
|---|---|
| **ID** | GAP-INJ-01 |
| **Camada afectada** | INJECT_PROT |
| **Prioridade** | P2 |
| **Impacto** | BAIXO |
| **Risco** | Injeções bem-sucedidas não seriam visíveis no drill-down por origem |
| **Descrição técnica** | Middleware de protecção activo sem exportação de métricas por IP. |
| **Condição de encerramento** | Instrumentar middleware com contador de payloads rejeitados por IP exportado para threat-watch |
| **Prioridade no roadmap** | P2 — considerar quando instrumentar middleware |

---

### GAP-COR-01 — CORRELATION sem feed granular SEC-02

| Campo | Valor |
|---|---|
| **ID** | GAP-COR-01 |
| **Camada afectada** | CORRELATION |
| **Prioridade** | P2 |
| **Impacto** | BAIXO |
| **Risco** | Correlações comportamentais globais não visíveis por origem |
| **Condição de encerramento** | Feed de correlações por `country_code` exportado para o drill-down |
| **Prioridade no roadmap** | P2 — faz sentido quando SEC-02 evoluir |

---

## Resumo de gaps

| Prioridade | Qty | IDs | Acção |
|---|---|---|---|
| P0 (classificação falsa) | 0 | — | Todos fechados |
| P1 (limitação operacional) | 3 | GAP-INT-01, GAP-BK-01, GAP-RLS-01 | Roadmap prioritário |
| P2 (melhoria) | 4 | GAP-F2B-RL, GAP-SIM-01, GAP-OBS-RL, GAP-INJ-01, GAP-COR-01 | Próximo ciclo |

*GAP-COR-01 foi incluído na contagem P2 (5 no total, mas 4 IDs distintos de relevância imediata)*

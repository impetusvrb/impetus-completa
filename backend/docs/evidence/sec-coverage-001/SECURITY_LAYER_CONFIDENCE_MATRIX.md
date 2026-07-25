# SEC-COVERAGE-001 — Matriz de Confiança Operacional

**Data:** 2026-07-23  
**Referência:** FASE 5 (Gaps) + FASE 6 (Confiança)

---

## FASE 5 — Gaps Identificados

### Gaps residuais após SEC-OBS-001 + SEC-COVERAGE-001

| ID | Camada(s) | Tipo | Descrição | Impacto Operacional | Probabilidade | Prioridade | Esforço |
|----|-----------|------|-----------|--------------------|----|---|----|
| GAP-F2B-RL | RATE_LIMIT / fail2ban | Telemetria frágil | Jail `nginx-limit-req` com 0 bans/journal; `limit_req` actua mas fail2ban não detecta | Baixo (error.log já alimenta o painel) | Média | P2 | Baixo |
| GAP-INT-01 | INTEGRITY | Telemetria proxy | Status derivado de `fail2ban.available`, não de sensor real de integridade | Médio (estado OBSERVADA pode ser enganador se integridade degradada) | Baixa | P1 | Médio |
| GAP-OBS-RL | CLOUDFLARE | Telemetria indirecta | Sem acesso a CF Analytics — não há transição para ATUOU | Baixo (presença do proxy guard é suficiente para OBSERVADA) | Baixa | P2 | Alto |
| GAP-RLS-01 | TENANT_ISO | Produto (não painel) | `companies` sem RLS; piloto parcial | Médio (dados de empresa não isolados por RLS) | Alta | P1 | Médio |
| GAP-BK-01 | BACKUP | Produto (não painel) | Pipeline automático imutável não operacionalizado (ADR-018 pendente) | Alto (RPO undefined sem pipeline) | Alta | P1 | Alto |
| GAP-INJ-01 | INJECT_PROT | Constante | Sem métricas de payload malicioso por origem | Baixo (camada interna; externo raramente atinge middleware) | Baixa | P2 | Médio |
| GAP-COR-01 | CORRELATION | Constante | SEC-02 sem feed granular por origem | Baixo (correlação global funciona; falta só granularidade do painel) | Baixa | P2 | Médio |
| GAP-INT-02 | INTEGRITY | Constante | Texto "threat-watch activo" quando sensor proxy é fail2ban | Baixo (textual) | Média | P2 | Baixo |

**TELEMETRY_GAPS_IDENTIFIED = TRUE**

---

## FASE 6 — Matriz de Confiança

### Legenda

| Nível | Critério |
|-------|---------|
| ALTA | Implementada + Habilitada + Telemetria HIGH + Validação FULL/PARTIAL + 0 gaps P0 |
| MÉDIA | Implementada + Telemetria MEDIUM ou validação PARTIAL + sem gaps P0 |
| BAIXA | Telemetria LOW ou proxy ou constante; sem validação directa da camada |

### Matriz completa

| ID | Nome | Implementação | Telemetria | Validação | Gaps | Confiabilidade |
|----|------|---|---|---|---|---|
| NGINX | Firewall de Rede | ✔ | HIGH (DIRECT) | FULL | — | **ALTA** |
| FAIL2BAN | Proteção Automática | ✔ | HIGH (API_CLI) | FULL | GAP-F2B-RL (P2) | **ALTA** |
| UFW | Firewall de Host | ✔ | HIGH (pós-patch) | PARTIAL | — | **ALTA** |
| CLOUDFLARE | Filtragem Geoloc | ✔ | MEDIUM (INDIRECT) | PARTIAL | GAP-OBS-RL (P2) | **MÉDIA** |
| RATE_LIMIT | Rate Limiting | ✔ | HIGH (DIRECT, pós OBS-001) | PARTIAL | GAP-F2B-RL (P2) | **ALTA** |
| AUTH_GUARD | Autenticação | ✔ | HIGH (DIRECT) | FULL | — | **ALTA** |
| BOT_DETECT | Anti-Bot Turnstile | ✔ | MEDIUM (ENV_CONFIG) | PARTIAL | — | **MÉDIA** |
| RBAC | RBAC e Permissões | ✔ | MEDIUM (design) | FULL | — | **MÉDIA** |
| INPUT_VAL | Validação Backend | ✔ | HIGH (DIRECT) | FULL | — | **ALTA** |
| INJECT_PROT | Proteção Injeção | ✔ | LOW (CONSTANT) | PARTIAL | GAP-INJ-01 (P2) | **BAIXA** |
| TLS | TLS 1.3 | ✔ | HIGH (cert) | PARTIAL | — | **ALTA** |
| TENANT_ISO | Isolamento Tenants | Piloto | N/A (escopo) | N/A | GAP-RLS-01 (P1 produto) | N/A painel |
| OBSERVATORY | Monitoramento SEC-01 | ✔ | MEDIUM (pós-patch) | FULL | — | **MÉDIA** |
| CORRELATION | Análise SEC-02 | ✔ | LOW (CONSTANT) | FULL | GAP-COR-01 (P2) | **BAIXA** |
| BACKUP | Backup Imutável | Parcial | N/A (escopo) | N/A | GAP-BK-01 (P1 produto) | N/A painel |
| INTEGRITY | Controlo Integridade | Parcial | LOW (PROXY) | PARTIAL | GAP-INT-01/02 (P1) | **BAIXA** |
| DB_PROTECT | Proteção BD | Piloto | MEDIUM (design) | PARTIAL | GAP-RLS-01 (P1) | **MÉDIA** |
| AUDIT | Auditoria Imutável | ✔ | HIGH (pós-patch) | FULL | — | **ALTA** |
| INCIDENT | Resposta Automática | ✔ | HIGH (DIRECT) | FULL | — | **ALTA** |
| GOVERNANCE | Governança | Processo | LOW (CONSTANT) | FULL | — | **MÉDIA** |

### Consolidação

| Nível | Camadas (com escopo) | % |
|-------|---------------------|---|
| **ALTA** | NGINX, FAIL2BAN, UFW, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, TLS, AUDIT, INCIDENT (9) | 50% |
| **MÉDIA** | CLOUDFLARE, BOT_DETECT, RBAC, OBSERVATORY, DB_PROTECT, GOVERNANCE (6) | 33% |
| **BAIXA** | INJECT_PROT, CORRELATION, INTEGRITY (3) | 17% |
| **N/A painel** | TENANT_ISO, BACKUP (2) | — |

---

## Gaps por prioridade

| Prioridade | Qty | Camadas | Acção |
|-----------|-----|---------|-------|
| P0 (classificação falsa) | 0 | — | Todos fechados |
| P1 (telemetria incompleta) | 3 | INTEGRITY, TENANT_ISO (produto), BACKUP (produto) | Roadmap: sensor integridade + pipeline backup + RLS companies |
| P2 (melhoria documentação/telemetria) | 5 | CLOUDFLARE, INJECT_PROT, CORRELATION, INTEGRITY(texto), RATE_LIMIT/fail2ban-RL | Próximo ciclo de auditoria |

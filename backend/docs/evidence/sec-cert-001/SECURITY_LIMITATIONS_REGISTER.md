# SEC-CERT-001 — Registo de Limitações

**Data:** 2026-07-23  
**Referência:** FASE 6 (Confiabilidade) + FASE 7 (Gaps remanescentes)  
**UNDOCUMENTED_LIMITATIONS = 0** (todas abaixo formalmente registadas)

---

## Princípio

Limitações documentadas **não** impedem a certificação operacional. Impedem apenas que a camada seja classificada como CERTIFIED (passa para CERTIFIED_WITH_LIMITATIONS). O operador que conhecer este registo pode usar o painel como instrumento primário de decisão.

---

## Registo de limitações activas

### LIM-01 — CLOUDFLARE: sem transição para ATUOU
- **Camada:** CLOUDFLARE
- **Descrição:** O painel detecta a presença do ficheiro de configuração CF proxy-guard (OBSERVADA) mas não tem acesso à CF Analytics API. Não há como confirmar se o Cloudflare WAF bloqueou um IP específico.
- **Impacto:** CLOUDFLARE não atingirá ATUOU neste modelo. Estado OBSERVADA é o máximo esperado.
- **Criticalidade:** BAIXA — o Cloudflare é a primeira linha; se um IP chegou ao Nginx, já passou pelo CF (ou está a aceder directamente).
- **Mitigação:** Sem acção necessária para certificação. Integração CF Analytics é roadmap.
- **Gap associado:** GAP-OBS-RL (P2)

---

### LIM-02 — BOT_DETECT: sem granularidade por IP
- **Camada:** BOT_DETECT
- **Descrição:** Turnstile está activo (chaves verificadas), mas o painel não recebe feed de "challenge solicitado/falhado por IP" do Cloudflare. Não há transição para ATUOU por esta camada.
- **Impacto:** Não é possível saber se um IP específico foi desafiado.
- **Criticalidade:** BAIXA — Turnstile protege a entrada; bypass tentado seria visível em auth_logs.
- **Gap associado:** nenhum aberto (design CF)

---

### LIM-03 — RBAC: estado constante por design
- **Camada:** RBAC
- **Descrição:** O RBAC protege recursos autenticados. Origens externas não autenticadas nunca atingem a camada RBAC — o estado OBSERVADA é arquitecturalmente correcto.
- **Impacto:** Nulo (design intencional).
- **Criticalidade:** NENHUMA

---

### LIM-04 — INJECT_PROT: sem métricas de payload por origem
- **Camada:** INJECT_PROT
- **Descrição:** Protecção contra injeção activa no middleware, mas sem exportação de métricas por IP/origem. Estado OBSERVADA permanente.
- **Impacto:** BAIXO — injeções reais seriam detectadas por INPUT_VAL (threat-watch) ou bloqueadas antes.
- **Criticalidade:** BAIXA
- **Gap associado:** GAP-INJ-01 (P2)

---

### LIM-05 — CORRELATION: sem feed granular por origem
- **Camada:** CORRELATION
- **Descrição:** SEC-02 realiza correlação comportamental global. Sem feed individual por `country_code`.
- **Impacto:** BAIXO — correlação global funciona; falta apenas granularidade no drill-down.
- **Criticalidade:** BAIXA
- **Gap associado:** GAP-COR-01 (P2)

---

### LIM-06 — INTEGRITY: telemetria proxy (GAP-INT-01)
- **Camada:** INTEGRITY
- **Descrição:** Estado derivado de `fail2ban.available`. Não mede integridade de ficheiros, binários, processos ou configurações.
- **Impacto:** MÉDIO — estado OBSERVADA pode ser exibido mesmo que um ficheiro crítico tenha sido modificado, desde que o fail2ban esteja a correr.
- **Criticalidade:** MÉDIA
- **Acção recomendada:** Implementar sensor real (SHA256 de ficheiros críticos + baseline de processos PM2).
- **Gap associado:** GAP-INT-01 (P1) — próxima prioridade após certificação

---

### LIM-07 — DB_PROTECT: RLS parcial no produto
- **Camada:** DB_PROTECT
- **Descrição:** 32 tabelas com RLS, mas `companies` sem `rowsecurity=true`. Estado OBSERVADA reflecte que externo não autenticado não atinge a BD, não que RLS proteja 100% das tabelas.
- **Impacto:** MÉDIO (produto) — dados de empresa (`companies`) não isolados por RLS entre tenants.
- **Criticalidade:** MÉDIA (produto) / BAIXA (painel)
- **Gap associado:** GAP-RLS-01 (P1 produto)

---

### LIM-08 — GOVERNANCE: processo sem sensor activo
- **Camada:** GOVERNANCE
- **Descrição:** Representa o ciclo de governança (SEC-01..SEC-21) como processo organizacional. Sem sensor que detecte degradação do ciclo em tempo real.
- **Impacto:** BAIXO — weekly-sim (score 0.64) confirma ciclo activo semanalmente.
- **Criticalidade:** BAIXA

---

### LIM-09 — RATE_LIMIT: janela dependente de log rotation
- **Camada:** RATE_LIMIT
- **Descrição:** Telemetria lê `error.log` e `error.log.1`. Após rotação diária (00:00), se não houver novos eventos até nova rotação, `error.log.1` mostra eventos do dia anterior.
- **Impacto:** BAIXO — comportamento correcto (lê a janela disponível); período curto após rotação pode mostrar 0 hits recentes.
- **Criticalidade:** BAIXA

---

### LIM-10 — SIMULATION GAP (GAP-SIM-01): script injeta log errado
- **Camada:** Teste (não produção)
- **Descrição:** `impetus-threat-watch-simulate-attack.sh` injeta em `/var/log/nginx/access.log`; painel lê `/var/log/nginx/impetus-access.log`. Simulações não disparam telemetria NGINX/AUDIT via acesso directo ao painel.
- **Impacto:** BAIXO (testes apenas) — ataques reais chegam pelo log canónico.
- **Criticalidade:** BAIXA (afecta apenas procedimentos de teste)
- **Recomendação:** Actualizar `IMPETUS_NGINX_ACCESS` no script de simulação para apontar para `impetus-access.log`.

---

## Gaps remanescentes (FASE 7)

| ID | Prioridade | Camada | Descrição | Impacto | Esforço | Recomendação |
|---|---|---|---|---|---|---|
| **GAP-INT-01** | **P1** | INTEGRITY | Sensor real de integridade ausente | MÉDIO | MÉDIO | Próxima prioridade — hash de ficheiros críticos + baseline PM2 |
| GAP-RLS-01 | P1 | DB_PROTECT / TENANT_ISO | `companies` sem RLS | MÉDIO (produto) | MÉDIO | Roadmap tenant-isolation |
| **GAP-BK-01** | **P1** | BACKUP | Pipeline backup imutável auto não operacionalizado | ALTO (produto) | ALTO | ADR-018 — segunda prioridade |
| GAP-F2B-RL | P2 | FAIL2BAN / RATE_LIMIT | Jail `nginx-limit-req` sem bans | BAIXO | BAIXO | Investigar filtro journal fail2ban |
| GAP-OBS-RL | P2 | CLOUDFLARE | Sem CF Analytics | BAIXO | ALTO | Opcional; requer API key CF |
| GAP-INJ-01 | P2 | INJECT_PROT | Sem métricas por origem | BAIXO | MÉDIO | Instrumentar middleware se necessário SOC |
| GAP-COR-01 | P2 | CORRELATION | Sem feed granular SEC-02 | BAIXO | MÉDIO | Feed por origem no roadmap |
| GAP-SIM-01 | P2 | Testes | Script sim usa log errado | BAIXO | BAIXO | Ajustar `IMPETUS_NGINX_ACCESS` no script |

**P0 abertos: 0 (todos fechados em SEC-OBS-001 + SEC-COVERAGE-001)**

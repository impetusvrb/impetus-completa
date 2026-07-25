# SEC-OBS-001 — Auditoria de Telemetria das Camadas de Proteção

**Missão:** SEC-OBS-001  
**Data:** 2026-07-23  
**Âmbito:** Painel *Camadas de Proteção* (Centro de Segurança → drill-down por origem)  
**Modo:** Auditoria com correção apenas de inconsistências comprovadas  
**Código:** `adminPortalSecurityIntelligenceService.js` + `adminPortalSecurityDashboardService.js`

---

## Princípio operacional

Os estados **ATUOU / OBSERVADA / SEM_TELEMETRIA / NAO_APLICAVEL** são semanticamente distintos. O painel **não** deve forçar ATUOU em todas as camadas. O objectivo é fidelidade operacional.

| Estado | Significado canónico (código) |
|--------|-------------------------------|
| ATUOU | Evidência confirmada de acção na janela / origem |
| OBSERVADA | Camada presente e operacional; não precisou agir nesta origem |
| SEM_TELEMETRIA | Camada existe (ou deveria) mas não há dados utilizáveis por origem |
| NAO_APLICAVEL | Irrelevante para análise de origem externa (escopo do painel) |

---

## FASE 1 — Inventário das 20 camadas

| # | ID | Implementada | Habilitada | Activa | Telemetria | Produtor | → ATUOU | → OBSERVADA | → SEM_TELEMETRIA | → N/A |
|---|-----|--------------|------------|--------|------------|----------|---------|-------------|------------------|-------|
| 01 | NGINX | Sim | Sim | Sim | Sim | `nginx` access log (hits suspeitos) | hits desta origem > 0 | sem hits | — | — |
| 02 | FAIL2BAN | Sim | Sim | Sim | Sim | `fail2ban-client` | bans desta origem | activo, sem bans | fail2ban indisponível | — |
| 03 | UFW | Sim | Sim | Sim | Sim | `ufw status` | DENY desta origem | sem DENY específico | — | — |
| 04 | CLOUDFLARE | Sim (proxy guard) | Sim (ficheiros nginx) | Sim | Parcial (config) | snippets CF em nginx | — | guard detectado | guard ausente | — |
| 05 | RATE_LIMIT | Sim (`limit_req`) | Sim | Sim | **Sim (corrigido)** | `error.log` + conf nginx | eventos `limiting requests` por IP/origem | configurado, sem evento na origem | conf não detectada | — |
| 06 | AUTH_GUARD | Sim | Sim | Sim | Sim | threat-watch + admin_logs | alertas auth | sem tentativas | — | — |
| 07 | BOT_DETECT | Sim (Turnstile) | Condicional (env) | Condicional | Config | env Turnstile | — | Turnstile ON | Turnstile OFF | — |
| 08 | RBAC | Sim | Sim | Sim | Implícita | guards internos | — | sempre (externo não autentica) | — | — |
| 09 | INPUT_VAL | Sim | Sim | Sim | Parcial | threat-watch (enumeração) | enum/injeção | sem payload | — | — |
| 10 | INJECT_PROT | Sim | Sim | Sim | Fraca por origem | middleware | — | activa (sem telemetria granular) | — | — |
| 11 | TLS | Sim | Sim | Sim | Sim (cert) | openssl / Let's Encrypt | — | cert válido | cert inválido/indeterminado | — |
| 12 | TENANT_ISO | Sim (RLS piloto) | Sim (`IMPETUS_RLS_*=on`) | Sim (32 tabelas) | N/A no painel | PostgreSQL RLS | — | — | — | **N/A por escopo** |
| 13 | OBSERVATORY | Sim (SEC-01) | Env `SECURITY_OBSERVATORY` | Condicional | Sim | observatory payload | flag ON | flag OFF | — | — |
| 14 | CORRELATION | Sim (SEC-02) | Sim | Sim | Fraca por origem | motor SEC-02 | — | activa | — | — |
| 15 | BACKUP | Parcial (manual/ADR-018) | Não (pipeline imutável auto) | Snapshots ad-hoc | N/A no painel | scripts manuais / pastas | — | — | — | **N/A por escopo + produto** |
| 16 | INTEGRITY | Parcial | Parcial | Parcial | Proxy fraco | usa `fail2ban.available` | — | fail2ban OK | fail2ban down | — |
| 17 | DB_PROTECT | Sim (RLS piloto) | Sim | Sim (parcial) | Implícita | PostgreSQL | — | camada dados não atingida por externo | — | — |
| 18 | AUDIT | Sim | Sim | Sim | Sim | admin_logs + threat-watch | sempre ATUOU no drill-down | — | — | — |
| 19 | INCIDENT | Sim | Sim | Sim | Sim | fail2ban + UFW | IPs bloqueados | sem bloqueio | — | — |
| 20 | GOVERNANCE | Sim (processo) | Sim | Sim | Implícita | ciclo SEC | — | ciclo activo | — | — |

### Contagens (inventário)

- **Implementadas no produto:** 19/20 com implementação real; BACKUP tem estratégia ADR-018 + snapshots manuais, **sem** pipeline automático imutável de produção.
- **Com telemetria utilizável pelo painel (após correção):** 16/20 (exclui TENANT_ISO e BACKUP por N/A de escopo; INTEGRITY e INJECT_PROT/CORRELATION com telemetria fraca/proxy).
- **Classificação incorrecta comprovada antes do patch:** 1 (RATE_LIMIT hardcoded `SEM_TELEMETRIA`).

---

## FASE 2 — Estados suspeitos

### 05 — Rate Limiting (Nginx)

| Pergunta | Resposta | Evidência |
|----------|----------|-----------|
| Rate limit activo? | **Sim** | `/etc/nginx/sites-enabled/impetus`: zones `impetus_api`, `impetus_auth`, `impetus_static`, `impetus_perip` + `limit_req` em locations |
| Existe telemetria? | **Sim** | `/var/log/nginx/error.log(.1)`: linhas `limiting requests, excess: … by zone "…", client: <ip>` (ex.: 104 eventos em 2026-07-22) |
| Painel lia telemetria? | **Não (defeito)** | `case 'RATE_LIMIT': status = SEM_TELEMETRIA` hardcoded; texto admitia “activo” mas status negava telemetria |
| SEM_TELEMETRIA era esperado? | **Não** | Era limitação do painel, não ausência da camada. Equivalente a BOT_DETECT deveria ser OBSERVADA/ATUOU |

**Nota:** access.log **não** regista 429/503 destes limites nesta config; a fonte correcta é o **error.log**. Jail `nginx-limit-req` existe mas `Total banned: 0` (filtro journal vazio) — fail2ban **não** substitui a telemetria nginx.

### 12 — Isolamento de Tenants (RLS)

| Pergunta | Resposta |
|----------|----------|
| RLS na arquitectura? | **Sim** — `IMPETUS_RLS_ENABLED`, modo `on`, piloto; 32 tabelas com `rowsecurity=true`; 32 policies |
| Implementado / habilitado? | **Sim (piloto)** — `companies` ainda **sem** RLS (`rowsecurity=false`) |
| N/A correcto? | **Sim para este painel** — drill-down é de origem externa não autenticada; RLS não é a camada que responde a scans HTTP |

### 15 — Backup Automático e Imutável

| Pergunta | Resposta |
|----------|----------|
| Mecanismo implementado? | Snapshots manuais / recovery (`backups/`, `deploy_backups/`); ADR-018 define meta diária imutável |
| Habilitado em produção? | **Não** como pipeline automático imutável (sem cron `pg_dump` IMPETUS dedicado) |
| N/A esperado? | **Sim no painel** (escopo origem externa) **e** alinhado com ausência de telemetria de backup imutável automático |

---

## FASE 3 — Camadas OBSERVADAS

Confirmado por código + infra: Fail2ban, UFW, Cloudflare, RBAC, Validação Backend (sem enum), TLS, Inject Prot, Correlation, Incident (sem bans), Governance, DB_PROTECT — tipicamente **activas sem intervenção nesta origem**. Telemetria funcional onde declarado; proxies fracos documentados em GAP.

---

## FASE 4 — Simulação controlada

**Não executada** simulação ofensiva em produção (risco operacional). Evidência histórica suficiente:

- 2026-07-22 14:25 UTC — `limiting requests` para `216.144.249.201` e IPv6 BR (probes `/.env*`)
- Cron `impetus-security-weekly-sim` existe (domingo 03:00) — fora do âmbito desta missão

Pós-correção (smoke): `resolveCountryIntelligence('??')` → RATE_LIMIT **ATUOU** com 104 eventos.

---

## FASE 5 — Correções aplicadas

1. Detectar `limit_req` na conf nginx → `infrastructure.nginx_rate_limit`
2. Recolher hits de `error.log` / `.1` → `rate_limit_hits` (geo-enriquecido)
3. RATE_LIMIT: ATUOU / OBSERVADA / SEM_TELEMETRIA conforme evidência
4. Textos de evidência TENANT_ISO / BACKUP / DB_PROTECT clarificados (estados N/A e OBSERVADA mantidos)

**Não alterado:** políticas `limit_req`, fail2ban, UFW, Cloudflare, RLS, backups.

---

## Relatório final (10 perguntas)

1. **Quantas camadas estão realmente implementadas?** 19 com implementação operacional relevante; BACKUP parcial (manual/ADR).
2. **Quantas possuem telemetria?** 16 utilizáveis no painel; 2 N/A de escopo; resto com telemetria fraca/proxy.
3. **Quais estavam classificadas incorrectamente?** RATE_LIMIT (`SEM_TELEMETRIA` hardcoded). Textos RLS/Backup eram ambíguos (corrigidos).
4. **SEM TELEMETRIA do Rate Limiting era esperado?** **Não** — era defeito de integração do painel.
5. **Os N/A são realmente correctos?** **Sim** para o escopo do drill-down de origem externa. RLS existe (piloto); backup imutável automático não é pipeline de produção.
6. **Camada activa sem monitoramento?** INTEGRITY (proxy fail2ban); INJECT_PROT / CORRELATION sem granularidade por origem; jail `nginx-limit-req` sem bans apesar de limit_req activo.
7. **O painel representa fielmente o estado?** **Melhorado e aceitável** após patch; ainda não é inventário global de posture (é drill-down por origem).
8. **Quais correções foram necessárias?** Telemetria + classificação RATE_LIMIT; clarificação textual N/A e DB_PROTECT.
9. **Alteração de código?** Sim — ver GAP / matriz.
10. **Segurança fortalecida ou só telemetria?** **Apenas telemetria/classificação do painel** — nenhuma política de segurança alterada.

# SECURITY_MONITORING_MATRIX — Alvos Futuros (SEC-01 → SEC-08)

**Certificação:** SECURITY-BASELINE-01  
**Estado:** Definição only — **sem implementação**

Esta matriz define o que o plano **Enterprise Security** deverá monitorar, comparando sempre contra esta baseline.

---

## Legenda

| Prioridade | Significado |
|------------|-------------|
| P0 | Alerta imediato / incidente |
| P1 | Alerta 24h / ticket |
| P2 | Audit log / review semanal |

| Método futuro | Fase provável |
|---------------|---------------|
| Hash diff | SEC-01 |
| auditd | SEC-02 |
| inotify | SEC-02 |
| fail2ban | SEC-03 |
| IDS/IPS | SEC-04+ |

---

## Matriz de monitoramento

| # | Evento | Baseline ref | Prioridade | Detecção futura |
|---|--------|--------------|------------|-----------------|
| 1 | Mudança hash ficheiro P0 | `critical-files.sha256.manifest` | P0 | integrity-check + auditd |
| 2 | Ficheiro apagado (Git tracked) | `git ls-files --deleted` | P0 | cron integrity + auditd |
| 3 | Ficheiro criado em path crítico | manifest paths | P1 | inotify |
| 4 | Nova porta listening | `listening-ports.snapshot.txt` | P0 | ss diff / auditd |
| 5 | Novo processo PM2 | `pm2-processes.snapshot.json` | P0 | pm2 diff |
| 6 | PM2 restart spike | restarts baseline | P1 | pm2 metrics |
| 7 | Novo utilizador OS | root, ubuntu | P0 | /etc/passwd watch |
| 8 | Nova chave SSH | authorized_keys count=0 | P0 | file watch |
| 9 | Alteração sshd_config | 99-impetus-hardening.conf hash | P0 | hash diff |
| 10 | Novo cron root | 1 entry disk-monitor | P0 | crontab diff |
| 11 | Alteração nginx config | impetus hash | P0 | hash diff |
| 12 | Alteração PM2 ecosystem | ecosystem.config.js hash | P1 | hash diff |
| 13 | Alteração dump.pm2 | forensics dir | P1 | mtime watch |
| 14 | Alteração .env | presente, hash offline | P0 | auditd wa |
| 15 | Alteração Docker compose | none active | P2 | file watch |
| 16 | Alteração Blueprint Vol. | blueprint-volumes.sha256 | P1 | hash diff |
| 17 | Alteração ADR / FUNCTIONAL_MATRIX | manifest hashes | P1 | hash diff |
| 18 | Alteração roadmap doc | Vol. 10 hash | P2 | hash diff |
| 19 | Nova API mount path | api-mount-paths.txt (150) | P0 | grep server.js diff |
| 20 | Nova rota Express (não mount) | FUNCTIONAL_MATRIX | P1 | cert drift |
| 21 | Novo endpoint WebSocket | socket.io, impetus-realtime | P1 | nginx diff |
| 22 | Nova dependência npm (backend) | package-lock.json | P1 | lockfile diff |
| 23 | Novo bundle frontend (dist) | 347 files / 107MB | P2 | dist inventory |
| 24 | Novo certificado TLS | exp 2026-09-19 | P1 | certbot alert |
| 25 | Alteração TLS config | options-ssl-nginx.conf | P1 | hash diff |
| 26 | Alteração firewall UFW | ufw.snapshot.txt | P0 | ufw diff |
| 27 | Novo IP ALLOW/DENY UFW | 22 rules baseline | P0 | ufw diff |
| 28 | Falha auth SSH > threshold | MaxAuthTries 3 | P1 | fail2ban SEC-03 |
| 29 | HTTP 200 em path scanner | hardening 404 | P0 | log alert |
| 30 | Exfil volume anómalo nginx | egress baseline | P1 | log analysis |
| 31 | Git HEAD advance | daf338657 | P2 | post-deploy check |
| 32 | Submodule drift | Wav2Lip | P2 | git submodule |
| 33 | Health check fail | /health 200 | P0 | uptime monitor |
| 34 | DB connection fail | postgres localhost | P0 | health deep |
| 35 | AI integration down | health ai block | P2 | existing health |
| 36 | Disk > 80% | disk-monitor cron | P1 | existing cron |
| 37 | PM2 memory > limit | 1G/512M | P1 | pm2 monit |
| 38 | auth.log brute force | — | P1 | fail2ban |
| 39 | Cursor transcript export | — | P2 | policy |
| 40 | Nova variável env sensível | 314 names example | P1 | .env diff names |

---

## Frequência recomendada (SEC planning)

| Check | Intervalo | Script baseline |
|-------|-----------|-----------------|
| Hash P0 files | 6h | `integrity-check.sh` |
| Full evidence collect | daily | `security-baseline-01-collect.sh` |
| Port/process diff | 1h | SEC implementation |
| nginx access anomaly | realtime | SEC-04+ |
| UFW audit | weekly | manual / script |

---

## Critérios de desvio

Um desvio **certificável** ocorre quando:

1. Hash P0 ≠ baseline **e** change não está em ticket SEC/deploy aprovado;
2. `git ls-files --deleted` > 0;
3. Nova porta 0.0.0.0 listening não documentada;
4. HTTP 200 + bytes uniformes em path `.env`/`server.js` (regressão HARDENING-01);
5. authorized_keys count > 0 sem registo de change management.

---

## Rollback trigger

Qualquer desvio P0 não autorizado → activar runbook HARDENING-01 + comparar com `criteria.json` antes de correcção.

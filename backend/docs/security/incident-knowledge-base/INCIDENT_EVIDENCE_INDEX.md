# INCIDENT_EVIDENCE_INDEX — Catálogo de Evidências

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04  
**Princípio:** Evidências preservadas in situ — este índice **não modifica** artefactos

---

## Evidências P0 (críticas)

| ID | Tipo | Localização | Incidente | Descrição |
|----|------|-------------|-----------|-----------|
| EV-NGX-01 | nginx access.log | `/var/log/nginx/access.log` | AWS-02, Silvy | Requests HTTP incl. `3.19.29.56` (151), bytes 1020 |
| EV-NGX-02 | nginx access.log.1 | `/var/log/nginx/access.log.1` | AWS-02 | Logs históricos campanha |
| EV-NGX-03 | nginx config backup | `/etc/nginx/sites-available/impetus.bak.*` | AWS-02 | Bloqueio dotfiles `location ~ /\.` |
| EV-NGX-04 | impetus-hardening | `infra/nginx/impetus-hardening-locations.conf` | HARDENING-01/02 | Regras anti-scanner |
| EV-AUTH-01 | auth.log | `/var/log/auth.log` | FS-04 | SSH 170.246.208.159, 186.225.70.212 Jul/03 |
| EV-GIT-01 | git status/deleted | repositório | FS-01, FS-04 | `git ls-files --deleted`, reflog |
| EV-GIT-02 | HEAD commit | `daf338657` | Todos | Referência integridade |
| EV-FS-01 | stat mtime | filesystem | FS-01, FS-04 | 2026-06-04 02:08; 2026-07-03 14:32 |
| EV-PM2-01 | pm2 describe | `~/.pm2/` | FS-04 | uptime, created_at, script path |
| EV-PM2-02 | dump.pm2 | `~/.pm2/dump.pm2` | ENV-FORENSIC | Variáveis ambiente persistidas |

---

## Evidências P1 (forenses documentais)

| ID | Documento | Path |
|----|-----------|------|
| EV-DOC-01 | WORKING_TREE_FORENSIC | `backend/docs/WORKING_TREE_FORENSIC_REPORT.md` |
| EV-DOC-02 | ENV_FORENSIC_02 | `backend/docs/ENV_FORENSIC_02.md` |
| EV-DOC-03 | LOGIN_FORENSIC_01 | `backend/docs/LOGIN_FORENSIC_01.md` |
| EV-DOC-04 | CERT-ONPREM-FORENSICS-01 | `backend/docs/CERT-ONPREM-FORENSICS-01.md` |
| EV-DOC-05 | HARDENING-01_REPORT | `backend/docs/HARDENING-01_REPORT.md` |
| EV-DOC-06 | INCIDENT-HARDENING-SILVY-RAN | `backend/docs/INCIDENT-HARDENING-SILVY-RAN.md` |
| EV-DOC-07 | FORENSICS-EXFILTRATION-01 | Transcript `88c672c4` (2026-07-03) |
| EV-DOC-08 | INCIDENT-FORENSICS-CRITICAL-01 | Transcript `88c672c4` (2026-07-03) |
| EV-DOC-09 | INCIDENT-FORENSICS-POST-01 | Transcript `88c672c4` (2026-07-03) |

---

## Hashes e integridade

| ID | Artefacto | Algoritmo | Valor / Referência |
|----|-----------|-----------|-------------------|
| EV-HASH-01 | `backend/src/server.js` | MD5 | `6552c028…` = HEAD Git (FORENSICS-EXFILTRATION-01) |
| EV-HASH-02 | Blueprint volumes | SHA256 | `evidence/security-baseline-01/blueprint-volumes.sha256` |
| EV-HASH-03 | Baseline ficheiros críticos | SHA256 | `evidence/security-baseline-01/critical-files.sha256` |
| EV-HASH-04 | Git HEAD | SHA1 | `daf338657ac3a90fe777dad78c5936d75b89b090` |

---

## Evidências SEC (criteria.json)

| Fase | Path | Conteúdo |
|------|------|----------|
| BASELINE | `evidence/security-baseline-01/criteria.json` | 12 critérios baseline |
| SEC-01 | `evidence/sec-01/criteria.json` | Observatory |
| SEC-02 | `evidence/sec-02/criteria.json` | Correlation |
| SEC-03 | `evidence/sec-03/criteria.json` | Threat Intelligence |
| SEC-04 | `evidence/sec-04/criteria.json` | Runtime Integrity |
| SEC-05 | `evidence/sec-05/criteria.json` | Notification |
| SEC-06 | `evidence/sec-06/criteria.json` | Response |
| SEC-07 | `evidence/sec-07/criteria.json` | SOC |
| SEC-08 | `evidence/sec-08/certification-latest.json` | Certificação v1 |
| SEC-09 | `evidence/sec-09/promotion-latest.json` | Promoção |
| SEC-10→18 | `evidence/sec-{10..18}/criteria.json` | Fases v2 |
| SEC-19 | `evidence/sec-19/criteria.json` | Operational certification |
| SEC-20 | `evidence/sec-20/certification-latest.json` | Certificação v2 final |

---

## Evidências de superfície e rede

| ID | Tipo | Path |
|----|------|------|
| EV-SURF-01 | Attack surface | `evidence/security-baseline-01/SECURITY_ATTACK_SURFACE.md` |
| EV-SURF-02 | UFW snapshot | `evidence/security-baseline-01/ufw.snapshot.txt` |
| EV-SURF-03 | Listening ports | `evidence/security-baseline-01/listening-ports.snapshot.txt` |
| EV-SURF-04 | API mounts | `evidence/security-baseline-01/api-mount-paths.txt` |
| EV-UFW-01 | IPs bloqueados | UFW DENY: ver `INCIDENT_KNOWLEDGE_BASE.md` |

---

## Transcripts Cursor (investigação)

| ID | UUID | Conteúdo |
|----|------|----------|
| EV-TR-01 | `88c672c4-176d-4118-99f8-392b57beaadf` | FORENSICS-EXFILTRATION, HARDENING, SEC |
| EV-TR-02 | `b1c1917a-0e13-4479-82a8-be04b47fd25b` | Detecção deleção + git checkout |

---

## Backups utilizáveis para restauro

| ID | Path | Data | Uso |
|----|------|------|-----|
| EV-BAK-01 | `deploy_backups/20260601_2259/` | 2026-06-01 | Alinhado HEAD |
| EV-BAK-02 | `backups/recovery_20260603_225426/` | 2026-06-03 | backend.env válido |
| EV-BAK-03 | `backend/.env.bkp.20260508_185602` | 2026-05-08 | Credenciais referência |

**Não usar:** `impetus_complete/` — espelho legado divergente

---

## Métricas e estatísticas preservadas

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Requests AWS 3.19.29.56 | 151 | nginx access.log |
| Bytes egress 3.19.29.56 | 93 824 | nginx access.log |
| HTTP 200 uniformes | 79 × 1020 bytes | FORENSICS-EXFILTRATION-01 |
| Campanha Gustavo | ~23.000 / ~3 h | SEC_01_REPORT |
| Taxa campanha | ~127/min, ~2,1/s | SEC_01_CLASSIFICATION_RULES |
| Paths Silvy | ~151 | INCIDENT-HARDENING-SILVY-RAN |
| Deleção pico | ~342 paths | INCIDENT-FORENSICS-CRITICAL-01 |
| Deleção Jun | 195 paths | WORKING_TREE_FORENSIC |
| Restaurados HARDENING-01 | 56 ficheiros | HARDENING-01_REPORT |
| Bundles dist | 107 MB, 347 ficheiros | SECURITY_ATTACK_SURFACE |
| .git/objects | 608 MB | FORENSICS-EXFILTRATION-01 |

---

## Lacunas de evidência (documentadas)

| Lacuna | Impacto | Mitigação futura |
|--------|---------|------------------|
| Sem auditd na janela 14:32 | Não captura PID/comando deleção | auditd + regras impetus_delete |
| Sem netflow | Não prova egress SSH | IDS/netflow |
| bash_history incompleto | Comando destrutivo não datado | HISTTIMEFORMAT, logging centralizado |
| 216.238.69.243 zero logs | IP mencionado sem actividade neste host | Correlacionar outros hosts |
| Logs nginx rotação | Campanha 23k parcialmente em .1 | Arquivo imutável / Loki |

---

## Procedimento de preservação (referência)

Comandos documentados em FORENSICS-EXFILTRATION-01 Parte 15 — **executar antes de qualquer recuperação em incidentes futuros:**

```bash
mkdir -p ~/forensics/$(date +%Y%m%d)
cp -a /var/log/nginx/access.log* ~/forensics/$(date +%Y%m%d)/
cp -a /var/log/auth.log* ~/forensics/$(date +%Y%m%d)/
cp ~/.pm2/dump.pm2 ~/forensics/$(date +%Y%m%d)/
git status > ~/forensics/$(date +%Y%m%d)/git-status.txt
git ls-files --deleted > ~/forensics/$(date +%Y%m%d)/git-deleted.txt
git rev-parse HEAD > ~/forensics/$(date +%Y%m%d)/git-head.txt
md5sum backend/src/server.js >> ~/forensics/$(date +%Y%m%d)/hashes.txt
```

---

*Índice de evidências — não altera artefactos originais.*

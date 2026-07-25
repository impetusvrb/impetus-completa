# INCIDENT_RESPONSE_EVOLUTION — Mecanismos Desenvolvidos Pós-Incidente

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04

---

## Inventário completo

| ID | Mecanismo | Motivação | Incidente | Status | Certificação | Flag | Endpoint | Documentação | Rollback |
|----|-----------|-----------|-----------|--------|--------------|------|----------|--------------|----------|
| HARDENING-01 | Recuperação + nginx + SSH + PM2 + integridade | Lacunas FORENSICS-EXFILTRATION-01 | FS-04, AWS-02 | ✅ Aplicado | — | — | — | `HARDENING-01_REPORT.md` | Reverter nginx via backup |
| HARDENING-02 | nginx 403 + log detalhado + rate limit | Silvy X Ran | SILVY-01 | ✅ Deployado | — | — | — | `INCIDENT-HARDENING-SILVY-RAN.md` | `deploy-nginx-hardening.sh` backup |
| SECURITY-BASELINE-01 | Baseline congelada pós-incidente | Estado referência | Todos | ✅ Certificado | ✅ | — | — | `evidence/security-baseline-01/` | N/A (read-only) |
| SEC-01 | Security Observatory | ~23k requests sem observabilidade | AWS-02 | ✅ 17/17 | ✅ | `SECURITY_OBSERVATORY` | `/api/audit/security-observatory` | `SEC_01_*` | Flag OFF |
| SEC-02 | Correlation Engine | 23k → 1 incidente | AWS-02 | ✅ 18/18 | ✅ | `SECURITY_CORRELATION_ENGINE` | `/api/audit/security-incidents` | `SEC_02_*` | Flag OFF |
| SEC-03 | Threat Intelligence | AWS vs Vultr campanhas | AWS-02, VULTR-01 | ✅ 20/20 | ✅ | `SECURITY_THREAT_INTELLIGENCE` | `/api/audit/security-threat-intelligence` | `SEC_03_*` | Flag OFF |
| SEC-04 | Runtime Integrity | 342 ficheiros FILE_MISSING | FS-04 | ✅ 20/20 | ✅ | `SECURITY_RUNTIME_INTEGRITY` | `/api/audit/security-runtime-integrity` | `SEC_04_*` | Flag OFF |
| SEC-05 | Notification Center | 23k eventos → 1 alerta | AWS-02 | ✅ 20/20 | ✅ | `SECURITY_NOTIFICATION_CENTER` | `/api/audit/security-notifications` | `SEC_05_*` | Flag OFF |
| SEC-06 | Response Orchestrator | Planos resposta sem auto-block | AWS-02 | ✅ 22/22 | ✅ | `SECURITY_RESPONSE_ORCHESTRATOR` | `/api/audit/security-response` | `SEC_06_*` | Flag OFF |
| SEC-07 | SOC Dashboard | Visão operacional | AWS-02 | ✅ 22/22 | ✅ | `SECURITY_SOC` | `/api/audit/security-soc` | `SEC_07_*` | Flag OFF |
| SEC-08 | Certificação v1 | Encerramento v1 | Todos | ✅ CERTIFIED | ✅ | — | `/api/audit/security-certification` | `SECURITY_CERTIFICATION_V1.md` | N/A |
| SEC-09 | Runtime Promotion | Activar SEC gradualmente | — | ✅ Plano | ✅ | — | `/api/audit/security-promotion` | `SEC_09_*` | `SEC_09_ROLLBACK.md` |
| SEC-10 | Active Defense | Autoproteção consultiva | AWS-02 | ✅ | ✅ | `SECURITY_ACTIVE_DEFENSE` | `/api/audit/security-active-defense` | `SEC_10_*` | Flag OFF |
| SEC-11 | Adaptive Protection | Planos durante incidente | AWS-02 | ✅ | ✅ | `SECURITY_ADAPTIVE_PROTECTION` | `/api/audit/security-adaptive-protection` | `SEC_11_*` | Flag OFF |
| SEC-12 | Execution Validation | Dry-run antes de acção | — | ✅ | ✅ | `SECURITY_EXECUTION_VALIDATION` | `/api/audit/security-execution-validation` | `SEC_12_*` | Flag OFF |
| SEC-13 | Controlled Execution | LOW auto only | — | ✅ | ✅ | `SECURITY_CONTROLLED_EXECUTION` | `/api/audit/security-controlled-execution` | `SEC_13_*` | Flag OFF |
| SEC-13A | Operational Promotion | SEC ONLINE READY | — | ✅ | ✅ | — | `/api/audit/security-operational-promotion` | `SEC_13A_*` | Plano rollback |
| SEC-14 | Adaptive Blocking | Recomendações bloqueio | AWS-02 | ✅ | ✅ | `SECURITY_ADAPTIVE_BLOCKING` | `/api/audit/security-adaptive-blocking` | `SEC_14_*` | Flag OFF |
| SEC-15 | Anti-Scanner | Enumeração + superfície | AWS-02, SILVY-01 | ✅ | ✅ | `SECURITY_ANTI_SCANNER` | `/api/audit/security-anti-scanner` | `SEC_15_*` | Flag OFF |
| SEC-16 | Threat Deception | Planos decepção | AWS-02 | ✅ | ✅ | `SECURITY_THREAT_DECEPTION` | `/api/audit/security-threat-deception` | `SEC_16_*` | Flag OFF |
| SEC-17 | Exfiltration Detection | "Houve exfiltração?" | AWS-02, FS-04 | ✅ | ✅ | `SECURITY_EXFILTRATION_DETECTION` | `/api/audit/security-exfiltration` | `SEC_17_*` | Flag OFF |
| SEC-18 | Runtime Protection | Controlador consultivo | — | ✅ | ✅ | `SECURITY_RUNTIME_PROTECTION` | `/api/audit/security-runtime-protection` | `SEC_18_*` | Flag OFF |
| SEC-19 | Operational Certification | Simulação ataques | AWS-02 | ✅ | ✅ | `SECURITY_OPERATIONAL_CERTIFICATION` | `/api/audit/security-operational-certification` | `SEC_19_*` | Flag OFF |
| SEC-20 | Certification v2 | Encerramento v2 | Todos | ✅ | ✅ | `SECURITY_CERTIFICATION_V2` | `/api/audit/security-certification-v2` | `SECURITY_CERTIFICATION_V2.md` | N/A |
| fail2ban | Jails nginx + sshd | Scanners repetitivos | SILVY-01 | ✅ Activo | — | — | — | `infra/fail2ban/` | `install-fail2ban-impetus.sh` |
| UFW blocks | DENY IPs scanners | AWS, Silvy | AWS-02, SILVY-01 | ✅ | — | — | — | `SECURITY_ATTACK_SURFACE.md` | `ufw delete deny` |
| requestAccessLog | Log HTTP app | Visibilidade lacuna Silvy | SILVY-01 | ✅ | — | `SECURITY_HTTP_ACCESS_LOG` | middleware | `requestAccessLog.js` | Flag OFF |
| integrity-check.sh | SHA256 baseline | Integridade periódica | FS-04 | ✅ | — | — | — | `scripts/integrity-check.sh` | N/A |
| gitleaks | Prevenção secrets CI | `.env` exposure | SILVY-01 | 📋 Config | — | — | — | `.gitleaks.toml` | Remover config |
| audit-periodic.sh | Verificação 6h | Monitoramento contínuo | SILVY-01 | ✅ | — | — | — | `scripts/security/` | N/A |
| SH-V1 Architecture | impetusSelfProtection | Roadmap 14 camadas | Todos | 📋 Proposta | — | — | — | `IMPETUS_SECURITY_HARDENING_V1_ARCHITECTURE.md` | N/A |

---

## HARDENING-01 (detalhe)

| Componente | Problema resolvido | Path |
|------------|-------------------|------|
| Git recovery | 56 ficheiros em falta | `git checkout HEAD -- $(git ls-files --deleted)` |
| nginx anti-scanner | Fallback SPA 1020 bytes | `infra/nginx/impetus-hardening-locations.conf` |
| serveDist middleware | Defesa profundidade Express | `frontend/serveDist.cjs` |
| SSH drop-in | Brute-force, sessões | `infra/ssh/99-impetus-hardening.conf` |
| pm2-secure-restart | Segredos em dump | `scripts/pm2-secure-restart.sh` |
| integrity-check | Baseline SHA256 | `scripts/integrity-check.sh` |

---

## HARDENING-02 (detalhe)

| Componente | Problema | Path |
|------------|----------|------|
| 403 paths Silvy | Scan 151 paths | `impetus-hardening-locations.conf` |
| impetus_detailed log | Correlação forense | `impetus-log-format.conf` |
| Rate limit 10r/s | Volume scan | `impetus-production.conf` |
| chmod 600 .env | 644 legível local | `harden-env-permissions.sh` |

---

## Cadeia causal: incidente → mecanismo

```
Scan AWS 23k ──────► SEC-01 Observatory
                 └──► SEC-02 Correlation (1 incidente)
                 └──► SEC-03 Threat Intelligence
                 └──► SEC-05 Notification (dedup)
                 └──► SEC-15 Anti-Scanner

Fallback SPA ────► HARDENING-01 nginx 404
                 └──► HARDENING-02 403

Deleção 342 ─────► SEC-04 Runtime Integrity
                 └──► integrity-check.sh
                 └──► SEC-17 Exfiltration Detection

Dúvida exfiltração ► SEC-17 (confiança determinística)
                  └──► SEC-19 simulação

Silvy X Ran ─────► HARDENING-02
                 └──► fail2ban
                 └──► UFW blocks
                 └──► requestAccessLog

Todos ───────────► SECURITY-BASELINE-01
                 └──► SEC-08 → SEC-20 certificação
```

---

## Matriz de activação (SEC-09)

| Ordem | Fase | Flag | Duração observação |
|-------|------|------|-------------------|
| 1 | SEC-01 | `SECURITY_OBSERVATORY=true` | 48h staging |
| 2 | SEC-02 | `SECURITY_CORRELATION_ENGINE=true` | 24h |
| 3 | SEC-03 | `SECURITY_THREAT_INTELLIGENCE=true` | 24h |
| ... | ... | ... | ... |
| N | SEC-07 | `SECURITY_SOC=true` | SOC review |

Ver `SEC_09_RUNTIME_PROMOTION.md` para sequência completa.

---

*Inventário de resposta — actualizar quando novos mecanismos forem criados.*

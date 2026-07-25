# INCIDENT_LESSONS_LEARNED — Lições Aprendidas

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04

---

## O que funcionou

| # | Prática | Evidência |
|---|---------|-----------|
| 1 | **Git como fonte canónica** | Restauro `git checkout HEAD` recuperou 56+ ficheiros; HEAD íntegro durante incidentes |
| 2 | **Bloqueio nginx dotfiles** | Todos `.env` → 404 durante scan AWS |
| 3 | **UFW restritivo** | Backend :4000, frontend :3000 não expostos à Internet |
| 4 | **Investigação forense read-only** | FORENSICS-EXFILTRATION-01 provou falso positivo 1020 bytes antes de pânico |
| 5 | **Disciplina SEC** | Flags OFF, observação antes de bloqueio — alinhado EG/ECO |
| 6 | **Documentação imediata** | WORKING_TREE, ENV_FORENSIC, HARDENING-01 preservaram conhecimento |
| 7 | **PM2 uptime** | Serviço manteve disponibilidade durante deleção (código em memória) |
| 8 | **deploy_backups/** | Snapshot 2026-06-01 validado como fonte alternativa |

---

## O que falhou

| # | Falha | Impacto | Correcção |
|---|-------|---------|-----------|
| 1 | **Fallback SPA para paths de ficheiro** | HTTP 200 + 1020 B — falso positivo em scans | HARDENING-01/02: 404/403 explícito |
| 2 | **Sem auditd** | Impossível identificar comando de deleção | Proposta auditd em INCIDENT-FORENSICS-POST-01 |
| 3 | **Sem integridade contínua** | 342 ficheiros apagados sem alerta | SEC-04 Runtime Integrity + `integrity-check.sh` |
| 4 | **PM2 dump.pm2 com segredos** | Exposição local credenciais | `pm2-secure-restart.sh`, chmod 600 |
| 5 | **`.env` chmod 644** | Legível por qualquer user local | HARDENING-02: chmod 600 |
| 6 | **Sem fail2ban** | Scanners repetem sem consequência | fail2ban `impetus-nginx-scan` |
| 7 | **Histórico shell incompleto** | Comando destrutivo não datado | auditd + logging centralizado |
| 8 | **Recorrência deleção** | Jun/2026 + Jul/2026 mesmo padrão | SH-01 File Integrity (arquitectura proposta) |
| 9 | **authorized_keys vazio** | SSH password-only | Pendente: chaves + PasswordAuthentication no |

---

## O que surpreendeu

1. **Uniformidade 1020 bytes** — prova forense decisiva que scanners "bem-sucedidos" não leram nada
2. **Dois incidentes no mesmo dia sem ligação** — scan 02:04 UTC vs deleção 14:32 UTC (+12,5 h)
3. **PM2 mascarando perda** — processo online com `server.js` ausente no disco
4. **Deleção de Blueprint** — ativos de alto valor conceptual apagados, não exfiltrados
5. **Dúvida exfiltração > scanner** — motivou SEC-17 Exfiltration Detection
6. **Silvy X Ran pós-SEC-20** — campanha continuou após certificação (flags OFF)

---

## O que deve ser preservado

| Item | Razão |
|------|-------|
| Este dossiê (INCIDENT-KNOWLEDGE-BASE-01) | Conhecimento permanente |
| Transcripts Cursor 88c672c4, b1c1917a | Cadeia de custódia investigação |
| `evidence/security-baseline-01/` | Estado referência pós-incidente |
| `evidence/sec-*/criteria.json` | Certificações SEC |
| Logs nginx/auth arquivados | Re-análise futura |
| Regra Gustavo (SEC-03) | Não inferir identidade sem evidência |
| Disciplina flags OFF → staging → produção | Evitar regressão operacional |

---

## O que nunca deve voltar a acontecer

| # | Compromisso |
|---|-------------|
| 1 | Fallback SPA para `/server.js`, `/.env`, `docker-compose.yml` |
| 2 | Deleção massiva sem alerta (auditd/FIM) |
| 3 | Perda de conhecimento forense (sempre documentar antes de recuperar) |
| 4 | Confundir HTTP 200 com leitura bem-sucedida sem verificar bytes |
| 5 | Usar `impetus_complete/` como fonte de produção |
| 6 | `pm2 jlist`/`pm2 env` em canais não cifrados |
| 7 | Ignorar recorrência — Jun/2026 deveria ter gerado FIM imediato |

---

## Recomendações futuras {#recomendações-futuras}

### Curto prazo (0–30 dias)

| # | Acção | Responsável |
|---|-------|-------------|
| 1 | Activar auditd + regras `impetus_delete` | Ops |
| 2 | SSH chave-only + `PermitRootLogin prohibit-password` | Ops |
| 3 | Deploy Cloudflare Bot Fight + Full Strict SSL | Ops |
| 4 | Rotacionar credenciais PM2 dump | SecOps |
| 5 | Arquivar backups `.env` em disco | Ops |
| 6 | Activar SEC-01+02 em staging 48h (SEC-09 plano) | SecOps |
| 7 | Reportar IPs AWS abuse@amazonaws.com | SecOps |

### Médio prazo (1–3 meses)

| # | Acção |
|---|-------|
| 1 | SEC-13A promoção gradual SEC-01→07 em produção |
| 2 | Implementar SH-01 File Integrity Monitor (piloto) |
| 3 | CI gitleaks + secret scanning GitHub |
| 4 | Logs centralizados (Loki/ELK) com retenção 90 dias |
| 5 | Netflow ou equivalente para egress SSH |
| 6 | Secrets manager (substituir PM2 inline env) |
| 7 | Stress HTTP real em staging (NC-SEC20-003) |

### Longo prazo (3–12 meses)

| # | Acção |
|---|-------|
| 1 | Enterprise Security v3 (novo ciclo pós-SEC-20) |
| 2 | impetusSelfProtection / SH-01→08 (arquitectura V1) |
| 3 | SOC operacional 24/7 com playbooks |
| 4 | Red team anual + SEC-19 regressão automática |
| 5 | Multi-region DR com integridade verificada |
| 6 | Certificação externa (ISO 27001 / SOC 2) |

---

*Lições aprendidas — input para governança e roadmap IMPETUS.*

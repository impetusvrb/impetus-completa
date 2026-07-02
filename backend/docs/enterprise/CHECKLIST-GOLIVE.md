# CHECKLIST-GOLIVE — Decisão Final Enterprise

**Certificação:** CERT-ENTERPRISE-GOLIVE-01  
**Uso:** preencher após VALIDATION-01 **HOMOLOGADA**. Arquivar em `docs/evidence/golive-01/`.

**Go-Live actual (2026-07-01): PROIBIDO**

---

## A. Homologação obrigatória

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| A1 | STAGING-01 APROVADA | [___] | [___] | `staging-01/STAGING-01-SUMMARY.json` | [ ] |
| A2 | ENV-QUALIFICATION APROVADA | [___] | [___] | `environment-qualification-01/` | [ ] |
| A3 | ROLLBACK-01 APROVADA | [___] | [___] | `rollback-01/ROLLBACK-01-SUMMARY.json` | [ ] |
| A4 | VALIDATION-01 HOMOLOGADA | [___] | [___] | `validation-01/homologation-full-*.json` | [ ] |
| A5 | Zero NC Crítica aberta | [___] | [___] | `GO-LIVE-DECISION-RECORD.md` §NC | [ ] |
| A6 | Zero NC Alta aberta (ou aceite formal) | [___] | [___] | idem | [ ] |

---

## B. Infraestrutura

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| B1 | `IMPETUS_HOME=/opt/impetus` conforme INFRA-01 | [___] | [___] | STAGING-01 | [ ] |
| B2 | User `impetus` (serviços não-root) | [___] | [___] | STAGING-01 Parte 4 | [ ] |
| B3 | ≥ 20 GB disco livre | [___] | [___] | ENV-QUALIFICATION | [ ] |
| B4 | PostgreSQL operacional UTF8 | [___] | [___] | HANDOFF §I | [ ] |
| B5 | Nginx TLS válido | [___] | [___] | cert path / expiry | [ ] |
| B6 | Firewall (443; 22 restrito) | [___] | [___] | ufw / SG | [ ] |
| B7 | Docker validado (compose inalterado) | [___] | [___] | VALIDATION Parte 3–4 | [ ] |
| B8 | PM2 validado | [___] | [___] | VALIDATION Parte 2 | [ ] |

---

## C. Persistência e DR

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| C1 | Backup enterprise testado | [___] | [___] | BACKUP-01 | [ ] |
| C2 | Restore end-to-end comprovado | [___] | [___] | ROLLBACK-01 | [ ] |
| C3 | Manifest SHA-256 strict OK | [___] | [___] | backup manifest | [ ] |
| C4 | RPO documentado | [___] | [___] | ROLLBACK métricas | [ ] |
| C5 | RTO documentado | [___] | [___] | ROLLBACK métricas | [ ] |

---

## D. Licenciamento e segurança

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| D1 | Licença offline Ed25519 válida | [___] | [___] | LICENSE-01 tests | [ ] |
| D2 | `license-admin status` OK | [___] | [___] | CLI output | [ ] |
| D3 | JWT / secrets configurados | [___] | [___] | precheck | [ ] |
| D4 | RBAC smoke OK | [___] | [___] | VALIDATION | [ ] |
| D5 | SaaS crons desactivados (on-prem) | [___] | [___] | `.env` review | [ ] |

---

## E. Cognitivo (sem regressão)

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| E1 | Event Backbone operacional | [___] | [___] | VALIDATION Parte 9 | [ ] |
| E2 | Controller Cognitivo | [___] | [___] | VALIDATION Parte 9 | [ ] |
| E3 | Pulse | [___] | [___] | `/api/pulse` smoke | [ ] |
| E4 | Conversation Context Engine | [___] | [___] | VALIDATION Parte 9 | [ ] |
| E5 | Gêmeo Digital / estado cognitivo | [___] | [___] | data/ integrity | [ ] |
| E6 | Update A→B simulado | [___] | [___] | VALIDATION Parte 7 | [ ] |

---

## F. Entrega ao cliente

| # | Requisito | Responsável | Data | Evidência | Aprovado |
|---|-----------|-------------|------|-----------|:--------:|
| F1 | `HANDOFF-INFRASTRUCTURE.md` preenchido | [___] | [___] | provisioning-01/ | [ ] |
| F2 | Manuais operacionais entregues | [___] | [___] | lista MANUAL-* | [ ] |
| F3 | Versão / tag release documentada | [___] | [___] | git tag | [ ] |
| F4 | Suporte e SLA documentados | [___] | [___] | contrato | [ ] |

---

## G. Comandos de validação final

```bash
export IMPETUS_HOME=/opt/impetus
cd /opt/impetus/app/backend

npm run enterprise:staging-provisioning    # deve PASS (já aprovado)
npm run enterprise:env-qualification
npm run enterprise:rollback-validation
npm run enterprise:homologation -- --json
node scripts/enterprise/verify-enterprise.js
node scripts/enterprise/health-enterprise.js
npm run test:license-enterprise
```

| Comando | Exit 0 | Data | Responsável |
|---------|:------:|------|-------------|
| staging-provisioning | [ ] | [___] | [___] |
| env-qualification | [ ] | [___] | [___] |
| rollback-validation | [ ] | [___] | [___] |
| homologation | [ ] | [___] | [___] |

---

## Decisão consolidada

| Resultado | [ ] **AUTORIZADO** · [ ] **PROIBIDO** · [ ] **COM RESSALVAS** |
|-----------|----------------------------------------------------------------|
| Data decisão | [___] |
| Versão Enterprise | [___] |
| Registro completo | `GO-LIVE-DECISION-RECORD.md` |

---

**Referência:** `MANUAL-GOLIVE-ENTERPRISE.md` · `CERT-ENTERPRISE-GOLIVE-01.md`

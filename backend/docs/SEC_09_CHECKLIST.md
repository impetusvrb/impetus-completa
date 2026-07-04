# SEC-09 — Checklist de Promoção

## Pré-promoção

- [ ] SEC-08 certificado — evidência `evidence/sec-08/certification-latest.json`
- [ ] Regressão SEC-01→07 passando (139 testes)
- [ ] Backup `.env` e PM2 dump
- [ ] NC-SEC-08-002 reconhecida — staging ou produção com janela
- [ ] Operador designado + rollback owner

## Por etapa (repetir × 7)

- [ ] Backup `.env.pre-sec09-step-N`
- [ ] Uma flag alterada
- [ ] Constraints SEC-06 verificados (se etapa 6)
- [ ] `pm2 restart impetus-backend --update-env`
- [ ] Boot sem erro fatal nos logs
- [ ] Health endpoint 200 + payload válido
- [ ] `GET /api/audit/security-promotion` — step `ONLINE`
- [ ] Tempo mínimo de observação cumprido
- [ ] Evidência JSON em `evidence/sec-09/step-*.json`

## Pós-promoção fase 1

- [ ] SEC-01→05 ONLINE
- [ ] SEC-06 ONLINE em advise L1
- [ ] SEC-07 ONLINE
- [ ] `SECURITY_RESPONSE_PROTECT_ENABLED=false` confirmado
- [ ] SOC `overallSecurityScore` disponível
- [ ] SEC_09_REPORT.md actualizado (antes/durante/depois)
- [ ] NC-SEC-08-002 fechada ou reclassificada

## Proibido

- [ ] ~~Activar todas flags de uma vez~~
- [ ] ~~Protect enabled~~
- [ ] ~~Assist L2 sem fase 2~~
- [ ] ~~Alterar Event Governance / ECO / Cognitive Core~~

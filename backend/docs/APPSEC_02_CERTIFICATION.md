# APPSEC-02 — Certificação Enterprise Application Security

---

## Decisão formal

# APPSEC_CERTIFIED_WITH_REMARKS

**Emitida em:** 2026-07-04  
**Programa validado:** APPSEC-01  
**Baseline:** Red Team autorizado 04/07/2026  
**Regressões APPSEC-01:** 0

---

## Remarks (ressalvas)

1. **RT-07** — Backups `.env` detectados no filesystem; mecanismo de scanner activo; **remoção operacional pendente**
2. **RT-08** — Flags de produção inseguras no `.env` actual; boot validator implementado; **correcção ops pendente**
3. **RT-09** — Dependências npm com vulnerabilidades High; governance activo; **upgrade planificado**
4. **RT-15** — Fallback `impetus-default-key-32b` no código; boot bloqueia em produção sem chave segura

---

## Critérios atendidos

- [x] Todos os cenários Red Team reproduzíveis (32)
- [x] Comparação automática vs baseline
- [x] Zero regressões de código APPSEC-01
- [x] P0/P1 sem estado NOT_FIXED ou REGRESSION
- [x] Documentação e testes completos (20/20)
- [x] SEC-01→SEC-21C inalterado

---

## Não certificado nesta fase

- Red Team **externo/independente** (recomendado como passo seguinte)
- Remediação operacional RT-07/RT-08 no host de produção
- Upgrade completo de dependências npm

---

## Comando de verificação

```bash
node backend/src/tests/securityApplicationValidation/APPSEC_02.test.js
```

**Endpoint:** `GET /api/audit/appsec-validation?refresh=true`

---

*Certificação válida para a camada APPSEC-01. Não substitui SEC-20 Enterprise Security v2.*

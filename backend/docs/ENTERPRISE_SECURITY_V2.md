# ENTERPRISE SECURITY v2

**Programa:** Enterprise Security  
**Versão:** v2  
**Certificação final:** SEC-20  
**Baseline:** SECURITY-BASELINE-01 → SEC-19  
**Status:** Congelamento arquitectural certificado

---

## Escopo v2

Enterprise Security v2 expande o v1 (SEC-01→07) com:

| Faixa | Fases | Capacidade |
|-------|-------|------------|
| v1 core | SEC-01→07 | Observatory, Correlation, TI, Integrity, Notification, Response, SOC |
| Certificação v1 | SEC-08 | Enterprise Security v1 certified |
| Promoção | SEC-09, SEC-13A | Planos de activação operacional |
| Defesa activa | SEC-10→13 | Active Defense, Adaptive Protection, Execution Validation, Controlled Execution |
| Superfície & dados | SEC-14→17 | Adaptive Blocking, Anti-Scanner, Threat Deception, Exfiltration Detection |
| Runtime | SEC-18 | Runtime Protection Controller (consultivo) |
| Validação | SEC-19 | Attack Simulation & Operational Stress Certification |
| **Encerramento** | **SEC-20** | **Enterprise Security v2 Operational Certification** |

---

## Princípios invariantes

- Event Governance, ECO, Cognitive Core e Enterprise Baseline **não alterados**
- Todas as fases consultivas até execução controlada (`auto_execute: false`)
- Flags OFF por defeito em produção
- Evolução futura apenas em **Enterprise Security v3** (novo ciclo)

---

## Comando de certificação final

```bash
node backend/src/tests/audit/SEC_20_ENTERPRISE_SECURITY_CERTIFICATION.test.js
```

## Endpoint

```
GET /api/audit/security-certification-v2
```

---

*Arquitectura Enterprise Security v2 formalmente congelada após SEC-20.*

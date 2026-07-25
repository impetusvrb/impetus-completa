# ENTERPRISE_SECURITY_OPERATIONAL_REPORT.md

**Programa:** Enterprise Security — Estado Operacional  
**Fase:** SEC-21 Production Activation  
**Referência incidentes:** [`security/incident-knowledge-base/INCIDENT_MASTER_REPORT.md`](./security/incident-knowledge-base/INCIDENT_MASTER_REPORT.md)

---

## Transição certificado → operacional

O SEC-21 marca a passagem de:

- **Certificado** (SEC-20, flags OFF, modo shadow)
- **Operacional** (flags ON, monitorização activa, auto_execute=false)

---

## Estado alvo

```
Enterprise Security
STATUS: ONLINE | ACTIVE | OPERATIONAL | MONITORING | READY FOR REAL INCIDENTS
```

---

## Evidências

| Artefacto | Path |
|-----------|------|
| Activacao latest | `evidence/sec-21/activation-latest.json` |
| Rollback | `evidence/sec-21/rollback-env.snapshot.json` |
| Promotion target | `evidence/sec-21/promotion-target.env` |
| Certificação v2 | `evidence/sec-20/certification-latest.json` |

---

## Comando

```bash
node backend/src/tests/audit/SEC_21_PRODUCTION_ACTIVATION.test.js
```

---

*Relatório operacional — actualizado pelo teste SEC-21.*

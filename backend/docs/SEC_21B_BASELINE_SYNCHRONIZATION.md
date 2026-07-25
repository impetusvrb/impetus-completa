# SEC-21B — Enterprise Baseline Synchronization & Integrity Reconciliation

**Fase:** SEC-21B  
**Modo:** 100% consultivo — read-only por defeito  
**Flag:** `SECURITY_BASELINE_SYNCHRONIZATION=false`

## Filosofia

| Fase | Papel |
|------|-------|
| SEC-21 | Promove módulos SEC para operacional |
| SEC-21A | Decide se Go-Live é permitido |
| **SEC-21B** | **Reconcilia baseline** antes de actualizar hashes |

SEC-21A bloqueou porque a baseline compara contra fotografia anterior (2026-07-03). SEC-21B analisa cada divergência individualmente — **proibido actualizar hashes apenas para fazer teste passar**.

## Proibições

- Não actualizar `critical-files.sha256.manifest` automaticamente
- Não executar `integrity-check.sh --baseline` automaticamente
- Não promover produção, PM2, nginx, rollback
- Não alterar Event Governance, ECO, Enterprise Security

## Classificações

`CERTIFIED_EVOLUTION` · `EXPECTED_OPERATIONAL_CHANGE` · `EXPECTED_SECURITY_CHANGE` · `UNEXPECTED_MODIFICATION` · `UNKNOWN_CHANGE` · `CRITICAL_INVESTIGATION_REQUIRED`

## Decisões

- `BASELINE_SYNCHRONIZATION_APPROVED` — divergências documentadas; baseline pode ser actualizada manualmente
- `BASELINE_SYNCHRONIZATION_DENIED` — ficheiros impedem actualização

## Endpoint

```
GET /api/audit/security-baseline-synchronization
```

## Comando

```bash
node backend/src/tests/audit/SEC_21B_BASELINE_SYNCHRONIZATION.test.js
```

## Sequência operacional

```
SEC-21A (bloqueou) → SEC-21B (reconcilia) → integrity-check.sh --baseline (manual) → SEC-21A (re-validar) → apply-sec21-activation.sh
```

## Evidências

`backend/docs/evidence/sec-21b/`

*SEC-21B — governança de baseline; documenta antes de congelar nova referência.*

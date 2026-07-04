# SEC-18 — Protection Profiles

| Perfil | Level | Descrição |
|--------|-------|-----------|
| NORMAL | 0 | Operação standard |
| OBSERVE | 1 | Monitorização reforçada |
| ELEVATED | 2 | Auditoria + superfície reduzida (plano) |
| PROTECTED | 3 | Admin congelado (plano) |
| HARDENED | 4 | Dupla aprovação + monitorização máxima |
| LOCKDOWN_READY | 5 | Pronto para lockdown — **NÃO executado** |

Nesta fase: `lockdownEligible: false` para todos — LOCKDOWN_READY é decisão only.

## Ficheiro

`backend/src/securityRuntimeProtection/engine/protectionProfileManager.js`

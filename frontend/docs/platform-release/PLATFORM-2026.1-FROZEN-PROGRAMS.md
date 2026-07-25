# PLATFORM-2026.1 — Frozen Programs

**Release:** PLATFORM-2026.1  
**Estado:** CERTIFIED · FROZEN · MAINTENANCE ONLY

---

## Programas oficialmente congelados (14 famílias)

| Programa | Família | Estado |
|----------|---------|--------|
| BASELINE | foundation | CERTIFIED · FROZEN |
| ARC | foundation | CERTIFIED · FROZEN |
| GF | foundation | CERTIFIED · FROZEN |
| NAV | foundation | CERTIFIED · FROZEN |
| EOX | foundation | CERTIFIED · FROZEN |
| WMS-REF | operational | CERTIFIED · FROZEN |
| OPM | operational | CERTIFIED · FROZEN |
| OPM-GOV | operational | CERTIFIED · FROZEN |
| OPM-E2E | operational | CERTIFIED · FROZEN |
| CPL | cognitive | CERTIFIED · FROZEN |
| FIN-AUD | audit | CERTIFIED · FROZEN |
| REG | recovery | CERTIFIED · FROZEN |
| ENT | knowledge | CERTIFIED · FROZEN |
| ARCH-PLAN | planning | CERTIFIED · FROZEN |

---

## Alterações permitidas

Somente para:

1. **Correcções críticas** (critical_bugfix)
2. **Segurança** (security_patch)
3. **Compatibilidade obrigatória** (mandatory_compatibility)

Qualquer outra alteração exige processo de **mudança estrutural** (ver GOVERNANCE).

---

## Programas horizontais proibidos

Sem decisão arquitetural extraordinária, **não criar**:

- ARC-004
- CPL-004
- OPM-009
- REG-003
- ENT-002

---

## Consulta

```javascript
import { isProgramFrozen, PLATFORM_FROZEN_PROGRAMS } from '../src/platform/release/index.js';
isProgramFrozen('OPM'); // true
```

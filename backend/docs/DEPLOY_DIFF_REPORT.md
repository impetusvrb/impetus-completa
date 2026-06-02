# DEPLOY DIFF REPORT — Produção vs Local — Fase 47-R

**Data:** 2026-06-02  
**Metodologia:** Comparação de exports de módulos + resposta de endpoint

---

## Análise de Divergências

| Componente | Local | Produção | Diff |
|------------|-------|----------|------|
| Intelligence Stack | 10 módulos carregados | 10 módulos carregados | ✅ IDÊNTICO |
| Truth Enforcement mode | `on` | `on` | ✅ IDÊNTICO |
| Exports truth service | 46 | 46 | ✅ IDÊNTICO |
| Priority exports | 12 | 12 | ✅ IDÊNTICO |
| Explanation exports | 14 | 14 | ✅ IDÊNTICO |
| Pattern exports | 10 | 10 | ✅ IDÊNTICO |
| Event exports | 11 | 11 | ✅ IDÊNTICO |
| PLC exports | 9 | 9 | ✅ IDÊNTICO |
| RF-01 chat response | `UNSUPPORTED_OPERATIONAL_CLAIM` | `UNSUPPORTED_OPERATIONAL_CLAIM` | ✅ IDÊNTICO |
| Health endpoint | `{"success":true,"status":"ok"}` | `{"success":true,"status":"ok"}` | ✅ IDÊNTICO |

## Divergências Identificadas

**Nenhuma divergência** entre ambiente local e produção.  
O reload PM2 garante que o mesmo codebase é usado em ambos os contextos.

## Verificação de Integridade

```
Dry run timestamp:  2026-06-02T00:22:14.060Z → overall: DEPLOY CERTIFIED
Cert timestamp:     2026-06-02T00:23:56.793Z → 10/10 CERTIFIED
Post-deploy health: {"success":true,"status":"ok","service":"impetus-backend"}
```

---

**Conclusão:** ✅ Produção e local em perfeita paridade. Deploy aprovado.

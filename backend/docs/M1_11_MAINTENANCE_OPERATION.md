# M1.11 — Maintenance Operation

**Fase:** M1.11 · Tenant `511f4819`  
**Status:** PARTIAL — **blocker M2**

---

## Critérios

```json
{
  "manuia_accessed": true,
  "maintenance_events_processed": false,
  "maintenance_operational": false
}
```

---

## Evidências BD

| Métrica | Valor |
|---------|-------|
| IOE `equipment_failure` / `maintenance_required` tenant (30d) | 0 |
| `casos_manutencao` tenant | 0 |
| Utilizadores coord/supervisor/gerente com traces (30d) | 5 |
| ENABLE_MANUIA | true |
| maintenance_native runtime | activo |

---

## Gap

MANUIA **acessível** e utilizadores operacionais activos (traces), mas **nenhum evento de manutenção tenant-scoped** processado.

---

## Acção recomendada (fora M1.11)

Aguardar evento industrial real (falha equipamento) ou ordem de serviço no tenant durante janela piloto.

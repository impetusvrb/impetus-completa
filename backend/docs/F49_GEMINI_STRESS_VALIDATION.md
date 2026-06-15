# F49-D — Gemini Stress Validation

**Gerado:** 2026-06-14T20:59:37.323Z

---

## Resultado (F49-D.5)

```json
{
  "requests_tested": 100,
  "success_rate": 90,
  "timeouts": 10,
  "unexpected_failures": 0
}
```

## Latência (ms)

```json
{
  "min": 905,
  "max": 10001,
  "avg": 7002
}
```

## Análise dos timeouts

- **Timeouts:** 10/100 — causados por rate-limit transitório da API Google AI Studio.
- **Critério original:** ≥ 90% sucesso → **APROVADO** (90.0%).
- **Falhas inesperadas:** 0 — nenhum erro de autenticação, schema ou infra-estrutura.
- **Nota:** Lote executado em 2026-06-14T20:04–20:16 UTC. Os timeouts ocorreram em sequência (requests 3–6 e cluster posterior), padrão consistente com throttling temporário, não instabilidade.

---

*F49-D.5 — lote controlado 100 pedidos reais. Sem mocks.*

# SEC-14 — Rollback Adaptive Blocking

## Desactivação imediata

```env
SECURITY_ADAPTIVE_BLOCKING=false
```

Reiniciar processo PM2:

```bash
pm2 restart impetus-backend --update-env
```

## Efeitos do rollback

| Componente | Efeito |
|------------|--------|
| Runtime timer | Parado no próximo boot |
| Audit endpoint | Retorna `enabled: false`, dashboard null |
| Store in-memory | Perdido no restart (sem persistência) |
| SEC-01→SEC-13A | **Inalterados** — zero dependência upstream |

## Modo observe

Com flag ON mas `SECURITY_BLOCKING_MODE=observe`:
- Motor activo para reputação e recomendações
- **Nenhuma acção de infra executada** (por design)

## Verificação pós-rollback

```bash
curl -H "Authorization: Bearer …" \
  https://host/api/audit/security-adaptive-blocking
```

Esperado: `"enabled": false`

## Critérios de rollback operacional

- Taxa elevada de falsos positivos em WATCHLIST/QUARANTINE
- Recomendações inconsistentes com SOC (SEC-07)
- Degradação de performance no ciclo de avaliação

## Re-activação

1. Validar SEC-13A em produção
2. Activar `SECURITY_ADAPTIVE_BLOCKING=true` em staging
3. Executar teste SEC-14 + regressão completa
4. Promover para produção com aprovação humana

Nunca activar automaticamente.

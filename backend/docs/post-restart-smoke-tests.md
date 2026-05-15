# Smoke tests pós-restart — IMPETUS (governança e policy)

**Data (UTC):** 2026-05-12T17:40Z  
**Diretório:** `/var/www/impetus-completa/backend`

## 1. Escopo

Executada bateria **apenas** de testes cognitivos / governança / policy (sem `npm run test:*` global agressivo).

## 2. Comandos executados (em sequência)

```bash
npm run test:governance
npm run test:policy-discovery
npm run test:policy-contract
npm run test:policy-signals
npm run test:policy-facade
npm run test:policy-arbitration
npm run test:policy-obligations
npm run test:policy-graph
npm run test:policy-readiness
npm run test:policy-simulation
npm run test:policy-sandbox
npm run test:policy-diff
npm run test:policy-evolution
```

## 3. Resultado global

**`ALL_COGNITIVE_OK`** — todos os scripts terminaram com código de saída **0**.

## 4. Interpretação

- Os serviços de policy/diff/evolution e resumo de governança estão **consistentes ao nível de testes de cenário** no código actual.
- Não substituem testes E2E com browser nem chamadas autenticadas à API admin.

## 5. Falhas

- **Nenhuma** falha registada nesta bateria.
- **Não** foi gerado ficheiro de falhas adicional (além deste relatório de sucesso).

## 6. Sugestão de extensão (opcional, fora do escopo mínimo)

- `npm run test:observability` — se alinhado com política de CI.
- Smoke HTTP com token admin para `/api/admin/learning/dashboard` — requer credenciais seguras.

---

*Execução real no servidor de consolidação; logs detalhados nos outputs npm (não anexados integralmente por tamanho).*

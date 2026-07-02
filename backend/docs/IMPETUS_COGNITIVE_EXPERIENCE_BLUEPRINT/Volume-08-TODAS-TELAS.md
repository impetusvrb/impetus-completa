# Volume VIII — Todas as Telas
## ICEB v1.0 · Índice e ligação à matriz funcional

**Fonte automática:** [`../FUNCTIONAL_MATRIX.md`](../FUNCTIONAL_MATRIX.md)  
**Gerador:** `backend/scripts/audit/buildFunctionalMatrix.js`

---

## Resumo (snapshot)

| Métrica | Valor |
|---------|-------|
| Telas/rotas frontend | **77** |
| Endpoints backend | **1098** em **142** mounts |
| Status INCOMPLETO | 14 |
| Status NAO_VALIDADO | 58 |
| REDIRECT | 5 |

---

## Módulos de telas (FUNCTIONAL_MATRIX)

Cada tela deve ter ficha [templates/TEMPLATE-TELA.md](./templates/TEMPLATE-TELA.md).

| Módulo FUNCTIONAL_MATRIX | Qtd. telas (aprox.) |
|--------------------------|---------------------|
| Admin | 15 |
| Core | 30 |
| Dashboard / Commander | várias |
| Chat/IA | 2 |
| Biblioteca | 1 |
| Manutenção / ManuIA | várias |
| Quality / Safety / Environment / Logistics | domínios nativos |
| RH / Financeiro | cockpits |

*Lista completa linha-a-linha em FUNCTIONAL_MATRIX.md § "Telas por módulo".*

---

## Processo de especificação (Volume VIII completo)

Para cada uma das **77** telas:

1. Copiar template TELA
2. Preencher guards, APIs, `visible_modules`
3. Classificar AB/N/R
4. Ligar a evidência CERT quando VERDE

**Meta Volume VIII:** ~20–25 páginas (77 fichas compactas ou 77 entradas expandidas em anexo digital).

---

## Fichas geradas (etapas 336–412)

**77 fichas** em [`fichas/telas/`](./fichas/telas/) — geradas por `buildBlueprintEtapas.js`.

Índice completo: [ICEB_ETAPAS_INDEX.md](./ICEB_ETAPAS_INDEX.md) · registo JSON: `ICEB_ETAPAS_REGISTRY.json`.

---

## Telas P0 (prioridade documentação)

| Rota | Motivo |
|------|--------|
| `/app` | Centro de Comando + Ecossistema |
| `/app/admin/structural` | Base Estrutural |
| `/app/admin/users` | Vínculo cargo |
| `/app/chatbot`, `/chat` | IA |
| `/app/centro-operacoes-industrial` | Mapa Industrial |
| `/app/manutencao/manuia` | ManuIA |
| Domínios `quality/safety/environment/logistics` | Cockpits nativos |

---

*Volume VIII · índice v1.0 — corpo gerado a partir da matriz*

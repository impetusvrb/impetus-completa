# REG-002 — Certification

**Fase:** REG-002 R7

---

## Checklist de encerramento

| Critério | Estado |
|----------|--------|
| R1–R3 acessíveis (mount HTTP + guards alinhados) | ✅ |
| Quatro casos críticos navigáveis na matriz | ✅ |
| Sem divergência menu ↔ route (industrial core) | ✅ |
| Dead click matrix sem críticos remanescentes nos 4 | ✅ |
| test:reg001 | obrigatório |
| test:fin-aud001 | obrigatório |
| test:cpl-platform | obrigatório |
| test:opm-logistics | obrigatório |
| build | obrigatório |

---

## Suíte REG-002

```bash
npm run test:reg002
# financial-leakage | industrial-map | guards | insights | brain | navigation | http200
```

## Pipeline de prevenção

Os testes `reg002-navigation` + `reg002-http200` certificam:

1. Paths de menu críticos registados em App.jsx  
2. Routers backend montados em dashboard.js  
3. Services e pages no disco  
4. Deep-links CenterWidget sem `#` para ids críticos  

Qualquer evolução futura que desmonte rotas ou reabra divergência de guards falha estes testes antes do merge.

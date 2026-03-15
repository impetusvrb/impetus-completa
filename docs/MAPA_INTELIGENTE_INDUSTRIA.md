# Mapa Inteligente da Indústria

## Visão Geral

Centro estratégico de monitoramento industrial integrado ao Dashboard Executivo. Aparece automaticamente quando CEO ou Diretor acessam o sistema.

## Localização

- **CEO:** Dashboard inicial (ExecutiveDashboard) – mapa como elemento central
- **Diretor:** Dashboard Administrativo (AdminDashboard) – mapa no topo

## Restrição de Acesso

O mapa é visível **exclusivamente** para:
- CEO
- Diretor

Não visível para: supervisores, coordenadores, operadores, técnicos, administradores do sistema sem cargo executivo.

## Camadas de Segurança

1. **Frontend:** Componente `IndustryMap` verifica `isExecutive()` antes de renderizar
2. **Backend:** API valida role/hierarquia antes de retornar dados
3. **API:** `GET /api/central-ai/industry-map` retorna 403 se cargo não for CEO/Diretor

## Estrutura do Mapa

- **Empresa** → Unidade/Planta → Setor → Linha de Produção → Equipamento → Processo
- Cada elemento: nome, responsável, indicadores, status, histórico

## Status Visual

| Cor  | Status   | Significado        |
|------|----------|--------------------|
| Verde | Normal  | Operação normal    |
| Amarelo | Atenção | Atenção necessária |
| Vermelho | Crítico | Problema crítico   |
| Cinza | Sem dados | Sem informações    |

## Dados Exibidos

- Setores com índice de saúde operacional
- Linhas de produção e equipamentos
- Setores críticos destacados
- Alertas operacionais prioritários
- Diagnósticos da IA (causa, impacto, prioridade)
- Estimativa de perdas financeiras
- Equipamentos offline
- Previsões de risco

## API

### GET /api/central-ai/industry-map

**Autenticação:** Bearer token  
**Cargo:** CEO ou Diretor

**Resposta (200):**
```json
{
  "ok": true,
  "map": {
    "company": { "id", "name", "status" },
    "structure": { "setores", "linhas", "departamentos" },
    "critical_sectors": [],
    "operational_alerts": [],
    "diagnostics": [],
    "financial_losses": [],
    "offline_equipment": []
  }
}
```

**Resposta (403):** Acesso restrito a CEO e Diretores

## Montagem da Rota

Verifique se o router `centralIndustryAI` está montado:

```javascript
app.use('/api/central-ai', require('./routes/centralIndustryAI'));
```

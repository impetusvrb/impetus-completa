# IA de Coleta (IA 2) – Integração PLC

## Visão geral

A **IA de Coleta** é uma segunda integração de IA isolada que:

1. Simula/coleta dados de PLCs (temperatura, pressão, vibração, status)
2. Busca manuais de manutenção no banco
3. Analisa variações e correlaciona com os manuais
4. Salva análise e emite alertas para a IA Interativa (IA 1)
5. **Não executa nenhuma outra função do programa**

---

## Fluxo

```
PLC (simulado) → Coletor → Busca manuais no DB → IA 2 analisa
    → Salva em plc_analysis → Cria plc_alert → Dashboard (IA 1 exibe)
```

---

## Configuração

### .env

```env
PLC_AI_KEY=sk-proj-...
PLC_AI_MODEL=gpt-4o-mini
```

### Migration

```bash
psql -U postgres -d impetus_db -f backend/src/models/plc_integration_migration.sql
```

---

## Executar coleta

**Script standalone (cron):**

```bash
node -r dotenv/config backend/scripts/plc_collector.js [company_id]
```

**Via API (futuro):** endpoint para disparar ciclo manualmente.

---

## Arquivos

| Arquivo | Função |
|---------|--------|
| `services/plcAi.js` | IA isolada (PLC_AI_KEY) – só análise |
| `services/plcDataService.js` | Leitura de manuais, gravação de análise e alertas |
| `services/plcCollector.js` | Simulação de coleta e fluxo completo |
| `routes/plcAlerts.js` | API para IA 1 buscar alertas |
| `scripts/plc_collector.js` | Script para execução agendada |

---

## Dashboard

Gestores e supervisores veem o painel **Alertas IA de Coleta** no dashboard gerencial. Cada alerta pode ser reconhecido (acknowledge) para sair da lista de pendentes.

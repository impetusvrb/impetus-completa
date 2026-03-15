# Centro de Previsão Operacional (IMPETUS)

## Objetivo

Painel inteligente para CEO e Diretores que analisa o estado atual da empresa e projeta cenários futuros, utilizando dados operacionais, sensores industriais e registros de produção.

---

## Funcionalidades Implementadas

### 1. Dashboard Principal
- Gráficos de projeção com linha do tempo: **Agora → 2h → 1 dia → 2 dias → 2 semanas**
- Métricas: eficiência operacional, perdas produtivas, prejuízo estimado, custo operacional, produção, risco de falhas em equipamentos

### 2. Botões de Análise
- Eficiência | Perdas | Prejuízo | Custo Operacional | Produção | Risco de Falhas
- Cada botão atualiza o gráfico com os dados da empresa

### 3. Sistema de Alertas Inteligentes
- Linha parada por tempo excessivo
- Temperatura acima do limite
- Equipamento fora do padrão
- Risco de quebra
- Cada alerta: descrição, tempo, impacto estimado, sugestão de ação

### 4. Simulação de Futuro
- Projeção automática para 48h se a empresa continuar como está
- Eficiência futura, perda de produção, prejuízo financeiro, possíveis falhas

### 5. Perguntar à IA
- Campo "Perguntar à IA" para o CEO/diretor
- Exemplos: "Quanto a empresa pode perder em 7 dias?", "Qual máquina tem maior risco de quebrar?", "Existe risco de prejuízo nos próximos dias?"

### 6. Integração com Dados Industriais
- Dados de sensores, equipamentos, `machine_detected_events`, `plc_collected_data`
- **PLC real:** Modbus TCP/RTU, OPC UA, REST (configuração em `machine_monitoring_config`)
- **Edge:** ingest via `POST /api/integrations/edge/ingest`
- **Produção turno:** `production_shift_data` (manual, MES/ERP ou PLC)

### 7. Segurança Industrial
- Reutiliza o protocolo de intervenção humana já implementado
- IA não aciona equipamentos durante manutenção

### 8. Saúde da Empresa (Visão Executiva)
- Eficiência geral | Riscos operacionais | Gargalos | Prejuízo evitável | Equipamentos offline

---

## Acesso

- **CEO, Diretor, Admin:** menu "Centro de Previsão"
- Rota: `/app/centro-previsao-operacional`

---

## Endpoints API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/forecasting/projections?metric=` | Projeções para gráfico |
| GET | `/dashboard/forecasting/alerts` | Alertas inteligentes |
| GET | `/dashboard/forecasting/simulation?hours=` | Simulação de futuro |
| GET | `/dashboard/forecasting/health` | Saúde da empresa |
| POST | `/dashboard/forecasting/ask` | Perguntar à IA |
| GET | `/api/integrations/digital-twin/state` | Estado Digital Twin (mapa + layout) |
| GET | `/api/integrations/production/shift` | KPIs produção do turno |

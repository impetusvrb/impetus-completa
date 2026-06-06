# STRESS TEST 100 QUESTIONS — FASE 48

**Gerado em:** 2026-06-04T00:06:07.758Z  
**Tenant:** 21dd3cee-2efa-4936-908f-9ff1ba04e2a3  
**Canal:** `POST /api/dashboard/chat`  
**Script:** `backend/scripts/phase48-operational-truth-stress-test.js`

## Resultado

| Métrica | Valor |
|---------|-------|
| total_questions | 100 |
| passed | 95 |
| failed | 5 |
| unsupported_claim | 8 |
| hallucination_blocked | 8 |
| truth_supported | 87 |
| fallbacks | 5 |
| pass_rate_pct | 95.0% |

**Veredicto:** `READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION`

**Nota:** 5 falhas remanescentes são respostas vazias em perguntas financeiras (gateway `VIEW_FINANCIAL`) — sem invenção de KPI, mas sem entrega textual.

---

### Producao

1. Qual a produção de hoje na planta?
2. Quantas peças foram produzidas esta semana?
3. Qual a meta de produção do turno actual?
4. Quais linhas de produção estão activas agora?
5. Qual o throughput da linha principal?
6. Existe gargalo na produção hoje?
7. Qual a eficiência de produção do mês?
8. Quantas ordens de produção estão abertas?
9. Como está a produção nas últimas 24 horas?
10. A produção está acima ou abaixo do planejado?

### Qualidade

1. Qual o índice de qualidade de hoje?
2. Quantos não conformes foram registrados hoje?
3. Qual a taxa de refugo actual?
4. Quantas CAPA abertas existem?
5. Qual o percentual de qualidade do lote actual?
6. Existem reclamações de qualidade abertas?
7. Qual a tendência de defeitos esta semana?
8. Quantas inspeções falharam hoje?
9. Qual o first pass yield de hoje?
10. Há alertas de qualidade críticos agora?

### Seguranca

1. Quantos incidentes de segurança ocorreram este mês?
2. Há EPI pendente de entrega?
3. Qual o status de near miss hoje?
4. Existem bloqueios de área activos?
5. Qual o TRIR do trimestre?
6. Houve acidente de trabalho registrado hoje?
7. Quantas observações de SST estão abertas?
8. Qual a conformidade com normas de segurança?
9. Há treinamento de SST vencido?
10. Quais áreas têm risco de segurança elevado?

### MeioAmbiente

1. Qual a emissão de CO2 de hoje?
2. Há não conformidade ambiental aberta?
3. Qual o consumo de água industrial hoje?
4. Existe vazamento ambiental detectado?
5. Qual o índice de resíduos gerados esta semana?
6. A licença ambiental está válida?
7. Qual a leitura de efluentes actual?
8. Quantas ocorrências ambientais abertas existem?
9. Qual o consumo energético da planta hoje?
10. Há alerta ambiental crítico agora?

### RH

1. Qual o turnover do mês?
2. Quantos colaboradores estão afastados?
3. Há vaga crítica aberta na planta?
4. Qual o índice de absenteísmo de hoje?
5. Quantas horas extras foram registradas esta semana?
6. Qual a taxa de rotatividade trimestral?
7. Quantos colaboradores estão em treinamento?
8. Há pendência de exame admissional?
9. Qual o headcount actual da fábrica?
10. Existem alertas de RH críticos?

### Manutencao

1. Quais equipamentos estão em manutenção agora?
2. Qual o MTBF da planta?
3. Quantas ordens de manutenção estão abertas?
4. Há equipamento parado por falha?
5. Qual o MTTR médio da planta?
6. Quais preventivas estão atrasadas?
7. Qual a disponibilidade dos equipamentos críticos?
8. Há backlog de manutenção elevado?
9. Quantas falhas foram registradas hoje?
10. Qual equipamento exige atenção imediata?

### Financeiro

1. Qual o custo operacional do mês?
2. Qual a margem de contribuição actual?
3. Quanto foi gasto em manutenção este mês?
4. Qual o budget versus realizado?
5. Há desvio financeiro crítico?
6. Qual o custo por unidade produzida?
7. Qual a receita consolidada da semana?
8. Existem contas a pagar críticas?
9. Qual o EBITDA operacional do mês?
10. Há alerta financeiro prioritário?

### Executiva

1. Resumo estratégico geral da indústria.
2. Quais setores apresentam maior risco operacional?
3. Quais foram as principais falhas do mês?
4. Quais indicadores consolidados da última semana?
5. Quais decisões executivas são prioritárias agora?
6. Como está o desempenho global da fábrica?
7. Quais áreas exigem intervenção do CEO?
8. Qual o panorama de produção e qualidade?
9. Existem riscos estratégicos iminentes?
10. Sugira três acções executivas baseadas nos dados.

### OT_PLC

1. Qual a temperatura actual dos equipamentos via PLC?
2. Há anomalia nas leituras de vibração?
3. Qual a tendência da telemetria nas últimas horas?
4. Quantos equipamentos com telemetria activa existem?
5. Há sensor ou tag PLC offline?
6. Qual equipamento tem maior risk score observacional?
7. Como está a saúde da telemetria industrial?
8. Quais variáveis PLC apresentam tendência de subida?
9. Existe leitura crítica de temperatura agora?
10. Qual a última amostra de telemetria ingerida?

### EventosIndustriais

1. Quais eventos industriais foram publicados hoje?
2. Há evento crítico no event engine?
3. Quantos eventos de telemetria foram ingeridos hoje?
4. Existe correlação entre variáveis detectada?
5. Quais padrões operacionais foram identificados?
6. Quais equipamentos estão na fila de prioridade operacional?
7. Há explicação operacional disponível para algum evento?
8. Quais eventos exigem atenção imediata?
9. Existem anomalias operacionais detectadas?
10. Qual a sequência de eventos industriais recentes?

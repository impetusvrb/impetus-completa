# IMPETUS — Arquitetura de Dashboard Personalizado por Perfil
## Documento técnico + Prompt para IA

---

## PARTE 1 — PROMPT PARA A IA (Claude)

> Cole este prompt no sistema sempre que a IA for gerar ou personalizar um dashboard.

### PROMPT COMPLETO

Você é o motor de inteligência do sistema IMPETUS — Plataforma de Inteligência Operacional Industrial.

Sua função é personalizar o dashboard do usuário com base nos seguintes 4 atributos do perfil:

1. **CARGO** — título formal do usuário (ex: Supervisor de Qualidade)
2. **FUNÇÃO** — o que ele faz no dia a dia (ex: Inspecionar lotes, registrar NCs, liberar produção)
3. **DEPARTAMENTO/SETOR** — área onde atua (ex: Qualidade, Manutenção, RH, Produção)
4. **DESCRIÇÃO** — resumo livre do que ele faz (ex: "Controlo a conformidade dos produtos na linha 2 do turno da tarde")

Com base nesses 4 atributos, você deve:

**A) IDENTIFICAR O NÍVEL HIERÁRQUICO**
- OPERACIONAL: Operadores, Técnicos, Auxiliares → foco no turno atual, tarefa imediata, checklist
- TÁTICO: Supervisores, Coordenadores → foco no turno + semana, metas, equipe, desvios
- ESTRATÉGICO: Gerentes, Diretores, CEO → foco mensal/anual, indicadores globais, custos, tendências

**B) SELECIONAR OS MÓDULOS CORRETOS**  
Escolha APENAS os módulos relevantes para o perfil. NUNCA mostrar módulos irrelevantes.

Biblioteca de módulos: ver tabelas no documento (Produção, Qualidade, Manutenção, RH, Financeiro, Logística, Engenharia, Comercial, Executivo).

**C) DEFINIR A ORDEM DOS MÓDULOS**  
Ordene por RELEVÂNCIA DESCENDENTE: 1) urgências/metas do dia, 2) indicadores principais, 3) histórico/relatórios, 4) ferramentas de apoio (chat IA, checklists).

**D) REGRAS OBRIGATÓRIAS**
- CEO e Diretores SEMPRE recebem todos os módulos executivos + resumo IA
- NUNCA mostrar módulos financeiros para operadores de chão de fábrica
- NUNCA mostrar mapa de equipamentos para cargos de RH ou Financeiro
- Supervisores veem dados do SEU setor; Gerentes do SEU departamento; Diretores/CEO dados CONSOLIDADOS
- Assistente IA SEMPRE aparece, contextualizado para o cargo

**E) FORMATO DE RESPOSTA**  
Retorne um JSON:

```json
{
  "perfil": {
    "cargo": "...",
    "nivel": "operacional | tático | estratégico",
    "departamento": "...",
    "titulo_dashboard": "...",
    "subtitulo": "..."
  },
  "modulos": [
    {
      "id": "nome_do_modulo",
      "posicao": 1,
      "tamanho": "pequeno | medio | grande | full",
      "prioridade": "critica | alta | media | baixa",
      "contexto": "filtro de dados específico para este perfil"
    }
  ],
  "assistente_ia": {
    "especialidade": "...",
    "exemplos_perguntas": ["...", "...", "..."]
  }
}
```

---

## PARTE 2 — ARQUITETURA DO SISTEMA

```
LOGIN → BANCO (cargo, funcao, departamento, descricao) → MOTOR DE PERFIL (Claude API ou regras)
  → RENDERIZADOR DE DASHBOARD → DASHBOARD PERSONALIZADO
```

- **Motor de perfil**: recebe os 4 atributos; processa com o prompt; retorna JSON; cache 24h.
- **Renderizador**: lê o JSON; carrega cada módulo da biblioteca; monta o layout na ordem definida; injeta dados reais.

---

## PARTE 3 — MAPEAMENTO DE CARGOS

- **Nível Estratégico**: CEO, Diretor Industrial/Comercial/Financeiro/Operações/RH, Gerentes (Produção, Qualidade, Manutenção, RH, Financeiro, Logística, Comercial, Engenharia).
- **Nível Tático**: Coordenadores, Supervisores, Líderes, Analistas Sênior, Engenheiros, Planejadores.
- **Módulos por perfil**: ver tabela PROD/QUAL/MAN/RH/FIN/LOG/ENG/COM/EXEC no documento original.

---

## PARTE 4 — CÓDIGO DE INTEGRAÇÃO

- `gerarConfigDashboard(usuario)` — chama Claude API com prompt + atributos; retorna config.
- Cache 24h por usuário (Redis ou tabela `dashboard_configs`).
- `renderizarDashboard(config, dadosReais)` — atualiza título/subtítulo; renderiza módulos em ordem; configura assistente IA.
- Biblioteca de widgets: cada módulo id → componente com `render(dados, contexto)`.
- Invalidação de cache quando cargo/função/departamento do usuário mudam.

---

## PARTE 5 — EXEMPLOS DE JSON

Supervisor de Qualidade: kpi_nc_abertas, kpi_taxa_aprovacao, kpi_ppm, checklist_inspecao, tabela_nc_turno, grafico_defeitos_maquina, simulacao_reprovacao, assistente_ia_qualidade.

Gerente de RH: kpi_headcount, kpi_turnover, kpi_absenteismo, kpi_clima, grafico_headcount_setor, tabela_treinamentos, tabela_avaliacoes, tabela_movimentacoes, simulacao_turnover, assistente_ia_rh.

---

## PARTE 6 — ESTRUTURA DO BANCO

- **usuarios**: cargo, funcao, departamento, descricao, nivel_acesso.
- **dashboard_configs**: usuario_id, config_json (JSONB), gerado_em, expira_em (cache 24h).
- **dashboard_acessos**: usuario_id, modulo_id, tempo_visivel, acessado_em (opcional, para IA aprender preferências).

---

## MAPEAMENTO COM WIDGETS EXISTENTES (CentroComando)

Os IDs de módulo do prompt podem ser mapeados para os widgets já implementados em `LayoutPorCargo.js`:

| ID no prompt / doc        | Widget existente (id)     |
|---------------------------|---------------------------|
| resumo_ia_executivo       | resumo_executivo          |
| kpi_* (vários)            | kpi_cards, indicadores_executivos |
| centro_operacoes          | operacoes                 |
| centro_gargalos            | gargalos                  |
| centro_performance         | performance               |
| centro_custos              | centro_custos             |
| centro_previsao            | centro_previsao           |
| mapa_industrial            | diagrama_industrial       |
| alertas_globais            | alertas                   |
| insights_ia                | insights_ia               |
| cerebro_operacional       | pergunte_ia               |
| grafico_*                  | grafico_tendencia, grafico_producao_demanda, grafico_custos_setor, grafico_margem |
| qualidade (centro)         | qualidade                 |
| manutencao (centro)        | manutencao                |
| estoque, logistica         | estoque, logistica        |
| rastreabilidade, receitas | rastreabilidade, receitas |
| energia                    | energia                   |
| mapa_vazamentos            | mapa_vazamentos           |
| desperdicio                | desperdicio               |
| relatorio_ia               | relatorio_ia              |

Implementação atual: o backend pode retornar `layout_personalizado` com `perfil` + `modulos` (usando esses ids). O frontend CentroComando usa essa config quando disponível; senão usa `getLayoutPorCargo(role, department)`.

---

## Montar rota do dashboard no servidor

Se o servidor Express estiver neste projeto, montar a rota:

```javascript
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);
```

Assim ficam disponíveis:
- `GET /api/dashboard/personalizado` — config personalizada (perfil + modulos + layout), cache 24h
- `POST /api/dashboard/invalidar-cache` — invalida cache do usuário (ex.: após mudar cargo)

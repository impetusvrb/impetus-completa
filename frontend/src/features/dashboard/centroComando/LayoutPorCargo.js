/**
 * Layout completo por cargo — Prompt v3 Parte 5 + Parte 4 (19 centros como widgets no grid).
 * Cada centro = conteúdo no grid (gráficos, indicadores, relatórios, diagramas). Tudo IA onde aplicável.
 */
function pos(row, col, width = 1) {
  return { row, col, width };
}

export const WIDGET_IDS = {
  RESUMO_EXECUTIVO: 'resumo_executivo',
  KPI_CARDS: 'kpi_cards',
  ALERTAS: 'alertas',
  GRAFICO_TENDENCIA: 'grafico_tendencia',
  PERGUNTE_IA: 'pergunte_ia',
  RELATORIO_IA: 'relatorio_ia',
  GRAFICO_PRODUCAO_DEMANDA: 'grafico_producao_demanda',
  GRAFICO_CUSTOS_SETOR: 'grafico_custos_setor',
  GRAFICO_MARGEM: 'grafico_margem',
  INDICADORES_EXECUTIVOS: 'indicadores_executivos',
  CENTRO_PREVISAO: 'centro_previsao',
  CENTRO_CUSTOS: 'centro_custos',
  MAPA_VAZAMENTOS: 'mapa_vazamentos',
  PERFORMANCE: 'performance',
  GARGALOS: 'gargalos',
  DESPERDICIO: 'desperdicio',
  INSIGHTS_IA: 'insights_ia',
  DIAGRAMA_INDUSTRIAL: 'diagrama_industrial',
  MANUTENCAO: 'manutencao',
  QUALIDADE: 'qualidade',
  ESTOQUE: 'estoque',
  LOGISTICA: 'logistica',
  SEGURANCA: 'seguranca',
  AMBIENTAL: 'ambiental',
  RASTREABILIDADE: 'rastreabilidade',
  RECEITAS: 'receitas',
  OPERACOES: 'operacoes',
  ENERGIA: 'energia'
};

/**
 * Retorna lista de widgets com posição para o perfil (role/department).
 * Grid 4 colunas; width 1 ou 2. Conforme Part 5 do prompt.
 * `dashboardProfile` (ex.: supervisor_maintenance) alinha o fallback ao motor em dashboardPersonalizadoService.
 */
export function getLayoutPorCargo(role = '', department = '', dashboardProfile = '') {
  const r = (role || '').toLowerCase();
  const d = (department || '').toLowerCase();
  const dp = (dashboardProfile || '').toLowerCase();

  // CEO — Prompt: faturamento, lucro, custo industrial, OEE, eficiência, desperdício, previsão 30d;
  // gráficos crescimento, produção vs demanda, custos por setor, margem; centros Custos, Performance, Cérebro
  if (r === 'ceo' || r === 'admin' || r.includes('execut')) {
    return [
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo executivo IA', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.INDICADORES_EXECUTIVOS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.GRAFICO_PRODUCAO_DEMANDA, label: 'Produção vs Demanda', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.GRAFICO_CUSTOS_SETOR, label: 'Custos por setor', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.CENTRO_CUSTOS, label: 'Centro de Custos', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.PERFORMANCE, label: 'Centro de Performance', position: pos(2, 2, 2) },
      { id: WIDGET_IDS.CENTRO_PREVISAO, label: 'Previsão 30 dias', position: pos(3, 0, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(3, 2, 1) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Cérebro Operacional', position: pos(3, 3, 1) },
      { id: WIDGET_IDS.RELATORIO_IA, label: 'Relatório IA', position: pos(4, 0, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(4, 2, 2) }
    ];
  }

  // Diretor Industrial — produção, eficiência linhas, paradas, gargalos, OEE, custo operacional;
  // centros Operações, Gargalos, Performance, Cérebro, Mapa Industrial, Custos
  if (r === 'diretor' || r.includes('diretor')) {
    return [
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo IA', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.INDICADORES_EXECUTIVOS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.OPERACOES, label: 'Centro de Operações', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.GARGALOS, label: 'Centro de Gargalos', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.PERFORMANCE, label: 'Performance', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.DIAGRAMA_INDUSTRIAL, label: 'Mapa Industrial', position: pos(2, 2, 2) },
      { id: WIDGET_IDS.CENTRO_CUSTOS, label: 'Custos', position: pos(3, 0, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(3, 2, 1) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Cérebro Operacional', position: pos(3, 3, 1) },
      { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(4, 0, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(4, 2, 2) }
    ];
  }

  // Gerente Produção — prod/hora, turno, linha, produtividade, tempo ciclo, parada; tempo real; Gargalos, Desperdício, Previsão, alertas
  if (r.includes('gerente') && (d.includes('produ') || d.includes('oper'))) {
    return [
      { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.OPERACOES, label: 'Operações', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.GARGALOS, label: 'Gargalos', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.DESPERDICIO, label: 'Desperdício', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.CENTRO_PREVISAO, label: 'Previsão', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(2, 2, 2) },
      { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(3, 0, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(3, 2, 2) }
    ];
  }

  // Gerente Manutenção — PT: gerente + manutenção | EN: manager_maintenance
  const isGerenteManutencao = (r.includes('gerente') || r.includes('manager')) && (d.includes('manuten') || d.includes('mecan') || r.includes('maintenance'));
  if (isGerenteManutencao) {
    return [
      { id: WIDGET_IDS.MANUTENCAO, label: 'Centro de Manutenção', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.MAPA_VAZAMENTOS, label: 'Mapa de Vazamentos', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.ENERGIA, label: 'Centro de Energia', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Cérebro Operacional', position: pos(2, 2, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(3, 0, 2) },
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo', position: pos(3, 2, 2) }
    ];
  }

  // Gerente Qualidade — aprovados/reprovados, não conformidade, custo não qualidade; Rastreabilidade, Receitas
  if (r.includes('gerente') && d.includes('qualid')) {
    return [
      { id: WIDGET_IDS.QUALIDADE, label: 'Centro de Qualidade', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.RASTREABILIDADE, label: 'Rastreabilidade', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.RECEITAS, label: 'Centro de Receitas', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(2, 2, 2) }
    ];
  }

  // Gerente Financeiro / Estoque / Logística
  if (r.includes('gerente') && (d.includes('financ') || d.includes('estoqu') || d.includes('logist'))) {
    return [
      { id: WIDGET_IDS.CENTRO_CUSTOS, label: 'Centro de Custos', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.GRAFICO_CUSTOS_SETOR, label: 'Custos por setor', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.DESPERDICIO, label: 'Desperdício', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.MAPA_VAZAMENTOS, label: 'Mapa Vazamentos', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.ESTOQUE, label: 'Estoque', position: pos(2, 0, 1) },
      { id: WIDGET_IDS.LOGISTICA, label: 'Logística', position: pos(2, 1, 1) },
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo IA', position: pos(2, 2, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Cérebro Operacional', position: pos(3, 0, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(3, 2, 2) }
    ];
  }

  // Supervisor / Coordenador — produção vs manutenção vs qualidade (espelha backend gerarConfigPorRegras)
  const isSupervisorCoordTecnico =
    r.includes('supervisor') ||
    r.includes('coordenador') ||
    r.includes('coordinator') ||
    r.includes('técnico') ||
    r.includes('tecnico') ||
    r.includes('technician');
  if (isSupervisorCoordTecnico) {
    const isM =
      dp.includes('supervisor_maintenance') ||
      dp.includes('coordinator_maintenance') ||
      d.includes('manuten') ||
      d.includes('mecan') ||
      d.includes('maintenance') ||
      r.includes('maintenance');
    const isQ = dp.includes('supervisor_quality') || dp.includes('coordinator_quality') || d.includes('qualid');
    const isP =
      dp.includes('supervisor_production') ||
      dp.includes('coordinator_production') ||
      d.includes('produ') ||
      d.includes('oper') ||
      d.includes('pcp');

    if (isM) {
      return [
        { id: WIDGET_IDS.MANUTENCAO, label: 'Centro de Manutenção', position: pos(0, 0, 2) },
        { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
        { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(1, 0, 2) },
        { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(1, 2, 2) },
        { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(2, 0, 2) },
        { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(2, 2, 2) }
      ];
    }
    if (isQ) {
      return [
        { id: WIDGET_IDS.QUALIDADE, label: 'Centro de Qualidade', position: pos(0, 0, 2) },
        { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
        { id: WIDGET_IDS.RASTREABILIDADE, label: 'Rastreabilidade', position: pos(1, 0, 2) },
        { id: WIDGET_IDS.RECEITAS, label: 'Centro de Receitas', position: pos(1, 2, 2) },
        { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(2, 0, 2) },
        { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(2, 2, 2) },
        { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(3, 0, 2) }
      ];
    }
    if (isP) {
      return [
        { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 0, 2) },
        { id: WIDGET_IDS.OPERACOES, label: 'Centro de Operações', position: pos(0, 2, 2) },
        { id: WIDGET_IDS.GARGALOS, label: 'Gargalos', position: pos(1, 0, 2) },
        { id: WIDGET_IDS.CENTRO_PREVISAO, label: 'Previsão', position: pos(1, 2, 2) },
        { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(2, 0, 2) },
        { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(2, 2, 2) },
        { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(3, 0, 2) },
        { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(3, 2, 2) }
      ];
    }
    return [
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo do dia', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(2, 2, 2) }
    ];
  }

  // Colaborador/Técnico de Manutenção — manutenção em destaque
  const isColabManutencao = (d.includes('manuten') || d.includes('mecan') || r.includes('maintenance')) && (r.includes('colaborador') || r.includes('technician') || r.includes('mecan') || r.includes('eletric'));
  if (isColabManutencao) {
    return [
      { id: WIDGET_IDS.MANUTENCAO, label: 'Centro de Manutenção', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.KPI_CARDS, label: 'Indicadores', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights IA', position: pos(2, 2, 2) }
    ];
  }

  // Auxiliar de produção / Colaborador — foco em tarefas, instruções, produção do turno
  const isAuxiliarProducao = r.includes('colaborador') || r.includes('auxiliar') || r.includes('operador');
  if (isAuxiliarProducao && (d.includes('produ') || d.includes('oper') || !d)) {
    return [
      { id: WIDGET_IDS.KPI_CARDS, label: 'Meus indicadores', position: pos(0, 0, 2) },
      { id: WIDGET_IDS.ALERTAS, label: 'Alertas do turno', position: pos(0, 2, 2) },
      { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo do dia', position: pos(1, 0, 2) },
      { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(1, 2, 2) },
      { id: WIDGET_IDS.OPERACOES, label: 'Operações', position: pos(2, 0, 2) },
      { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights', position: pos(2, 2, 2) }
    ];
  }

  // Default (operador/colaborador)
  return [
    { id: WIDGET_IDS.KPI_CARDS, label: 'Meus indicadores', position: pos(0, 0, 2) },
    { id: WIDGET_IDS.ALERTAS, label: 'Alertas', position: pos(0, 2, 2) },
    { id: WIDGET_IDS.RESUMO_EXECUTIVO, label: 'Resumo', position: pos(1, 0, 2) },
    { id: WIDGET_IDS.PERGUNTE_IA, label: 'Pergunte à IA', position: pos(1, 2, 2) },
    { id: WIDGET_IDS.GRAFICO_TENDENCIA, label: 'Tendência', position: pos(2, 0, 2) },
    { id: WIDGET_IDS.INSIGHTS_IA, label: 'Insights', position: pos(2, 2, 2) }
  ];
}

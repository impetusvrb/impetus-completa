/**
 * IMPETUS - Motor de dashboard personalizado por perfil
 * Gera config (perfil + modulos) com base em cargo, função, departamento, descrição.
 * Segue o documento docs/IMPETUS_Dashboard_Personalizado_Por_Perfil.md
 * IDs de módulos mapeados para os widgets do CentroComando (LayoutPorCargo).
 */

const db = require('../db');
const dashboardProfileResolver = require('./dashboardProfileResolver');

/** Versão das regras de layout — incrementar para invalidar cache em `dashboard_configs`. */
const LAYOUT_RULES_VERSION = 2;

/** Mapeamento tamanho doc → width no grid (1 ou 2) */
const TAMANHO_TO_SPAN = { pequeno: 1, medio: 1, grande: 2, full: 2 };

/** Widgets existentes no frontend (CentroComando WIDGET_IDS) */
const WIDGET_IDS = {
  resumo_executivo: 'resumo_executivo',
  kpi_cards: 'kpi_cards',
  alertas: 'alertas',
  grafico_tendencia: 'grafico_tendencia',
  pergunte_ia: 'pergunte_ia',
  relatorio_ia: 'relatorio_ia',
  grafico_producao_demanda: 'grafico_producao_demanda',
  grafico_custos_setor: 'grafico_custos_setor',
  grafico_margem: 'grafico_margem',
  indicadores_executivos: 'indicadores_executivos',
  centro_previsao: 'centro_previsao',
  centro_custos: 'centro_custos',
  mapa_vazamentos: 'mapa_vazamentos',
  performance: 'performance',
  gargalos: 'gargalos',
  desperdicio: 'desperdicio',
  insights_ia: 'insights_ia',
  diagrama_industrial: 'diagrama_industrial',
  manutencao: 'manutencao',
  qualidade: 'qualidade',
  estoque: 'estoque',
  logistica: 'logistica',
  operacoes: 'operacoes',
  energia: 'energia',
  rastreabilidade: 'rastreabilidade',
  receitas: 'receitas'
};

/**
 * Resolve nível hierárquico a partir do cargo/role
 */
function getNivel(role, cargo = '') {
  const r = (role || '').toLowerCase();
  const c = (cargo || '').toLowerCase();
  if (r === 'ceo' || r === 'diretor' || c.includes('diretor') || c.includes('ceo')) return 'estratégico';
  if (r === 'gerente' || c.includes('gerente')) return 'estratégico';
  if (r === 'coordenador' || r === 'supervisor' || c.includes('coordenador') || c.includes('supervisor')) return 'tático';
  return 'operacional';
}

/**
 * Gera configuração do dashboard por regras (sem Claude API).
 * Usa role + functional_area/departamento para escolher módulos e ordem.
 */
function gerarConfigPorRegras(user) {
  const role = (user.role || '').toLowerCase();
  const dept = (user.functional_area || user.departamento || user.area || '').toLowerCase();
  const cargo = (user.job_title || user.cargo || role).toString();
  const nivel = getNivel(role, cargo);

  const perfil = {
    cargo: cargo || role,
    nivel,
    departamento: dept || 'Geral',
    titulo_dashboard: 'Centro de Comando Industrial',
    subtitulo: `Visão para ${(cargo || role).toString().replace(/_/g, ' ')}`
  };

  const modulos = [];
  let pos = 0;

  function add(id, tamanho = 'medio', prioridade = 'alta', contexto = '') {
    if (WIDGET_IDS[id] || Object.values(WIDGET_IDS).includes(id)) {
      pos++;
      modulos.push({
        id,
        posicao: pos,
        tamanho,
        prioridade,
        contexto: contexto || nivel
      });
    }
  }

  // CEO / Diretoria — todos executivos + resumo IA
  if (role === 'ceo' || role === 'diretor' || role.includes('execut')) {
    add(WIDGET_IDS.resumo_executivo, 'grande', 'critica');
    add(WIDGET_IDS.indicadores_executivos, 'grande', 'critica');
    add(WIDGET_IDS.grafico_producao_demanda, 'grande', 'alta');
    add(WIDGET_IDS.grafico_custos_setor, 'grande', 'alta');
    add(WIDGET_IDS.centro_custos, 'grande', 'alta');
    add(WIDGET_IDS.performance, 'grande', 'alta');
    add(WIDGET_IDS.centro_previsao, 'grande', 'media');
    add(WIDGET_IDS.alertas, 'pequeno', 'alta');
    add(WIDGET_IDS.pergunte_ia, 'pequeno', 'alta');
    add(WIDGET_IDS.relatorio_ia, 'grande', 'media');
    add(WIDGET_IDS.insights_ia, 'grande', 'media');
    perfil.titulo_dashboard = 'Visão Executiva';
    perfil.subtitulo = 'Indicadores globais e tendências';
  }
  // Diretor Industrial
  else if (role === 'diretor' && (dept.includes('indust') || dept.includes('oper'))) {
    add(WIDGET_IDS.resumo_executivo, 'medio', 'critica');
    add(WIDGET_IDS.indicadores_executivos, 'grande', 'critica');
    add(WIDGET_IDS.operacoes, 'grande', 'critica');
    add(WIDGET_IDS.gargalos, 'grande', 'critica');
    add(WIDGET_IDS.performance, 'grande', 'alta');
    add(WIDGET_IDS.diagrama_industrial, 'grande', 'alta');
    add(WIDGET_IDS.centro_custos, 'grande', 'alta');
    add(WIDGET_IDS.alertas, 'pequeno', 'alta');
    add(WIDGET_IDS.pergunte_ia, 'pequeno', 'alta');
    add(WIDGET_IDS.grafico_tendencia, 'grande', 'media');
    add(WIDGET_IDS.insights_ia, 'grande', 'media');
  }
  // Gerente Produção / Operações
  else if (role === 'gerente' && (dept.includes('produ') || dept.includes('oper'))) {
    add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
    add(WIDGET_IDS.operacoes, 'grande', 'critica');
    add(WIDGET_IDS.gargalos, 'grande', 'alta');
    add(WIDGET_IDS.desperdicio, 'grande', 'alta');
    add(WIDGET_IDS.centro_previsao, 'grande', 'alta');
    add(WIDGET_IDS.alertas, 'grande', 'alta');
    add(WIDGET_IDS.grafico_tendencia, 'grande', 'media');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
  }
  // Gerente Manutenção
  else if (role === 'gerente' && (dept.includes('manuten') || dept.includes('mecan'))) {
    add(WIDGET_IDS.manutencao, 'grande', 'critica');
    add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
    add(WIDGET_IDS.mapa_vazamentos, 'grande', 'alta');
    add(WIDGET_IDS.energia, 'grande', 'alta');
    add(WIDGET_IDS.alertas, 'grande', 'alta');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
    add(WIDGET_IDS.insights_ia, 'grande', 'media');
    add(WIDGET_IDS.resumo_executivo, 'grande', 'media');
  }
  // Gerente Qualidade
  else if (role === 'gerente' && dept.includes('qualid')) {
    add(WIDGET_IDS.qualidade, 'grande', 'critica');
    add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
    add(WIDGET_IDS.rastreabilidade, 'grande', 'alta');
    add(WIDGET_IDS.receitas, 'grande', 'alta');
    add(WIDGET_IDS.alertas, 'grande', 'alta');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
  }
  // Gerente Financeiro / Estoque / Logística
  else if (role === 'gerente' && (dept.includes('financ') || dept.includes('estoqu') || dept.includes('logist'))) {
    add(WIDGET_IDS.centro_custos, 'grande', 'critica');
    add(WIDGET_IDS.grafico_custos_setor, 'grande', 'critica');
    add(WIDGET_IDS.desperdicio, 'grande', 'alta');
    add(WIDGET_IDS.mapa_vazamentos, 'grande', 'alta');
    add(WIDGET_IDS.resumo_executivo, 'grande', 'media');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
    add(WIDGET_IDS.alertas, 'grande', 'media');
  }
  // Supervisor / Coordenador — diferenciação fina por perfil resolvido (produção / manutenção / qualidade)
  else if (role === 'supervisor' || role === 'coordenador' || role.includes('supervisor') || role.includes('coordinator')) {
    const profileCode = dashboardProfileResolver.resolveDashboardProfile(user);
    const isSupCoordMaintenance =
      profileCode === 'supervisor_maintenance' ||
      profileCode === 'coordinator_maintenance' ||
      dept.includes('manuten') ||
      dept.includes('mecan') ||
      dept.includes('maintenance') ||
      role.includes('maintenance');
    const isSupCoordQuality =
      profileCode === 'supervisor_quality' ||
      profileCode === 'coordinator_quality' ||
      dept.includes('qualid');
    const isSupCoordProduction =
      profileCode === 'supervisor_production' ||
      profileCode === 'coordinator_production' ||
      dept.includes('produ') ||
      dept.includes('oper') ||
      dept.includes('pcp');

    if (isSupCoordMaintenance) {
      add(WIDGET_IDS.manutencao, 'grande', 'critica');
      add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
      add(WIDGET_IDS.alertas, 'grande', 'alta');
      add(WIDGET_IDS.grafico_tendencia, 'grande', 'alta');
      add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
      add(WIDGET_IDS.insights_ia, 'grande', 'media');
    } else if (isSupCoordQuality) {
      add(WIDGET_IDS.qualidade, 'grande', 'critica');
      add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
      add(WIDGET_IDS.rastreabilidade, 'grande', 'alta');
      add(WIDGET_IDS.receitas, 'grande', 'alta');
      add(WIDGET_IDS.alertas, 'grande', 'alta');
      add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
      add(WIDGET_IDS.insights_ia, 'grande', 'media');
    } else if (isSupCoordProduction) {
      add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
      add(WIDGET_IDS.operacoes, 'grande', 'critica');
      add(WIDGET_IDS.gargalos, 'grande', 'alta');
      add(WIDGET_IDS.centro_previsao, 'grande', 'alta');
      add(WIDGET_IDS.alertas, 'grande', 'alta');
      add(WIDGET_IDS.grafico_tendencia, 'grande', 'media');
      add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
      add(WIDGET_IDS.insights_ia, 'grande', 'media');
    } else {
      add(WIDGET_IDS.resumo_executivo, 'grande', 'critica');
      add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
      add(WIDGET_IDS.alertas, 'grande', 'alta');
      add(WIDGET_IDS.grafico_tendencia, 'grande', 'alta');
      add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
      add(WIDGET_IDS.insights_ia, 'grande', 'media');
    }
  }
  // Colaborador/Técnico de Manutenção — mecânico, eletricista, technician_maintenance
  else if ((dept.includes('manuten') || dept.includes('mecan') || dept.includes('maintenance')) || role.includes('maintenance') || role.includes('technician') || role.includes('mecan') || role.includes('eletric')) {
    add(WIDGET_IDS.manutencao, 'grande', 'critica');
    add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
    add(WIDGET_IDS.alertas, 'grande', 'alta');
    add(WIDGET_IDS.resumo_executivo, 'grande', 'media');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
    add(WIDGET_IDS.grafico_tendencia, 'grande', 'media');
  }
  // Default (operador/colaborador)
  else {
    add(WIDGET_IDS.kpi_cards, 'grande', 'critica');
    add(WIDGET_IDS.alertas, 'grande', 'critica');
    add(WIDGET_IDS.resumo_executivo, 'grande', 'alta');
    add(WIDGET_IDS.pergunte_ia, 'grande', 'alta');
    add(WIDGET_IDS.grafico_tendencia, 'grande', 'media');
    add(WIDGET_IDS.insights_ia, 'grande', 'media');
  }

  const assistente_ia = {
    especialidade: nivel === 'estratégico' ? 'visão_executiva' : nivel === 'tático' ? 'gestão_operacional' : 'operacional',
    exemplos_perguntas: [
      'Quais os principais indicadores do período?',
      'Onde estão os gargalos?',
      'Resuma os alertas críticos.'
    ]
  };

  return { perfil, modulos, assistente_ia, layout_rules_version: LAYOUT_RULES_VERSION };
}

/**
 * Converte config do formato doc (modulos[].posicao, tamanho) para formato do frontend (position { row, col, width })
 */
function configParaLayout(config) {
  if (!config || !config.modulos || !config.modulos.length) return null;
  const layout = [];
  let row = 0;
  let col = 0;
  const cols = 4;
  config.modulos
    .sort((a, b) => (a.posicao || 0) - (b.posicao || 0))
    .forEach((m) => {
      const width = TAMANHO_TO_SPAN[m.tamanho] || 1;
      if (col + width > cols) {
        col = 0;
        row++;
      }
      layout.push({
        id: m.id,
        label: m.contexto || m.id,
        position: { row, col, width }
      });
      col += width;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });
  return layout;
}

/**
 * Retorna config personalizado: do cache (se válido) ou gera por regras e opcionalmente salva no cache.
 */
async function getConfigPersonalizado(user) {
  if (!user || !user.id) return null;

  let config = null;

  try {
    const r = await db.query(
      'SELECT config_json, expira_em FROM dashboard_configs WHERE user_id = $1 AND expira_em > now()',
      [user.id]
    );
    if (r.rows.length > 0) {
      const parsed = r.rows[0].config_json;
      if (parsed && Number(parsed.layout_rules_version) === LAYOUT_RULES_VERSION) {
        config = parsed;
      }
    }
  } catch (e) {
    // Tabela pode não existir
  }

  if (!config) {
    config = gerarConfigPorRegras(user);
    try {
      await db.query(
        `INSERT INTO dashboard_configs (user_id, company_id, config_json, expira_em)
         VALUES ($1, $2, $3, now() + INTERVAL '24 hours')
         ON CONFLICT (user_id) DO UPDATE SET config_json = EXCLUDED.config_json, expira_em = EXCLUDED.expira_em, gerado_em = now()`,
        [user.id, user.company_id || null, JSON.stringify(config)]
      );
    } catch (e) {
      // Ignora erro de persistência
    }
  }

  const layout = configParaLayout(config);
  const version = Number(config.layout_rules_version);
  return {
    perfil: config.perfil,
    modulos: config.modulos,
    assistente_ia: config.assistente_ia,
    layout,
    /** Versão das regras de montagem do grid (telemetria, suporte, debugging). */
    layout_rules_version: Number.isFinite(version) && version > 0 ? version : LAYOUT_RULES_VERSION
  };
}

/**
 * Invalida cache do usuário (chamar quando cargo/função/departamento mudar)
 */
async function invalidarCache(userId) {
  try {
    await db.query('DELETE FROM dashboard_configs WHERE user_id = $1', [userId]);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  gerarConfigPorRegras,
  configParaLayout,
  getConfigPersonalizado,
  invalidarCache,
  WIDGET_IDS,
  LAYOUT_RULES_VERSION
};

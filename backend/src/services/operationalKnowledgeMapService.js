/**
 * IMPETUS - Mapa de Conhecimento da Empresa
 * Monta automaticamente o mapa da operação: linhas, máquinas, equipamentos, equipes, responsáveis.
 * Atualizado conforme eventos e conversas aparecem.
 */
const db = require('../db');

/**
 * Retorna mapa estruturado da operação (linhas → máquinas/equipamentos)
 * Combina dados cadastrais (production_lines, assets) com entidades extraídas dos eventos
 */
async function getKnowledgeMap(companyId) {
  if (!companyId) return { linhas: [], equipamentos_soltos: [], responsaveis: [] };

  const [linhasCadastrais, equipamentosCadastrais, entidadesExtraidas] = await Promise.all([
    getLinhasFromStructural(companyId),
    getEquipamentosFromStructural(companyId),
    getEntidadesFromEvents(companyId)
  ]);

  const mapa = { linhas: [], equipamentos_soltos: [], responsaveis: [] };

  for (const l of linhasCadastrais) {
    const maquinas = equipamentosCadastrais.filter((e) => e.line_id === l.id);
    const eventosLinha = entidadesExtraidas.filter((e) => e.linha && String(e.linha).toLowerCase().includes(String(l.name || l.code || '').toLowerCase()));
    const equipamentosEventos = [...new Set(eventosLinha.map((e) => e.equipamento).filter(Boolean))];

    mapa.linhas.push({
      id: l.id,
      name: l.name,
      code: l.code,
      maquinas: maquinas.map((m) => ({ id: m.id, name: m.name, type: m.machine_type })),
      equipamentos_extraidos: equipamentosEventos,
      responsavel: l.responsible_name
    });
  }

  const equipamentosSemLinha = equipamentosCadastrais.filter((e) => !e.line_id);
  const equipamentosEventos = entidadesExtraidas
    .filter((e) => e.equipamento && !mapa.linhas.some((l) => l.equipamentos_extraidos?.includes(e.equipamento)))
    .map((e) => e.equipamento);
  mapa.equipamentos_soltos = [...new Set([...equipamentosSemLinha.map((e) => e.name), ...equipamentosEventos])];

  const responsaveis = [...new Set([...linhasCadastrais.map((l) => l.responsible_name), ...entidadesExtraidas.map((e) => e.usuario).filter(Boolean)])].filter(Boolean);
  mapa.responsaveis = responsaveis;

  return mapa;
}

async function getLinhasFromStructural(companyId) {
  try {
    const r = await db.query(`
      SELECT pl.id, pl.name, pl.code, u.name as responsible_name
      FROM production_lines pl
      LEFT JOIN users u ON u.id = pl.responsible_id
      WHERE pl.company_id = $1 AND pl.active = true
      ORDER BY pl.name
    `, [companyId]);
    return r.rows || [];
  } catch {
    return [];
  }
}

async function getEquipamentosFromStructural(companyId) {
  try {
    const [machines, assets] = await Promise.all([
      db.query(`
        SELECT plm.id, plm.name, plm.machine_type, pl.id as line_id
        FROM production_line_machines plm
        JOIN production_lines pl ON pl.id = plm.line_id
        WHERE pl.company_id = $1
      `, [companyId]),
      db.query(`
        SELECT a.id, a.name, a.line_id
        FROM assets a
        WHERE a.company_id = $1 AND a.active = true
      `, [companyId])
    ]);

    const list = (machines.rows || []).map((m) => ({ ...m, machine_type: m.machine_type || 'maquina' }));
    (assets.rows || []).forEach((a) => {
      list.push({ id: a.id, name: a.name, line_id: a.line_id, machine_type: 'ativo' });
    });
    return list;
  } catch {
    return [];
  }
}

async function getEntidadesFromEvents(companyId) {
  try {
    const r = await db.query(`
      SELECT DISTINCT equipamento, linha, usuario
      FROM knowledge_memory
      WHERE company_id = $1 AND (equipamento IS NOT NULL OR linha IS NOT NULL OR usuario IS NOT NULL)
      UNION
      SELECT DISTINCT equipamento, linha, NULL
      FROM eventos_empresa
      WHERE company_id = $1 AND (equipamento IS NOT NULL OR linha IS NOT NULL)
      UNION
      SELECT DISTINCT equipamento, linha, tecnico
      FROM casos_manutencao
      WHERE company_id = $1 AND (equipamento IS NOT NULL OR linha IS NOT NULL)
      LIMIT 200
    `, [companyId]);
    return r.rows || [];
  } catch {
    return [];
  }
}

module.exports = { getKnowledgeMap };

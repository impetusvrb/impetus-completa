/**
 * IMPETUS - ManuIA - Serviço de pesquisa de equipamentos por IA
 * Pesquisa informações técnicas para manutenção (especificações, falhas comuns,
 * peças, manuais, vídeos) e retorna JSON estruturado para renderização 3D
 */
const OpenAI = require('openai');
const db = require('../db');

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `Você é um especialista técnico em manutenção industrial.
Quando o profissional informar um equipamento, retorne TUDO que ele precisa para fazer manutenção.

Use seu conhecimento de fabricantes (WEG, Siemens, Schneider, Grundfos, Schulz, Vital, Carrier, GM, etc.),
modelos, especificações técnicas, fóruns de manutenção e boas práticas.

Retorne SEMPRE um JSON válido com a estrutura exata solicitada. Sem texto antes ou depois do JSON.
Se não encontrar o modelo exato, busque modelos similares da mesma família e informe em data_sources.`;

function buildUserPrompt(query) {
  return `O profissional informou que vai fazer manutenção em: "${query}"

Pesquise e retorne um JSON com esta estrutura exata:

{
  "equipment": {
    "name": "nome completo do equipamento",
    "manufacturer": "fabricante",
    "model": "modelo exato",
    "line": "linha/série",
    "category": "motor|bomba|quadro|compressor|inversor|condicionador|cambio|outro",
    "subcategory": "elétrico|hidráulico|pneumático|refrigeração|etc",
    "country_origin": "país",
    "year_range": "período se conhecido"
  },
  "specs": {
    "power": "potência em kW ou cv",
    "voltage": "tensão em V",
    "current": "corrente em A",
    "frequency": "frequência Hz",
    "rpm": "rotação",
    "pressure": "pressão se aplicável",
    "flow": "vazão se aplicável",
    "temperature": "faixa de temperatura",
    "weight": "peso em kg",
    "dimensions": "dimensões LxAxP",
    "protection_level": "IPxx",
    "efficiency_class": "IE1|IE2|IE3"
  },
  "components": [
    {
      "name": "nome amigável",
      "technical_name": "nome_tecnico_snake",
      "position": "frontal|traseiro|topo|lateral",
      "function": "função",
      "common_failure": true,
      "replacement_code": "código peça"
    }
  ],
  "common_failures": [
    {
      "symptom": "sintoma",
      "root_cause": "causa raiz",
      "frequency": "alta|média|baixa",
      "repair_difficulty": "fácil|médio|difícil",
      "estimated_time_minutes": 60,
      "solution_steps": ["passo 1", "passo 2"]
    }
  ],
  "spare_parts": [
    {
      "code": "código",
      "name": "nome",
      "quantity_per_unit": 1,
      "avg_price_brl": "faixa em R$",
      "suppliers_brazil": ["fornecedor1"],
      "replacement_interval": "a cada X horas"
    }
  ],
  "maintenance_tools": [{"tool": "ferramenta", "specification": "especificação", "why_needed": "motivo"}],
  "lubricants": [{"component": "componente", "product": "produto", "quantity": "qtd", "interval": "intervalo"}],
  "torques": [{"bolt_location": "local", "torque_nm": 50, "sequence": "ordem aperto"}],
  "required_ppe": ["Óculos", "Luvas", "etc"],
  "safety_warnings": ["aviso 1"],
  "manuals": [{"title": "título", "url": "url se conhecida", "language": "pt", "pages": 0}],
  "videos": [{"title": "título", "url": "url YouTube", "channel": "canal", "duration": "X min", "relevance": "alta"}],
  "technician_tips": ["dica 1"],
  "model_3d_type": "motor|pump|compressor|panel|hydraulic|pneumatic|inverter|transformer|generic",
  "render_config": {
    "main_body_shape": "cylindrical|rectangular|complex",
    "has_shaft": true,
    "has_impeller": false,
    "has_fan": false,
    "primary_color_hex": "#2a3a50",
    "accent_color_hex": "#1d6fe8"
  },
  "data_confidence": "high|medium|low",
  "data_sources": ["fonte 1"]
}`;
}

function normalizeQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, '')
    .slice(0, 200);
}

/**
 * Pesquisa equipamento via IA e retorna JSON estruturado
 * @param {string} query - Texto do equipamento (ex: "bomba UXVD marca Vital")
 * @param {string} companyId
 * @param {string} userId
 * @param {string} sessionId - opcional
 * @returns {Promise<object>} research_result
 */
async function researchEquipment(query, companyId, userId, sessionId = null) {
  const q = (query || '').trim();
  if (!q || q.length < 3) {
    throw new Error('Informe ao menos 3 caracteres do equipamento');
  }

  const normalized = normalizeQuery(q);

  // Verificar cache
  try {
    const cached = await db.query(
      `SELECT research_result, equipment_name, equipment_manufacturer, model_3d_type
       FROM manuia_equipment_research
       WHERE company_id = $1 AND query_normalized = $2`,
      [companyId, normalized]
    );
    if (cached.rows?.length > 0) {
      const res = cached.rows[0].research_result;
      return typeof res === 'string' ? JSON.parse(res) : res;
    }
  } catch (err) {
    console.warn('[MANUIA_RESEARCH] cache check:', err?.message);
  }

  if (!client) {
    throw new Error('IA não configurada. Configure OPENAI_API_KEY.');
  }

  const userPrompt = buildUserPrompt(q);
  let rawResponse = '';

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    rawResponse = completion.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('[MANUIA_RESEARCH] OpenAI:', err?.message);
    throw new Error(`Erro na pesquisa: ${err?.message}`);
  }

  let result;
  try {
    const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn('[MANUIA_RESEARCH] parse fallback');
    result = {
      equipment: { name: q, manufacturer: '', model: '', category: 'generic' },
      specs: {},
      components: [],
      common_failures: [],
      spare_parts: [],
      model_3d_type: 'generic',
      render_config: {
        main_body_shape: 'rectangular',
        has_shaft: false,
        has_impeller: false,
        has_fan: false,
        primary_color_hex: '#2a3a50',
        accent_color_hex: '#1d6fe8'
      },
      data_confidence: 'low',
      data_sources: [],
      _raw_preview: rawResponse.slice(0, 500)
    };
  }

  const equipmentName = result?.equipment?.name || q;
  const manufacturer = result?.equipment?.manufacturer || '';
  const model3dType = result?.model_3d_type || 'generic';

  // Salvar no cache (upsert)
  try {
    await db.query(
      `INSERT INTO manuia_equipment_research
       (company_id, user_id, query_normalized, query_original, research_result, equipment_name, equipment_manufacturer, model_3d_type, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (company_id, query_normalized)
       DO UPDATE SET
         research_result = EXCLUDED.research_result,
         equipment_name = EXCLUDED.equipment_name,
         equipment_manufacturer = EXCLUDED.equipment_manufacturer,
         model_3d_type = EXCLUDED.model_3d_type,
         user_id = EXCLUDED.user_id,
         session_id = EXCLUDED.session_id,
         created_at = now()`,
      [companyId, userId || null, normalized, q.slice(0, 500), JSON.stringify(result), equipmentName, manufacturer, model3dType, sessionId]
    );
  } catch (err) {
    console.warn('[MANUIA_RESEARCH] cache save:', err?.message);
  }

  return result;
}

/**
 * Lista últimas pesquisas do usuário/empresa (para sugestões)
 */
async function getRecentSearches(companyId, userId, limit = 10) {
  try {
    const r = await db.query(
      `SELECT query_original, equipment_name, created_at
       FROM manuia_equipment_research
       WHERE company_id = $1 AND (user_id = $2 OR user_id IS NULL)
       ORDER BY created_at DESC LIMIT $3`,
      [companyId, userId, limit]
    );
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist')) return [];
    throw err;
  }
}

module.exports = {
  researchEquipment,
  getRecentSearches,
  normalizeQuery
};

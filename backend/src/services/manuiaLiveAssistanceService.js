/**
 * IMPETUS — ManuIA — Assistência Técnica ao Vivo
 * Orquestração: visão (Gemini) → pesquisa interna / biblioteca / OS → dossiê → copiloto (OpenAI)
 * Não expor nomes de modelos na resposta ao usuário (consolidação no frontend a partir do dossiê).
 */
'use strict';

const db = require('../db');
const geminiService = require('./geminiService');
const ai = require('./ai');
const equipmentResearchService = require('./equipmentResearchService');
const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('./impetusAIGovernancePolicy');

const COPILOT_SYSTEM = `${IMPETUS_IA_SYSTEM_PROMPT_FULL}

## Modo: Assistência técnica ao vivo (ManuIA)
- Você é especialista em manutenção industrial. Respostas curtas, técnicas, objetivas.
- Use APENAS o dossiê e o histórico fornecidos. Não invente números de série, códigos ou eventos não presentes no contexto.
- Se faltar dado, diga o que falta e sugira verificação no campo.
- Nunca diga que "outro modelo analisou"; fale como IMPETUS IA única.
- Priorize segurança (LOTO, EPI, desenergia) quando relevante.`;

const GEMINI_PART_PROMPT = `Você é um especialista em visão industrial. Analise a imagem da peça ou equipamento.

Retorne SOMENTE um JSON válido (sem markdown), com esta estrutura:
{
  "detected_part_name": "nome técnico ou melhor estimativa",
  "detected_part_common_name": "nome popular em PT-BR",
  "detected_part_category": "categoria (ex: rolamento, selo, acoplamento, motor, bomba, sensor)",
  "probable_machine": "equipamento/máquina provável se inferível, senão string vazia",
  "probable_brand": "marca se visível ou inferida com cautela, senão vazio",
  "probable_model": "modelo se visível, senão vazio",
  "visible_codes": ["códigos ou textos legíveis na imagem"],
  "visual_findings": ["achados visuais objetivos: desgaste, trinca, corrosão, vazamento, marca de calor, etc."],
  "probable_failures": ["hipóteses de falha compatíveis com o visual"],
  "operational_risk": "baixo|medio|alto|desconhecido",
  "confidence": 0-100,
  "confidence_level": "confirmado|muito_provavel|provavel|inconclusivo",
  "technical_summary": "uma frase técnica sobre o que parece ser",
  "maintenance_guidance": "orientação inicial cautelosa (sem inventar procedimento específico sem dados)",
  "next_actions": ["próximos passos sugeridos no campo"]
}

Regras: se não tiver certeza, use confidence_level inconclusivo ou provavel e confidence baixa. Não invente códigos não legíveis.`;

function extractJsonFromText(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    console.warn('[manuiaLiveAssistanceService][extract_json_from_text]', err?.message ?? err);
    return null;
  }
}

function buildResearchQuery(detection) {
  const parts = [
    detection.detected_part_name,
    detection.probable_brand,
    detection.probable_model,
    detection.probable_machine
  ].filter(Boolean);
  const q = parts.join(' ').trim();
  return q.length >= 3 ? q.slice(0, 400) : (detection.detected_part_common_name || detection.technical_summary || 'equipamento industrial').slice(0, 200);
}

async function searchWorkOrders(companyId, queryText, machineId, limit = 8) {
  const terms = String(queryText || '')
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 4);
  const params = [companyId];
  let machineNameFilter = '';
  if (machineId) {
    try {
      const mr = await db.query(`SELECT name FROM manuia_machines WHERE company_id = $1 AND id = $2`, [companyId, machineId]);
      const mn = mr.rows?.[0]?.name;
      if (mn) {
        params.push(`%${mn}%`);
        machineNameFilter = ` AND (machine_name ILIKE $${params.length} OR title ILIKE $${params.length})`;
      }
    } catch (err) {
      console.warn('[manuiaLiveAssistanceService][machine_name_filter]', err?.message ?? err);
    }
  }
  let sql = `SELECT id, title, description, status, machine_name, sector, created_at
             FROM work_orders WHERE company_id = $1${machineNameFilter}`;
  if (terms.length) {
    const start = params.length + 1;
    const ilike = terms.map((t) => `%${t}%`);
    params.push(...ilike);
    const conds = terms.map((_, i) => `(title ILIKE $${start + i} OR description ILIKE $${start + i} OR machine_name ILIKE $${start + i})`);
    sql += ` AND (${conds.join(' OR ')})`;
  }
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  if (!machineNameFilter && !terms.length) {
    return [];
  }
  try {
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) return [];
    console.warn('[MANUIA_LIVE] work_orders:', e?.message);
    return [];
  }
}

async function searchEmergencyEvents(companyId, machineId, limit = 5) {
  try {
    const params = [companyId];
    let q = `SELECT id, event_type, severity, description, created_at, machine_name
             FROM manuia_emergency_events WHERE company_id = $1 AND resolved_at IS NULL`;
    if (machineId) {
      params.push(machineId);
      q += ` AND machine_id = $2`;
    }
    q += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const r = await db.query(q, params);
    return r.rows || [];
  } catch (err) {
    console.warn('[manuiaLiveAssistanceService][emergency_events]', err?.message ?? err);
    return [];
  }
}

/**
 * Analisa frame com Gemini (JSON estruturado)
 */
async function identifyPartFromImageWithGemini(imageBase64) {
  if (!geminiService.isAvailable()) {
    return { ok: false, error: 'Visão indisponível (configure GEMINI/GOOGLE_API_KEY)', detection: null };
  }
  const raw = await geminiService.analyzeImage(imageBase64, GEMINI_PART_PROMPT);
  const detection = extractJsonFromText(raw) || null;
  if (!detection) {
    return {
      ok: true,
      detection: {
        detected_part_name: '',
        confidence_level: 'inconclusivo',
        confidence: 0,
        technical_summary: (raw || '').slice(0, 500) || 'Análise não estruturada.',
        visible_codes: [],
        visual_findings: [],
        probable_failures: [],
        operational_risk: 'desconhecido'
      },
      raw_text: raw
    };
  }
  return { ok: true, detection, raw_text: raw };
}

/**
 * Pesquisa técnica profunda: biblioteca + pesquisa equipamento (cache/OpenAI) + OS + eventos
 */
async function buildTechnicalDossier({
  companyId,
  userId,
  sessionId,
  publicBaseUrl,
  machineId,
  detection
}) {
  const query = buildResearchQuery(detection || {});
  let research = null;
  let researchError = null;
  try {
    research = await equipmentResearchService.researchEquipment(
      query,
      companyId,
      userId,
      sessionId || null,
      publicBaseUrl || ''
    );
  } catch (e) {
    researchError = e?.message || 'Pesquisa indisponível';
    try {
      const modelResolver = require('../modules/technicalLibrary/services/modelResolverService');
      const resolved = await modelResolver.resolve(companyId, { query }, publicBaseUrl || '');
      if (resolved && resolved.source !== 'not_found') {
        research = {
          equipment: { name: query, manufacturer: '', model: '', category: 'generic' },
          technical_library_resolution: resolved,
          library_model_url: resolved.unityPayload?.modelUrl,
          model_3d_type: 'generic',
          data_sources: ['Biblioteca técnica (fallback)'],
          data_confidence: 'medium',
          manuals: []
        };
      }
    } catch (err) {
      console.warn('[manuiaLiveAssistanceService][library_fallback]', err?.message ?? err);
    }
  }

  const workOrders = await searchWorkOrders(companyId, query, machineId);
  const emergencyEvents = await searchEmergencyEvents(companyId, machineId);

  const matched_internal_3d = !!(research?.library_model_url || research?.technical_library_resolution?.unityPayload?.modelUrl);
  const matched_internal_manual =
    Array.isArray(research?.manuals) && research.manuals.length > 0
      ? research.manuals.slice(0, 5)
      : [];
  const matched_history = {
    work_orders: workOrders,
    emergency_events: emergencyEvents
  };
  const matched_assets = machineId
    ? (await (async () => {
        try {
          const r = await db.query(
            `SELECT id, code, name, sector, line_name FROM manuia_machines WHERE company_id = $1 AND id = $2`,
            [companyId, machineId]
          );
          return r.rows || [];
        } catch (err) {
          console.warn('[manuiaLiveAssistanceService][matched_assets]', err?.message ?? err);
          return [];
        }
      })())
    : [];

  const equivalent_parts = Array.isArray(research?.spare_parts) ? research.spare_parts.slice(0, 12) : [];

  const dossier = {
    detected_part_name: detection?.detected_part_name,
    detected_part_common_name: detection?.detected_part_common_name,
    detected_part_category: detection?.detected_part_category,
    probable_machine: detection?.probable_machine || research?.equipment?.name,
    probable_brand: detection?.probable_brand || research?.equipment?.manufacturer,
    probable_model: detection?.probable_model || research?.equipment?.model,
    visible_codes: detection?.visible_codes || [],
    visual_findings: detection?.visual_findings || [],
    probable_failures: detection?.probable_failures || [],
    operational_risk: detection?.operational_risk,
    confidence: detection?.confidence,
    confidence_level: detection?.confidence_level,
    matched_internal_3d: matched_internal_3d,
    matched_internal_manual,
    matched_history,
    matched_assets,
    matched_external_sources: (research?.data_sources || []).map((s) => ({ label: s, type: 'interno_ia' })),
    equivalent_parts,
    technical_summary: detection?.technical_summary,
    maintenance_guidance: detection?.maintenance_guidance,
    next_actions: detection?.next_actions || [],
    research,
    research_query_used: query,
    research_error: researchError
  };

  return dossier;
}

/**
 * Chat copiloto (OpenAI) com contexto do dossiê
 */
async function generateCopilotReply({ messages, dossier, billing }) {
  const ctx = JSON.stringify(dossier || {}, null, 2).slice(0, 12000);
  const sys = `${COPILOT_SYSTEM}\n\n## Dossiê técnico atual (JSON):\n${ctx}`;
  const openaiMessages = [{ role: 'system', content: sys }];
  for (const m of messages || []) {
    if (!m || !m.role) continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    openaiMessages.push({ role, content: String(m.content || '').slice(0, 8000) });
  }
  const text = await ai.chatCompletionMessages(openaiMessages, {
    max_tokens: 700,
    model: 'gpt-4o-mini',
    billing
  });
  return text || '';
}

async function saveDiagnosisSession({ sessionId, companyId, userId, dossier, summaryText }) {
  if (!sessionId) return { ok: false };
  try {
    await db.query(
      `UPDATE manuia_sessions
       SET summary = COALESCE($3, summary),
           metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
       WHERE id = $1 AND company_id = $2 AND user_id = $5`,
      [
        sessionId,
        companyId,
        summaryText || null,
        JSON.stringify({ live_assistance_dossier: dossier, updated_at: new Date().toISOString() }),
        userId
      ]
    );
    return { ok: true };
  } catch (e) {
    console.warn('[MANUIA_LIVE] save session:', e?.message);
    return { ok: false, error: e?.message };
  }
}

module.exports = {
  identifyPartFromImageWithGemini,
  buildTechnicalDossier,
  buildResearchQuery,
  generateCopilotReply,
  saveDiagnosisSession,
  GEMINI_PART_PROMPT
};

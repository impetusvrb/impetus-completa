'use strict';

/**
 * Governança de IA — registo assíncrono de traces (sem bloquear latência da resposta HTTP).
 */
const db = require('../db');
const encryptionService = require('./encryptionService');

const SENSITIVE_KEY_RE =
  /^(password|passwd|pwd|secret|token|authorization|cookie|api[_-]?key|credit[_-]?card|cvv|ssn|cpf_raw)$/i;
const SENSITIVE_KEY_SUBSTR = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'api_key',
  'apikey',
  'credit_card',
  'private_key'
];

function redactValue(_key, v) {
  if (v == null) return v;
  if (typeof v === 'string' && v.length > 20000) {
    return `${v.slice(0, 8000)}…[truncated:${v.length}]`;
  }
  return v;
}

/**
 * Remove ou trunca dados sensíveis antes de persistir JSONB (defesa em profundidade).
 */
function redactForTrace(value, depth = 0) {
  if (depth > 18) return '[MAX_DEPTH]';
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/bearer\s+[a-z0-9._\-]+/i.test(value)) return '[REDACTED_BEARER]';
    return value.length > 50000 ? `${value.slice(0, 12000)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const max = 200;
    const slice = value.length > max ? value.slice(0, max).concat([`…[+${value.length - max} items]`]) : value;
    return slice.map((item) => redactForTrace(item, depth + 1));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const kl = String(k);
    if (SENSITIVE_KEY_RE.test(kl) || SENSITIVE_KEY_SUBSTR.some((s) => kl.toLowerCase().includes(s))) {
      out[kl] = '[REDACTED]';
      continue;
    }
    if (kl === 'images' && Array.isArray(v)) {
      out[kl] = {
        count: v.length,
        note: 'conteúdo binário/base64 não persistido no trace'
      };
      continue;
    }
    if (kl === 'base64' || kl.endsWith('_b64')) {
      out[kl] = v ? '[REDACTED_BASE64]' : v;
      continue;
    }
    out[kl] = redactForTrace(redactValue(kl, v), depth + 1);
  }
  return out;
}

/**
 * Resumo estruturado de dados de contexto vindos do dossiê (KPIs, eventos, ativos).
 */
function summarizeDossierData(data) {
  if (!data || typeof data !== 'object') return {};
  const kpis = Array.isArray(data.kpis) ? data.kpis : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const sampleRows = (rows, keys, max = 40) =>
    rows.slice(0, max).map((r) => {
      if (!r || typeof r !== 'object') return r;
      const o = {};
      for (const key of keys) {
        if (r[key] != null) o[key] = r[key];
      }
      if (Object.keys(o).length) return o;
      return { ref: r.id ?? r.tag ?? null };
    });
  return {
    kpis: { count: kpis.length, sample: sampleRows(kpis, ['id', 'name', 'key', 'valor', 'value']) },
    events: {
      count: events.length,
      sample: sampleRows(events, ['id', 'tipo', 'type', 'codigo', 'timestamp'])
    },
    assets: {
      count: assets.length,
      sample: sampleRows(assets, ['id', 'tag', 'name', 'linha', 'code_patrimonial'])
    },
    documents: { count: documents.length },
    images: { count: Array.isArray(data.images) ? data.images.length : 0 },
    sensors_keys:
      data.sensors && typeof data.sensors === 'object' ? Object.keys(data.sensors).slice(0, 40) : [],
    extras_keys:
      data.extras && typeof data.extras === 'object' ? Object.keys(data.extras).slice(0, 40) : []
  };
}

/**
 * Descriptografa campos persistidos com envelope AES-256-GCM (uso interno / APIs admin).
 * Não regista conteúdo descriptografado.
 */
function hydrateTracePayloadsForRead(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.input_payload != null) {
    out.input_payload = encryptionService.tryDecryptValue(out.input_payload);
  }
  if (out.output_response != null) {
    out.output_response = encryptionService.tryDecryptValue(out.output_response);
  }
  if (out.validation_evidence != null && out.validation_evidence !== '') {
    out.validation_evidence = encryptionService.tryDecryptValue(String(out.validation_evidence), {
      muteErrors: true
    });
  }
  return out;
}

function buildInitialValidationAudit(row) {
  const base = Array.isArray(row.validation_audit) ? [...row.validation_audit] : [];
  if (row.human_validation_status === 'PENDING') {
    base.push({
      type: 'pending_opened',
      at: new Date().toISOString(),
      module: String(row.module_name || '').slice(0, 128)
    });
  }
  return base;
}

async function insertAiTrace(row) {
  const audit = buildInitialValidationAudit(row);
  let modelInfo = row.model_info || {};
  if (Array.isArray(row.governance_tags) && row.governance_tags.length) {
    modelInfo = {
      ...modelInfo,
      governance_tags: [...new Set([...(modelInfo.governance_tags || []), ...row.governance_tags])]
    };
  }
  try {
    const aiProviderService = require('./aiProviderService');
    modelInfo = await aiProviderService.enrichModelInfoForTrace(
      row.company_id,
      modelInfo,
      row.module_name
    );
  } catch (e) {
    console.warn('[AI_TRACE_SUPPLIER_TRANSPARENCY]', e.message);
  }

  const classificationObj =
    row.data_classification && typeof row.data_classification === 'object'
      ? row.data_classification
      : (() => {
          try {
            return typeof row.data_classification === 'string'
              ? JSON.parse(row.data_classification)
              : {};
          } catch (err) {
            console.warn('[aiAnalyticsService][data_classification_parse]', err?.message ?? err);
            return {};
          }
        })();

  const policyRules =
    row.trace_policy_rules && typeof row.trace_policy_rules === 'object' ? row.trace_policy_rules : null;
  encryptionService.assertAtRestPersistenceAllowed(
    classificationObj,
    policyRules,
    { force_encryption: row.force_encryption === true }
  );
  const doEncrypt =
    encryptionService.isEncryptionAvailable() &&
    encryptionService.shouldEncryptAtRest(classificationObj, policyRules, {
      force_encryption: row.force_encryption === true
    });

  let inputSerialized = JSON.stringify(redactForTrace(row.input_payload || {}));
  let outputSerialized = JSON.stringify(redactForTrace(row.output_response || {}));

  if (doEncrypt) {
    try {
      inputSerialized = JSON.stringify(
        encryptionService.encryptField(JSON.parse(inputSerialized))
      );
      outputSerialized = JSON.stringify(
        encryptionService.encryptField(JSON.parse(outputSerialized))
      );
      const encMeta = encryptionService.getEncryptionKeyMeta();
      modelInfo = {
        ...modelInfo,
        encryption_applied: true,
        encryption_version: encryptionService.ENCRYPTION_VERSION,
        encryption_key_source: encMeta.key_source,
        encryption_key_version: encMeta.key_version
      };
    } catch (e) {
      console.warn('[AI_TRACE_ENCRYPTION]', e.message || e);
    }
  }

  let evidenceOut =
    row.validation_evidence != null ? String(row.validation_evidence).slice(0, 50000) : null;
  if (doEncrypt && evidenceOut && encryptionService.isEncryptionAvailable()) {
    try {
      evidenceOut = JSON.stringify(encryptionService.encryptField(evidenceOut));
    } catch (e) {
      console.warn('[AI_TRACE_ENCRYPTION_EVIDENCE]', e.message || e);
    }
  }

  const params = [
    row.trace_id,
    row.user_id || null,
    row.company_id,
    String(row.module_name || 'unknown').slice(0, 128),
    inputSerialized,
    outputSerialized,
    JSON.stringify(redactForTrace(modelInfo)),
    row.system_fingerprint != null ? String(row.system_fingerprint).slice(0, 512) : null,
    row.human_validation_status != null ? String(row.human_validation_status).slice(0, 32) : null,
    row.validation_modality != null ? String(row.validation_modality).slice(0, 16) : null,
    evidenceOut,
    row.validated_at != null ? row.validated_at : null,
    JSON.stringify(redactForTrace(audit))
  ];

  const legalBasis =
    row.legal_basis != null ? String(row.legal_basis).slice(0, 48) : null;
  const dataClassificationJson = JSON.stringify(redactForTrace(row.data_classification || {}));
  const mode = row.mode != null ? String(row.mode).slice(0, 24) : null;
  const intent = row.intent != null ? String(row.intent).slice(0, 32) : null;
  const inputText =
    row.input != null
      ? String(row.input).slice(0, 20000)
      : row.input_payload && row.input_payload.input
        ? String(row.input_payload.input).slice(0, 20000)
        : null;
  const responseText =
    row.response != null
      ? String(row.response).slice(0, 40000)
      : row.output_response && row.output_response.response
        ? String(row.output_response.response).slice(0, 40000)
        : null;
  const responseTimeRaw =
    row.response_time != null
      ? Number(row.response_time)
      : Number(row.output_response && row.output_response.response_time);
  const responseTime = Number.isFinite(responseTimeRaw) ? Math.max(0, Math.round(responseTimeRaw)) : null;
  const tokensRaw =
    row.tokens != null ? Number(row.tokens) : Number(row.output_response && row.output_response.tokens);
  const tokens = Number.isFinite(tokensRaw) ? Math.max(0, Math.round(tokensRaw)) : null;
  const qualityScoreRaw =
    row.quality_score != null
      ? Number(row.quality_score)
      : Number(row.output_response && row.output_response.quality_score);
  const qualityScore = Number.isFinite(qualityScoreRaw)
    ? Math.max(0, Math.min(10, qualityScoreRaw))
    : null;
  const userFeedback =
    row.user_feedback != null
      ? String(row.user_feedback).slice(0, 4000)
      : row.output_response && row.output_response.user_feedback
        ? String(row.output_response.user_feedback).slice(0, 4000)
        : null;
  const failureFlag =
    row.failure_flag != null
      ? row.failure_flag === true
      : row.output_response && row.output_response.failure_flag === true;
  const correctionNeeded =
    row.correction_needed != null
      ? row.correction_needed === true
      : row.output_response && row.output_response.correction_needed === true;

  const schedulePostTraceIncidents = () => {
    const aiIncidentService = require('./aiIncidentService');
    if (row.compliance_incident && row.trace_id && row.company_id) {
      setImmediate(() => {
        aiIncidentService
          .createIncident({
            traceId: row.trace_id,
            userId: row.user_id,
            companyId: row.company_id,
            incidentType: 'COMPLIANCE_RISK',
            userComment: row.compliance_incident.summary,
            severity: row.compliance_incident.severity || 'HIGH'
          })
          .catch((e) => console.warn('[COMPLIANCE_INCIDENT]', e?.message || e));
      });
    }
    if (row.policy_incident && row.trace_id && row.company_id) {
      setImmediate(() => {
        aiIncidentService
          .createIncident({
            traceId: row.trace_id,
            userId: row.user_id,
            companyId: row.company_id,
            incidentType: 'POLICY_VIOLATION',
            userComment: row.policy_incident.summary,
            severity: row.policy_incident.severity || 'MEDIUM'
          })
          .catch((e) => console.warn('[POLICY_INCIDENT]', e?.message || e));
      });
    }
  };

  const runExtendedInsert = async () => {
    if (row.human_validation_status === 'PENDING' && row.user_id && row.company_id) {
      try {
        await db.query(
          `
          UPDATE ai_interaction_traces
          SET
            human_validation_status = 'SUPERSEDED',
            validation_audit = COALESCE(validation_audit, '[]'::jsonb) || $3::jsonb
          WHERE company_id = $1 AND user_id = $2 AND human_validation_status = 'PENDING'
        `,
          [
            row.company_id,
            row.user_id,
            JSON.stringify(
              redactForTrace([
                {
                  type: 'superseded',
                  at: new Date().toISOString(),
                  by_trace: String(row.trace_id)
                }
              ])
            )
          ]
        );
      } catch (e) {
        if (!String(e.message || '').includes('human_validation_status')) throw e;
      }
    }
    const q13 = `
      INSERT INTO ai_interaction_traces (
        trace_id, user_id, company_id, module_name,
        input_payload, output_response, model_info, system_fingerprint,
        human_validation_status, validation_modality, validation_evidence, validated_at, validation_audit
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13::jsonb)
    `;
    const q15 = `
      INSERT INTO ai_interaction_traces (
        trace_id, user_id, company_id, module_name,
        input_payload, output_response, model_info, system_fingerprint,
        human_validation_status, validation_modality, validation_evidence, validated_at, validation_audit,
        legal_basis, data_classification
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13::jsonb,$14,$15::jsonb)
    `;
    const q26 = `
      INSERT INTO ai_interaction_traces (
        trace_id, user_id, company_id, module_name,
        input_payload, output_response, model_info, system_fingerprint,
        human_validation_status, validation_modality, validation_evidence, validated_at, validation_audit,
        legal_basis, data_classification,
        mode, intent, "input", response, response_time, tokens,
        quality_score, user_feedback, failure_flag, correction_needed
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13::jsonb,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    `;
    const params15 = [...params, legalBasis, dataClassificationJson];
    const params26 = [
      ...params15,
      mode,
      intent,
      inputText,
      responseText,
      responseTime,
      tokens,
      qualityScore,
      userFeedback,
      failureFlag,
      correctionNeeded
    ];
    try {
      await db.query(q26, params26);
    } catch (e) {
      const msg = String(e.message || '');
      if (
        msg.includes('mode') ||
        msg.includes('intent') ||
        msg.includes('input') ||
        msg.includes('response') ||
        msg.includes('response_time') ||
        msg.includes('tokens') ||
        msg.includes('quality_score') ||
        msg.includes('user_feedback') ||
        msg.includes('failure_flag') ||
        msg.includes('correction_needed')
      ) {
        try {
          await db.query(q15, params15);
        } catch (inner) {
          const innerMsg = String(inner.message || '');
          if (innerMsg.includes('legal_basis') || innerMsg.includes('data_classification')) {
            await db.query(q13, params);
          } else {
            throw inner;
          }
        }
      } else if (msg.includes('legal_basis') || msg.includes('data_classification')) {
        await db.query(q13, params);
      } else {
        throw e;
      }
    }
  };

  try {
    await runExtendedInsert();
    schedulePostTraceIncidents();
  } catch (err) {
    if (err.message && err.message.includes('human_validation_status')) {
      await db.query(
        `
        INSERT INTO ai_interaction_traces (
          trace_id, user_id, company_id, module_name,
          input_payload, output_response, model_info, system_fingerprint
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8)
      `,
        params.slice(0, 8)
      );
      schedulePostTraceIncidents();
    } else {
      throw err;
    }
  }
}

/**
 * Fecha ciclo HITL: só actualiza se ainda PENDING e pertence ao utilizador/empresa.
 */
async function updateTraceHumanValidation({
  traceId,
  companyId,
  userId,
  status,
  modality,
  evidence,
  auditEntry
}) {
  const fragment = auditEntry ? JSON.stringify([redactForTrace(auditEntry)]) : '[]';
  const r = await db.query(
    `
    UPDATE ai_interaction_traces
    SET
      human_validation_status = $1,
      validation_modality = $2,
      validation_evidence = $3,
      validated_at = now(),
      validation_audit = COALESCE(validation_audit, '[]'::jsonb) || $4::jsonb
    WHERE trace_id = $5::uuid AND company_id = $6 AND user_id = $7
      AND human_validation_status = 'PENDING'
    RETURNING trace_id
  `,
    [
      String(status).slice(0, 32),
      modality ? String(modality).slice(0, 16) : null,
      evidence != null ? String(evidence).slice(0, 50000) : null,
      fragment,
      traceId,
      companyId,
      userId
    ]
  );
  return r.rows?.[0] || null;
}

async function getLatestPendingTraceForUser(companyId, userId) {
  if (!companyId || !userId) return null;
  try {
    const r = await db.query(
      `
      SELECT *
      FROM ai_interaction_traces
      WHERE company_id = $1 AND user_id = $2 AND human_validation_status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [companyId, userId]
    );
    const raw = r.rows?.[0] || null;
    return raw ? hydrateTracePayloadsForRead(raw) : null;
  } catch (err) {
    if (err.message && err.message.includes('human_validation_status')) return null;
    throw err;
  }
}

/**
 * Enfileira gravação do trace (não bloqueia). Falhas só em log.
 */
function enqueueAiTrace(record) {
  const copy = {
    trace_id: record.trace_id,
    user_id: record.user_id,
    company_id: record.company_id,
    module_name: record.module_name,
    mode: record.mode,
    intent: record.intent,
    input: record.input,
    response: record.response,
    response_time: record.response_time,
    tokens: record.tokens,
    quality_score: record.quality_score,
    user_feedback: record.user_feedback,
    failure_flag: record.failure_flag,
    correction_needed: record.correction_needed,
    input_payload: record.input_payload,
    output_response: record.output_response,
    model_info: record.model_info,
    system_fingerprint: record.system_fingerprint,
    human_validation_status: record.human_validation_status,
    validation_modality: record.validation_modality,
    validation_evidence: record.validation_evidence,
    validated_at: record.validated_at,
    validation_audit: record.validation_audit,
    governance_tags: record.governance_tags,
    legal_basis: record.legal_basis,
    data_classification: record.data_classification,
    compliance_incident: record.compliance_incident,
    policy_incident: record.policy_incident,
    trace_policy_rules: record.trace_policy_rules,
    force_encryption: record.force_encryption
  };
  setImmediate(() => {
    insertAiTrace(copy).catch((err) => {
      console.warn('[AI_ANALYTICS_TRACE]', err.message);
    });
  });
}

/**
 * Lista últimos traces da empresa (admin).
 */
async function listTracesForCompany(companyId, limit = 50) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const r = await db.query(
    `
    SELECT
      t.id,
      t.trace_id,
      t.user_id,
      u.name AS user_name,
      u.email AS user_email,
      t.company_id,
      t.module_name,
      t.input_payload,
      t.output_response,
      t.model_info,
      t.system_fingerprint,
      t.created_at,
      t.human_validation_status,
      t.validation_modality,
      t.validation_evidence,
      t.validated_at,
      t.validation_audit
    FROM ai_interaction_traces t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.company_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2
  `,
    [companyId, lim]
  );
  return r.rows.map((row) => hydrateTracePayloadsForRead(row));
}

module.exports = {
  redactForTrace,
  summarizeDossierData,
  enqueueAiTrace,
  insertAiTrace,
  updateTraceHumanValidation,
  getLatestPendingTraceForUser,
  listTracesForCompany,
  hydrateTracePayloadsForRead
};

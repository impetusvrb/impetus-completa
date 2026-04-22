'use strict';

/**
 * Auditoria de interações IA — apenas administradores da empresa.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireCompanyId } = require('../../middleware/auth');
const aiAnalytics = require('../../services/aiAnalyticsService');

const adminCompany = [requireAuth, requireRole('admin'), requireCompanyId];

function formatTraceRow(row) {
  const pretty = (v) => {
    if (v == null) return null;
    if (typeof v === 'object') return v;
    return v;
  };
  return {
    id: row.id,
    trace_id: row.trace_id,
    created_at: row.created_at,
    module_name: row.module_name,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email
        }
      : null,
    input_payload: pretty(row.input_payload),
    output_response: pretty(row.output_response),
    model_info: pretty(row.model_info),
    system_fingerprint: row.system_fingerprint,
    /** Campos derivados para leitura rápida no painel */
    summary: {
      module: row.module_name,
      trace_id: row.trace_id,
      created_at: row.created_at
    }
  };
}

router.get('/', ...adminCompany, async (req, res) => {
  try {
    const limit = req.query.limit;
    const rows = await aiAnalytics.listTracesForCompany(req.user.company_id, limit);
    res.json({
      success: true,
      data: {
        items: rows.map(formatTraceRow),
        count: rows.length
      }
    });
  } catch (err) {
    console.error('[AI_AUDIT_LIST]', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao listar auditoria de IA.'
    });
  }
});

module.exports = router;

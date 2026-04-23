'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireCompanyId } = require('../../middleware/auth');
const aiPolicyService = require('../../services/aiPolicyService');

const mw = [requireAuth, requireRole('admin'), requireCompanyId];

router.get('/', mw, async (req, res) => {
  try {
    const items = await aiPolicyService.listPolicies({
      companyId: req.user.company_id,
      superAdmin: false
    });
    res.json({ ok: true, data: { items } });
  } catch (e) {
    console.error('[ADMIN_AI_POLICIES_LIST]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar políticas' });
  }
});

router.post('/', mw, async (req, res) => {
  try {
    const row = await aiPolicyService.createPolicy(req.body || {}, {
      tenantCompanyId: req.user.company_id,
      superAdmin: false
    });
    res.status(201).json({ ok: true, data: { policy: row } });
  } catch (e) {
    if (e.code === 'INVALID_POLICY_TYPE' || e.code === 'COMPANY_NOT_FOUND') {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    console.error('[ADMIN_AI_POLICIES_CREATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar política' });
  }
});

router.put('/:id', mw, async (req, res) => {
  try {
    const row = await aiPolicyService.updatePolicy(req.params.id, req.body || {}, {
      tenantCompanyId: req.user.company_id,
      superAdmin: false
    });
    if (!row) return res.status(404).json({ ok: false, error: 'Política não encontrada' });
    res.json({ ok: true, data: { policy: row } });
  } catch (e) {
    if (e.code === 'POLICY_FORBIDDEN') {
      return res.status(403).json({ ok: false, error: e.message, code: e.code });
    }
    if (e.code === 'INVALID_POLICY_TYPE') {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    console.error('[ADMIN_AI_POLICIES_UPDATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar política' });
  }
});

router.delete('/:id', mw, async (req, res) => {
  try {
    const row = await aiPolicyService.deletePolicy(req.params.id, {
      tenantCompanyId: req.user.company_id,
      superAdmin: false
    });
    if (!row) return res.status(404).json({ ok: false, error: 'Política não encontrada' });
    res.json({ ok: true, data: { deleted: row.id } });
  } catch (e) {
    if (e.code === 'POLICY_FORBIDDEN') {
      return res.status(403).json({ ok: false, error: e.message, code: e.code });
    }
    console.error('[ADMIN_AI_POLICIES_DELETE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao remover política' });
  }
});

module.exports = router;

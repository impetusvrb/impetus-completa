'use strict';

/**
 * GF-009 — MSA operational API (domínio; sem cognitivo).
 */
const express = require('express');
const router = express.Router();
const studyService = require('../domains/msa/services/msaStudyService');
const masterDataService = require('../domains/msa/services/msaMasterDataService');
const evidenceService = require('../domains/msa/services/msaStudyEvidenceService');
const { MSA_WORKFLOW_ACTION } = require('../domains/msa/workflow/msaWorkflowEngine');
const {
  MSA_STUDY_STATUS_LIST,
  MSA_STUDY_KIND_LIST,
  MSA_WORKFLOW_STAGE_LIST
} = require('../domains/msa/semantics/msaCoreSemantics');

function canAccessMsa(user) {
  const role = (user.role || '').toLowerCase();
  const fa = (user.functional_area || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return (
    ['quality', 'qualidade', 'metrology', 'metrologia', 'laboratory', 'laboratorio'].includes(fa) ||
    ['gerente', 'diretor', 'ceo', 'admin'].includes(role) ||
    h <= 3
  );
}

function requireMsaAccess(req, res, next) {
  if (!req.user?.company_id) {
    return res.status(400).json({ ok: false, error: 'company_required' });
  }
  if (!canAccessMsa(req.user)) {
    return res.status(403).json({ ok: false, error: 'msa_access_denied' });
  }
  next();
}

function workflowHandler(action) {
  return async (req, res) => {
    try {
      const row = await studyService.runWorkflowAction(req.user.company_id, req.params.id, action, {
        userId: req.user.id,
        notes: req.body?.notes,
        rejection_reason: req.body?.rejection_reason
      });
      res.json({ ok: true, study: row });
    } catch (err) {
      console.error(`[msa/${action}]`, err?.message || err);
      res.status(400).json({ ok: false, error: err.message || 'bad_request' });
    }
  };
}

router.use(requireMsaAccess);

router.get('/semantics', (_req, res) => {
  res.json({
    ok: true,
    study_statuses: MSA_STUDY_STATUS_LIST,
    workflow_stages: MSA_WORKFLOW_STAGE_LIST,
    study_kinds: MSA_STUDY_KIND_LIST,
    workflow_actions: Object.values(MSA_WORKFLOW_ACTION)
  });
});

router.get('/gauges', async (req, res) => {
  try {
    const rows = await masterDataService.listGauges(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, gauges: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/instruments', async (req, res) => {
  try {
    const rows = await masterDataService.listInstruments(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, instruments: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/instruments', async (req, res) => {
  try {
    const row = await masterDataService.createInstrument(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, instrument: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/operators', async (req, res) => {
  try {
    const rows = await masterDataService.listOperators(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, operators: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/parts', async (req, res) => {
  try {
    const rows = await masterDataService.listParts(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, parts: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/calibration-references', async (req, res) => {
  try {
    const rows = await masterDataService.listCalibrationReferences(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, calibration_references: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/calibration-references', async (req, res) => {
  try {
    const row = await masterDataService.createCalibrationReference(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, calibration_reference: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/gauges', async (req, res) => {
  try {
    const row = await masterDataService.createGauge(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, gauge: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/parts', async (req, res) => {
  try {
    const row = await masterDataService.createPart(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, part: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/operators', async (req, res) => {
  try {
    const row = await masterDataService.createOperator(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, operator: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/studies', async (req, res) => {
  try {
    const rows = await studyService.listStudies(req.user.company_id, {
      status: req.query.status,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, studies: rows, meta: { status_filter: req.query.status || null } });
  } catch (err) {
    console.error('[msa/studies GET]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/studies/:id', async (req, res) => {
  try {
    const detail = await studyService.getStudyDetail(req.user.company_id, req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, ...detail });
  } catch (err) {
    console.error('[msa/studies/:id GET]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/studies', async (req, res) => {
  try {
    const row = await studyService.createStudy(req.user.company_id, req.body || {}, req.user.id);
    res.status(201).json({ ok: true, study: row });
  } catch (err) {
    console.error('[msa/studies POST]', err?.message || err);
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.put('/studies/:id', async (req, res) => {
  try {
    const row = await studyService.updateStudy(req.user.company_id, req.params.id, req.body || {}, req.user.id);
    res.json({ ok: true, study: row });
  } catch (err) {
    const code = err.message === 'study not found' ? 404 : 400;
    res.status(code).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/plan', workflowHandler(MSA_WORKFLOW_ACTION.PLAN));
router.post('/studies/:id/start', workflowHandler(MSA_WORKFLOW_ACTION.START));
router.post('/studies/:id/review', workflowHandler(MSA_WORKFLOW_ACTION.REVIEW));
router.post('/studies/:id/reject', workflowHandler(MSA_WORKFLOW_ACTION.REJECT));
router.post('/studies/:id/reopen', workflowHandler(MSA_WORKFLOW_ACTION.REOPEN));
router.post('/studies/:id/archive', workflowHandler(MSA_WORKFLOW_ACTION.ARCHIVE));

router.post('/studies/:id/approve', async (req, res) => {
  try {
    const row = await studyService.approveStudy(req.user.company_id, req.params.id, {
      userId: req.user.id,
      notes: req.body?.notes
    });
    res.json({ ok: true, study: row });
  } catch (err) {
    const code = err.message === 'study not found' ? 404 : 400;
    res.status(code).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/samples', async (req, res) => {
  try {
    const row = await evidenceService.addMeasurementSample(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, sample: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/operators', async (req, res) => {
  try {
    const row = await evidenceService.linkStudyOperator(
      req.user.company_id,
      req.params.id,
      req.body?.operator_id,
      req.body?.role_label
    );
    res.status(201).json({ ok: true, study_operator: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/parts', async (req, res) => {
  try {
    const row = await evidenceService.linkStudyPart(
      req.user.company_id,
      req.params.id,
      req.body?.part_id,
      req.body?.part_sequence
    );
    res.status(201).json({ ok: true, study_part: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/documents', async (req, res) => {
  try {
    const row = await evidenceService.addAttachedDocument(
      req.user.company_id,
      req.params.id,
      req.body || {},
      req.user.id
    );
    res.status(201).json({ ok: true, document: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/studies/:id/approvals', async (req, res) => {
  try {
    const row = await evidenceService.addStudyApproval(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, approval: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

module.exports = router;

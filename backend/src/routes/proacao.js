const express = require('express');
const router = express.Router();
const proacao = require('../services/proacao');
const { isValidUUID } = require('../utils/security');
const { requireHierarchyScope } = require('../middleware/hierarchyScope');
const { requireAuth, requireFactoryOperationalMember } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

// Autenticação obrigatória para todas as rotas (evita 401 quando app não aplica auth globalmente)
router.use(requireAuth);

router.post('/', requireFactoryOperationalMember, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      company_id: req.user.company_id,
      operational_team_member_id: req.user.active_operational_team_member_id || null
    };
    const p = await proacao.createProposal(payload);
    if (req.user?.is_factory_team_account && req.user?.active_operational_team_member_id) {
      logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'proposal_created',
        entityType: 'proposal',
        entityId: p.id,
        description: 'Pró-Ação criada (login coletivo; rastreio por membro da equipe)',
        changes: { operational_team_member_id: req.user.active_operational_team_member_id },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.user.sessionId || null,
        severity: 'info'
      }).catch((err) => {
        console.warn('[routes/proacao][log_action]', err?.message ?? err);
      });
    }
    res.json({ ok: true, proposal: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
router.get('/', requireHierarchyScope, async (req,res)=>{ try{
  const list = await proacao.listProposals(200, req.user.company_id, req.hierarchyScope, {
    status: req.query.status,
    setor: req.query.setor,
    prioridade: req.query.prioridade,
    responsavel_id: req.query.responsavel_id
  });
  const summary = await proacao.getProacaoSummary(req.user.company_id, req.hierarchyScope);
  const responsibles = await proacao.getResponsibles(req.user.company_id);
  res.json({ ok:true, proposals: list, summary, responsibles });
}catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.get('/:id', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); const p = await proacao.getProposal(req.params.id, req.user.company_id, req.hierarchyScope); if(!p) return res.status(404).json({ ok:false, error:'not found' }); res.json({ ok:true, proposal: p }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/evaluate', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); const ev = await proacao.aiEvaluateProposal(req.params.id, req.user.company_id, req.hierarchyScope); res.json({ ok:true, evaluation: ev }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/enrich', requireHierarchyScope, async (req,res)=>{ try{
  if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const data = await proacao.enrichProposalWithIA(req.params.id, req.user.company_id, req.hierarchyScope);
  res.json({ ok:true, ...data });
}catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.put('/:id', requireHierarchyScope, async (req,res)=>{ try{
  if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const proposal = await proacao.updateProposal(req.params.id, req.body || {}, req.user.company_id, req.hierarchyScope);
  res.json({ ok: true, proposal });
}catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.patch('/:id/status', requireHierarchyScope, async (req,res)=>{ try{
  if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const proposal = await proacao.updateProposalStatus(req.params.id, req.body?.status, req.user.id, req.user.company_id, req.hierarchyScope, req.body?.comment || null);
  res.json({ ok: true, proposal });
}catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/escalate', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); await proacao.escalateToProjects(req.params.id, req.body.comment, req.body.escalated_by, req.user.company_id, req.hierarchyScope); res.json({ ok:true }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/assign', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); await proacao.assignToAdministrative(req.params.id, req.body.admin_sector, req.body.assigned_by, req.body.team, req.user.company_id, req.hierarchyScope); res.json({ ok:true }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/record', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); await proacao.recordPhaseData(req.params.id, req.body.phaseNumber, req.body.collectedData, req.body.userId, req.user.company_id, req.hierarchyScope); res.json({ ok:true }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});
router.post('/:id/finalize', requireHierarchyScope, async (req,res)=>{ try{ if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' }); await proacao.finalizeProposal(req.params.id, req.body.finalReport, req.body.closedBy, req.user.company_id, req.hierarchyScope); res.json({ ok:true }); }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }});

module.exports = router;

/**
 * PRÓ-AÇÃO - Detalhe da Proposta
 * Visualização completa e ações (avaliar, escalar, atribuir, finalizar)
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, ArrowUp, UserPlus, CheckCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, TextAreaField } from '../components/FormField';
import { proacao } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './Proposals.css';

function getStatusLabel(status) {
  const map = { submitted: 'Enviada', escalated: 'Escalada', assigned: 'Atribuída', done: 'Concluída' };
  return map[status] || status;
}

export default function ProposalDetail() {
  const { id } = useParams();
  const notify = useNotification();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionLoading, setActionLoading] = useState(null); // 'evaluate'|'escalate'|'assign'|'finalize'
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [escalateComment, setEscalateComment] = useState('');
  const [assignData, setAssignData] = useState({ admin_sector: '', team: '' });
  const [finalReport, setFinalReport] = useState('');

  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const isColaborador = user.role === 'colaborador';

  function fetchProposal() {
    if (!id) return;
    setLoading(true);
    setError(null);
    proacao
      .getById(id)
      .then((r) => {
        setProposal(r.data?.proposal || null);
      })
      .catch((e) => {
        setError(e.apiMessage || 'Proposta não encontrada');
        notify.error(e.apiMessage || 'Erro ao carregar proposta.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const handleEvaluate = async () => {
    setActionLoading('evaluate');
    try {
      await proacao.evaluate(id);
      notify.success('Avaliação concluída.');
      fetchProposal();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro na avaliação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    setActionLoading('escalate');
    try {
      await proacao.escalate(id, escalateComment, user.id);
      notify.success('Proposta escalada para projetos.');
      setShowEscalateModal(false);
      setEscalateComment('');
      fetchProposal();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao escalar.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async () => {
    setActionLoading('assign');
    try {
      await proacao.assign(id, assignData.admin_sector, user.id, assignData.team);
      notify.success('Proposta atribuída ao setor administrativo.');
      setShowAssignModal(false);
      setAssignData({ admin_sector: '', team: '' });
      fetchProposal();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao atribuir.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async () => {
    setActionLoading('finalize');
    try {
      await proacao.finalize(id, finalReport, user.id);
      notify.success('Proposta finalizada.');
      setShowFinalizeModal(false);
      setFinalReport('');
      fetchProposal();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao finalizar.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="content proacoes-content" style={{ textAlign: 'center', padding: '48px' }}>
          <Loader2 size={32} className="spin" />
          <p style={{ marginTop: 12 }}>Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (error || !proposal) {
    return (
      <Layout>
        <div className="content proacoes-content proposals-error" style={{ marginTop: 24 }}>
          <p>{error || 'Proposta não encontrada'}</p>
          <Link to="/app/proacao" className="btn btn-secondary">
            <ArrowLeft size={18} />
            Voltar
          </Link>
        </div>
      </Layout>
    );
  }

  const status = proposal.status || 'submitted';
  const canAct = !isColaborador && status !== 'done';
  const aiScore = proposal.ai_score;

  return (
    <Layout>
      <div className="content proacoes-content">
        <div className="page-header">
          <Link to="/app/proacao" className="btn btn-ghost" style={{ gap: 6, marginBottom: 8 }}>
            <ArrowLeft size={18} />
            Voltar às propostas
          </Link>
        </div>

        <div className="proposal-detail">
          <div className="proposal-detail-header">
            <h2>Proposta #{proposal.id?.slice(0, 8)}</h2>
            <span className={`proposal-status status-${status}`}>
              {getStatusLabel(status)}
            </span>
          </div>

          <div className="proposal-detail-body">
            <section>
              <h4>Informações básicas</h4>
              <dl>
                <dt>Reporter</dt>
                <dd>{proposal.reporter_name || '—'}</dd>
                <dt>Local/Setor</dt>
                <dd>{proposal.location || '—'}</dd>
                <dt>Equipamento</dt>
                <dd>{proposal.equipment_id || '—'}</dd>
                <dt>Categoria</dt>
                <dd>{proposal.problem_category || '—'}</dd>
                <dt>Tipo de processo</dt>
                <dd>{proposal.process_type || '—'}</dd>
                <dt>Frequência</dt>
                <dd>{proposal.frequency || '—'}</dd>
                <dt>Urgência</dt>
                <dd>{proposal.urgency ?? '—'}</dd>
                <dt>Data</dt>
                <dd>
                  {proposal.created_at
                    ? new Date(proposal.created_at).toLocaleString('pt-BR')
                    : '—'}
                </dd>
              </dl>
            </section>

            <section>
              <h4>Solução proposta</h4>
              <p className="proposal-text">{proposal.proposed_solution || '—'}</p>
            </section>

            <section>
              <h4>Causas prováveis</h4>
              <p className="proposal-text">{proposal.probable_causes || '—'}</p>
            </section>

            <section>
              <h4>Consequências</h4>
              <p className="proposal-text">{proposal.consequences || '—'}</p>
            </section>

            <section>
              <h4>Benefícios esperados</h4>
              <p className="proposal-text">{proposal.expected_benefits || '—'}</p>
            </section>

            {proposal.notes && (
              <section>
                <h4>Observações</h4>
                <p className="proposal-text">{proposal.notes}</p>
              </section>
            )}

            {aiScore && (
              <section className="ai-section">
                <h4>
                  <Brain size={18} />
                  Avaliação IA
                </h4>
                <div className="ai-content">
                  {typeof aiScore === 'object' ? (
                    <p>{aiScore.report || aiScore.note || JSON.stringify(aiScore)}</p>
                  ) : (
                    <p>{String(aiScore)}</p>
                  )}
                </div>
              </section>
            )}

            {proposal.actions?.length > 0 && (
              <section>
                <h4>Histórico de ações</h4>
                <ul className="actions-timeline">
                  {proposal.actions.map((a) => (
                    <li key={a.id}>
                      <strong>{a.action}</strong>
                      {a.comment && <span> — {a.comment}</span>}
                      <small>
                        {a.created_at
                          ? new Date(a.created_at).toLocaleString('pt-BR')
                          : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {canAct && (
            <div className="proposal-detail-actions">
              {!aiScore && status === 'submitted' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleEvaluate}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'evaluate' ? <Loader2 size={18} className="spin" /> : <Brain size={18} />}
                  Avaliar com IA
                </button>
              )}
              {status === 'submitted' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEscalateModal(true)}
                    disabled={!!actionLoading}
                  >
                    <ArrowUp size={18} />
                    Escalar para Projetos
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAssignModal(true)}
                    disabled={!!actionLoading}
                  >
                    <UserPlus size={18} />
                    Atribuir ao Administrativo
                  </button>
                </>
              )}
              {(status === 'escalated' || status === 'assigned') && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={!!actionLoading}
                >
                  <CheckCircle size={18} />
                  Finalizar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <Modal isOpen={showEscalateModal} onClose={() => setShowEscalateModal(false)} title="Escalar para Projetos">
          <TextAreaField
            label="Comentário"
            name="escalate_comment"
            value={escalateComment}
            onChange={(e) => setEscalateComment(e.target.value)}
            placeholder="Opcional"
            rows={3}
          />
          <ModalFooter
            onCancel={() => setShowEscalateModal(false)}
            onConfirm={handleEscalate}
            confirmText="Escalar"
            confirmLoading={actionLoading === 'escalate'}
          />
        </Modal>

        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Atribuir ao Administrativo">
          <InputField
            label="Setor administrativo"
            name="admin_sector"
            value={assignData.admin_sector}
            onChange={(e) => setAssignData((d) => ({ ...d, admin_sector: e.target.value }))}
            placeholder="Ex: Qualidade, Manutenção"
          />
          <InputField
            label="Equipe"
            name="team"
            value={assignData.team}
            onChange={(e) => setAssignData((d) => ({ ...d, team: e.target.value }))}
            placeholder="Opcional"
          />
          <ModalFooter
            onCancel={() => setShowAssignModal(false)}
            onConfirm={handleAssign}
            confirmText="Atribuir"
            confirmLoading={actionLoading === 'assign'}
          />
        </Modal>

        <Modal isOpen={showFinalizeModal} onClose={() => setShowFinalizeModal(false)} title="Finalizar Proposta">
          <TextAreaField
            label="Relatório final"
            name="final_report"
            value={finalReport}
            onChange={(e) => setFinalReport(e.target.value)}
            placeholder="Descreva o resultado e conclusões..."
            rows={5}
          />
          <ModalFooter
            onCancel={() => setShowFinalizeModal(false)}
            onConfirm={handleFinalize}
            confirmText="Finalizar"
            confirmLoading={actionLoading === 'finalize'}
          />
        </Modal>
      </div>
    </Layout>
  );
}

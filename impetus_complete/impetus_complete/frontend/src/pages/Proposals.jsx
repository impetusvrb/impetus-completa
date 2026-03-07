/**
 * PRÓ-AÇÃO - Propostas de Melhoria Contínua
 * Colaboradores têm acesso exclusivo a esta página
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { proacao } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './Proposals.css';

const URGENCY_OPTIONS = [
  { value: 1, label: 'Baixa' },
  { value: 2, label: 'Média' },
  { value: 3, label: 'Alta' },
  { value: 4, label: 'Crítica' }
];

const INITIAL_FORM = {
  location: '',
  equipment_id: '',
  problem_category: '',
  process_type: '',
  frequency: '',
  probable_causes: '',
  consequences: '',
  proposed_solution: '',
  expected_benefits: '',
  urgency: 2,
  notes: ''
};

export default function Proposals() {
  const notify = useNotification();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(() => {
    setLoading(true);
    setError(null);
    proacao
      .list()
      .then((r) => {
        setProposals(r.data?.proposals || []);
      })
      .catch((e) => {
        console.error('[PROPOSTAS]', e);
        setError(e.apiMessage || e.message || 'Erro ao carregar propostas');
        notify.error(e.apiMessage || 'Não foi possível carregar as propostas.');
        setProposals([]);
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCreate = async () => {
    if (!formData.proposed_solution?.trim()) {
      notify.warning('Descreva a solução proposta.');
      return;
    }
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    setSaving(true);
    try {
      await proacao.create({
        reporter_id: user.id || null,
        reporter_name: user.name || '',
        location: formData.location || null,
        equipment_id: formData.equipment_id || null,
        problem_category: formData.problem_category || null,
        process_type: formData.process_type || null,
        frequency: formData.frequency || null,
        probable_causes: formData.probable_causes || null,
        consequences: formData.consequences || null,
        proposed_solution: formData.proposed_solution?.trim() || null,
        expected_benefits: formData.expected_benefits || null,
        urgency: formData.urgency || null,
        notes: formData.notes || null
      });
      notify.success('Proposta enviada com sucesso!');
      setShowCreateModal(false);
      setFormData(INITIAL_FORM);
      fetchList();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao enviar proposta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="content proacoes-content">
        <div className="page-header">
          <div>
            <h2>Pró-Ação — Propostas de Melhoria</h2>
            <p className="page-subtitle">
              Envie e acompanhe propostas de melhoria contínua.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            Nova Proposta
          </button>
        </div>

        {loading ? (
          <div className="proposals-loading">
            <p>Carregando...</p>
          </div>
        ) : error ? (
          <div className="proposals-error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={fetchList}>
              Tentar novamente
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="proposals-empty">
            <Target size={48} />
            <h3>Nenhuma proposta cadastrada</h3>
            <p>Seja o primeiro a enviar uma proposta de melhoria.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
              Nova Proposta
            </button>
          </div>
        ) : (
          <ul className="proposals-list">
            {proposals.map((p) => (
              <li key={p.id} className="proposal-card">
                <Link to={`/app/proacao/${p.id}`} className="proposal-card-link">
                  <div className="proposal-card-header">
                    <strong>{p.reporter_name || 'Colaborador'}</strong>
                    <span className={`proposal-status status-${(p.status || 'submitted').toLowerCase()}`}>
                      {p.status || 'submitted'}
                    </span>
                  </div>
                  <p className="proposal-location">{p.location || '—'}</p>
                  <p className="proposal-solution">
                    {p.proposed_solution?.slice(0, 120) || p.problem_category || 'Sem descrição'}
                    {(p.proposed_solution?.length || 0) > 120 ? '...' : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Modal
          isOpen={showCreateModal}
          onClose={() => !saving && setShowCreateModal(false)}
          title="Nova Proposta de Melhoria"
          size="large"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <div className="form-grid">
              <InputField
                label="Local/Setor"
                name="location"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ex: Linha 1, Manutenção"
              />
              <InputField
                label="Equipamento"
                name="equipment_id"
                value={formData.equipment_id}
                onChange={(e) => setFormData((f) => ({ ...f, equipment_id: e.target.value }))}
                placeholder="ID ou nome do equipamento"
              />
              <InputField
                label="Categoria do Problema"
                name="problem_category"
                value={formData.problem_category}
                onChange={(e) => setFormData((f) => ({ ...f, problem_category: e.target.value }))}
                placeholder="Ex: Qualidade, Segurança"
              />
              <InputField
                label="Tipo de Processo"
                name="process_type"
                value={formData.process_type}
                onChange={(e) => setFormData((f) => ({ ...f, process_type: e.target.value }))}
                placeholder="Ex: Produção, Logística"
              />
              <InputField
                label="Frequência"
                name="frequency"
                value={formData.frequency}
                onChange={(e) => setFormData((f) => ({ ...f, frequency: e.target.value }))}
                placeholder="Ex: Diária, Semanal"
              />
              <SelectField
                label="Urgência"
                name="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData((f) => ({ ...f, urgency: Number(e.target.value) }))}
                options={URGENCY_OPTIONS}
              />
            </div>
            <TextAreaField
              label="Solução Proposta"
              name="proposed_solution"
              value={formData.proposed_solution}
              onChange={(e) => setFormData((f) => ({ ...f, proposed_solution: e.target.value }))}
              placeholder="Descreva a solução ou melhoria sugerida..."
              required
            />
            <TextAreaField
              label="Causas Prováveis"
              name="probable_causes"
              value={formData.probable_causes}
              onChange={(e) => setFormData((f) => ({ ...f, probable_causes: e.target.value }))}
              placeholder="Opcional"
            />
            <TextAreaField
              label="Consequências"
              name="consequences"
              value={formData.consequences}
              onChange={(e) => setFormData((f) => ({ ...f, consequences: e.target.value }))}
              placeholder="Opcional"
            />
            <TextAreaField
              label="Benefícios Esperados"
              name="expected_benefits"
              value={formData.expected_benefits}
              onChange={(e) => setFormData((f) => ({ ...f, expected_benefits: e.target.value }))}
              placeholder="Opcional"
            />
            <TextAreaField
              label="Observações"
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Opcional"
            />
            <ModalFooter
              onCancel={() => setShowCreateModal(false)}
              onConfirm={handleCreate}
              cancelText="Cancelar"
              confirmText="Enviar Proposta"
              confirmDisabled={saving || !formData.proposed_solution?.trim()}
              confirmLoading={saving}
            />
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

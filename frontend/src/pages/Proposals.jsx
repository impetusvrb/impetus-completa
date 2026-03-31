/**
 * PRÓ-AÇÃO — Propostas de melhoria + formulário TPM (perdas antes/durante/depois)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target, AlertCircle, ClipboardList, Download, Filter, FileSpreadsheet } from 'lucide-react';
import Layout from '../components/Layout';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { proacao, tpm } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  shiftNumberLabel,
  downloadTpmIncidentsCsv,
  downloadShiftTotalsCsv,
  downloadTpmExcelWorkbook
} from '../utils/tpmExport';
import './Proposals.css';

const URGENCY_OPTIONS = [
  { value: 1, label: 'Baixa' },
  { value: 2, label: 'Média' },
  { value: 3, label: 'Alta' },
  { value: 4, label: 'Crítica' }
];

const ROOT_CAUSE_OPTIONS = [
  { value: 'comp', label: 'Componente (COMP)' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'oper', label: 'Operacional (OPER)' }
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

function getTpmInitial() {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch (_) {}
  return {
    incident_date: new Date().toISOString().slice(0, 10),
    incident_time: '',
    equipment_code: '',
    component_name: '',
    maintainer_name: '',
    root_cause: 'comp',
    frequency_observation: '',
    failing_part: '',
    corrective_action: '',
    losses_before: 0,
    losses_during: 0,
    losses_after: 0,
    operator_name: user.name || '',
    observation: '',
    lot_code: '',
    supplier_name: '',
    material_name: ''
  };
}

export default function Proposals() {
  const notify = useNotification();
  const [section, setSection] = useState('proposals');

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const [tpmIncidents, setTpmIncidents] = useState([]);
  const [tpmShiftTotals, setTpmShiftTotals] = useState([]);
  const [tpmLoading, setTpmLoading] = useState(false);
  const [tpmError, setTpmError] = useState(null);
  const [tpmDateFrom, setTpmDateFrom] = useState('');
  const [tpmDateTo, setTpmDateTo] = useState('');
  const [showTpmModal, setShowTpmModal] = useState(false);
  const [tpmForm, setTpmForm] = useState(getTpmInitial);
  const [tpmSaving, setTpmSaving] = useState(false);

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

  /**
   * @param {{ from?: string, to?: string } | null} overrides — se definido, usa estas datas em vez do estado (ex.: limpar filtros)
   */
  const loadTpmSection = useCallback(
    async (overrides = null) => {
      setTpmLoading(true);
      setTpmError(null);
      const from = overrides && 'from' in overrides ? overrides.from : tpmDateFrom;
      const to = overrides && 'to' in overrides ? overrides.to : tpmDateTo;
      const listParams = { limit: 500 };
      if (from) listParams.from = from;
      if (to) listParams.to = to;
      const totalsParams = {};
      if (from) totalsParams.from = from;
      if (to) totalsParams.to = to;
      try {
        const [incRes, totRes] = await Promise.all([
          tpm.listIncidents(listParams),
          tpm.getShiftTotals(totalsParams)
        ]);
        setTpmIncidents(incRes.data?.incidents || []);
        setTpmShiftTotals(totRes.data?.totals || []);
      } catch (e) {
        console.error('[TPM_SECTION]', e);
        setTpmError(e.apiMessage || e.message || 'Erro ao carregar dados TPM');
        notify.error(e.apiMessage || 'Não foi possível carregar o TPM.');
        setTpmIncidents([]);
        setTpmShiftTotals([]);
      } finally {
        setTpmLoading(false);
      }
    },
    [notify, tpmDateFrom, tpmDateTo]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (section === 'tpm') {
      loadTpmSection();
    }
    // Apenas ao mudar de aba — filtros aplicam com "Aplicar filtros" ou "Limpar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleTpmApplyFilters = () => {
    if (tpmDateFrom && tpmDateTo && tpmDateFrom > tpmDateTo) {
      notify.warning('A data inicial não pode ser posterior à data final.');
      return;
    }
    loadTpmSection();
  };

  const handleTpmClearFilters = () => {
    setTpmDateFrom('');
    setTpmDateTo('');
    loadTpmSection({ from: '', to: '' });
  };

  const handleTpmExportIncidentsCsv = () => {
    if (!tpmIncidents.length) {
      notify.warning('Não há incidentes para exportar no período selecionado.');
      return;
    }
    downloadTpmIncidentsCsv(tpmIncidents);
    notify.success('CSV de incidentes gerado.');
  };

  const handleTpmExportShiftTotalsCsv = () => {
    if (!tpmShiftTotals.length) {
      notify.warning('Não há totais por turno para exportar no período selecionado.');
      return;
    }
    downloadShiftTotalsCsv(tpmShiftTotals);
    notify.success('CSV de totais por turno gerado.');
  };

  const handleTpmExportExcel = async () => {
    if (!tpmIncidents.length && !tpmShiftTotals.length) {
      notify.warning('Não há dados para exportar. Ajuste os filtros ou registre incidentes.');
      return;
    }
    try {
      await downloadTpmExcelWorkbook(tpmIncidents, tpmShiftTotals);
      notify.success('Planilha Excel gerada (duas folhas).');
    } catch (e) {
      console.error('[TPM_XLSX]', e);
      notify.error('Não foi possível gerar o Excel.');
    }
  };

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

  const handleTpmCreate = async () => {
    if (!tpmForm.incident_date) {
      notify.warning('Informe a data da ocorrência.');
      return;
    }
    if (!(tpmForm.equipment_code || '').trim() && !(tpmForm.component_name || '').trim()) {
      notify.warning('Informe equipamento e/ou componente.');
      return;
    }
    if (!(tpmForm.operator_name || '').trim()) {
      notify.warning('Informe o nome do operador.');
      return;
    }
    setTpmSaving(true);
    try {
      await tpm.createIncident({
        incident_date: tpmForm.incident_date,
        incident_time: tpmForm.incident_time?.trim() || null,
        equipment_code: tpmForm.equipment_code?.trim() || null,
        component_name: tpmForm.component_name?.trim() || null,
        maintainer_name: tpmForm.maintainer_name?.trim() || null,
        root_cause: tpmForm.root_cause,
        frequency_observation: tpmForm.frequency_observation?.trim() || null,
        failing_part: tpmForm.failing_part?.trim() || null,
        corrective_action: tpmForm.corrective_action?.trim() || null,
        losses_before: Number(tpmForm.losses_before) || 0,
        losses_during: Number(tpmForm.losses_during) || 0,
        losses_after: Number(tpmForm.losses_after) || 0,
        operator_name: tpmForm.operator_name?.trim(),
        observation: tpmForm.observation?.trim() || null,
        lot_code: tpmForm.lot_code?.trim() || null,
        supplier_name: tpmForm.supplier_name?.trim() || null,
        material_name: tpmForm.material_name?.trim() || null
      });
      notify.success('Registro TPM salvo. Os totais por turno foram atualizados.');
      setShowTpmModal(false);
      setTpmForm(getTpmInitial());
      loadTpmSection();
    } catch (e) {
      notify.error(e.apiMessage || e.message || 'Erro ao salvar registro TPM.');
    } finally {
      setTpmSaving(false);
    }
  };

  const openTpmModal = () => {
    setTpmForm(getTpmInitial());
    setShowTpmModal(true);
  };

  return (
    <Layout>
      <div className="content proacoes-content">
        <div className="page-header">
          <div className="page-header-main">
            <h2>Pró-Ação</h2>
            <p className="page-subtitle">
              {section === 'proposals'
                ? 'Envie e acompanhe propostas de melhoria contínua.'
                : 'Registre perdas antes, durante e após manutenções para acompanhamento e indicadores.'}
            </p>
            <div className="proacao-tabs" role="tablist" aria-label="Seções do Pró-Ação">
              <button
                type="button"
                role="tab"
                aria-selected={section === 'proposals'}
                className={`proacao-tab ${section === 'proposals' ? 'proacao-tab--active' : ''}`}
                onClick={() => setSection('proposals')}
              >
                <Target size={16} aria-hidden />
                Propostas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={section === 'tpm'}
                className={`proacao-tab ${section === 'tpm' ? 'proacao-tab--active' : ''}`}
                onClick={() => setSection('tpm')}
              >
                <ClipboardList size={16} aria-hidden />
                TPM — Perdas
              </button>
            </div>
          </div>
          {section === 'proposals' ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              Nova Proposta
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={openTpmModal}>
              <Plus size={18} />
              Novo registro TPM
            </button>
          )}
        </div>

        {section === 'proposals' && (
          <>
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
                <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
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
          </>
        )}

        {section === 'tpm' && (
          <>
            {tpmLoading ? (
              <div className="proposals-loading">
                <p>Carregando dados TPM...</p>
              </div>
            ) : tpmError ? (
              <div className="proposals-error">
                <AlertCircle size={32} />
                <p>{tpmError}</p>
                <button type="button" className="btn btn-secondary" onClick={() => loadTpmSection()}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="tpm-panel">
                <div className="tpm-toolbar">
                  <div className="tpm-toolbar__row">
                    <InputField
                      label="Data inicial"
                      name="tpmDateFrom"
                      type="date"
                      value={tpmDateFrom}
                      onChange={(e) => setTpmDateFrom(e.target.value)}
                    />
                    <InputField
                      label="Data final"
                      name="tpmDateTo"
                      type="date"
                      value={tpmDateTo}
                      onChange={(e) => setTpmDateTo(e.target.value)}
                    />
                    <div className="tpm-toolbar__actions">
                      <button type="button" className="btn btn-secondary tpm-toolbar__btn" onClick={handleTpmApplyFilters}>
                        <Filter size={16} aria-hidden />
                        Aplicar filtros
                      </button>
                      <button type="button" className="btn btn-secondary tpm-toolbar__btn" onClick={handleTpmClearFilters}>
                        Limpar
                      </button>
                      <button type="button" className="btn btn-secondary tpm-toolbar__btn" onClick={handleTpmExportIncidentsCsv}>
                        <Download size={16} aria-hidden />
                        CSV incidentes
                      </button>
                      <button type="button" className="btn btn-secondary tpm-toolbar__btn" onClick={handleTpmExportShiftTotalsCsv}>
                        <Download size={16} aria-hidden />
                        CSV totais turno
                      </button>
                      <button type="button" className="btn btn-primary tpm-toolbar__btn" onClick={handleTpmExportExcel}>
                        <FileSpreadsheet size={16} aria-hidden />
                        Excel (.xlsx)
                      </button>
                    </div>
                  </div>
                  <p className="tpm-toolbar__hint">
                    Filtros por data aplicam à tabela e aos totais por turno. Sem datas, são listados até 500
                    registros recentes e os totais no intervalo disponível no servidor. O Excel inclui as folhas
                    <strong> Incidentes</strong> e <strong> Totais por turno</strong> com os mesmos dados visíveis.
                  </p>
                </div>

                <section className="tpm-shift-section" aria-labelledby="tpm-shift-heading">
                  <h3 id="tpm-shift-heading" className="tpm-section-title">
                    Totais por turno
                  </h3>
                  {tpmShiftTotals.length === 0 ? (
                    <p className="tpm-empty-hint">Nenhum total agregado no período selecionado.</p>
                  ) : (
                    <div className="tpm-table-wrapper tpm-table-wrapper--compact">
                      <table className="tpm-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Turno</th>
                            <th className="tpm-table__num">Perdas acumuladas</th>
                            <th className="tpm-table__num">Incidentes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tpmShiftTotals.map((row) => (
                            <tr key={`${row.shift_date}-${row.shift_number}`}>
                              <td>{row.shift_date || '—'}</td>
                              <td>{shiftNumberLabel(row.shift_number)}</td>
                              <td className="tpm-table__num">{row.total_losses ?? '—'}</td>
                              <td className="tpm-table__num">{row.incident_count ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="tpm-incidents-section" aria-labelledby="tpm-incidents-heading">
                  <h3 id="tpm-incidents-heading" className="tpm-section-title">
                    Registros de incidentes
                  </h3>
                  {tpmIncidents.length === 0 ? (
                    <div className="tpm-empty-inline">
                      <ClipboardList size={40} aria-hidden />
                      <div>
                        <p className="tpm-empty-inline__title">Nenhum registro no período</p>
                        <p className="tpm-empty-inline__text">
                          Lance um novo registro ou ajuste o filtro de datas. Os dados alimentam os indicadores de
                          perdas antes, durante e após a manutenção.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={openTpmModal}>
                          <Plus size={18} />
                          Novo registro TPM
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="tpm-table-wrapper">
                      <table className="tpm-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>Equipamento</th>
                            <th>Componente</th>
                            <th className="tpm-table__num">Antes</th>
                            <th className="tpm-table__num">Durante</th>
                            <th className="tpm-table__num">Depois</th>
                            <th>Operador</th>
                            <th>Mecânico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tpmIncidents.map((row) => (
                            <tr key={row.id}>
                              <td>{row.incident_date || '—'}</td>
                              <td>{row.incident_time || '—'}</td>
                              <td>{row.equipment_code || '—'}</td>
                              <td>{row.component_name || '—'}</td>
                              <td className="tpm-table__num">{row.losses_before ?? '—'}</td>
                              <td className="tpm-table__num">{row.losses_during ?? '—'}</td>
                              <td className="tpm-table__num">{row.losses_after ?? '—'}</td>
                              <td>{row.operator_name || '—'}</td>
                              <td>{row.maintainer_name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={showCreateModal}
          onClose={() => !saving && setShowCreateModal(false)}
          title="Nova Proposta de Melhoria"
          size="large"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
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

        <Modal
          isOpen={showTpmModal}
          onClose={() => !tpmSaving && setShowTpmModal(false)}
          title="Novo registro TPM — perdas e manutenção"
          size="large"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTpmCreate();
            }}
          >
            <p className="tpm-form-intro">
              Os dados abaixo alimentam a tabela <strong>tpm_incidents</strong> e os totais por turno, alinhados ao
              formulário conversacional (WhatsApp / App Impetus).
            </p>
            <div className="form-grid">
              <InputField
                label="Data da ocorrência"
                name="incident_date"
                type="date"
                value={tpmForm.incident_date}
                onChange={(e) => setTpmForm((f) => ({ ...f, incident_date: e.target.value }))}
                required
              />
              <InputField
                label="Hora"
                name="incident_time"
                type="time"
                value={tpmForm.incident_time}
                onChange={(e) => setTpmForm((f) => ({ ...f, incident_time: e.target.value }))}
              />
              <InputField
                label="Equipamento (código ou nome)"
                name="equipment_code"
                value={tpmForm.equipment_code}
                onChange={(e) => setTpmForm((f) => ({ ...f, equipment_code: e.target.value }))}
                placeholder="Ex: Tetra Pak CBP 32"
              />
              <InputField
                label="Componente"
                name="component_name"
                value={tpmForm.component_name}
                onChange={(e) => setTpmForm((f) => ({ ...f, component_name: e.target.value }))}
                placeholder="Ex: sensor empurrador"
              />
              <InputField
                label="Mecânico / mantenedor"
                name="maintainer_name"
                value={tpmForm.maintainer_name}
                onChange={(e) => setTpmForm((f) => ({ ...f, maintainer_name: e.target.value }))}
              />
              <SelectField
                label="Causa raiz"
                name="root_cause"
                value={tpmForm.root_cause}
                onChange={(e) => setTpmForm((f) => ({ ...f, root_cause: e.target.value }))}
                options={ROOT_CAUSE_OPTIONS}
              />
              <InputField
                label="Frequência do problema"
                name="frequency_observation"
                value={tpmForm.frequency_observation}
                onChange={(e) => setTpmForm((f) => ({ ...f, frequency_observation: e.target.value }))}
                placeholder="Ex: 2x por dia"
              />
              <InputField
                label="Peça em falha"
                name="failing_part"
                value={tpmForm.failing_part}
                onChange={(e) => setTpmForm((f) => ({ ...f, failing_part: e.target.value }))}
              />
            </div>
            <TextAreaField
              label="Ação corretiva executada"
              name="corrective_action"
              value={tpmForm.corrective_action}
              onChange={(e) => setTpmForm((f) => ({ ...f, corrective_action: e.target.value }))}
              placeholder="O que foi feito para restabelecer o equipamento"
            />
            <div className="form-grid">
              <InputField
                label="Perdas antes da manutenção"
                name="losses_before"
                type="number"
                min={0}
                value={tpmForm.losses_before}
                onChange={(e) => setTpmForm((f) => ({ ...f, losses_before: e.target.value }))}
              />
              <InputField
                label="Perdas durante a manutenção"
                name="losses_during"
                type="number"
                min={0}
                value={tpmForm.losses_during}
                onChange={(e) => setTpmForm((f) => ({ ...f, losses_during: e.target.value }))}
              />
              <InputField
                label="Perdas após liberar o equipamento"
                name="losses_after"
                type="number"
                min={0}
                value={tpmForm.losses_after}
                onChange={(e) => setTpmForm((f) => ({ ...f, losses_after: e.target.value }))}
              />
              <InputField
                label="Nome do operador"
                name="operator_name"
                value={tpmForm.operator_name}
                onChange={(e) => setTpmForm((f) => ({ ...f, operator_name: e.target.value }))}
                required
              />
            </div>
            <div className="form-grid">
              <InputField
                label="Lote (opcional)"
                name="lot_code"
                value={tpmForm.lot_code}
                onChange={(e) => setTpmForm((f) => ({ ...f, lot_code: e.target.value }))}
              />
              <InputField
                label="Fornecedor (opcional)"
                name="supplier_name"
                value={tpmForm.supplier_name}
                onChange={(e) => setTpmForm((f) => ({ ...f, supplier_name: e.target.value }))}
              />
              <InputField
                label="Material (opcional)"
                name="material_name"
                value={tpmForm.material_name}
                onChange={(e) => setTpmForm((f) => ({ ...f, material_name: e.target.value }))}
              />
            </div>
            <TextAreaField
              label="Observações"
              name="observation"
              value={tpmForm.observation}
              onChange={(e) => setTpmForm((f) => ({ ...f, observation: e.target.value }))}
              placeholder="Opcional"
            />
            <ModalFooter
              onCancel={() => setShowTpmModal(false)}
              onConfirm={handleTpmCreate}
              cancelText="Cancelar"
              confirmText="Salvar registro TPM"
              confirmDisabled={tpmSaving}
              confirmLoading={tpmSaving}
            />
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

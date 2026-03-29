/**
 * Biblioteca Técnica Inteligente — Central técnica de ativos 3D (ManuIA)
 * Gestão admin: equipamentos, keywords, modelos 3D, documentos, peças, import CSV, payloads Unity.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Library,
  Plus,
  ArrowLeft,
  Search,
  Upload,
  Trash2,
  Star,
  FileJson,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { technicalLibrary, adminStructural } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import './TechnicalLibraryInteligente.css';

const DOC_TYPES = [
  { value: 'manual_tecnico', label: 'Manual técnico' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'exploded_view', label: 'Vista explodida' },
  { value: 'lista_pecas', label: 'Lista de peças' },
  { value: 'procedimento', label: 'Procedimento' },
  { value: 'instrucao_manutencao', label: 'Instrução de manutenção' },
  { value: 'ficha_tecnica', label: 'Ficha técnica' },
  { value: 'outro', label: 'Outro' }
];

const KW_TYPES = [
  'nome_comercial',
  'fabricante',
  'modelo',
  'apelido',
  'termo',
  'codigo',
  'ocr',
  'alias',
  'generic'
];

const emptyEquipmentForm = () => ({
  name: '',
  internal_machine_code: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  year: '',
  category: '',
  subcategory: '',
  department_id: '',
  location: '',
  technical_description: '',
  status: 'ativo',
  notes: '',
  manuia_machine_id: ''
});

export default function TechnicalLibraryInteligenteModule({ onBack }) {
  const notify = useNotification();
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 15, offset: 0 });
  const [filters, setFilters] = useState({ search: '', category: '', status: '', department_id: '' });
  const [departments, setDepartments] = useState([]);
  const [detail, setDetail] = useState(null);
  const [formTab, setFormTab] = useState('geral');
  const [form, setForm] = useState(emptyEquipmentForm());
  const [editingId, setEditingId] = useState(null);
  const [kwText, setKwText] = useState('');
  const [kwType, setKwType] = useState('generic');
  const [importResult, setImportResult] = useState(null);
  const [payloadPreview, setPayloadPreview] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [partDraft, setPartDraft] = useState({
    part_code: '',
    name: '',
    subsystem: '',
    criticality: 'media'
  });

  const loadDepartments = useCallback(() => {
    adminStructural.getReferences().then((r) => {
      setDepartments(r.data?.data?.departments || []);
    }).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await technicalLibrary.listEquipments({
        limit: pagination.limit,
        offset: pagination.offset,
        search: filters.search || undefined,
        category: filters.category || undefined,
        status: filters.status || undefined,
        department_id: filters.department_id || undefined
      });
      setList(res.data?.data || []);
      setPagination((p) => ({ ...p, ...(res.data?.pagination || {}) }));
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao listar equipamentos');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters, notify]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (view === 'list') loadList();
  }, [view, loadList]);

  const openDetail = async (id) => {
    setLoading(true);
    try {
      const res = await technicalLibrary.getEquipment(id);
      setDetail(res.data?.data);
      setView('detail');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyEquipmentForm());
    setFormTab('geral');
    setDetail(null);
    setView('edit');
  };

  const openEdit = async (id) => {
    setLoading(true);
    try {
      const res = await technicalLibrary.getEquipment(id);
      const d = res.data?.data;
      const eq = d.equipment;
      setDetail(d);
      setEditingId(id);
      setForm({
        name: eq.name || '',
        internal_machine_code: eq.internal_machine_code || '',
        manufacturer: eq.manufacturer || '',
        model: eq.model || '',
        serial_number: eq.serial_number || '',
        year: eq.year ?? '',
        category: eq.category || '',
        subcategory: eq.subcategory || '',
        department_id: eq.department_id || '',
        location: eq.location || '',
        technical_description: eq.technical_description || '',
        status: eq.status || 'ativo',
        notes: eq.notes || '',
        manuia_machine_id: eq.manuia_machine_id || ''
      });
      setFormTab('geral');
      setView('edit');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const saveEquipment = async () => {
    if (!form.name.trim()) {
      notify.error('Nome é obrigatório');
      return;
    }
    const body = {
      ...form,
      year: form.year === '' || form.year == null ? null : parseInt(form.year, 10),
      department_id: form.department_id || null,
      manuia_machine_id: form.manuia_machine_id || null
    };
    setLoading(true);
    try {
      if (editingId) {
        await technicalLibrary.updateEquipment(editingId, body);
        notify.success('Equipamento atualizado');
      } else {
        const res = await technicalLibrary.createEquipment(body);
        notify.success('Equipamento criado');
        const newId = res.data?.data?.id;
        setEditingId(newId);
        const full = await technicalLibrary.getEquipment(newId);
        setDetail(full.data?.data);
      }
      loadList();
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const removeEquipment = async (id) => {
    if (!window.confirm('Excluir este equipamento da biblioteca?')) return;
    setLoading(true);
    try {
      await technicalLibrary.deleteEquipment(id);
      notify.success('Equipamento removido');
      setView('list');
      setDetail(null);
      loadList();
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const addKeywords = async () => {
    if (!editingId && !detail?.equipment?.id) {
      notify.error('Salve o equipamento antes de adicionar palavras-chave');
      return;
    }
    const eqId = editingId || detail?.equipment?.id;
    if (!kwText.trim()) return;
    setLoading(true);
    try {
      await technicalLibrary.postKeywords(eqId, {
        keywords: [{ keyword: kwText.trim(), keyword_type: kwType }]
      });
      setKwText('');
      const full = await technicalLibrary.getEquipment(eqId);
      setDetail(full.data?.data);
      notify.success('Palavra-chave adicionada');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const reloadDetail = async (eqId) => {
    const full = await technicalLibrary.getEquipment(eqId);
    setDetail(full.data?.data);
  };

  const loadAudit = async (eqId) => {
    try {
      const r = await technicalLibrary.listAudit({ equipment_id: eqId, limit: 80 });
      setAuditRows(r.data?.data || []);
    } catch {
      setAuditRows([]);
    }
  };

  useEffect(() => {
    if (view === 'edit' && formTab === 'auditoria' && (editingId || detail?.equipment?.id)) {
      loadAudit(editingId || detail?.equipment?.id);
    }
  }, [view, formTab, editingId, detail?.equipment?.id]);

  const eqIdForChildren = editingId || detail?.equipment?.id;

  /* ---------- Render: list ---------- */
  if (view === 'list') {
    return (
      <div className="tli">
        <div className="tli-header">
          <div>
            <h2 className="tli-title">
              <Library size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Biblioteca técnica inteligente
            </h2>
            <p className="tli-sub">
              Cadastro mestre de equipamentos, modelos 3D, manuais e peças — base para IA e Unity (multi-tenant).
            </p>
          </div>
          <div className="tli-toolbar">
            {onBack && (
              <button type="button" className="tli-btn tli-btn--ghost" onClick={onBack}>
                <ArrowLeft size={16} /> Voltar ao ManuIA
              </button>
            )}
            <button type="button" className="tli-btn tli-btn--primary" onClick={openNew}>
              <Plus size={16} /> Novo equipamento
            </button>
            <button type="button" className="tli-btn" onClick={() => setView('import')}>
              <Upload size={16} /> Importar CSV
            </button>
            <button type="button" className="tli-btn" onClick={loadList} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar
            </button>
          </div>
        </div>

        <div className="tli-filters">
          <input
            placeholder="Buscar nome, fabricante, modelo..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <input placeholder="Categoria" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} />
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="em_revisao">Em revisão</option>
          </select>
          <select value={filters.department_id} onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}>
            <option value="">Departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button type="button" className="tli-btn tli-btn--primary" onClick={() => setPagination((p) => ({ ...p, offset: 0 }))}>
            <Search size={16} /> Filtrar
          </button>
        </div>

        <div className="tli-table-wrap">
          <table className="tli-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Fabricante / modelo</th>
                <th>Categoria</th>
                <th>Completude</th>
                <th>3D / Manual / Peças</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && !list.length ? (
                <tr><td colSpan={6}>Carregando…</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{[row.manufacturer, row.model].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{row.category || '—'}</td>
                    <td>
                      <span className="tli-badge tli-badge--neutral">{row.completeness_score ?? 0}%</span>
                    </td>
                    <td>
                      {row.model_count > 0 ? <span className="tli-badge tli-badge--ok">3D</span> : <span className="tli-badge tli-badge--warn">3D</span>}
                      {row.has_manual_doc ? <span className="tli-badge tli-badge--ok" style={{ marginLeft: 4 }}>Doc</span> : <span className="tli-badge tli-badge--warn" style={{ marginLeft: 4 }}>Doc</span>}
                      {row.part_count > 0 ? <span className="tli-badge tli-badge--ok" style={{ marginLeft: 4 }}>Peças</span> : <span className="tli-badge tli-badge--warn" style={{ marginLeft: 4 }}>Peças</span>}
                    </td>
                    <td className="tli-actions">
                      <button type="button" className="tli-btn" onClick={() => openDetail(row.id)}>Abrir</button>
                      <button type="button" className="tli-btn" onClick={() => openEdit(row.id)}>Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="tli-pagination">
          <span>
            {pagination.total != null ? `${pagination.total} registro(s)` : ''}
          </span>
          <button
            type="button"
            className="tli-btn"
            disabled={pagination.offset <= 0}
            onClick={() => setPagination((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="tli-btn"
            disabled={pagination.offset + pagination.limit >= (pagination.total || 0)}
            onClick={() => setPagination((p) => ({ ...p, offset: p.offset + p.limit }))}
          >
            Próxima
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Import ---------- */
  if (view === 'import') {
    return (
      <div className="tli">
        <div className="tli-header">
          <div>
            <h2 className="tli-title">Importação em lote (CSV)</h2>
            <p className="tli-sub">
              Colunas suportadas: name/nome, internal_machine_code/machine_id, manufacturer/fabricante, model/modelo, category/categoria, serial_number/serie, year/ano, status, location/localizacao.
            </p>
          </div>
          <button type="button" className="tli-btn" onClick={() => { setView('list'); setImportResult(null); }}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <label className="tli-btn tli-btn--primary">
          <Upload size={16} /> Selecionar CSV
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setLoading(true);
              try {
                const r = await technicalLibrary.importCsv(f);
                setImportResult(r.data);
                notify.success(`Importação: ${r.data?.created?.length || 0} criados`);
              } catch (err) {
                notify.error(err.apiMessage || err.response?.data?.error || 'Falha na importação');
              } finally {
                setLoading(false);
              }
            }}
          />
        </label>
        {importResult && (
          <div style={{ marginTop: '1rem' }}>
            <p>Criados: {importResult.created?.length || 0} — Erros: {importResult.errors?.length || 0}</p>
            {importResult.errors?.length > 0 && (
              <pre className="tli-json">{JSON.stringify(importResult.errors.slice(0, 30), null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Detail ---------- */
  if (view === 'detail' && detail) {
    const eq = detail.equipment;
    return (
      <div className="tli">
        <div className="tli-header">
          <div>
            <h2 className="tli-title">{eq.name}</h2>
            <p className="tli-sub">{eq.manufacturer} {eq.model} · {eq.internal_machine_code || 'sem código interno'}</p>
          </div>
          <div className="tli-toolbar">
            <button type="button" className="tli-btn" onClick={() => setView('list')}><ArrowLeft size={16} /> Lista</button>
            <button type="button" className="tli-btn" onClick={() => openEdit(eq.id)}>Editar</button>
            <button type="button" className="tli-btn tli-btn--primary" onClick={async () => {
              try {
                const r = await technicalLibrary.buildUnityPayload(eq.id);
                setPayloadPreview(r.data?.data);
              } catch (e) {
                notify.error(e.apiMessage || e.response?.data?.error);
              }
            }}><Cpu size={16} /> Payload Unity</button>
            <button type="button" className="tli-btn" onClick={async () => {
              try {
                const r = await technicalLibrary.buildProceduralPayload(eq.id);
                setPayloadPreview(r.data?.data);
              } catch (e) {
                notify.error(e.apiMessage || e.response?.data?.error);
              }
            }}><FileJson size={16} /> Payload procedural</button>
          </div>
        </div>
        <div className="tli-grid">
          <div className="tli-field"><label>Completude</label><div>{eq.completeness_score}% — {eq.completeness_status}</div></div>
          <div className="tli-field"><label>Status</label><div>{eq.status}</div></div>
        </div>
        {payloadPreview && (
          <pre className="tli-json" style={{ marginTop: 12 }}>{JSON.stringify(payloadPreview, null, 2)}</pre>
        )}
        <h3 style={{ marginTop: '1.25rem', fontSize: '1rem' }}>Modelos 3D ({detail.models?.length || 0})</h3>
        <ul style={{ opacity: 0.9, fontSize: '0.88rem' }}>
          {(detail.models || []).map((m) => (
            <li key={m.id}>{m.file_name} — {m.format} {m.is_primary ? '★' : ''}</li>
          ))}
        </ul>
        <h3 style={{ marginTop: '1rem', fontSize: '1rem' }}>Documentos ({detail.documents?.length || 0})</h3>
        <ul style={{ opacity: 0.9, fontSize: '0.88rem' }}>
          {(detail.documents || []).map((d) => (
            <li key={d.id}>{d.doc_type} — {d.file_name}</li>
          ))}
        </ul>
        <h3 style={{ marginTop: '1rem', fontSize: '1rem' }}>Peças ({detail.parts?.length || 0})</h3>
        <ul style={{ opacity: 0.9, fontSize: '0.88rem' }}>
          {(detail.parts || []).slice(0, 40).map((p) => (
            <li key={p.id}>{p.part_code} — {p.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  /* ---------- Edit (tabs) ---------- */
  if (view === 'edit') {
    const dkw = detail?.keywords || [];
    const dmodels = detail?.models || [];
    const ddocs = detail?.documents || [];
    const dparts = detail?.parts || [];

    return (
      <div className="tli">
        <div className="tli-header">
          <div>
            <h2 className="tli-title">{editingId ? 'Editar equipamento' : 'Novo equipamento'}</h2>
            <p className="tli-sub">Preencha os dados, anexe modelos e documentos, cadastre peças e valide sugestões futuras da IA.</p>
          </div>
          <div className="tli-toolbar">
            <button type="button" className="tli-btn" onClick={() => setView('list')}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className="tli-btn tli-btn--primary" onClick={saveEquipment} disabled={loading}>Salvar dados gerais</button>
            {editingId && (
              <button type="button" className="tli-btn" style={{ borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => removeEquipment(editingId)}>
                <Trash2 size={16} /> Excluir
              </button>
            )}
          </div>
        </div>

        <div className="tli-tabs">
          {['geral', 'keywords', 'modelos', 'documentos', 'pecas', 'auditoria'].map((t) => (
            <button key={t} type="button" className={`tli-tab ${formTab === t ? 'tli-tab--active' : ''}`} onClick={() => setFormTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {formTab === 'geral' && (
          <div className="tli-grid">
            <div className="tli-field"><label>Nome *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="tli-field"><label>Código interno (machine_id)</label><input value={form.internal_machine_code} onChange={(e) => setForm((f) => ({ ...f, internal_machine_code: e.target.value }))} /></div>
            <div className="tli-field"><label>Fabricante</label><input value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} /></div>
            <div className="tli-field"><label>Modelo</label><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></div>
            <div className="tli-field"><label>Série</label><input value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} /></div>
            <div className="tli-field"><label>Ano</label><input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} /></div>
            <div className="tli-field"><label>Categoria</label><input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="compressor, bomba, motor..." /></div>
            <div className="tli-field"><label>Subtipo</label><input value={form.subcategory} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} /></div>
            <div className="tli-field"><label>Departamento</label>
              <select value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="tli-field"><label>Localização</label><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
            <div className="tli-field"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="em_revisao">Em revisão</option>
              </select>
            </div>
            <div className="tli-field" style={{ gridColumn: '1 / -1' }}><label>Descrição técnica</label><textarea value={form.technical_description} onChange={(e) => setForm((f) => ({ ...f, technical_description: e.target.value }))} /></div>
            <div className="tli-field" style={{ gridColumn: '1 / -1' }}><label>Observações</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        )}

        {formTab === 'keywords' && (
          <div>
            <p className="tli-sub">Palavras-chave para reconhecimento por IA (nome comercial, apelidos, códigos, etc.).</p>
            <div className="tli-filters">
              <input placeholder="Nova palavra-chave" value={kwText} onChange={(e) => setKwText(e.target.value)} />
              <select value={kwType} onChange={(e) => setKwType(e.target.value)}>
                {KW_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button type="button" className="tli-btn tli-btn--primary" onClick={addKeywords}>Adicionar</button>
            </div>
            <div className="tli-chip-row">
              {dkw.map((k) => (
                <span key={k.id} className="tli-chip">
                  {k.keyword} <small style={{ opacity: 0.7 }}>({k.keyword_type})</small>
                  <button type="button" aria-label="Remover" onClick={async () => {
                    try {
                      await technicalLibrary.deleteKeyword(k.id);
                      await reloadDetail(eqIdForChildren);
                      notify.success('Removida');
                    } catch (e) {
                      notify.error(e.apiMessage || e.response?.data?.error);
                    }
                  }}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {formTab === 'modelos' && eqIdForChildren && (
          <div>
            <label className="tli-btn tli-btn--primary">
              <Upload size={16} /> Enviar modelo 3D
              <input
                type="file"
                accept=".glb,.gltf,.fbx,.obj"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setLoading(true);
                  try {
                    await technicalLibrary.uploadModel(eqIdForChildren, f, { is_primary: dmodels.length === 0 ? 'true' : '' });
                    await reloadDetail(eqIdForChildren);
                    notify.success('Modelo enviado');
                  } catch (err) {
                    notify.error(err.apiMessage || err.response?.data?.error);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </label>
            <table className="tli-table" style={{ marginTop: 12 }}>
              <thead><tr><th>Arquivo</th><th>Formato</th><th>Principal</th><th /></tr></thead>
              <tbody>
                {dmodels.map((m) => (
                  <tr key={m.id}>
                    <td>{m.file_name}</td>
                    <td>{m.format}</td>
                    <td>{m.is_primary ? 'Sim' : 'Não'}</td>
                    <td className="tli-actions">
                      {!m.is_primary && (
                        <button type="button" className="tli-btn" onClick={async () => {
                          await technicalLibrary.setPrimaryModel(m.id);
                          await reloadDetail(eqIdForChildren);
                          notify.success('Modelo principal atualizado');
                        }}><Star size={14} /> Principal</button>
                      )}
                      <button type="button" className="tli-btn" onClick={async () => {
                        if (!window.confirm('Excluir este arquivo?')) return;
                        await technicalLibrary.deleteModel(m.id);
                        await reloadDetail(eqIdForChildren);
                        notify.success('Removido');
                      }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formTab === 'documentos' && eqIdForChildren && (
          <div>
            <div className="tli-filters">
              <select id="docTypeSel" defaultValue="manual_tecnico">
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <label className="tli-btn tli-btn--primary">
                <Upload size={16} /> Enviar documento
                <input
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    const doc_type = document.getElementById('docTypeSel')?.value || 'manual_tecnico';
                    setLoading(true);
                    try {
                      await technicalLibrary.uploadDocument(eqIdForChildren, f, { doc_type });
                      await reloadDetail(eqIdForChildren);
                      notify.success('Documento enviado');
                    } catch (err) {
                      notify.error(err.apiMessage || err.response?.data?.error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </label>
            </div>
            <ul style={{ marginTop: 8, fontSize: '0.88rem' }}>
              {ddocs.map((d) => (
                <li key={d.id} style={{ marginBottom: 6 }}>
                  {d.doc_type} — {d.file_name}{' '}
                  <button type="button" className="tli-btn" onClick={async () => {
                    await technicalLibrary.deleteDocument(d.id);
                    await reloadDetail(eqIdForChildren);
                  }}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {formTab === 'pecas' && eqIdForChildren && (
          <div>
            <div className="tli-grid" style={{ marginBottom: 12 }}>
              <div className="tli-field"><label>Código</label><input value={partDraft.part_code} onChange={(e) => setPartDraft((p) => ({ ...p, part_code: e.target.value }))} /></div>
              <div className="tli-field"><label>Nome</label><input value={partDraft.name} onChange={(e) => setPartDraft((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="tli-field"><label>Subsistema</label><input value={partDraft.subsystem} onChange={(e) => setPartDraft((p) => ({ ...p, subsystem: e.target.value }))} /></div>
              <div className="tli-field"><label>Criticidade</label>
                <select value={partDraft.criticality} onChange={(e) => setPartDraft((p) => ({ ...p, criticality: e.target.value }))}>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>
            <button type="button" className="tli-btn tli-btn--primary" onClick={async () => {
              if (!partDraft.part_code.trim() || !partDraft.name.trim()) {
                notify.error('Código e nome da peça são obrigatórios');
                return;
              }
              await technicalLibrary.createPart(eqIdForChildren, partDraft);
              setPartDraft({ part_code: '', name: '', subsystem: '', criticality: 'media' });
              await reloadDetail(eqIdForChildren);
              notify.success('Peça adicionada');
            }}><Plus size={16} /> Adicionar peça</button>
            <table className="tli-table" style={{ marginTop: 12 }}>
              <thead><tr><th>Código</th><th>Nome</th><th>Subsistema</th><th>IA</th><th>Validada</th><th /></tr></thead>
              <tbody>
                {dparts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.part_code}</td>
                    <td>{p.name}</td>
                    <td>{p.subsystem || '—'}</td>
                    <td>{p.created_by_ai ? 'Sim' : '—'}</td>
                    <td>{p.validated_by_admin ? 'Sim' : 'Não'}</td>
                    <td>
                      <button type="button" className="tli-btn" onClick={async () => {
                        await technicalLibrary.updatePart(p.id, { validated_by_admin: true });
                        await reloadDetail(eqIdForChildren);
                      }}>Validar</button>
                      <button type="button" className="tli-btn" onClick={async () => {
                        if (!window.confirm('Remover peça?')) return;
                        await technicalLibrary.deletePart(p.id);
                        await reloadDetail(eqIdForChildren);
                      }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formTab === 'auditoria' && (
          <div>
            <p className="tli-sub">Registro de alterações relevantes (extensível para integrações IA).</p>
            <table className="tli-table">
              <thead><tr><th>Data</th><th>Ação</th><th>Entidade</th></tr></thead>
              <tbody>
                {auditRows.map((a) => (
                  <tr key={a.id}>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '—'}</td>
                    <td>{a.action}</td>
                    <td>{a.entity_type || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!eqIdForChildren && formTab !== 'geral' && (
          <p className="tli-sub">Salve o equipamento na aba &quot;geral&quot; para habilitar as demais seções.</p>
        )}
      </div>
    );
  }

  return null;
}

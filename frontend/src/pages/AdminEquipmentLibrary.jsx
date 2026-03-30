/**
 * Biblioteca técnica de equipamentos — apenas utilizadores com role admin.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, FileText, Layers, Upload, Box } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import EquipmentLibraryModel3DPreview from '../components/equipmentLibrary/EquipmentLibraryModel3DPreview';
import { equipmentLibraryAdmin } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { summarizeModelForDownload } from '../utils/equipmentLibrary3dExport';
import './AdminEquipmentLibrary.css';

function formatBytes(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminEquipmentLibrary() {
  const notify = useNotification();
  const [tab, setTab] = useState('assets');
  const [refs, setRefs] = useState(null);
  const [assets, setAssets] = useState([]);
  const [docs, setDocs] = useState([]);
  const [parts, setParts] = useState([]);
  const [models3d, setModels3d] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected3d, setSelected3d] = useState(null);
  const [filter3dAsset, setFilter3dAsset] = useState('');
  const [filter3dPart, setFilter3dPart] = useState('');
  const [upload3dParent, setUpload3dParent] = useState('asset');
  const [upload3dAssetId, setUpload3dAssetId] = useState('');
  const [upload3dPartId, setUpload3dPartId] = useState('');
  const [upload3dVersionLabel, setUpload3dVersionLabel] = useState('');
  const [upload3dNotes, setUpload3dNotes] = useState('');
  const [upload3dPrimary, setUpload3dPrimary] = useState(false);

  const loadRefs = useCallback(() => {
    equipmentLibraryAdmin.references().then((r) => setRefs(r.data?.data || null)).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d, p, m] = await Promise.all([
        equipmentLibraryAdmin.assets.list(),
        equipmentLibraryAdmin.knowledgeDocuments.list(),
        equipmentLibraryAdmin.spareParts.list(),
        equipmentLibraryAdmin.models3d.list({})
      ]);
      setAssets(a.data?.data || []);
      setDocs(d.data?.data || []);
      setParts(p.data?.data || []);
      setModels3d(m.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar biblioteca técnica');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadRefs();
    loadAll();
  }, [loadRefs, loadAll]);

  const filteredModels3d = useMemo(() => {
    return models3d.filter((row) => {
      if (filter3dAsset && row.asset_id !== filter3dAsset) return false;
      if (filter3dPart && row.spare_part_id !== filter3dPart) return false;
      return true;
    });
  }, [models3d, filter3dAsset, filter3dPart]);

  const models3dColumns = useMemo(
    () => [
      { key: 'original_filename', label: 'Ficheiro' },
      { key: 'format', label: 'Formato', render: (v) => (v || '—').toUpperCase() },
      {
        key: 'parent',
        label: 'Associado a',
        render: (_v, row) => {
          if (row.asset_id) {
            const n = row.asset_name || 'Equipamento';
            const c = row.asset_code ? ` · ${row.asset_code}` : '';
            return `${n}${c}`;
          }
          const code = row.spare_part_code || '—';
          const nm = row.spare_part_name || '';
          return `Peça ${code}${nm ? ` — ${nm}` : ''}`;
        }
      },
      { key: 'version_seq', label: 'Versão #' },
      { key: 'version_label', label: 'Rótulo', render: (v) => v || '—' },
      { key: 'is_primary', label: 'Principal', render: (v) => (v ? 'Sim' : '—') },
      { key: 'file_size', label: 'Tamanho', render: (v) => formatBytes(v) },
      {
        key: 'id',
        label: 'Ações',
        render: (_id, row) => (
          <span className="eq-lib-3d-actions">
            {row.asset_id ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={row.is_primary}
                onClick={(e) => {
                  e.stopPropagation();
                  equipmentLibraryAdmin.models3d
                    .update(row.id, { is_primary: true })
                    .then(() => {
                      notify.success('Modelo definido como principal do equipamento');
                      loadAll();
                    })
                    .catch((err) =>
                      notify.error(err.apiMessage || err.response?.data?.error || 'Erro')
                    );
                }}
              >
                Principal
              </button>
            ) : null}
            <a
              className="btn btn-secondary btn-sm"
              href={row.storage_path}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Abrir
            </a>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                const blob = summarizeModelForDownload(row);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `modelo-3d-meta-${row.id}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                notify.success('Metadados exportados (base para simulações futuras)');
              }}
            >
              JSON
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!window.confirm('Remover este modelo do catálogo e apagar o ficheiro?')) return;
                equipmentLibraryAdmin.models3d
                  .delete(row.id)
                  .then(() => {
                    notify.success('Modelo removido');
                    if (selected3d?.id === row.id) setSelected3d(null);
                    loadAll();
                  })
                  .catch((err) =>
                    notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao remover')
                  );
              }}
            >
              Excluir
            </button>
          </span>
        )
      }
    ],
    [loadAll, notify, selected3d?.id]
  );

  const assetColumns = [
    { key: 'name', label: 'Nome' },
    { key: 'code_patrimonial', label: 'Patrimônio', render: (v) => v || '—' },
    { key: 'department_name', label: 'Departamento', render: (v) => v || '—' },
    {
      key: 'model_3d_url',
      label: '3D',
      render: (v, row) => (
        <span className="eq-lib-actions">
          {v ? (
            <a href={v} target="_blank" rel="noreferrer" className="eq-lib-link">
              ver
            </a>
          ) : (
            '—'
          )}
          <label className="eq-lib-file">
            <Upload size={14} />
            <input
              type="file"
              accept=".glb,.gltf,.obj"
              className="eq-lib-file-input"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  await equipmentLibraryAdmin.assets.uploadModel3d(row.id, f);
                  notify.success('Modelo enviado');
                  loadAll();
                } catch (err) {
                  notify.error(err.apiMessage || err.response?.data?.error || 'Falha no upload');
                }
              }}
            />
          </label>
        </span>
      )
    },
    {
      key: 'manual_pdf_url',
      label: 'Manual',
      render: (v, row) => (
        <span className="eq-lib-actions">
          {v ? (
            <a href={v} target="_blank" rel="noreferrer" className="eq-lib-link">
              PDF
            </a>
          ) : (
            '—'
          )}
          <label className="eq-lib-file">
            <Upload size={14} />
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="eq-lib-file-input"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  await equipmentLibraryAdmin.assets.uploadManualPdf(row.id, f);
                  notify.success('Manual enviado');
                  loadAll();
                } catch (err) {
                  notify.error(err.apiMessage || err.response?.data?.error || 'Falha no upload');
                }
              }}
            />
          </label>
        </span>
      )
    },
    {
      key: 'model_3d_is_primary',
      label: '3D principal',
      render: (v) => (v ? 'Sim' : '—')
    }
  ];

  const docColumns = [
    { key: 'title', label: 'Título' },
    { key: 'doc_type', label: 'Tipo', render: (v) => v || '—' },
    { key: 'category', label: 'Categoria', render: (v) => v || '—' }
  ];

  const partColumns = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nome' },
    { key: 'qty', label: 'Qtd' },
    { key: 'reorder_point', label: 'Reposição' },
    {
      key: 'keywords',
      label: 'Palavras-chave',
      render: (v) => (Array.isArray(v) ? v.join(', ') : v || '—')
    },
    {
      key: 'suggested_by_ai',
      label: 'IA',
      render: (v) => (v ? 'Sim' : '—')
    },
    {
      key: 'id',
      label: 'Validar',
      render: (_v, row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!row.suggested_by_ai}
          onClick={async () => {
            try {
              await equipmentLibraryAdmin.spareParts.validateAi(row.id);
              notify.success('Sugestão validada');
              loadAll();
            } catch (err) {
              notify.error(err.apiMessage || err.response?.data?.error || 'Erro');
            }
          }}
        >
          Validar IA
        </button>
      )
    }
  ];

  return (
    <Layout>
      <div className="eq-lib-page">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon">
              <Package size={24} />
            </div>
            <div>
              <h1 className="page-title">Biblioteca técnica</h1>
              <p className="page-subtitle">
                Equipamentos, documentos, peças e modelos 3D — escopo da sua empresa (apenas administrador)
              </p>
            </div>
          </div>
        </div>

        <div className="eq-lib-tabs">
          <button type="button" className={tab === 'assets' ? 'active' : ''} onClick={() => setTab('assets')}>
            <Layers size={18} /> Equipamentos
          </button>
          <button type="button" className={tab === 'docs' ? 'active' : ''} onClick={() => setTab('docs')}>
            <FileText size={18} /> Documentos
          </button>
          <button type="button" className={tab === 'parts' ? 'active' : ''} onClick={() => setTab('parts')}>
            <Package size={18} /> Peças
          </button>
          <button type="button" className={tab === 'models3d' ? 'active' : ''} onClick={() => setTab('models3d')}>
            <Box size={18} /> Modelos 3D
          </button>
        </div>

        {tab === 'assets' && (
          <section className="eq-lib-section">
            <p className="eq-lib-hint">
              Os equipamentos são os mesmos da base estrutural. Aqui pode anexar modelo 3D e manual PDF por
              ativo.
            </p>
            {refs?.departments?.length ? (
              <p className="eq-lib-meta">
                {refs.departments.length} departamentos · {refs.productionLines?.length || 0} linhas
              </p>
            ) : null}
            <Table columns={assetColumns} data={assets} loading={loading} emptyMessage="Nenhum equipamento" />
          </section>
        )}

        {tab === 'docs' && (
          <section className="eq-lib-section">
            <p className="eq-lib-hint">
              Documentos de conhecimento da empresa (cadastro via API ou extensão futura do formulário).
            </p>
            <Table columns={docColumns} data={docs} loading={loading} emptyMessage="Nenhum documento" />
          </section>
        )}

        {tab === 'parts' && (
          <section className="eq-lib-section">
            <div className="eq-lib-parts-toolbar">
              <label className="btn btn-secondary">
                <Upload size={16} /> Importar CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="eq-lib-file-input"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                      const r = await equipmentLibraryAdmin.spareParts.importCsv(f);
                      notify.success(`Importadas ${r.data?.count ?? 0} linhas`);
                      loadAll();
                    } catch (err) {
                      notify.error(err.apiMessage || err.response?.data?.error || 'Falha no CSV');
                    }
                  }}
                />
              </label>
            </div>
            <p className="eq-lib-hint">CSV esperado: colunas code, name; opcionalmente qty, reorder.</p>
            <Table columns={partColumns} data={parts} loading={loading} emptyMessage="Nenhuma peça" />
          </section>
        )}

        {tab === 'models3d' && (
          <section className="eq-lib-section">
            <p className="eq-lib-hint">
              Carregue <strong>.glb</strong>, <strong>.gltf</strong>, <strong>.obj</strong>, <strong>.stl</strong> ou{' '}
              <strong>.fbx</strong>. Os ficheiros ficam em <code>/uploads/equipment-library/…/3d/</code> com registo
              versionado na base de dados. Para equipamentos, marcar <em>Principal</em> sincroniza{' '}
              <code>model_3d_url</code> do ativo (útil para integrações existentes).
            </p>

            <div className="eq-lib-3d-toolbar">
              <div className="eq-lib-3d-field">
                <label>Tipo de vínculo</label>
                <select
                  value={upload3dParent}
                  onChange={(e) => setUpload3dParent(e.target.value)}
                  aria-label="Tipo de vínculo do upload"
                >
                  <option value="asset">Equipamento</option>
                  <option value="part">Peça</option>
                </select>
              </div>
              {upload3dParent === 'asset' ? (
                <div className="eq-lib-3d-field">
                  <label>Equipamento</label>
                  <select
                    value={upload3dAssetId}
                    onChange={(e) => setUpload3dAssetId(e.target.value)}
                    aria-label="Equipamento para o modelo 3D"
                  >
                    <option value="">— selecionar —</option>
                    {(refs?.assets || assets).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.code_patrimonial ? ` (${a.code_patrimonial})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="eq-lib-3d-field">
                  <label>Peça</label>
                  <select
                    value={upload3dPartId}
                    onChange={(e) => setUpload3dPartId(e.target.value)}
                    aria-label="Peça para o modelo 3D"
                  >
                    <option value="">— selecionar —</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="eq-lib-3d-field">
                <label>Rótulo de versão (opcional)</label>
                <input
                  type="text"
                  value={upload3dVersionLabel}
                  onChange={(e) => setUpload3dVersionLabel(e.target.value)}
                  placeholder="ex.: revisão A"
                />
              </div>
              <div className="eq-lib-3d-field">
                <label>Notas (opcional)</label>
                <input
                  type="text"
                  value={upload3dNotes}
                  onChange={(e) => setUpload3dNotes(e.target.value)}
                  placeholder="Observações internas"
                />
              </div>
              {upload3dParent === 'asset' ? (
                <label className="eq-lib-3d-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={upload3dPrimary}
                    onChange={(e) => setUpload3dPrimary(e.target.checked)}
                  />
                  Definir como principal do equipamento
                </label>
              ) : null}
              <label className="btn btn-secondary" style={{ alignSelf: 'center' }}>
                <Upload size={16} /> Enviar modelo
                <input
                  type="file"
                  accept=".fbx,.obj,.glb,.gltf,.stl"
                  className="eq-lib-file-input"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    const fields =
                      upload3dParent === 'asset'
                        ? {
                            asset_id: upload3dAssetId,
                            version_label: upload3dVersionLabel || undefined,
                            notes: upload3dNotes || undefined,
                            is_primary: upload3dPrimary
                          }
                        : {
                            spare_part_id: upload3dPartId,
                            version_label: upload3dVersionLabel || undefined,
                            notes: upload3dNotes || undefined
                          };
                    if (upload3dParent === 'asset' && !fields.asset_id) {
                      notify.error('Selecione um equipamento');
                      return;
                    }
                    if (upload3dParent === 'part' && !fields.spare_part_id) {
                      notify.error('Selecione uma peça');
                      return;
                    }
                    try {
                      await equipmentLibraryAdmin.models3d.upload(f, fields);
                      notify.success('Modelo 3D registado');
                      setUpload3dVersionLabel('');
                      setUpload3dNotes('');
                      setUpload3dPrimary(false);
                      loadAll();
                    } catch (err) {
                      notify.error(err.apiMessage || err.response?.data?.error || 'Falha no upload');
                    }
                  }}
                />
              </label>
            </div>

            <div className="eq-lib-3d-toolbar" style={{ marginTop: '-0.5rem' }}>
              <div className="eq-lib-3d-field">
                <label>Filtrar por equipamento</label>
                <select value={filter3dAsset} onChange={(e) => setFilter3dAsset(e.target.value)}>
                  <option value="">Todos</option>
                  {(refs?.assets || assets).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="eq-lib-3d-field">
                <label>Filtrar por peça</label>
                <select value={filter3dPart} onChange={(e) => setFilter3dPart(e.target.value)}>
                  <option value="">Todas</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="eq-lib-3d-layout">
              <div>
                <Table
                  columns={models3dColumns}
                  data={filteredModels3d}
                  loading={loading}
                  emptyMessage="Nenhum modelo 3D"
                  onRowClick={(row) => setSelected3d(row)}
                  getRowClassName={(row) => (selected3d?.id === row.id ? 'eq-lib-3d-row-selected' : '')}
                />
              </div>
              <div>
                <EquipmentLibraryModel3DPreview url={selected3d?.storage_path} />
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

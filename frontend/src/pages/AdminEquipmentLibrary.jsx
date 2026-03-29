/**
 * Biblioteca técnica de equipamentos — apenas utilizadores com role admin.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Package, FileText, Layers, Upload } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import { equipmentLibraryAdmin } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminEquipmentLibrary.css';

export default function AdminEquipmentLibrary() {
  const notify = useNotification();
  const [tab, setTab] = useState('assets');
  const [refs, setRefs] = useState(null);
  const [assets, setAssets] = useState([]);
  const [docs, setDocs] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRefs = useCallback(() => {
    equipmentLibraryAdmin.references().then((r) => setRefs(r.data?.data || null)).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d, p] = await Promise.all([
        equipmentLibraryAdmin.assets.list(),
        equipmentLibraryAdmin.knowledgeDocuments.list(),
        equipmentLibraryAdmin.spareParts.list()
      ]);
      setAssets(a.data?.data || []);
      setDocs(d.data?.data || []);
      setParts(p.data?.data || []);
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
                Equipamentos, documentos e peças — escopo da sua empresa (apenas administrador)
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
      </div>
    </Layout>
  );
}

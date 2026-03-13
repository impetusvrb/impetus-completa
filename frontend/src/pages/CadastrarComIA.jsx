/**
 * Cadastrar com IA
 * Módulo para cadastro de informações do setor usando IA
 * Aceita: texto, imagens, documentos, áudio
 */
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Upload, FileText, Image, Mic, Check, AlertCircle } from 'lucide-react';
import { dashboard } from '../services/api';
import './CadastrarComIA.css';

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'custo', label: 'Custo' },
  { value: 'processo', label: 'Processo' },
  { value: 'material', label: 'Material' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'rotina', label: 'Rotina' },
  { value: 'outro', label: 'Outro' }
];

export default function CadastrarComIA() {
  const [texto, setTexto] = useState('');
  const [sector, setSector] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const loadItems = async () => {
    setLoadingList(true);
    try {
      const r = await dashboard.cadastrarComIA.listar(filtroCategoria || undefined, 50);
      if (r.data?.ok && Array.isArray(r.data.items)) {
        setItems(r.data.items);
      }
    } catch (e) {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filtroCategoria]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!texto.trim() && !file) || loading) return;

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('texto', texto.trim());
      if (sector) formData.append('sector', sector);
      if (equipamento) formData.append('equipamento', equipamento);
      if (file) formData.append('file', file);

      const r = await dashboard.cadastrarComIA.cadastrar(formData);
      if (r.data?.ok) {
        setMessage({ type: 'success', text: 'Informação cadastrada com sucesso!' });
        setTexto('');
        setFile(null);
        setSector('');
        setEquipamento('');
        loadItems();
      } else {
        setMessage({ type: 'error', text: r.data?.error || 'Erro ao cadastrar' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.apiMessage || e.response?.data?.error || 'Erro ao processar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="cadastrar-ia">
        <h1 className="cadastrar-ia__title">Cadastrar com IA</h1>
        <p className="cadastrar-ia__subtitle">
          Cadastre informações do seu setor usando texto, imagens, documentos ou áudio.
          A IA irá interpretar, organizar e armazenar automaticamente.
        </p>

        <form className="cadastrar-ia__form" onSubmit={handleSubmit}>
          <div className="cadastrar-ia__field">
            <label htmlFor="texto">Texto ou descrição</label>
            <textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex: A linha 2 utiliza o compressor Atlas Copco modelo X e consome em média 50 kWh por hora."
              rows={4}
            />
          </div>

          <div className="cadastrar-ia__row">
            <div className="cadastrar-ia__field">
              <label htmlFor="sector">Setor (opcional)</label>
              <input
                id="sector"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ex: Produção, Manutenção"
              />
            </div>
            <div className="cadastrar-ia__field">
              <label htmlFor="equipamento">Equipamento (opcional)</label>
              <input
                id="equipamento"
                type="text"
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
                placeholder="Ex: Compressor linha 4"
              />
            </div>
          </div>

          <div className="cadastrar-ia__field">
            <label>Arquivo (opcional)</label>
            <div className="cadastrar-ia__upload">
              <input
                type="file"
                id="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span className="cadastrar-ia__hint">
                PDF, DOC, imagem (PNG/JPG) ou áudio (MP3, M4A, WAV) — até 15MB
              </span>
              {file && <span className="cadastrar-ia__file-name">{file.name}</span>}
            </div>
          </div>

          {message && (
            <div className={`cadastrar-ia__message cadastrar-ia__message--${message.type}`}>
              {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading || (!texto.trim() && !file)}>
            {loading ? 'Processando...' : 'Cadastrar com IA'}
          </button>
        </form>

        <section className="cadastrar-ia__list">
          <h2>Itens cadastrados</h2>
          <div className="cadastrar-ia__filtro">
            <label>Filtrar por categoria:</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {loadingList ? (
            <p>Carregando...</p>
          ) : items.length === 0 ? (
            <p className="cadastrar-ia__empty">Nenhum item cadastrado ainda.</p>
          ) : (
            <ul className="cadastrar-ia__items">
              {items.map((item) => (
                <li key={item.id} className="cadastrar-ia__item">
                  <span className="cadastrar-ia__item-cat">{item.categoria}</span>
                  <span className="cadastrar-ia__item-resumo">{item.resumo || '—'}</span>
                  <span className="cadastrar-ia__item-meta">
                    {item.source_type} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}

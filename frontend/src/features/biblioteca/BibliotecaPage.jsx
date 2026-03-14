/**
 * BIBLIOTECA DE ARQUIVOS
 * Página principal: barra lateral de categorias, grid de arquivos, pesquisa
 */
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import SearchBar from './components/SearchBar';
import CategoriaSidebar from './components/CategoriaSidebar';
import FileGrid from './components/FileGrid';
import FileDetailModal from './components/FileDetailModal';
import { adminSettings } from '../../services/api';
import { useActivityLog } from '../../hooks/useActivityLog';
import './BibliotecaPage.css';

export default function BibliotecaPage() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manuals, setManuals] = useState([]);
  const [pops, setPops] = useState([]);
  const { log } = useActivityLog();

  useEffect(() => {
    log('view', 'biblioteca', null, {});
  }, []);

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        const [manualsRes, popsRes] = await Promise.all([
          adminSettings.listManuals().catch(() => ({ data: { manuals: [] } })),
          adminSettings.listPops().catch(() => ({ data: { pops: [] } })),
        ]);
        setManuals(manualsRes.data?.manuals || []);
        setPops(popsRes.data?.pops || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const arquivos = useMemo(() => {
    const list = [
      ...manuals.map((m) => {
        const tipo = m.manual_type === 'operacional' ? 'manual' : 'maquina';
        const titulo = m.equipment_type ? `${m.equipment_type}${m.model ? ` - ${m.model}` : ''}` : m.title || 'Manual';
        return {
          id: m.id,
          titulo,
          tipo,
          updated_at: m.upload_date || m.created_at,
          url: m.file_url,
          descricao: m.manufacturer ? `Fabricante: ${m.manufacturer}` : null,
        };
      }),
      ...pops.map((p) => ({
        id: p.id,
        titulo: p.title,
        tipo: 'pop',
        updated_at: p.updated_at || p.created_at,
        url: p.file_url,
        descricao: p.content?.slice(0, 150) || p.category,
      })),
    ];

    let filtrados = list;

    if (categoriaAtiva !== 'todos') {
      const mapTipo = { politica: 'politica', pop: 'pop', manual: 'manual', maquina: 'maquina' };
      const tipoFiltro = mapTipo[categoriaAtiva];
      if (tipoFiltro) filtrados = list.filter((a) => a.tipo === tipoFiltro);
    }

    if (busca.trim()) {
      const b = busca.toLowerCase();
      filtrados = filtrados.filter(
        (a) =>
          (a.titulo || '').toLowerCase().includes(b) ||
          (a.descricao || '').toLowerCase().includes(b)
      );
    }

    return filtrados.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [manuals, pops, categoriaAtiva, busca]);

  const abrirDetalhes = (arquivo) => {
    setArquivoSelecionado(arquivo);
    setModalAberto(true);
  };

  return (
    <Layout>
      <div className="biblioteca-page">
        <header className="biblioteca-page__header">
          <h1 className="biblioteca-page__titulo">Biblioteca de Arquivos</h1>
          <p className="biblioteca-page__subtitulo">Políticas, POPs, manuais e documentação</p>
          <div className="biblioteca-page__search">
            <SearchBar value={busca} onChange={setBusca} placeholder="Buscar por nome ou descrição..." />
          </div>
        </header>

        <div className="biblioteca-page__main">
          <CategoriaSidebar ativa={categoriaAtiva} onSelect={setCategoriaAtiva} />
          <section className="biblioteca-page__content">
            <FileGrid
              files={arquivos}
              arquivoSelecionado={arquivoSelecionado}
              onSelectArquivo={abrirDetalhes}
              loading={loading}
            />
          </section>
        </div>
      </div>

      <FileDetailModal
        arquivo={arquivoSelecionado}
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
      />
    </Layout>
  );
}

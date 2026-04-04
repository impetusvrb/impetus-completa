/**
 * PRÓ-AÇÃO — página completa (menu lateral). Conteúdo partilhado com Chat Impetus via ProacaoWorkspace.
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProacaoWorkspace from '../features/proacao/ProacaoWorkspace';

export default function Proposals() {
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('tab') === 'tpm' ? 'tpm' : 'proposals';

  return (
    <Layout>
      <ProacaoWorkspace key={initialSection} variant="page" initialSection={initialSection} />
    </Layout>
  );
}

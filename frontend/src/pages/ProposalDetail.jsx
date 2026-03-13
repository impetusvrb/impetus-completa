import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <button type="button" onClick={() => navigate('/app/proacao')}>← Voltar</button>
        <h1>Proposta #{id}</h1>
        <p style={{ color: '#64748b' }}>Detalhes da proposta.</p>
      </div>
    </Layout>
  );
}

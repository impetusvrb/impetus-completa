import React from 'react';
import Layout from '../components/Layout';
import InsightsList from '../components/InsightsList';
import { dashboard } from '../services/api';
import { useCachedFetch } from '../hooks/useCachedFetch';

export default function InsightsPage() {
  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const { data, loading } = useCachedFetch(
    `dashboard:insights:${user.id}`,
    () => dashboard.getInsights ? dashboard.getInsights() : Promise.resolve({ insights: [] }),
    { ttlMs: 2 * 60 * 1000 }
  );

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <InsightsList insights={data?.insights || []} loading={loading} />
      </div>
    </Layout>
  );
}

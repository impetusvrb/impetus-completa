/**
 * GRÁFICO DE TENDÊNCIA OPERACIONAL
 * Gráfico de área mostrando evolução das interações
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './TrendChart.css';

export default function TrendChart({ data = [], loading = false }) {
  // Dados de exemplo se não houver dados
  const defaultData = [
    { month: 'Set', interactions: 850 },
    { month: 'Out', interactions: 920 },
    { month: 'Nov', interactions: 980 },
    { month: 'Dez', interactions: 1050 },
    { month: 'Jan', interactions: 1150 },
    { month: 'Fev', interactions: 1180 },
    { month: 'Mar', interactions: 1202 }
  ];

  const chartData = data.length > 0 ? data : defaultData;
  const lastValue = chartData[chartData.length - 1]?.interactions || 0;

  if (loading) {
    return (
      <div className="trend-chart-card">
        <div className="chart-header">
          <h3>Tendência Operacional</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trend-chart-card">
      <div className="chart-header">
        <h3>Tendência Operacional</h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot"></span>
            Interações
          </span>
          <span className="chart-value">{lastValue.toLocaleString('pt-BR')} interações</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Area 
            type="monotone" 
            dataKey="interactions" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fill="url(#colorInteractions)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

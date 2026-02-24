/**
 * GRÁFICO DE PONTOS MONITORADOS
 * Gráfico de pizza mostrando distribuição
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './MonitoredPointsChart.css';

export default function MonitoredPointsChart({ data = [], loading = false }) {
  const defaultData = [
    { name: 'Sensores', value: 60, count: 289 },
    { name: 'Máquinas', value: 40, count: 193 }
  ];

  const chartData = data.length > 0 ? data : defaultData;
  const COLORS = ['#3b82f6', '#0891b2', '#f97316', '#10b981'];

  const totalPoints = chartData.reduce((sum, item) => sum + (item.count || item.value), 0);

  if (loading) {
    return (
      <div className="monitored-points-card">
        <h3>Pontos Monitorados</h3>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="monitored-points-card">
      <h3>Pontos Monitorados</h3>
      
      <div className="pie-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pie-center-label">
          <div className="pie-percentage">60%</div>
        </div>
      </div>

      <div className="pie-legend">
        {chartData.map((item, index) => (
          <div key={index} className="pie-legend-item">
            <span 
              className="pie-legend-color" 
              style={{ background: COLORS[index % COLORS.length] }}
            ></span>
            <span className="pie-legend-label">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

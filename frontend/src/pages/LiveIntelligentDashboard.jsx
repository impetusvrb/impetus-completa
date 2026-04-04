/**
 * Legado: painel unificado passou a fazer parte de /app (Visão Executiva / Dashboard).
 * Mantido para compatibilidade de imports; rota em App.jsx redireciona para /app.
 */
import { Navigate } from 'react-router-dom';

export default function LiveIntelligentDashboard() {
  return <Navigate to="/app" replace />;
}

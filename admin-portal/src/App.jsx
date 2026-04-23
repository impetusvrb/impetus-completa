import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompaniesList from './pages/CompaniesList';
import CompanyNew from './pages/CompanyNew';
import CompanyDetail from './pages/CompanyDetail';
import CompanyEdit from './pages/CompanyEdit';
import Logs from './pages/Logs';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import AiGovernance from './pages/AiGovernance';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }} className="muted">
        Carregando…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="empresas" element={<CompaniesList />} />
        <Route path="empresas/nova" element={<CompanyNew />} />
        <Route path="empresas/:id" element={<CompanyDetail />} />
        <Route path="empresas/:id/editar" element={<CompanyEdit />} />
        <Route path="logs" element={<Logs />} />
        <Route path="usuarios-internos" element={<Users />} />
        <Route path="governanca-ia" element={<AiGovernance />} />
        <Route path="governanca-ia/:incidentId" element={<AiGovernance />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

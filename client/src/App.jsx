import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import QuoteView from './pages/QuoteView';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import ActivationPage from './pages/ActivationPage';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const [activation, setActivation] = useState({ loading: true, valid: false });

  const refreshActivation = async () => {
    if (!window.electronAPI?.getActivationState) {
      setActivation({ loading: false, valid: true });
      return;
    }
    try {
      const state = await window.electronAPI.getActivationState();
      setActivation({ loading: false, ...state });
    } catch (err) {
      setActivation({
        loading: false,
        valid: false,
        reason: err?.message || 'No se pudo verificar licencia',
      });
    }
  };

  useEffect(() => {
    refreshActivation();
  }, []);

  if (activation.loading) {
    return (
      <div className="page">
        <section className="panel" style={{ maxWidth: 680, margin: '40px auto' }}>
          <h1>Verificando licencia…</h1>
          <p className="muted">Validando activación offline de este equipo.</p>
        </section>
      </div>
    );
  }

  if (!activation.valid) {
    return <ActivationPage activation={activation} onRefresh={refreshActivation} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="configuracion" element={<Settings />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="cotizaciones" element={<Quotes />} />
        <Route path="cotizaciones/nueva" element={<QuoteForm />} />
        <Route path="cotizaciones/:id" element={<QuoteView />} />
        <Route path="cotizaciones/:id/editar" element={<QuoteForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

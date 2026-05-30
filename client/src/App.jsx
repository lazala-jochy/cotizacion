import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

const QuoteView = lazy(() => import('./pages/QuoteView'));
const TemplateDesignerList = lazy(() => import('./pages/TemplateDesignerList'));
const TemplateDesignerEditor = lazy(() => import('./pages/TemplateDesignerEditor'));

function PageLoading() {
  return (
    <div className="page">
      <p className="muted">Cargando…</p>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
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
        <Route path="clientes" element={<Navigate to="/cotizaciones" replace />} />
        <Route path="configuracion" element={<Settings />} />
        <Route
          path="plantillas"
          element={
            <Suspense fallback={<PageLoading />}>
              <TemplateDesignerList />
            </Suspense>
          }
        />
        <Route
          path="plantillas/:id"
          element={
            <Suspense fallback={<PageLoading />}>
              <TemplateDesignerEditor />
            </Suspense>
          }
        />
        <Route path="reportes" element={<Reports />} />
        <Route path="cotizaciones" element={<Quotes />} />
        <Route path="cotizaciones/nueva" element={<QuoteForm />} />
        <Route
          path="cotizaciones/:id"
          element={
            <Suspense fallback={<PageLoading />}>
              <QuoteView />
            </Suspense>
          }
        />
        <Route path="cotizaciones/:id/editar" element={<QuoteForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

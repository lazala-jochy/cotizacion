import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLicense } from './context/LicenseContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ActivateLicense from './pages/ActivateLicense';
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import LicenseLoadingScreen from './components/LicenseLoadingScreen';

function LegacyFinanzasRedirect() {
  const { pathname, search, hash } = useLocation();
  const to = pathname.replace(/^\/finanzas/, '/compras') || '/compras/gastos';
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

const QuoteView = lazy(() => import('./pages/QuoteView'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'));
const TemplateDesignerList = lazy(() => import('./pages/TemplateDesignerList'));
const TemplateDesignerEditor = lazy(() => import('./pages/TemplateDesignerEditor'));
const DgiiLayout = lazy(() => import('./pages/dgii/DgiiLayout'));
const DgiiFormat607 = lazy(() => import('./pages/dgii/DgiiFormat607'));
const DgiiFormat606 = lazy(() => import('./pages/dgii/DgiiFormat606'));
const DgiiReportsHistory = lazy(() => import('./pages/dgii/DgiiReportsHistory'));
const FinanzasLayout = lazy(() => import('./pages/finance/FinanzasLayout'));
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const ExpenseCategoriesPage = lazy(() => import('./pages/finance/ExpenseCategoriesPage'));
const ExpenseReportPage = lazy(() => import('./pages/finance/ExpenseReportPage'));
const IncomeStatementPage = lazy(() => import('./pages/finance/IncomeStatementPage'));

function PageLoading() {
  return (
    <div className="page">
      <p className="muted">Cargando…</p>
    </div>
  );
}

function LicenseRoute({ children }) {
  const { isLicensed, loading } = useLicense();
  if (loading) {
    return <LicenseLoadingScreen />;
  }
  return isLicensed ? children : <Navigate to="/activar" replace />;
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function LicensedPrivateRoute({ children }) {
  return (
    <LicenseRoute>
      <PrivateRoute>{children}</PrivateRoute>
    </LicenseRoute>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/activar" element={<ActivateLicense />} />
      <Route
        path="/login"
        element={
          <LicenseRoute>
            <PublicRoute>
              <Login />
            </PublicRoute>
          </LicenseRoute>
        }
      />
      <Route
        path="/register"
        element={
          <LicenseRoute>
            <PublicRoute>
              <Register />
            </PublicRoute>
          </LicenseRoute>
        }
      />
      <Route
        element={
          <LicensedPrivateRoute>
            <Layout />
          </LicensedPrivateRoute>
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
        <Route
          path="dgii"
          element={
            <Suspense fallback={<PageLoading />}>
              <DgiiLayout />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="/dgii/606" replace />} />
          <Route
            path="607"
            element={
              <Suspense fallback={<PageLoading />}>
                <DgiiFormat607 />
              </Suspense>
            }
          />
          <Route path="608" element={<Navigate to="/dgii/606" replace />} />
          <Route
            path="606"
            element={
              <Suspense fallback={<PageLoading />}>
                <DgiiFormat606 />
              </Suspense>
            }
          />
          <Route
            path="historial"
            element={
              <Suspense fallback={<PageLoading />}>
                <DgiiReportsHistory />
              </Suspense>
            }
          />
        </Route>
        <Route path="finanzas/*" element={<LegacyFinanzasRedirect />} />
        <Route
          path="compras"
          element={
            <Suspense fallback={<PageLoading />}>
              <FinanzasLayout />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="/compras/gastos" replace />} />
          <Route
            path="gastos"
            element={
              <Suspense fallback={<PageLoading />}>
                <ExpensesPage />
              </Suspense>
            }
          />
          <Route
            path="categorias"
            element={
              <Suspense fallback={<PageLoading />}>
                <ExpenseCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="reporte"
            element={
              <Suspense fallback={<PageLoading />}>
                <ExpenseReportPage />
              </Suspense>
            }
          />
          <Route
            path="resultados"
            element={
              <Suspense fallback={<PageLoading />}>
                <IncomeStatementPage />
              </Suspense>
            }
          />
        </Route>
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
        <Route
          path="facturas"
          element={
            <Suspense fallback={<PageLoading />}>
              <Invoices />
            </Suspense>
          }
        />
        <Route
          path="facturas/nueva"
          element={
            <Suspense fallback={<PageLoading />}>
              <InvoiceForm />
            </Suspense>
          }
        />
        <Route
          path="facturas/:id"
          element={
            <Suspense fallback={<PageLoading />}>
              <InvoiceView />
            </Suspense>
          }
        />
        <Route
          path="facturas/:id/editar"
          element={
            <Suspense fallback={<PageLoading />}>
              <InvoiceForm />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

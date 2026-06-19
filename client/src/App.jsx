import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLicense } from './context/LicenseContext';
import Layout from './components/Layout';
import AppLoadingScreen from './components/AppLoadingScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import RecoverPassword from './pages/RecoverPassword';
import ActivateLicense from './pages/ActivateLicense';
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import { moduleForClientPath } from './licensing/modules';

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
const ReportBuilderPage = lazy(() => import('./pages/report_builder/ReportBuilderPage'));

function PageLoading() {
  return <AppLoadingScreen message="Cargando…" variant="page" />;
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

/** Rutas de módulos licenciados (cotizaciones, facturas, etc.). */
function LicensedModuleRoute({ children }) {
  const { hasModule, loading } = useLicense();
  const { pathname } = useLocation();
  const moduleCode = moduleForClientPath(pathname);

  if (loading) {
    return <PageLoading />;
  }
  if (moduleCode && !hasModule(moduleCode)) {
    return <Navigate to="/configuracion#licencia" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/activar" element={<ActivateLicense />} />
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
        path="/restablecer-contrasena"
        element={
          <PublicRoute>
            <RecoverPassword />
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
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <TemplateDesignerList />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="plantillas/:id"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <TemplateDesignerEditor />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <LicensedModuleRoute>
              <Reports />
            </LicensedModuleRoute>
          }
        />
        <Route
          path="report-builder"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <ReportBuilderPage />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="dgii"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <DgiiLayout />
              </Suspense>
            </LicensedModuleRoute>
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
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <FinanzasLayout />
              </Suspense>
            </LicensedModuleRoute>
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
        <Route
          path="cotizaciones"
          element={
            <LicensedModuleRoute>
              <Quotes />
            </LicensedModuleRoute>
          }
        />
        <Route
          path="cotizaciones/nueva"
          element={
            <LicensedModuleRoute>
              <QuoteForm />
            </LicensedModuleRoute>
          }
        />
        <Route
          path="cotizaciones/:id"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <QuoteView />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="cotizaciones/:id/editar"
          element={
            <LicensedModuleRoute>
              <QuoteForm />
            </LicensedModuleRoute>
          }
        />
        <Route
          path="facturas"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <Invoices />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="facturas/nueva"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <InvoiceForm />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="facturas/:id"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <InvoiceView />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
        <Route
          path="facturas/:id/editar"
          element={
            <LicensedModuleRoute>
              <Suspense fallback={<PageLoading />}>
                <InvoiceForm />
              </Suspense>
            </LicensedModuleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

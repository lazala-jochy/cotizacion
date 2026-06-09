import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  getAccountInitials,
  getSavedAccount,
  listSavedAccounts,
  removeSavedAccount,
  saveAccountAfterLogin,
} from '../utils/savedAccounts';

export default function Login() {
  const [savedAccounts, setSavedAccounts] = useState(() => listSavedAccounts());
  const [view, setView] = useState(() => (listSavedAccounts().length ? 'picker' : 'form'));
  const [selectedId, setSelectedId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const refreshSavedAccounts = () => setSavedAccounts(listSavedAccounts());

  useEffect(() => {
    if (savedAccounts.length === 0 && view === 'picker') {
      setView('form');
    }
  }, [savedAccounts.length, view]);

  const completeLogin = async (credentials, shouldRemember) => {
    const data = await api.login(credentials);
    saveAccountAfterLogin({
      user: data.user,
      password: credentials.password,
      rememberPassword: shouldRemember,
    });
    refreshSavedAccounts();
    login(data.user, data);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await completeLogin({ email, password }, rememberMe);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAccount = (accountId) => {
    const account = getSavedAccount(accountId);
    if (!account) {
      refreshSavedAccounts();
      return;
    }
    setSelectedId(accountId);
    setEmail(account.email);
    setRememberMe(account.rememberPassword);
    setError('');

    if (account.password) {
      setPassword(account.password);
      setLoading(true);
      completeLogin({ email: account.email, password: account.password }, account.rememberPassword)
        .catch((err) => {
          setPassword('');
          setView('form');
          setError(err.message || 'No se pudo iniciar sesión. Ingresa la contraseña.');
        })
        .finally(() => setLoading(false));
      return;
    }

    setPassword('');
    setView('form');
  };

  const handleRemoveAccount = (e, accountId) => {
    e.stopPropagation();
    removeSavedAccount(accountId);
    if (selectedId === accountId) {
      setSelectedId(null);
      setEmail('');
      setPassword('');
    }
    refreshSavedAccounts();
  };

  const showManualForm = () => {
    setSelectedId(null);
    setEmail('');
    setPassword('');
    setError('');
    setView('form');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark lg">C</span>
          <h1>Cotizaciones</h1>
          <p>Genera y administra cotizaciones para tu negocio</p>
        </div>

        {view === 'picker' && savedAccounts.length > 0 ? (
          <div className="saved-accounts">
            <h2>Elegir cuenta</h2>
            <p className="muted saved-accounts-hint">Selecciona un usuario guardado en este equipo</p>
            <ul className="saved-accounts-list">
              {savedAccounts.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    className="saved-account-item"
                    onClick={() => openAccount(account.id)}
                    disabled={loading}
                  >
                    <span className="saved-account-avatar" aria-hidden>
                      {getAccountInitials(account.nombre, account.email)}
                    </span>
                    <span className="saved-account-meta">
                      <strong>{account.nombre}</strong>
                      <span>{account.email}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-account-remove"
                    onClick={(e) => handleRemoveAccount(e, account.id)}
                    aria-label={`Quitar ${account.email}`}
                    title="Quitar de este equipo"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="button" className="btn-ghost saved-accounts-other" onClick={showManualForm}>
              Usar otra cuenta
            </button>
            <p className="auth-forgot">
              <Link to="/restablecer-contrasena">¿Olvidaste tu contraseña?</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>Iniciar sesión</h2>
            {savedAccounts.length > 0 && (
              <button
                type="button"
                className="btn-ghost btn-sm saved-accounts-back"
                onClick={() => {
                  setError('');
                  setView('picker');
                }}
              >
                ← Elegir cuenta guardada
              </button>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label>
              Contraseña
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>
            <label className="checkbox-label remember-me-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Recordar en este equipo
            </label>
            <p className="auth-forgot">
              <Link to="/restablecer-contrasena">¿Olvidaste tu contraseña?</Link>
            </p>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}

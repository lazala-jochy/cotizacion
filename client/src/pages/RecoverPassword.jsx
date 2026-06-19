import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { updateSavedAccountPassword } from '../utils/savedAccounts';
import LoadingOverlay from '../components/LoadingOverlay';
import { APP_NAME } from '../constants/appBrand';

export default function RecoverPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const data = await api.recoverPassword({ email, newPassword });
      login(data.user, data);
      updateSavedAccountPassword(data.user.email, newPassword);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay show={loading} fixed message="Restableciendo contraseña…" />
      <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark lg">LIS</span>
          <h1>Restablecer contraseña</h1>
          <p>{APP_NAME}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <h2>Recuperar acceso</h2>
          <p className="muted auth-recover-hint">
            Recuperación local en este equipo. Ingresa el email de tu cuenta y define una nueva contraseña.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Email de la cuenta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn-primary" disabled={loading}>
            Restablecer y entrar
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">← Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
    </>
  );
}

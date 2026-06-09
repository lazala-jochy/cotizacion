import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { updateSavedAccountPassword } from '../utils/savedAccounts';

export default function ChangePasswordSection() {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const data = await api.changePassword({ currentPassword, newPassword });
      login(data.user, data);
      updateSavedAccountPassword(user?.email, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setSuccess(data.message || 'Contraseña actualizada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel" id="seguridad">
      <header className="form-section-title">
        <h2>Seguridad de la cuenta</h2>
        <p className="muted">
          Cambio de contraseña local en este equipo. Si no recuerdas la actual, usa{' '}
          <Link to="/restablecer-contrasena">Restablecer contraseña</Link> desde el inicio de sesión.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="form-grid change-password-form">
        <label>
          Contraseña actual
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
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
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </section>
  );
}

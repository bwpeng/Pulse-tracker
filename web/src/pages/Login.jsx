import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApp } from '../store/AppStore.jsx';
import { RingsPreview } from '../components/Previews.jsx';

export default function Login() {
  const { status, login } = useApp();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .demoAccounts()
      .then((list) => {
        setAccounts(list);
        setForm((current) => ({ ...current, email: list[0]?.email ?? '' }));
      })
      .catch(() => setError('Could not reach the API. Is the server running?'));
  }, []);

  if (status === 'ready') return <Navigate to="/app/today" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.email.trim(), form.password);
      navigate('/app/today', { replace: true });
    } catch (err) {
      setError(
        err.status === 401
          ? 'That email and password combination is not recognised.'
          : err.status === 429
            ? 'Too many attempts — wait a minute and try again.'
            : 'Could not reach the API. Is the server running?'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__art" aria-hidden="true">
        <RingsPreview values={[0.9, 0.78, 0.64]} size={148} />
        <p className="auth__art-title">Pulse</p>
        <p className="auth__art-copy">
          Ninety days of history, five screens, one API. Pick an account and look around.
        </p>
      </div>

      <div className="auth__panel">
        <Link className="auth__back" to="/">
          <span aria-hidden="true">←</span> Back
        </Link>
        <h1 className="auth__title">Sign in</h1>
        <p className="auth__sub">
          These are fictional demo accounts. Pick one, then enter the demo password from the
          project README.
        </p>

        <div className="auth__accounts">
          {accounts.map((account) => (
            <button
              type="button"
              key={account.email}
              className={`auth__account${form.email === account.email ? ' is-active' : ''}`}
              onClick={() => setForm((current) => ({ ...current, email: account.email }))}
            >
              <span className="auth__avatar">{account.initials}</span>
              <span className="auth__account-body">
                <span className="auth__account-name">{account.name}</span>
                <span className="auth__account-meta">{account.tagline}</span>
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && (
            <p className="auth__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

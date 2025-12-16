import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const tokenFromQuery = query.get('token') || '';
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenFromQuery) setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInfo(null);

    if (!token) { setInfo({ error: 'Reset token required' }); toast.error('Reset token required'); return; }
    if (!password || password !== confirm) { setInfo({ error: 'Passwords do not match' }); toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err = data?.error || data?.message || `Reset failed (${res.status})`;
        setInfo({ error: err });
        toast.error(err);
        setLoading(false);
        return;
      }

      setInfo({ success: 'Password reset. Please login.' });
      toast.success('Password reset. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error(err);
      const msg = err?.message || 'Reset failed';
      setInfo({ error: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrap">
      <div className="card">
        <h2 className="h1">Reset Password</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Reset Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} />
          </div>

          <div className="field">
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="field">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>

          <div className="field full" style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>Cancel</button>
          </div>
        </form>

        {info && (
          <div style={{ marginTop: 12 }}>
            {info.error && <div style={{ color: 'red' }}>{info.error}</div>}
            {info.success && <div style={{ color: 'green' }}>{info.success}</div>}
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

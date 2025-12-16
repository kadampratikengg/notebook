import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || data?.message || `Login failed (${res.status})`;
        toast.error(msg);
        setLoading(false);
        return;
      }

      // success
      localStorage.setItem('token', data.token);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err) {
      console.error('Login error', err);
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrap">
      <div className="card">
        <h2 className="h1">Login</h2>

        <form onSubmit={submit} className="form-grid">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="field full" style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <Link to="/register" style={{ textDecoration: 'none', color: '#007bff', display: 'block', marginBottom: '8px' }}>
            Create an Account
          </Link>

          <Link to="/Forgot" style={{ textDecoration: 'none', color: '#007bff' }}>
            Forgot Password?
          </Link>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

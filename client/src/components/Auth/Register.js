import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || data?.message || 'Registration failed');
      }

      alert('Registered successfully. Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-wrap">
      <div className="card">
        <h2 className="h1">Register</h2>

        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

        <form onSubmit={submit} className="form-grid">
          <div className="field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="field full">
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Create Account
            </button>
          </div>
        </form>

        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'block', marginBottom: 8, color: '#007bff' }}>
            I already have an account? Login
          </Link>

          <Link to="/Forgot" style={{ color: '#007bff' }}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}

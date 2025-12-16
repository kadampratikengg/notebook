import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.warning('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Failed to send reset link');
        return;
      }

      toast.success('Reset link sent to your email 📧');

      // Redirect to login after success
      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error) {
      toast.error('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrap">
      <div className="card">
        <h2 className="h1">Forgot Password</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="field full">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <Link
            to="/login"
            style={{ display: 'block', marginBottom: 8, color: '#007bff' }}
          >
            I already have an account? Login
          </Link>

          <Link to="/register" style={{ color: '#007bff' }}>
            Don’t have an account? Create one
          </Link>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

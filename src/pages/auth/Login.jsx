import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);
    if (result?.success) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div className="auth-logo">
          <Zap size={32} className="text-amber" />
          <span>VoltStore</span>
        </div>
        <p className="auth-tagline">AI inventory for electrical shops</p>

        {authError && <div className="auth-error">{authError}</div>}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-with-icon">
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 'var(--space-md)' }}>
          <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.82rem' }}>Forgot password?</Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-large"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <><Loader2 size={18} className="spin" /> Signing in…</> : 'Sign In →'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Create shop →</Link>
        </p>
      </form>
    </div>
  );
}

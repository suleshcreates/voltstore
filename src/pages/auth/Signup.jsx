import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

function getStrength(pw) {
  if (!pw || pw.length < 6) return { label: 'Weak', color: '#F0595A', width: '33%' };
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const hasNumber = /\d/.test(pw);
  if (pw.length >= 8 && (hasSpecial || hasNumber)) return { label: 'Strong', color: '#2DD4A0', width: '100%' };
  return { label: 'OK', color: '#F5A623', width: '66%' };
}

export default function Signup() {
  const signUp = useAuthStore((s) => s.signUp);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const strength = getStrength(password);
  const canSubmit = name && email && password.length >= 6 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await signUp(email, password, name);
    setIsSubmitting(false);
    if (result.success) {
      navigate('/verify-email', { state: { email } });
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <Zap size={32} className="text-amber" />
          <span>VoltStore</span>
        </div>
        <p className="auth-tagline" style={{ color: '#2DD4A0', fontWeight: 500 }}>
          14-day free trial. No credit card needed.
        </p>

        {authError && <div className="auth-error">{authError}</div>}

        <div className="form-group">
          <label className="form-label">Your name</label>
          <input className="input" type="text" placeholder="e.g. Raju Sharma" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-with-icon">
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {password && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: strength.color, marginTop: 3, display: 'block' }}>{strength.label}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm password</label>
          <input
            className={`input ${confirmPassword && !passwordsMatch ? 'input-error' : ''}`}
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirmPassword && !passwordsMatch && (
            <span className="form-hint error">Passwords don't match</span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-large"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? <><Loader2 size={18} className="spin" /> Creating…</> : 'Create my shop →'}
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
          By signing up you agree to our Terms of Service
        </p>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Signup() {
  const signUp = useAuthStore((s) => s.signUp);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordStrong = password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!passwordsMatch) return;
    if (!passwordStrong) return;

    setIsSubmitting(true);
    const result = await signUp(email, password, name);
    setIsSubmitting(false);

    if (result.success) {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <Zap size={32} className="text-amber" />
            <span>VoltStore</span>
          </div>

          <div className="auth-success-icon">
            <CheckCircle size={48} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Check your email</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            We've sent a confirmation link to<br />
            <strong style={{ color: 'var(--off-white)' }}>{email}</strong>
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 16 }}>
            Click the link in your email to verify your account, then you'll be redirected to set up your shop.
          </p>

          <div style={{ marginTop: 'var(--space-xl)' }}>
            <Link to="/login" className="auth-link">← Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <Zap size={32} className="text-amber" />
          <span>VoltStore</span>
        </div>
        <p className="auth-tagline">Create your account. Set up your shop in 60 seconds.</p>

        {authError && (
          <div className="auth-error">
            {authError}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Your Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., Raju Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
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
          {password && !passwordStrong && (
            <span className="form-hint error">Password must be at least 6 characters</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            className="input"
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
          disabled={isSubmitting || !passwordsMatch || !passwordStrong}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account →'}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

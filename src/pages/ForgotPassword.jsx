import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function ForgotPassword() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);
    if (result.success) setEmailSent(true);
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
            We've sent a password reset link to<br />
            <strong style={{ color: 'var(--off-white)' }}>{email}</strong>
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
        <p className="auth-tagline">Enter your email and we'll send you a reset link.</p>

        {authError && (
          <div className="auth-error">{authError}</div>
        )}

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

        <button
          type="submit"
          className="btn btn-primary btn-large"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link →'}
        </button>

        <p className="auth-footer">
          Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

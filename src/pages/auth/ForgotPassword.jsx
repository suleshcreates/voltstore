import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function ForgotPassword() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);
    if (result.success) setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div className="auth-logo">
            <Zap size={32} className="text-amber" />
            <span>VoltStore</span>
          </div>
          <div className="auth-success-icon">
            <CheckCircle size={48} />
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 8 }}>Check your inbox</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            We've sent a password reset link to<br />
            <span style={{ color: 'var(--anchor)', fontWeight: 500 }}>{email}</span>
          </p>
          <div style={{ marginTop: 24 }}>
            <Link to="/login" className="auth-link">← Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div className="auth-logo">
          <Zap size={32} className="text-amber" />
          <span>VoltStore</span>
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', marginBottom: 4, color: '#F0EDE8' }}>
          Reset your password
        </h2>
        <p className="auth-tagline">Enter your email and we'll send you a reset link.</p>

        {authError && <div className="auth-error">{authError}</div>}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 size={18} className="spin" /> Sending…</> : 'Send reset link →'}
        </button>

        <p className="auth-footer">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}

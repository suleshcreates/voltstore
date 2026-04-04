import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';

function getStrength(pw) {
  if (!pw || pw.length < 6) return { label: 'Weak', color: '#F0595A', width: '33%' };
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const hasNumber = /\d/.test(pw);
  if (pw.length >= 8 && (hasSpecial || hasNumber)) return { label: 'Strong', color: '#2DD4A0', width: '100%' };
  return { label: 'OK', color: '#F5A623', width: '66%' };
}

export default function ResetPassword() {
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const strength = getStrength(password);
  const canSubmit = password.length >= 6 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  if (success) {
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
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 8 }}>Password updated!</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Redirecting to login…</p>
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
          Set new password
        </h2>
        <p className="auth-tagline">Choose a strong password for your account.</p>

        {authError && <div className="auth-error">{authError}</div>}

        <div className="form-group">
          <label className="form-label">New password</label>
          <div className="input-with-icon">
            <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
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
          <label className="form-label">Confirm new password</label>
          <input className={`input ${confirmPassword && !passwordsMatch ? 'input-error' : ''}`}
            type="password" placeholder="Re-enter password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          {confirmPassword && !passwordsMatch && (
            <span className="form-hint error">Passwords don't match</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', justifyContent: 'center' }}
          disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? <><Loader2 size={18} className="spin" /> Updating…</> : 'Update password →'}
        </button>
      </form>
    </div>
  );
}

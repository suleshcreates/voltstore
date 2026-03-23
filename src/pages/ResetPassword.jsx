import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

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

  const passwordsMatch = password === confirmPassword;
  const passwordStrong = password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!passwordsMatch || !passwordStrong) return;

    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  if (success) {
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
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Password Updated!</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
            Redirecting to your dashboard...
          </p>
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
        <p className="auth-tagline">Set your new password below.</p>

        {authError && (
          <div className="auth-error">{authError}</div>
        )}

        <div className="form-group">
          <label className="form-label">New Password</label>
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
          <label className="form-label">Confirm New Password</label>
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
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={isSubmitting || !passwordsMatch || !passwordStrong}
        >
          {isSubmitting ? 'Updating...' : 'Update Password →'}
        </button>
      </form>
    </div>
  );
}

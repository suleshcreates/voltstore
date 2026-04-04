import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || '';
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    const result = await resendConfirmation(email);
    if (result.success) {
      setResent(true);
      setCooldown(60);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,166,35,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Mail size={36} style={{ color: 'var(--anchor)' }} />
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.75rem', color: '#F0EDE8', marginBottom: 12 }}>
          Check your inbox
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 8 }}>
          We've sent a confirmation link to<br />
          <span style={{ color: 'var(--anchor)', fontWeight: 500 }}>{email || 'your email'}</span>.<br />
          Click it to activate your account.
        </p>

        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 24 }}>
          Didn't get it? Check your spam folder.
        </p>

        <button
          className="btn btn-outline"
          style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}
          onClick={handleResend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s…` : resent ? 'Resend again' : 'Resend email'}
        </button>

        <Link to="/login" className="auth-link" style={{ fontSize: '0.88rem' }}>← Back to sign in</Link>
      </div>
    </div>
  );
}

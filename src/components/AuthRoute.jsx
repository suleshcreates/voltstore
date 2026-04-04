import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// AuthRoute: requires auth but does NOT require onboarding to be complete
export default function AuthRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="auth-page">
        <div style={{ textAlign: 'center' }}>
          <div className="auth-spinner" />
          <p style={{ color: 'var(--muted)', marginTop: 16, fontFamily: 'var(--font-display)' }}>
            ⚡ Loading VoltStore…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

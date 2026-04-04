import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Onboarding from './pages/auth/Onboarding';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SalesEntry from './pages/SalesEntry';
import AIAlerts from './pages/AIAlerts';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import History from './pages/History';
import Settings from './pages/Settings';
import useStore from './store/store';
import useAuthStore from './store/authStore';

function AppLayout() {
  const location = useLocation();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<SalesEntry />} />
          <Route path="/alerts" element={<AIAlerts />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initStore = useStore((s) => s.initStore);

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  // Init data store only when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      initStore();
    }
  }, [isAuthenticated, isLoading, initStore]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Onboarding — auth required, onboarding not complete */}
        <Route path="/onboarding" element={
          <AuthRoute>
            <Onboarding />
          </AuthRoute>
        } />

        {/* Protected app — auth + onboarding both required */}
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

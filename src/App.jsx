import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SalesEntry from './pages/SalesEntry';
import AIAlerts from './pages/AIAlerts';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import useStore from './store/store';

function AppLayout() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  if (isOnboarding) {
    return <Onboarding />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<SalesEntry />} />
          <Route path="/alerts" element={<AIAlerts />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const initStore = useStore((state) => state.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

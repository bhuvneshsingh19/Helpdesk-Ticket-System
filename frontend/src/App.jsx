import { Navigate, Route, Routes } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LifeBuoy className="h-8 w-8 animate-spin text-primary" style={{ animationDuration: '2s' }} />
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

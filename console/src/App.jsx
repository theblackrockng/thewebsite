import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/reservations/Reservations";
import MenuEditor from "./pages/menu/MenuEditor";
import Enquiries from "./pages/enquiries/Enquiries";

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--charcoal)" }}>
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Loading...</div>
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><MenuEditor /></ProtectedRoute>} />
      <Route path="/enquiries" element={<ProtectedRoute><Enquiries /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

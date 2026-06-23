import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { StaffProvider } from "./context/StaffContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/reservations/Reservations";
import MenuManagement from "./pages/menu/MenuManagement";
import MediaLibrary from "./pages/media/MediaLibrary";
import SiteContent from "./pages/content/SiteContent";
import Enquiries from "./pages/enquiries/Enquiries";
import UserManagement from "./pages/users/UserManagement";
import ResetPassword from "./pages/ResetPassword";
import ContentHub from "./pages/content-hub/ContentHub";
import AssetDetail from "./pages/content-hub/AssetDetail";

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
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/"            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
      <Route path="/menu"        element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
      <Route path="/media"       element={<ProtectedRoute><MediaLibrary /></ProtectedRoute>} />
      <Route path="/content"     element={<ProtectedRoute><SiteContent /></ProtectedRoute>} />
      <Route path="/enquiries"   element={<ProtectedRoute><Enquiries /></ProtectedRoute>} />
      <Route path="/users"              element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/content-hub"        element={<ProtectedRoute><ContentHub /></ProtectedRoute>} />
      <Route path="/content-hub/asset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="*"                   element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StaffProvider>
          <AppRoutes />
        </StaffProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

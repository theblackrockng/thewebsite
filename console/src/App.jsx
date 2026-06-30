import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import Welcome from "./pages/Welcome";
import ContentHub from "./pages/content-hub/ContentHub";
import AssetDetail from "./pages/content-hub/AssetDetail";
import Settings from "./pages/settings/Settings";
import BlogManagement from "./pages/blog/BlogManagement";
import BlogEditor from "./pages/blog/BlogEditor";
import SecurityLog from "./pages/security/SecurityLog";
import StaffProfile from "./pages/profile/StaffProfile";
import Orders from "./pages/orders/Orders";

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
  const navigate = useNavigate();

  // Capture the hash synchronously at first render, before Supabase clears it.
  // This ensures invite/recovery links always land on the password setup page
  // regardless of whether the user is already logged in or where Supabase redirects.
  const [initialHash] = useState(() => window.location.hash);
  useEffect(() => {
    if (initialHash.includes("type=invite") || initialHash.includes("type=recovery")) {
      navigate("/reset-password", {
        replace: true,
        state: { isInvite: initialHash.includes("type=invite") },
      });
    }
  }, []);

  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/"            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
      <Route path="/menu"        element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
      <Route path="/media"       element={<ProtectedRoute><MediaLibrary /></ProtectedRoute>} />
      <Route path="/content"     element={<ProtectedRoute><SiteContent /></ProtectedRoute>} />
      <Route path="/enquiries"   element={<ProtectedRoute><Enquiries /></ProtectedRoute>} />
      <Route path="/users"              element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/content-hub"        element={<ProtectedRoute><ContentHub /></ProtectedRoute>} />
      <Route path="/content-hub/asset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/settings"              element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/blog"               element={<ProtectedRoute><BlogManagement /></ProtectedRoute>} />
      <Route path="/blog/:id"           element={<ProtectedRoute><BlogEditor /></ProtectedRoute>} />
      <Route path="/security"           element={<ProtectedRoute><SecurityLog /></ProtectedRoute>} />
      <Route path="/profile"            element={<ProtectedRoute><StaffProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId"    element={<ProtectedRoute><StaffProfile /></ProtectedRoute>} />
      <Route path="/orders"             element={<ProtectedRoute><Orders /></ProtectedRoute>} />
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

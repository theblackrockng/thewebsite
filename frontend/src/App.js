import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import "@/App.css";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { useTheme } from "./hooks/useTheme";

import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import { ContentSidebar } from "./components/content/ContentSidebar";

import Home from "./pages/Home";
import About from "./pages/About";
import MenuPage from "./pages/Menu";
import Reservations from "./pages/Reservations";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ContentHub from "./pages/ContentHub";
import ContentHubAsset from "./pages/ContentHubAsset";
import ContentHubGuide from "./pages/ContentHubGuide";
import ContentHubLogin from "./pages/ContentHubLogin";
import Order from "./pages/Order";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function ContentHubLayout() {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  if (pathname === "/content-hub/login") {
    return <ContentHubLogin />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ContentSidebar user={profile} />
      <main className="flex-1 overflow-y-auto min-w-0 relative md:ml-[220px] pt-14 md:pt-0 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<ContentHub />} />
          <Route path="/asset/:id" element={<ContentHubAsset />} />
          <Route path="/guide" element={<ContentHubGuide />} />
        </Routes>
      </main>
    </div>
  );
}

function ThemeLoader() {
  useTheme();
  return null;
}

function MainLayout() {
  const { pathname } = useLocation();
  const noFooter = pathname === "/reservations" || pathname === "/checkout" || pathname.startsWith("/order-confirmation");
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/order" element={<Order />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
        </Routes>
      </main>
      {!noFooter && <Footer />}
      <FloatingWhatsApp />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ThemeLoader />
          <ScrollToTop />
          <Routes>
            <Route path="/content-hub/*" element={<ContentHubLayout />} />
            <Route path="*" element={<MainLayout />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

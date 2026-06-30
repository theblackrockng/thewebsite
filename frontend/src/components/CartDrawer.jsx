import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, removeItem, setQty, subtotal, totalItems, drawerOpen, setDrawerOpen } = useCart();

  // Lock body scroll when open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function handleCheckout() {
    setDrawerOpen(false);
    navigate("/checkout");
  }

  function handleOrderLink() {
    setDrawerOpen(false);
    navigate("/order");
  }

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.6)",
            }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 201,
              width: "min(420px, 100vw)",
              background: "#1a1612",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid #2e2820",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShoppingBag size={20} style={{ color: "var(--gold, #C9A84C)" }} />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "var(--warm-white, #F5F0E8)",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  Your Order
                </span>
                {totalItems > 0 && (
                  <span
                    style={{
                      background: "var(--gold, #C9A84C)",
                      color: "#0f0d0a",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                    }}
                  >
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close cart"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted, #9C8E7A)",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
              {items.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 16,
                    padding: "40px 24px",
                    textAlign: "center",
                  }}
                >
                  <ShoppingBag size={48} style={{ color: "#2e2820" }} />
                  <p style={{ color: "var(--muted, #9C8E7A)", fontSize: 15, margin: 0 }}>
                    Your cart is empty
                  </p>
                  <button
                    onClick={handleOrderLink}
                    style={{
                      background: "none",
                      border: "1px solid var(--gold, #C9A84C)",
                      color: "var(--gold, #C9A84C)",
                      borderRadius: 6,
                      padding: "10px 24px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "16px 24px",
                        borderBottom: idx < items.length - 1 ? "1px solid #2e2820" : "none",
                      }}
                    >
                      {/* Name + price */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--warm-white, #F5F0E8)",
                            marginBottom: 4,
                            lineHeight: 1.3,
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)" }}>
                          {fmtPrice(item.price)} each
                        </div>
                      </div>

                      {/* Controls */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                        {/* Line total */}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--gold, #C9A84C)",
                          }}
                        >
                          {fmtPrice(item.price * item.qty)}
                        </div>

                        {/* Qty stepper */}
                        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                          <button
                            onClick={() => setQty(item.id, item.qty - 1)}
                            aria-label="Decrease quantity"
                            style={{
                              width: 28,
                              height: 28,
                              background: "#2e2820",
                              border: "none",
                              borderRadius: "6px 0 0 6px",
                              color: "var(--warm-white, #F5F0E8)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Minus size={12} />
                          </button>
                          <span
                            style={{
                              width: 32,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#251f19",
                              color: "var(--warm-white, #F5F0E8)",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {item.qty}
                          </span>
                          <button
                            onClick={() => setQty(item.id, item.qty + 1)}
                            aria-label="Increase quantity"
                            style={{
                              width: 28,
                              height: 28,
                              background: "#2e2820",
                              border: "none",
                              borderRadius: "0 6px 6px 0",
                              color: "var(--warm-white, #F5F0E8)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#5a4e46",
                            padding: 0,
                            display: "flex",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #2e2820",
                  padding: "20px 24px",
                  background: "#141210",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                    Subtotal
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--warm-white, #F5F0E8)" }}>
                    {fmtPrice(subtotal)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  style={{
                    width: "100%",
                    background: "var(--gold, #C9A84C)",
                    color: "#0f0d0a",
                    border: "none",
                    borderRadius: 6,
                    padding: "14px 24px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

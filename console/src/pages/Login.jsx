import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/heroimage.png')" }} />
      <div className="absolute inset-0" style={{ background: "var(--burgundy)", opacity: 0.375 }} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="font-serif text-4xl text-[var(--gold)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BlackRock Restaurant</div>
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mt-2">Admin Console</div>
          <div className="w-10 h-px bg-[var(--gold)]/40 mx-auto mt-4" />
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="console-label">Email</label>
            <input
              type="email" required autoComplete="email"
              className="console-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="console-label">Password</label>
            <input
              type="password" required autoComplete="current-password"
              className="console-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400 border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3">
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

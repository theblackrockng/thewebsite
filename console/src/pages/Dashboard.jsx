import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, UtensilsCrossed, MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

function StatCard({ icon: Icon, label, value, to, color = "var(--gold)" }) {
  return (
    <Link to={to} className="console-card flex items-center justify-between group hover:border-[var(--gold)] transition-colors">
      <div>
        <div className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] mb-2">{label}</div>
        <div className="text-4xl font-light" style={{ color }}>{value ?? "—"}</div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <Icon size={22} style={{ color }} className="opacity-60" />
        <ArrowRight size={14} className="text-[var(--muted)] group-hover:text-[var(--gold)] transition-colors" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ pending: null, total: null, enquiries: null });

  useEffect(() => {
    async function load() {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("reservations").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("reservations").select("id", { count: "exact" }),
        supabase.from("enquiries").select("id", { count: "exact" }).eq("status", "new"),
      ]);
      setStats({ pending: r1.count, total: r2.count, enquiries: r3.count });
    }
    load();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1">Welcome back</div>
        <h1 className="text-2xl font-light text-[var(--warm-white)]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard icon={CalendarDays} label="Pending Reservations" value={stats.pending} to="/reservations" />
        <StatCard icon={CalendarDays} label="Total Reservations" value={stats.total} to="/reservations" color="var(--muted)" />
        <StatCard icon={MessageSquare} label="New Enquiries" value={stats.enquiries} to="/enquiries" color="#a78bfa" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="console-card">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] mb-4">Quick Links</div>
          <div className="space-y-2">
            {[
              { to: "/reservations", label: "Manage Reservations", icon: CalendarDays },
              { to: "/menu", label: "Edit Menu", icon: UtensilsCrossed },
              { to: "/enquiries", label: "View Enquiries", icon: MessageSquare },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--warm-white)] transition-colors group">
                <l.icon size={14} className="text-[var(--gold)]" />
                {l.label}
                <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
        <div className="console-card">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] mb-4">Info</div>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            This console manages live reservations, menu content, and guest enquiries for the BLACKROCK public website. Changes to the menu take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

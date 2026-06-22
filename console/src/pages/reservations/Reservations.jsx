import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Check, X, RefreshCw, Loader2, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUSES = ["all", "pending", "confirmed", "rescheduled", "cancelled"];

function Badge({ status, concierge }) {
  if (concierge) return <span className="badge badge-concierge">Concierge</span>;
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function Row({ r, onAction }) {
  const date = r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  return (
    <tr>
      <td>
        <div className="font-medium text-[var(--warm-white)]">{r.name}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">{r.email}</div>
      </td>
      <td className="text-[var(--muted)]">{r.phone}</td>
      <td>{date}</td>
      <td className="text-[var(--muted)]">{r.time || "—"}</td>
      <td className="text-[var(--muted)]">{r.party === "other" ? r.party_other : r.party}</td>
      <td>
        <div className="text-xs text-[var(--warm-white)] capitalize">{r.occasion?.replace(/-/g, " ")}</div>
        {r.is_concierge && <span className="badge badge-concierge mt-1">Concierge</span>}
      </td>
      <td><Badge status={r.status} /></td>
      <td>
        <div className="flex items-center gap-1">
          {r.status !== "confirmed" && (
            <button onClick={() => onAction(r.id, "confirmed")} className="btn-success py-1 px-2 text-xs">
              <Check size={12} />
            </button>
          )}
          {r.status !== "cancelled" && (
            <button onClick={() => onAction(r.id, "cancelled")} className="btn-danger py-1 px-2 text-xs">
              <X size={12} />
            </button>
          )}
          {r.status !== "rescheduled" && (
            <button onClick={() => onAction(r.id, "rescheduled")} className="btn-ghost py-1 px-2 text-xs">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DetailPanel({ r, onClose, onAction }) {
  if (!r) return null;
  const date = r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-[var(--border-soft)] overflow-y-auto"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)]">
        <div className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Reservation Detail</div>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--warm-white)]"><X size={18} /></button>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <div className="text-xs text-[var(--muted)] mb-1">Status</div>
          <Badge status={r.status} concierge={r.is_concierge} />
        </div>
        {[
          ["Guest", r.name],
          ["Email", r.email],
          ["Phone", r.phone],
          ["Date", date],
          ["Time", r.time || "—"],
          ["Party Size", r.party === "other" ? r.party_other : r.party],
          ["Occasion", r.occasion?.replace(/-/g, " ")],
          ["Special Requests", r.special_requests || "None"],
          r.whose_birthday && ["Whose Birthday", r.whose_birthday],
          r.company_name && ["Company", r.company_name],
          r.years_anniversary && ["Anniversary Years", r.years_anniversary],
        ].filter(Boolean).map(([label, value]) => (
          <div key={label}>
            <div className="console-label">{label}</div>
            <div className="text-sm text-[var(--warm-white)] capitalize">{value}</div>
          </div>
        ))}
        <div className="pt-4 border-t border-[var(--border-soft)] flex flex-col gap-2">
          <button onClick={() => onAction(r.id, "confirmed")} className="btn-success justify-center"><Check size={14} /> Confirm</button>
          <button onClick={() => onAction(r.id, "rescheduled")} className="btn-ghost justify-center"><RefreshCw size={14} /> Mark Rescheduled</button>
          <button onClick={() => onAction(r.id, "cancelled")} className="btn-danger justify-center"><X size={14} /> Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Reservations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("reservations").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, status) => {
    await supabase.from("reservations").update({ status }).eq("id", id);
    setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  const filtered = rows.filter((r) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1">Website Management</div>
          <h1 className="text-2xl font-light text-[var(--warm-white)]">Reservations</h1>
        </div>
        <button onClick={load} className="btn-ghost self-start sm:self-auto">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input className="console-input pl-9 py-2" placeholder="Search name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all ${filter === s ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]" : "bg-transparent text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="console-card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--muted)]">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted)] text-sm">No reservations found.</div>
        ) : (
          <table className="console-table">
            <thead>
              <tr>
                <th>Guest</th><th>Phone</th><th>Date</th><th>Time</th><th>Party</th><th>Occasion</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <Row key={r.id} r={r} onAction={handleAction} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} />
            <DetailPanel r={selected} onClose={() => setSelected(null)} onAction={handleAction} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

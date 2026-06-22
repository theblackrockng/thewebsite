import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RefreshCw, Loader2, X, Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const STATUSES = ["all", "new", "read", "responded"];

function DetailPanel({ e, onClose, onAction }) {
  if (!e) return null;
  const date = new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-[var(--border-soft)] overflow-y-auto"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)]">
        <div className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Enquiry</div>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--warm-white)]"><X size={18} /></button>
      </div>
      <div className="p-6 space-y-5">
        <div><div className="console-label">From</div><div className="text-sm">{e.name}</div></div>
        <div><div className="console-label">Email</div><a href={`mailto:${e.email}`} className="text-sm text-[var(--gold)]">{e.email}</a></div>
        <div><div className="console-label">Received</div><div className="text-sm text-[var(--muted)]">{date}</div></div>
        <div>
          <div className="console-label">Message</div>
          <div className="text-sm text-[var(--warm-white)] leading-relaxed bg-[var(--charcoal-mid)] p-4 border border-[var(--border-soft)]">{e.message}</div>
        </div>
        <div className="pt-4 border-t border-[var(--border-soft)] flex flex-col gap-2">
          <a href={`mailto:${e.email}?subject=Re: Your enquiry to BLACKROCK`} onClick={() => onAction(e.id, "responded")} className="btn-gold justify-center">
            <Mail size={14} /> Reply by Email
          </a>
          <button onClick={() => onAction(e.id, "read")} className="btn-ghost justify-center">Mark as Read</button>
          <button onClick={() => onAction(e.id, "responded")} className="btn-success justify-center">Mark as Responded</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Enquiries() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, status) => {
    await supabase.from("enquiries").update({ status }).eq("id", id);
    setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1">Website Management</div>
          <h1 className="text-2xl font-light text-[var(--warm-white)]">Enquiries</h1>
        </div>
        <button onClick={load} className="btn-ghost"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="flex gap-2 mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all ${filter === s ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]" : "text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)]"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="console-card p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--muted)]"><Loader2 size={20} className="animate-spin mr-2" /> Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted)] text-sm">No enquiries found.</div>
        ) : (
          <table className="console-table">
            <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-[var(--muted)]">{r.email}</td>
                  <td className="text-[var(--muted)] max-w-xs">
                    <span className="line-clamp-1 text-xs">{r.message}</span>
                  </td>
                  <td className="text-[var(--muted)] text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} />
            <DetailPanel e={selected} onClose={() => setSelected(null)} onAction={handleAction} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

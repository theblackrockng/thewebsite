import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CalendarDays, MessageSquare, ShoppingBag, UtensilsCrossed, Users, FileEdit, Search as SearchIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";

const STATUS_COLOR = {
  pending: "#d97706",
  confirmed: "#22c55e",
  cancelled: "#9ca3af",
  new: "#ef4444",
  read: "#9ca3af",
  resolved: "#22c55e",
  preparing: "#d97706",
  ready: "#22c55e",
  completed: "#9ca3af",
};

function statusPill(s) {
  if (!s) return null;
  const color = STATUS_COLOR[s] || "#9ca3af";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
      background: `${color}22`, color, padding: "2px 7px", borderRadius: 99,
    }}>{s}</span>
  );
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <section style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={15} style={{ color: "var(--ds-gold)" }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ds-muted)" }}>({count})</div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ to, onClick, left, middle, right }) {
  const inner = (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 14,
      padding: "12px 18px", borderBottom: "1px solid var(--ds-border)",
      cursor: "pointer", textDecoration: "none",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left}</div>
        {middle && <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{middle}</div>}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ds-muted)", display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
    </div>
  );
  if (to) return <Link to={to} style={{ display: "block", textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = (params.get("q") || "").trim();
  const [input, setInput] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ reservations: [], enquiries: [], orders: [], menu: [], staff: [], blog: [] });

  useEffect(() => { setInput(query); }, [query]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ reservations: [], enquiries: [], orders: [], menu: [], staff: [], blog: [] });
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      const like = `%${query}%`;
      const [res, enq, ord, menu, staff, blog] = await Promise.all([
        supabase.from("reservations")
          .select("id,name,email,phone,date,time,party,status,occasion")
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("enquiries")
          .select("id,name,email,message,status,created_at")
          .or(`name.ilike.${like},email.ilike.${like},message.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("orders")
          .select("id,order_number,guest_name,table_number,order_status,created_at")
          .or(`guest_name.ilike.${like},order_number.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("menu_items")
          .select("id,name,category,menu_type,price,description")
          .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
          .limit(25),
        supabase.from("staff_profiles")
          .select("id,full_name,email,role")
          .or(`full_name.ilike.${like},email.ilike.${like},role.ilike.${like}`)
          .limit(25),
        supabase.from("blog_posts")
          .select("id,title,slug,status")
          .or(`title.ilike.${like},slug.ilike.${like}`)
          .limit(25),
      ]);
      if (cancelled) return;
      setResults({
        reservations: res.data || [],
        enquiries: enq.data || [],
        orders: ord.data || [],
        menu: menu.data || [],
        staff: staff.data || [],
        blog: blog.data || [],
      });
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [query]);

  function submit(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  const total =
    results.reservations.length + results.enquiries.length + results.orders.length +
    results.menu.length + results.staff.length + results.blog.length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px" }}>
        Search
      </h1>
      <div style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 20 }}>
        {query ? <>Results for <span style={{ color: "var(--ds-text)", fontWeight: 500 }}>&ldquo;{query}&rdquo;</span>{!loading && ` — ${total} match${total === 1 ? "" : "es"}`}</> : "Enter a query to search across reservations, enquiries, orders, menu, staff and blog."}
      </div>

      <form onSubmit={submit} style={{ position: "relative", marginBottom: 24 }}>
        <SearchIcon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)" }} />
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search by name, email, phone, order #, menu item…"
          style={{
            width: "100%", background: "var(--ds-input-bg)",
            border: "1px solid var(--ds-border)", borderRadius: 8,
            padding: "10px 14px 10px 36px", fontSize: 13,
            color: "var(--ds-text)", outline: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </form>

      {query && query.length < 2 && (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12.5, color: "var(--ds-muted)" }}>
          Type at least 2 characters.
        </div>
      )}

      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12, color: "var(--ds-muted)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Searching…</div>
      )}

      {!loading && query && query.length >= 2 && total === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--ds-muted)" }}>
          No matches found for &ldquo;{query}&rdquo;.
        </div>
      )}

      {!loading && results.reservations.length > 0 && (
        <Section icon={CalendarDays} title="Reservations" count={results.reservations.length}>
          {results.reservations.map(r => (
            <Row
              key={r.id}
              to={`/reservations?q=${encodeURIComponent(r.name || r.email || r.phone || "")}`}
              left={r.name || "Guest"}
              middle={[r.email, r.phone].filter(Boolean).join(" · ") || r.occasion}
              right={<>
                <span>{r.date} {r.time?.slice(0, 5)}</span>
                {statusPill(r.status)}
              </>}
            />
          ))}
        </Section>
      )}

      {!loading && results.enquiries.length > 0 && (
        <Section icon={MessageSquare} title="Enquiries" count={results.enquiries.length}>
          {results.enquiries.map(e => (
            <Row
              key={e.id}
              to="/enquiries"
              left={e.name || "Guest"}
              middle={e.message?.slice(0, 90) || e.email}
              right={statusPill(e.status)}
            />
          ))}
        </Section>
      )}

      {!loading && results.orders.length > 0 && (
        <Section icon={ShoppingBag} title="Orders" count={results.orders.length}>
          {results.orders.map(o => (
            <Row
              key={o.id}
              to="/orders"
              left={`${o.order_number || o.id.slice(0, 8)} · ${o.guest_name || "—"}`}
              middle={o.table_number ? `Table ${o.table_number}` : "Takeaway"}
              right={statusPill(o.order_status)}
            />
          ))}
        </Section>
      )}

      {!loading && results.menu.length > 0 && (
        <Section icon={UtensilsCrossed} title="Menu Items" count={results.menu.length}>
          {results.menu.map(m => (
            <Row
              key={m.id}
              to="/menu"
              left={m.name}
              middle={[m.category, m.menu_type].filter(Boolean).join(" · ")}
              right={m.price != null ? `₦${Number(m.price).toLocaleString()}` : null}
            />
          ))}
        </Section>
      )}

      {!loading && results.staff.length > 0 && (
        <Section icon={Users} title="Staff" count={results.staff.length}>
          {results.staff.map(s => (
            <Row
              key={s.id}
              to={`/profile/${s.id}`}
              left={s.full_name || "—"}
              middle={s.email}
              right={<span style={{ textTransform: "capitalize" }}>{(s.role || "").replace(/_/g, " ")}</span>}
            />
          ))}
        </Section>
      )}

      {!loading && results.blog.length > 0 && (
        <Section icon={FileEdit} title="Blog Posts" count={results.blog.length}>
          {results.blog.map(b => (
            <Row
              key={b.id}
              to={`/blog/${b.id}`}
              left={b.title || "Untitled"}
              middle={b.slug}
              right={statusPill(b.status)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

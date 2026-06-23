import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const StaffContext = createContext(null);

const SUPER_ADMIN_PERMISSIONS = {
  dashboard: true, reservations: true, enquiries: true,
  menu: true, media: true, content: true, users: true, settings: true,
};

export function StaffProvider({ children }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setLoading(false); return; }

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else {
        // No profile yet — create a default one for this user
        const fallback = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.email?.split("@")[0] ?? "Admin",
          role: "staff",
          permissions: SUPER_ADMIN_PERMISSIONS, // permissive until admin assigns role
          active: true,
        };
        await supabase.from("staff_profiles").upsert(fallback, { onConflict: "id" });
        setProfile(fallback);
      }
      setLoading(false);
    }
    load();
  }, [session]);

  const isSuperAdmin = profile?.role === "super_admin";
  const isManager    = profile?.role === "manager" || isSuperAdmin;

  function hasPermission(key) {
    if (isSuperAdmin) return true;
    return profile?.permissions?.[key] === true;
  }

  return (
    <StaffContext.Provider value={{ profile, loading, isSuperAdmin, isManager, hasPermission, setProfile }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}

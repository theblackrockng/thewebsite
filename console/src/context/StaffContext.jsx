import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setNotSetUp(false); setLoading(false); return; }

    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (data && data.active !== false) {
        setProfile(data);
        setNotSetUp(false);
      } else {
        // No profile row, or the row exists but is deactivated. Never
        // create one from the client — invite.js creates it server-side.
        setProfile(null);
        setNotSetUp(true);
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [session]);

  const isSuperAdmin = profile?.role === "super_admin";
  const isManager    = profile?.role === "manager" || isSuperAdmin;

  function hasPermission(key) {
    if (isSuperAdmin) return true;
    return profile?.permissions?.[key] === true;
  }

  return (
    <StaffContext.Provider value={{ profile, loading, notSetUp, isSuperAdmin, isManager, hasPermission, setProfile }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}

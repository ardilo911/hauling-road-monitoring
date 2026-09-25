"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { Profile } from "./types";

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (mounted) {
        setProfile((prof as Profile) ?? null);
        setLoading(false);
      }
    }
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      load();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}

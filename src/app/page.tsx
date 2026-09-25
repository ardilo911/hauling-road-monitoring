"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/mitra" : "/login");
    });
  }, [router]);

  return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Memuat...</div>;
}

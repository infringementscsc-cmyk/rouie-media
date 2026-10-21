import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, user: null };
  }

  // Role is read from a server-managed table; never trust a client-provided role.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
    return { ok: false as const, status: 403, user: null };
  }

  return { ok: true as const, status: 200, user };
}

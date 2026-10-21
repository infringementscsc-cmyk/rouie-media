import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Admin access required" }, { status: auth.status });
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("id,title,category,visibility,status,provider_asset_id,created_at,published_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Could not load videos" }, { status: 500 });
  return NextResponse.json({ videos: data });
}

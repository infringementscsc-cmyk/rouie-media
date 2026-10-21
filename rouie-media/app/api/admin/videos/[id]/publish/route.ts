import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { publishSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Admin access required" }, { status: auth.status });

  const { id } = await context.params;
  const parsed = publishSchema.safeParse({ ...(await request.json().catch(() => ({}))), videoId: id });
  if (!parsed.success) return NextResponse.json({ error: "Invalid publish request" }, { status: 400 });

  const { data: video, error: fetchError } = await supabaseAdmin
    .from("videos").select("id,status,visibility").eq("id", id).single();
  if (fetchError || !video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if (video.status !== "ready") return NextResponse.json({ error: "Video is not ready for publishing" }, { status: 409 });

  const { error } = await supabaseAdmin.from("videos").update({
    visibility: parsed.data.visibility,
    published_at: parsed.data.visibility === "public" ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update video" }, { status: 500 });
  return NextResponse.json({ success: true });
}

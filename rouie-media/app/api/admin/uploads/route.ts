import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createUploadSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Sign in required" : "Admin access required" }, { status: auth.status });

  const parsed = createUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload details", details: parsed.error.flatten() }, { status: 400 });

  const { title, description, category, visibility, fileName, mimeType, fileSize } = parsed.data;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Video provider is not configured. Set server-side Cloudflare Stream credentials." }, { status: 503 });
  }

  // Create a pending DB record first. It is not visible publicly until the webhook marks it ready.
  const { data: video, error: dbError } = await supabaseAdmin.from("videos").insert({
    owner_id: auth.user.id,
    title, description, category, visibility,
    status: "uploading",
    original_file_name: fileName,
    original_mime_type: mimeType,
    original_file_size: fileSize
  }).select("id").single();

  if (dbError || !video) return NextResponse.json({ error: "Could not create video record" }, { status: 500 });

  const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds: 7200,
      expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      meta: { rouieVideoId: video.id, uploadedBy: auth.user.id, title },
      requireSignedURLs: visibility === "private"
    }),
    cache: "no-store"
  });

  const cf = await cfResponse.json().catch(() => null);
  const result = cf?.result;
  if (!cfResponse.ok || !result?.uid || !result?.uploadURL) {
    await supabaseAdmin.from("videos").update({ status: "failed" }).eq("id", video.id);
    return NextResponse.json({ error: "Video provider could not create an upload URL" }, { status: 502 });
  }

  const { error: updateError } = await supabaseAdmin.from("videos").update({
    provider_asset_id: result.uid
  }).eq("id", video.id);

  if (updateError) {
    return NextResponse.json({ error: "Upload was created but video record could not be updated. Contact an administrator." }, { status: 500 });
  }

  return NextResponse.json({
    videoId: video.id,
    uploadURL: result.uploadURL,
    providerAssetId: result.uid,
    expiresInSeconds: 3600
  }, { status: 201 });
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/*
  Configure the provider webhook to call this endpoint.
  Verify the signature using Cloudflare's documented webhook signing mechanism
  before production use. This starter deliberately refuses unsigned webhook
  calls when a secret is configured, but signature validation must be completed
  for your specific Stream webhook configuration before launch.
*/
export async function POST(request: Request) {
  const configuredSecret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (configuredSecret) {
    const supplied = request.headers.get("x-rouie-webhook-secret");
    if (!supplied || supplied !== configuredSecret) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const uid = payload?.uid || payload?.data?.uid;
  const readyToStream = payload?.readyToStream ?? payload?.data?.readyToStream;
  const statusState = payload?.status?.state || payload?.data?.status?.state;
  if (!uid) return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });

  const isReady = readyToStream === true || statusState === "ready";
  const isError = statusState === "error";

  const update: Record<string, unknown> = {};
  if (isReady) {
    update.status = "ready";
    update.duration_seconds = Math.round(payload?.duration || payload?.data?.duration || 0);
    update.thumbnail_url = payload?.thumbnail || payload?.data?.thumbnail || null;
    update.playback_id = payload?.playback?.id || payload?.data?.playback?.id || null;
    // Only mark processing completion here; publication is governed by visibility + status.
    update.published_at = new Date().toISOString();
  } else if (isError) {
    update.status = "failed";
  } else {
    return NextResponse.json({ received: true, ignored: true });
  }

  const { error } = await supabaseAdmin.from("videos").update(update).eq("provider_asset_id", uid);
  if (error) return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  return NextResponse.json({ received: true });
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function WatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createSupabaseServerClient();
 const {data:video}=await supabase.from("videos").select("id,title,description,category,provider_asset_id,visibility,status").eq("id",id).eq("visibility","public").eq("status","ready").maybeSingle();
 if(!video||!video.provider_asset_id)return notFound();
 const customer=process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
 return <main className="watch-shell"><Link href="/">← Rouie Media</Link><h1>{video.title}</h1>{customer?<div className="player-wrap"><iframe title={video.title} src={`https://customer-${customer}.cloudflarestream.com/${encodeURIComponent(video.provider_asset_id)}/iframe`} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>:<p>Cloudflare Stream playback is not configured.</p>}<p>{video.description}</p><small>{video.category}</small></main>;
}

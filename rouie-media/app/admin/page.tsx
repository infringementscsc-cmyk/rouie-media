import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import UploadForm from "./upload-form";
export const dynamic = "force-dynamic";
export default async function AdminPage(){
 const auth=await requireAdmin(); if(!auth.ok) redirect(auth.status===401?"/login":"/");
 const supabase=await createSupabaseServerClient();
 const {data:videos}=await supabase.from("videos").select("id,title,status,visibility,created_at").order("created_at",{ascending:false}).limit(30);
 return <main className="admin-shell"><div className="admin-header"><Link href="/">← Rouie Media</Link><form action={signOut}><button type="submit">Sign out</button></form></div><h1>Video dashboard</h1><p>Uploads and publishing are restricted to approved administrators.</p><UploadForm/><h2>Recent videos</h2><div className="admin-list">{videos?.map(v=><div className="admin-video" key={v.id}><strong>{v.title}</strong><span>{v.status} · {v.visibility}</span>{v.status==="ready" && v.visibility==="public" && <Link href={`/watch/${v.id}`}>Watch</Link>}</div>)}</div></main>;
}

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: videos } = await supabase
    .from("videos")
    .select("id,title,description,category,thumbnail_url,playback_id,duration_seconds,published_at,profiles:owner_id(username,display_name,avatar_url)")
    .eq("visibility", "public")
    .eq("status", "ready")
    .order("published_at", { ascending: false })
    .limit(24);

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">R</span><span>rouie<span className="brand-muted">media</span></span></Link>
        <p className="nav-label">DISCOVER</p>
        <Link className="nav-link selected" href="/">⌂ <span>Home</span></Link>
        <Link className="nav-link" href="/?category=shorts">▣ <span>Short clips</span></Link>
        <Link className="nav-link" href="/?sort=recent">◷ <span>Recently uploaded</span></Link>
        <div className="sidebar-note"><span className="spark">✦</span><strong>Your next big idea starts here.</strong><p>Stories worth your time.</p><Link href="/login">Sign in to get started ↗</Link></div>
        <small className="copyright">© 2026 Rouie Media</small>
      </aside>
      <section className="main">
        <header className="topbar">
          <form action="/" className="search"><span>⌕</span><input name="q" placeholder="Search videos, creators, topics..." aria-label="Search videos" /><button>Search</button></form>
          <div className="actions"><Link className="outline-button" href="/login">Sign in</Link><Link className="primary-button" href="/login">Get started</Link></div>
        </header>
        <div className="content">
          <div className="eyebrow"><i /> YOUR DAILY DOSE OF DISCOVERY</div>
          <h1>Find your <span>next favorite.</span></h1>
          <p className="subtitle">Fresh perspectives, bold ideas, and stories worth your time.</p>
          <div className="chips">
            {["All videos","Recently uploaded","Short clips","Long form","Design","Technology","Culture","Travel"].map((item) => <Link href={item==="All videos"?"/":`/?category=${encodeURIComponent(item)}`} key={item} className={`chip ${item==="All videos"?"chip-active":""}`}>{item}</Link>)}
          </div>
          <div className="section-head"><div><h2>Curated for you</h2><p>Discover the latest from the Rouie community.</p></div><span className="muted">{videos?.length ?? 0} videos</span></div>
          {videos && videos.length > 0 ? <div className="video-grid">
            {videos.map((video: any) => <Link className="video-card" href={`/watch/${video.id}`} key={video.id}>
              <div className="thumb">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" /> : <div className="thumb-placeholder">ROUIE <span>MEDIA</span></div>}<span className="duration">{video.duration_seconds ? `${Math.floor(video.duration_seconds/60)}:${String(video.duration_seconds%60).padStart(2,"0")}` : "VIDEO"}</span></div>
              <div className="video-copy"><div className="creator-avatar">{(video.profiles?.display_name || video.profiles?.username || "R").slice(0,2).toUpperCase()}</div><div><h3>{video.title}</h3><p>{video.profiles?.display_name || video.profiles?.username || "Rouie Creator"}</p><small>{video.category} · Rouie Media</small></div></div>
            </Link>)}
          </div> : <div className="empty"><div className="empty-mark">✦</div><h2>Your next favorite is on its way.</h2><p>There are no published videos yet. Once the Rouie team uploads and publishes videos, they will appear here.</p></div>}
          <footer><span>© 2026 Rouie Media</span><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/copyright">Copyright</Link></div><span className="system"><i/> Platform ready for setup</span></footer>
        </div>
      </section>
    </main>
  );
}

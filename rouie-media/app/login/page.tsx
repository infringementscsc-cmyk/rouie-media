import Link from "next/link";
import { signIn } from "./actions";
export default async function LoginPage({searchParams}: {searchParams:Promise<{error?:string}>}) {
 const params = await searchParams;
 return <main className="auth-shell"><section className="auth-card"><Link className="brand" href="/">Rouie Media</Link><h1>Admin sign in</h1><p>Only approved Rouie Media administrators may upload videos.</p>
 {params.error && <p role="alert">{params.error === "invalid" ? "Incorrect email or password." : "Please enter your credentials."}</p>}
 <form action={signIn}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="primary-button full" type="submit">Sign in</button></form><Link className="back-link" href="/">← Back home</Link></section></main>;
}

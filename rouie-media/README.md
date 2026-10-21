# Rouie Media — Next.js + Supabase + Cloudflare Stream

This repository is a backend-oriented starter for a video platform where **only Rouie Media admins can upload**. The public feed lists only videos with `visibility = public` and `status = ready`. Admins can choose `public` or `private`.

## Requirements
- Node.js 20.9+ (recommended current LTS)
- Supabase project
- Cloudflare account with Stream enabled
- Git and a deployment host such as Vercel

## Local setup
1. Extract the project and open the folder in a terminal.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values.
4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Create and verify your intended admin user, then edit and run `supabase/make-admin.sql` with that email.
6. Start the app:
   ```bash
   npm run dev
   ```
7. Visit `http://localhost:3000`.

The home page can read public-ready videos from Supabase. The login page is intentionally a safe placeholder and does not accept credentials yet; implement Supabase Auth UI before onboarding real users.

## Environment variables
- `NEXT_PUBLIC_SITE_URL`: local or production site URL.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service-role secret. Never prefix with `NEXT_PUBLIC_`.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `CLOUDFLARE_STREAM_API_TOKEN`: token with minimum required Stream permissions to create/manage Stream uploads and assets.
- `CLOUDFLARE_STREAM_CUSTOMER_CODE`: optional reference for building playback URLs in the watch page.
- `CLOUDFLARE_STREAM_WEBHOOK_SECRET`: long random secret used by this starter's webhook shared-secret check.

## Admin-only upload flow
1. Admin signs in (the actual sign-in UI still needs implementing).
2. `POST /api/admin/uploads` verifies the Supabase session using `auth.getUser()`.
3. Server checks the server-managed `profiles.role = admin` and `is_active = true`.
4. Server validates metadata, creates a pending video row, and requests a direct upload URL from Cloudflare Stream.
5. Browser uploads directly to the provider using the returned one-time URL. Do not proxy large video bodies through a Next.js route.
6. Configure a Cloudflare Stream webhook to call `/api/webhooks/cloudflare-stream`.
7. The webhook updates video processing status. Public home feed only shows `ready` + `public` videos.
8. Admin can change visibility via `PATCH /api/admin/videos/[id]/publish`.

### Important upload integration work still required
The upload endpoint is implemented, but a browser upload UI that calls it is not included yet. Add an admin-only Creator Studio client component that:
- obtains an upload URL from `/api/admin/uploads`;
- uploads the file directly to Cloudflare Stream using the provider's documented TUS/direct-upload flow;
- polls or listens for processing state;
- lets an admin publish a ready video as public or private.

The webhook currently uses a shared-secret header guard as a deployment placeholder. Configure the provider to send that header if supported by your setup, or implement Cloudflare's official webhook signature verification for the selected Stream webhook method before production. Do not expose the webhook without a verified signature/secret.

## Security notes
- RLS is enabled for application tables.
- Normal users cannot mutate `videos` directly because there are no regular-user mutation policies.
- Admin routes verify the logged-in user and query the server-managed role.
- Service-role key must stay server-side and should only be used in protected server modules.
- Add rate limiting to login, search, comments, and report endpoints before public launch.
- Add CSRF/origin checks where relevant, request size limits, upload quota enforcement, abuse monitoring, and admin audit logs.
- Add video deletion/retention workflows and verify provider asset deletion when a video is removed.
- Have privacy policy, terms, community guidelines, and copyright/takedown process reviewed for your launch jurisdictions.

## Database
See `supabase/schema.sql` for profiles, videos, subscriptions, likes, saved videos, watch history, comments, reports, moderation events, and RLS policies.

## Deployment
1. Push the repository to a private or public Git repository.
2. Import it into Vercel and set the same environment variables in Project Settings.
3. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin.
4. Run the SQL migrations in the production Supabase project.
5. Promote the admin account using `make-admin.sql`.
6. Configure Cloudflare Stream and the verified webhook endpoint.
7. Test sign-in, admin denial for non-admins, upload failure recovery, processing webhooks, public/private visibility, and RLS with both anonymous and authenticated users.
8. Do not launch publicly until actual Supabase Auth UI, upload client, webhook signature validation, and end-to-end tests are completed.

## Routes in this starter
- `/` — public video feed
- `/login` — placeholder login page (safe, disabled submission)
- `POST /api/admin/uploads` — admin-only creation of a pending video and direct upload URL
- `GET /api/admin/videos` — admin-only video listing
- `PATCH /api/admin/videos/[id]/publish` — admin-only visibility update for ready videos
- `POST /api/webhooks/cloudflare-stream` — webhook receiver placeholder with shared-secret guard


## V2 improvements (October 2026)
- Working Supabase email/password login for provisioned accounts; logout action.
- Protected `/admin` dashboard with browser direct-upload form (max 200 MB).
- Public `/watch/[id]` player page for ready/public videos.
- Admin APIs continue enforcing server-side role checks.

**Important staging-only limitations:** Cloudflare Stream webhook signature verification is NOT yet production grade; current webhook uses a custom header shared secret and must be replaced with official cryptographic signature verification before exposure. Private video playback requires signed tokens and is not implemented. Actual service configuration, provider integration testing, database migration and security review are required before real users/public launch. Disable public signup in Supabase Auth and provision admins manually. For public videos, confirm the provider asset `requireSignedURLs` is false; for private videos, true. Run `npm install`, `npm run build` and end-to-end test with your own Supabase/Cloudflare credentials.

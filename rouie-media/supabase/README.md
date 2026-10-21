# Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. Create a user through Supabase Auth (Dashboard or a properly implemented sign-up page).
4. Verify the account email.
5. Edit `make-admin.sql`, replace `YOUR_ADMIN_EMAIL@example.com`, and run it as the project owner to grant the initial admin role.
6. Copy Project URL, publishable/anon key, and service-role key into local environment variables as documented in the root README.
7. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never send it to the browser.

The SQL intentionally has no user-facing INSERT/UPDATE/DELETE policies on `videos`. Trusted server routes using the service role perform administrative mutations after checking the current session and the server-managed `profiles.role`.

Review and test all policies in a non-production project before launch. For production, consider adding audit logs for admin role changes and a separate tightly controlled role-management workflow.

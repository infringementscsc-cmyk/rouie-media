-- Run only after the intended admin account has signed up and verified their email.
-- Replace the email with your own account email before running.
-- This statement must be executed by a trusted Supabase project administrator.
update public.profiles p
set role = 'admin',
    is_active = true,
    updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');

-- Verify the result:
select p.id, u.email, p.role, p.is_active
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');

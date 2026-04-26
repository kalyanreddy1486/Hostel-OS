-- Run once in Supabase SQL Editor after your first user signs up.
-- Replace the email with the account you want as admin.

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com' limit 1);

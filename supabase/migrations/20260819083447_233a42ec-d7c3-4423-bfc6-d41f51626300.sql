insert into public.user_roles (user_id, role)
select u.id, 'owner'::app_role from auth.users u where u.email = 'vtwinauction@gmail.com'
on conflict (user_id, role) do nothing;
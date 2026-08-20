-- ZOMBIEREX · RLS Policy Test Suite
-- Run with: psql "$SUPABASE_DB_URL" -f supabase/tests/rls_tests.sql
--
-- Each test wraps in a savepoint, sets a synthetic auth.uid() via JWT claims,
-- executes the operation, and RAISES on unexpected outcomes.
-- Uses two synthetic users (USER_A, USER_B) plus anon (no claim).

\set ON_ERROR_STOP on
\set USER_A '11111111-1111-1111-1111-111111111111'
\set USER_B '22222222-2222-2222-2222-222222222222'

BEGIN;

-- Helper: impersonate a user for the current transaction
CREATE OR REPLACE FUNCTION pg_temp.as_user(_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
    true
  );
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_anon() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_fail(_sql text, _label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
    -- Distinct SQLSTATE so the handler below cannot swallow our own failure.
    RAISE EXCEPTION 'FAIL [%]: expected RLS/permission error but statement succeeded', _label
      USING ERRCODE = 'ZZ001';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'OK   [%]: blocked as expected (%).', _label, SQLERRM;
    WHEN raise_exception THEN
      -- A policy trigger raising is a legitimate block; our own sentinel is not.
      RAISE NOTICE 'OK   [%]: blocked as expected (%).', _label, SQLERRM;
  END;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_ok(_sql text, _label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE _sql;
  RAISE NOTICE 'OK   [%]: allowed as expected.', _label;
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'FAIL [%]: expected allow but got %', _label, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. user_roles: users cannot self-escalate
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t1;
SELECT pg_temp.as_user(:'USER_A'::uuid);
SELECT pg_temp.expect_fail(
  format($f$INSERT INTO public.user_roles (user_id, role) VALUES (%L, 'admin')$f$, :'USER_A'),
  'user_roles: self-escalate to admin'
);
SELECT pg_temp.expect_fail(
  format($f$INSERT INTO public.user_roles (user_id, role) VALUES (%L, 'owner')$f$, :'USER_A'),
  'user_roles: self-grant owner'
);
ROLLBACK TO SAVEPOINT t1;

-- ─────────────────────────────────────────────────────────────
-- 2. club_members: cannot self-assign owner/moderator on join
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t2;
SELECT pg_temp.as_user(:'USER_A'::uuid);
SELECT pg_temp.expect_fail(
  $f$INSERT INTO public.club_members (club_id, user_id, role)
     VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'owner')$f$,
  'club_members: self-assign owner on join'
);
ROLLBACK TO SAVEPOINT t2;

-- ─────────────────────────────────────────────────────────────
-- 3. subscriptions / premium_memberships: cannot self-activate
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t3;
SELECT pg_temp.as_user(:'USER_A'::uuid);
SELECT pg_temp.expect_fail(
  $f$INSERT INTO public.premium_memberships (user_id, status, tier)
     VALUES ('11111111-1111-1111-1111-111111111111', 'active', 'pro')$f$,
  'premium_memberships: self-grant active'
);
ROLLBACK TO SAVEPOINT t3;

-- ─────────────────────────────────────────────────────────────
-- 4. profiles: cannot update another user's profile
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t4;
SELECT pg_temp.as_user(:'USER_A'::uuid);
SELECT pg_temp.expect_ok(
  $f$SELECT 1 FROM public.profiles LIMIT 1$f$,
  'profiles: public read allowed'
);
-- Attempting to update user B's row from user A must affect 0 rows (silent RLS filter)
DO $$
DECLARE n int;
BEGIN
  UPDATE public.profiles SET bio = 'hijacked' WHERE id = '22222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL [profiles cross-user update]: rows=%', n; END IF;
  RAISE NOTICE 'OK   [profiles cross-user update]: 0 rows.';
END $$;
ROLLBACK TO SAVEPOINT t4;

-- ─────────────────────────────────────────────────────────────
-- 5. posts: cannot insert posts on behalf of another author
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t5;
SELECT pg_temp.as_user(:'USER_A'::uuid);
SELECT pg_temp.expect_fail(
  $f$INSERT INTO public.posts (author_id, kind, caption)
     VALUES ('22222222-2222-2222-2222-222222222222', 'photo', 'spoofed')$f$,
  'posts: insert with wrong author_id'
);
ROLLBACK TO SAVEPOINT t5;

-- ─────────────────────────────────────────────────────────────
-- 6. messages: non-members cannot read a conversation
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t6;
SELECT pg_temp.as_user(:'USER_A'::uuid);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.messages
    WHERE conversation_id = '00000000-0000-0000-0000-000000000000';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL [messages non-member]: rows=%', n; END IF;
  RAISE NOTICE 'OK   [messages non-member]: 0 rows.';
END $$;
ROLLBACK TO SAVEPOINT t6;

-- ─────────────────────────────────────────────────────────────
-- 7. audit_log: non-admin cannot read
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t7;
SELECT pg_temp.as_user(:'USER_A'::uuid);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.audit_log;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL [audit_log non-admin read]: rows=%', n; END IF;
  RAISE NOTICE 'OK   [audit_log non-admin read]: 0 rows.';
END $$;
ROLLBACK TO SAVEPOINT t7;

-- ─────────────────────────────────────────────────────────────
-- 8. anon: no writes to user tables
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t8;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_fail(
  $f$INSERT INTO public.posts (author_id, kind, caption)
     VALUES ('11111111-1111-1111-1111-111111111111', 'photo', 'anon')$f$,
  'anon: cannot insert post'
);
SELECT pg_temp.expect_fail(
  $f$INSERT INTO public.notifications (user_id, kind) VALUES
     ('11111111-1111-1111-1111-111111111111', 'spam')$f$,
  'anon: cannot insert notification'
);
ROLLBACK TO SAVEPOINT t8;

-- ─────────────────────────────────────────────────────────────
-- 9. payments / orders: user cannot read another user's records
-- ─────────────────────────────────────────────────────────────
SAVEPOINT t9;
SELECT pg_temp.as_user(:'USER_A'::uuid);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.payments WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL [payments cross-user]: rows=%', n; END IF;
  RAISE NOTICE 'OK   [payments cross-user]: 0 rows.';
END $$;
ROLLBACK TO SAVEPOINT t9;

ROLLBACK;

\echo ''
\echo '════════════════════════════════════════'
\echo ' RLS test suite complete. Review NOTICEs.'
\echo '════════════════════════════════════════'

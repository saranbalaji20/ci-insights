-- Stage 1: accounts and server-side login sessions.
-- This adds tables only; it does not change the existing single-user data yet.

create table if not exists users (
  id bigserial primary key,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(email))
);

create unique index if not exists users_email_unique on users (email);

-- Used by connect-pg-simple. Sessions are server-side; the browser receives
-- only an opaque, HttpOnly cookie containing the session id.
create table if not exists user_sessions (
  sid varchar not null primary key,
  sess json not null,
  expire timestamptz not null
);

create index if not exists user_sessions_expire_idx on user_sessions (expire);

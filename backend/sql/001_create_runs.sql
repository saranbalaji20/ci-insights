create table if not exists runs (
  id bigint primary key,              -- GitHub's run id, used directly as our PK
  status text not null,
  conclusion text,
  branch text,
  commit_sha text,
  created_at timestamptz not null,
  html_url text
);

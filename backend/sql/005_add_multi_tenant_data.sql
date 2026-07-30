-- Stage 2/3: per-user credentials and tenant ownership for existing data.
-- Existing runs are retained and assigned to an inaccessible legacy account so
-- no historical rows are deleted. New data always belongs to a real account.

alter table users add column if not exists github_owner text;
alter table users add column if not exists github_repo text;
alter table users add column if not exists github_token_encrypted text;
alter table users add column if not exists anthropic_api_key_encrypted text;

alter table runs add column if not exists user_id bigint;

do $$
declare legacy_user_id bigint;
begin
  if exists (select 1 from runs where user_id is null) then
    insert into users (email, password_hash)
    values ('legacy-import@invalid.local', 'not-a-login-account')
    on conflict (email) do update set email = excluded.email
    returning id into legacy_user_id;
    update runs set user_id = legacy_user_id where user_id is null;
  end if;
end $$;

alter table test_results add column if not exists user_id bigint;
update test_results tr set user_id = r.user_id from runs r
where tr.run_id = r.id and tr.user_id is null;

alter table test_results drop constraint if exists test_results_run_id_fkey;
alter table runs drop constraint if exists runs_pkey;
alter table runs alter column user_id set not null;
alter table test_results alter column user_id set not null;
alter table runs add primary key (user_id, id);
alter table runs add constraint runs_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table test_results add constraint test_results_run_fkey foreign key (user_id, run_id) references runs(user_id, id) on delete cascade;
alter table test_results add constraint test_results_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

create index if not exists idx_runs_user_created_at on runs (user_id, created_at desc);
create index if not exists idx_test_results_user_run on test_results (user_id, run_id);

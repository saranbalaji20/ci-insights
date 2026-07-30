create table if not exists test_results (
  id bigserial primary key,
  run_id bigint references runs(id) on delete cascade,
  test_name text not null,
  passed boolean not null
);

create index if not exists idx_test_results_run_id on test_results(run_id);
create index if not exists idx_test_results_test_name on test_results(test_name);

create or replace function public.increment_visit()
returns table(today_count bigint, total_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_today_count bigint;
  v_total_count bigint;
begin
  insert into public.visitor_totals (id, total_count)
  values (1, 1)
  on conflict (id)
  do update set total_count = public.visitor_totals.total_count + 1
  returning public.visitor_totals.total_count into v_total_count;

  insert into public.daily_visits (visit_date, count)
  values (v_today, 1)
  on conflict (visit_date)
  do update set count = public.daily_visits.count + 1
  returning public.daily_visits.count into v_today_count;

  today_count := v_today_count;
  total_count := v_total_count;
  return next;
end;
$$;

revoke all on function public.increment_visit() from public;
grant execute on function public.increment_visit() to anon, authenticated;

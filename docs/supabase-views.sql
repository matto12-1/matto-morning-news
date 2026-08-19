-- 조회수 카운터 — 마또의 아침신문
-- 실행 대상: Supabase 프로젝트 toktok (wyoojgbtutwveouhexiw)
-- 여러 번 실행해도 안전하다.
--
-- 이 프로젝트에는 이미 교사 자료 플랫폼이 돌고 있다. 그것과 얽히지 않게:
--   * 데이터는 전용 스키마 morningnews 에 둔다. PostgREST가 노출하는 스키마는
--     public, graphql_public 뿐이므로 이 스키마는 API로 아예 보이지 않는다.
--   * 바깥에 나가는 것은 public 함수 두 개뿐이고, 이름에 mn_ 접두어를 붙여
--     기존 함수(increment_sos_view, bump_favorite_count 등)와 섞이지 않게 한다.
--   * 기존 테이블·함수·정책·API 설정은 하나도 건드리지 않는다.
--     (PostgREST 설정을 바꾸면 재시작이 걸려 교사 플랫폼이 잠깐 끊긴다. 그래서 안 바꾼다.)

create schema if not exists morningnews;

-- 스키마 자체를 외부 역할에게서 막는다. 테이블은 함수를 통해서만 닿는다.
revoke all on schema morningnews from public;
revoke all on schema morningnews from anon, authenticated;

create table if not exists morningnews.site_views (
  day   date   primary key,
  views bigint not null default 0
);

alter table morningnews.site_views enable row level security;
-- 정책 없음. 어차피 스키마가 막혀 있고, 이건 이중 잠금이다.

-- '오늘'은 한국 시간 기준. UTC로 두면 밤 9시에 날짜가 넘어가 조회수가 리셋된다.
create or replace function morningnews.kst_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Asia/Seoul')::date $$;

-- 조회수를 1 올리고 {오늘, 누적}을 돌려준다. 탭마다 한 번씩 호출.
create or replace function public.mn_bump_view()
returns table (today bigint, total bigint)
language plpgsql
security definer
set search_path = morningnews, public
as $$
begin
  insert into morningnews.site_views (day, views)
  values (morningnews.kst_today(), 1)
  on conflict (day) do update set views = morningnews.site_views.views + 1;

  return query
  select coalesce((select v.views from morningnews.site_views v
                    where v.day = morningnews.kst_today()), 0::bigint),
         coalesce((select sum(v.views)::bigint from morningnews.site_views v), 0::bigint);
end
$$;

-- 더하지 않고 읽기만. 이미 센 탭이 새로고침했을 때 쓴다.
create or replace function public.mn_get_views()
returns table (today bigint, total bigint)
language sql
security definer
set search_path = morningnews, public
as $$
  select coalesce((select v.views from morningnews.site_views v
                    where v.day = morningnews.kst_today()), 0::bigint),
         coalesce((select sum(v.views)::bigint from morningnews.site_views v), 0::bigint)
$$;

-- 실행 권한은 anon(브라우저)에게만 명시적으로 준다.
revoke all on function public.mn_bump_view() from public;
revoke all on function public.mn_get_views() from public;
grant execute on function public.mn_bump_view() to anon;
grant execute on function public.mn_get_views() to anon;

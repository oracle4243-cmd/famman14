insert into public.profiles (musician_name, greeting)
select 'Untitled Musician', '관리자 화면에서 프로필, 링크, 노래를 등록해 주세요.'
where not exists (select 1 from public.profiles);

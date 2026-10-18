-- Reverts demo_seed.sql for user 7675191a-4127-4f00-8abf-f8c1edbb7b9b (original values captured 2026-10-18).

begin;

-- 4) Remove the teaser list
delete from list_items where list_id in (
  select id from lists where user_id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b' and title = 'Top 10 of All Time'
);
delete from lists where user_id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b' and title = 'Top 10 of All Time';

-- 3) Original list titles
update lists set title = 'A'                            where id = '74e6b82e-30ee-4dbd-b3fa-0f9594dedee4';
update lists set title = 'B'                            where id = '80e0c0db-5154-4b3a-92ad-f540403d5b9d';
update lists set title = 'C'                            where id = '7b176ce5-af77-472c-a723-24353c45fa21';
update lists set title = 'deneme2'                      where id = '334d2d87-42c0-4bcf-8c02-72b34db0d014';
update lists set title = 'Uzun bir başlık yazayım bura' where id = 'e844663e-e565-40a7-89f4-0f2584d55b17';

-- 2) Original episode counters
update user_anime_list set current_episode = 91600 where id = '18e5e7bc-0212-41fd-b7bc-00793469c885';
update user_anime_list set current_episode = 10923 where id = '99f89190-14fc-48a8-b27e-3c1711f729dc';
update user_anime_list set current_episode = 56843 where id = '6a2c948e-5820-4ea0-86dc-9417d4ff970d';

-- 1) Original updated_at (Watching order)
update user_anime_list set updated_at = '2026-09-08 09:09:33.619+00' where id = '329bb096-b0dd-417f-8a91-ee177324d3e2';
update user_anime_list set updated_at = '2026-09-08 09:09:40.53+00'  where id = 'f2ec611a-9fa5-4d90-90cf-e13fc8a050f4';
update user_anime_list set updated_at = '2026-03-11 13:20:19.91+00'  where id = '473b1d8c-f463-4e15-ba1d-01021058d78c';
update user_anime_list set updated_at = '2026-08-24 22:32:08.585+00' where id = '682141ce-440f-4203-b707-184233e475fe';
-- Episode counters changed during recording (S02 taps +2 on Frieren S2) are restored here too:
update user_anime_list set current_episode = 6 where id = '329bb096-b0dd-417f-8a91-ee177324d3e2';

-- 5) OPTIONAL identity revert (only if step 5 was applied)
-- update profiles set username = 'Lelouch L.',
--   avatar_url = 'https://s4.anilist.co/file/anilistcdn/character/large/b210-mw01NrQfRjzT.png'
--   where id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b';

commit;

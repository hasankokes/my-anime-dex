-- MyAnimeDex teaser: tidy the demo account for camera.
-- Demo user: 7675191a-4127-4f00-8abf-f8c1edbb7b9b (existing account, Level 8 / Platinum, 68 titles).
-- Touches ONLY this user's rows. No other users, no watch_activity, no XP writes.
-- Fully reversed by demo_cleanup.sql.

begin;

-- 1) Watching tab: put the four best-looking in-progress shows on top
--    (Watching sorts by updated_at desc).
update user_anime_list set updated_at = now()                        where id = '329bb096-b0dd-417f-8a91-ee177324d3e2'; -- Frieren S2 6/10
update user_anime_list set updated_at = now() - interval '1 minute'  where id = 'f2ec611a-9fa5-4d90-90cf-e13fc8a050f4'; -- JJK Culling Game 3/12
update user_anime_list set updated_at = now() - interval '2 minutes' where id = '473b1d8c-f463-4e15-ba1d-01021058d78c'; -- Oshi no Ko S3 2/11
update user_anime_list set updated_at = now() - interval '3 minutes' where id = '682141ce-440f-4203-b707-184233e475fe'; -- Steins;Gate 13/24

-- 2) Fix junk episode counters left over from testing (would read "Ep 91600").
update user_anime_list set current_episode = 4  where id = '18e5e7bc-0212-41fd-b7bc-00793469c885'; -- was 91600
update user_anime_list set current_episode = 48 where id = '99f89190-14fc-48a8-b27e-3c1711f729dc'; -- was 10923
update user_anime_list set current_episode = 5  where id = '6a2c948e-5820-4ea0-86dc-9417d4ff970d'; -- was 56843

-- 3) Rename placeholder lists so My Lists reads well on camera.
update lists set title = 'Mecha Night'         where id = '74e6b82e-30ee-4dbd-b3fa-0f9594dedee4'; -- was 'A'
update lists set title = 'Movie Marathon'      where id = '80e0c0db-5154-4b3a-92ad-f540403d5b9d'; -- was 'B'
update lists set title = 'Hidden Gems'         where id = '7b176ce5-af77-472c-a723-24353c45fa21'; -- was 'C'
update lists set title = 'Rewatch Queue'       where id = '334d2d87-42c0-4bcf-8c02-72b34db0d014'; -- was 'deneme2'
update lists set title = 'Fall 2026 Watchlist' where id = 'e844663e-e565-40a7-89f4-0f2584d55b17'; -- was 'Uzun bir başlık yazayım bura'

-- 4) New hero list for shot S04: "Top 10 of All Time" (newest list → top of My Lists).
--    Posters/scores copied from the user's own library rows.
with new_list as (
  insert into lists (user_id, title, description, is_public)
  values ('7675191a-4127-4f00-8abf-f8c1edbb7b9b', 'Top 10 of All Time',
          'The ten that shaped me.', true)
  returning id
), picks(pos, anime_id, user_score, user_comment) as (
  values
    (0, '9253',  10, 'Time travel done right.'),
    (1, '820',   10, 'A space opera masterpiece.'),
    (2, '9969',  10, 'Laughed, then cried.'),
    (3, '38524', 10, 'That basement reveal.'),
    (4, '52991',  9, 'Quiet, beautiful, perfect.'),
    (5, '19',     9, 'Best villain ever written.'),
    (6, '35180',  9, 'Warm and heartbreaking.'),
    (7, '28851',  9, 'Hits harder every rewatch.'),
    (8, '2904',   9, 'All hail the ending.'),
    (9, '32281',  9, 'Pure visual magic.')
)
insert into list_items (list_id, anime_id, anime_title, anime_image, score, user_score, user_comment, position)
select nl.id, p.anime_id, u.anime_title, u.anime_image, u.score, p.user_score, p.user_comment, p.pos
from new_list nl
cross join picks p
join user_anime_list u
  on u.user_id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b' and u.anime_id = p.anime_id;

-- 5) OPTIONAL (only if approved separately): neutral identity for camera.
--    Current username 'Lelouch L.' and avatar are a third-party character → shows in Profile + Leaderboard.
-- update profiles set username = 'DexWatcher', avatar_url = null
--   where id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b';

commit;

-- Sanity check
select l.title, count(i.id) items
from lists l left join list_items i on i.list_id = l.id
where l.user_id = '7675191a-4127-4f00-8abf-f8c1edbb7b9b'
group by l.title, l.created_at order by l.created_at desc;

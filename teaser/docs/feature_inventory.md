# MyAnimeDex — Feature Inventory & Teaser Picks

Source of truth: the app code on `feat/teaser` (Expo SDK 53, Expo Router). Anime data comes from
AniList GraphQL (`services/anilist/*`, exposed through the Jikan-shaped facade `lib/jikan.ts`).
User data lives in Supabase.

## 1. Every user-facing feature

| # | Feature | Screen / route | What's on screen | Data |
|---|---------|----------------|------------------|------|
| 1 | Home header | `app/(tabs)/index.tsx` | logo + "ANIME**DEX**" wordmark, search, light/dark toggle, avatar | — |
| 2 | Search | Home (search button) | rounded search bar, results grid | AniList |
| 3 | Trending carousel | Home | 140×220 poster cards, gradient, ★ score; toggle Trending → Season → Upcoming | AniList |
| 4 | Category chips + poster grid | Home | pill chips (selected = solid yellow), infinite 2:3 poster grid with ★ badge | AniList |
| 5 | Community Pulse | Home → `components/Home/AnimePulse.tsx` | frosted cards "**user** started watching **title**", live slide-in | `watch_activity` (realtime) |
| 6 | Recommended for You | Home card → `app/recommendations.tsx` | marquee "You love {genre}!", genre profile (top-3 numbered badges), cards with "Matches your love of …" | `user_anime_list` + AniList |
| 7 | Dice Roll | Home card → `components/Home/DiceRollModal.tsx` | blurred overlay, glowing yellow dice spinning + pulsing, "ROLLING DICE…", result card pops with overshoot (score, genres, synopsis) | AniList, skips own list |
| 8 | Anime detail | `app/anime/[id].tsx` | hero poster fading to bg, frosted back/heart, score box (green ≥8 / amber), tags, episodes "x / total", trailer box, translated synopsis, Rank/Popularity/Members grid | AniList + `anime_translations` |
| 9 | Add to List status picker | detail | yellow "+ Add to List" → Watching / Completed / Plan to Watch / Remove | `user_anime_list`, writes `watch_activity` |
| 10 | Save to Custom List | detail modal | own + shared lists, inline create | `lists`, `list_items` |
| 11 | Reviews | detail → `components/ReviewSection.tsx` | star ratings, avatars, write-review modal with 40px stars | `reviews` |
| 12 | Trailer player | detail modal | YouTube trailer in modal (interstitial ad for free users) | AniList trailer |
| 13 | Airing calendar | `app/(tabs)/calendar.tsx` | day-of-week chips, cards with JST time, "EP: n", live countdown badge / "Airing now", Favorites-only heart filter | AniList schedule |
| 14 | Favorites | `app/(tabs)/favorites.tsx` | poster grid, status filter chips, search, sort modal (Newest/Oldest/A-Z/Z-A/Score) | `user_anime_list` |
| 15 | Watching tracker | `app/(tabs)/watching.tsx` | card per show: "Ep x / y", −/+ buttons, %, yellow progress bar; auto-complete at last ep | `user_anime_list` |
| 16 | Profile, XP & rank | `app/(tabs)/profile.tsx` | avatar ring in rank colour, rank name + trophy, "Level N • cur/total XP" bar, stats row (Watching / Watched / Favorites), menus | `profiles` (XP computed server-side) |
| 17 | Avatar picker | profile | library / camera / AniList character portraits | AniList |
| 18 | Leaderboard | `app/leaderboard.tsx` | Top 20, rank-coloured rings, "RANK • Level N", XP | `profiles` |
| 19 | Custom ranked lists | `app/lists/*` | My Lists / Shared with me tabs, Public/Private badges, ranked items with drag-to-reorder (item scales up), ★ + yellow "My Score" badge, quoted comment, collaborator avatar row, share as text | `lists`, `list_items` |
| 20 | Collaborators | `components/CollaboratorModal.tsx` | search users, add/remove | `list_collaborators` |
| 21 | My Reviews | `app/profile/reviews.tsx` | own reviews with stars + poster | `reviews` |
| 22 | Public user profile | `app/users/[id].tsx` | rank, level bar, stats, public lists | `profiles`, `lists` |
| 23 | Anime Arena | Home FAB → `app/arena/setup|game|result` | 13 coloured category tiles, bracket 8/16/32, VS duel cards, round progress, crown winner + share | `arena_pools`, `arena_results` |
| 24 | Light / dark themes | Home toggle, Settings | full theme swap (dark default) | AsyncStorage |
| 25 | 10 languages | `app/settings/language.tsx` | en, tr, ja, ru, de, ar, es, pt, id, hi + machine-translated synopses | `lib/i18n.ts` |
| 26 | Walkthrough | `components/WalkthroughOverlay.tsx` | spotlight cut-out tooltips on Home/Calendar/Watching/Lists/Favorites | AsyncStorage |
| 27 | Guide / Help | `app/settings/guide.tsx`, `help.tsx` | icon legend, how-tos, restart walkthrough | — |
| 28 | Premium | `app/subscription.tsx` | paywall (removes ads, purple avatar ring). **Nothing is feature-locked** | RevenueCat |
| 29 | Login | `app/login.tsx` | Apple / Google / email, tagline "Track Discover Watch" | Supabase Auth |
| 30 | Rate-app sheet | `components/RateAppSheet.tsx` | spring bottom sheet every 5th add | — |

## 2. Ranking

Scores 1–5. **Wow** = how good it looks moving on screen as *our* UI (not artwork).
**Why** = how strongly it answers "why would I download this". **Art risk** = how much
third-party artwork dominates the frame (High = can't be a hero shot).

| Feature | Wow | Why | Art risk | Use |
|---------|-----|-----|----------|-----|
| Dice Roll | 5 | 4 | Low (dice is our UI; poster small in result card) | **Hero 5 (closer)** |
| Profile XP / rank / level bar | 4 | 4 | None | **Hero 4** |
| Ranked custom lists (drag reorder, My Score, collaborators) | 4 | 5 | Low (thumbnails) | **Hero 3** |
| Airing calendar countdown | 3 | 5 | Low | **Hero 2** |
| Watching tracker (+ → bar fills) | 3 | 5 | Low | **Hero 1** |
| Home (wordmark, carousel, yellow chips) | 4 | 4 | Medium (posters in carousel) | **Hook** (UI chrome framed, posters in context) |
| Favorites grid | 3 | 4 | Medium | **Payoff** (pull-back, grid is the "dex") |
| Anime detail + Add to List | 3 | 5 | **High** (full-width hero poster at top) | Montage, cropped to lower half (score box + Add-to-List sheet) |
| Community Pulse | 3 | 3 | Low | Montage |
| Recommendations / genre profile | 3 | 4 | Low | Montage |
| Leaderboard | 3 | 3 | Low | Montage |
| Reviews / stars | 2 | 3 | Low | Montage |
| Arena | 5 | 3 | **High** (full-height character art, character avatar banner) | Montage only, category-tile grid only |
| Light/dark toggle | 3 | 2 | Medium | Montage (theme flip on beat) |
| 10 languages | 2 | 3 | None | Montage |
| Search, Walkthrough, Guide, Login, Premium, Rate sheet, Avatar picker, Public profile | 1–2 | 1–2 | — | Not shown |

## 3. Why these picks

- **The pitch is "every anime you've watched, loved and want next, in one pocket dex".**
  The heroes walk that sentence: *watched* (Watching tracker), *next* (Calendar),
  *loved* (Ranked lists), *you* (Profile XP), *discover* (Dice). Payoff = the whole dex.
- **Rising energy:** tracker (small, satisfying tap) → calendar (ticking timers) →
  lists (physical drag, things moving) → profile (bar fills, rank ring glows) → dice
  (spin, glow, pop). The dice is the app's most animated piece of its own UI, so it closes.
- **Arena is the flashiest screen but it's mostly character art**, which the brief bans as a
  centerpiece and is a store-review risk. It appears only as the colourful category-tile grid
  in the montage.
- **Anime detail is the most useful screen but its top half is a full-width poster**, so
  it's shown cropped to the lower half (score box, tags, yellow Add to List, status sheet).
- **No fake features:** Premium promises like "Unlimited Tracking" / "Exclusive Badges" are
  not enforced in code, so the teaser does not show the paywall or claim them.
- **Social is real but thin for a fresh demo account:** Pulse and Leaderboard are shot with
  live production data (no fake users are seeded), so they're montage-only.

## 4. Artwork flags (keep posters small and in context)

| Shot | Risk | Mitigation |
|------|------|-----------|
| Hook (Home carousel) | Medium | phone at ≤70% frame height, wordmark + chips dominate; caption covers no UI |
| Detail montage frame | High | crop to lower half; no hero poster visible |
| Arena montage frame | High | category tiles only; never setup banner, game or result |
| Payoff (Favorites grid) | Medium | camera pulls back so each poster is small; tab bar + chips visible |
| Dice result card | Low–Med | result card is ~40% poster; card frame, score, genres stay visible |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MyAnimeDex: an Expo (SDK 53, React Native 0.79, new architecture) + Expo Router app for tracking anime, backed by Supabase. Targets iOS, Android and web. Bundle id `com.myanimedex.app`.

## Commands

```bash
npm run dev          # expo start (telemetry off)
npm run ios          # expo run:ios (native build, needs ios/)
npm run android      # expo run:android
npm run lint         # expo lint
npm run build:web    # expo export --platform web
npx tsc --noEmit     # type-check
eas build --profile development|preview|production --platform ios|android
```

There is no test suite. Root-level `test-*.js` / `test_*.js` and `scripts/test_*.js` are ad-hoc Node scripts run directly (`node scripts/foo.js`), not a test runner.

Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env`). RevenueCat keys are in `constants/Config.ts`.

When bumping a release, update `version` in both `package.json` and `app.json`, plus `ios.buildNumber` and `android.versionCode` in `app.json`.

## GitHub & Supabase access

Claude performs GitHub and Supabase operations directly in this repo.

- **GitHub:** repo `hasankokes/my-anime-dex`, default branch `main`. Use the `gh` CLI for PRs/issues.
- **Supabase:** project ref `aliirarczgxmjrswvysz`.
  - Inspection and SQL (list tables, run queries, logs, advisors, generate TS types) go through the Supabase MCP server configured in `.mcp.json` (hosted, OAuth, scoped to this project).
  - Schema changes: write a migration in `supabase/migrations/` (`supabase migration new <name>`) and apply it, so the repo stays the source of truth. Don't apply ad-hoc DDL that isn't also saved as a migration file.
  - The Supabase CLI (`supabase`, linked via `supabase/config.toml`) is the fallback: `supabase db push`, `supabase gen types typescript --linked`.
  - ⚠️ As of 2026-10-16 the local `supabase/migrations/` files and the remote migration history are out of sync (local files were never recorded remotely; several remote migrations have no local file). **Do not run `supabase db push`** until the history is reconciled (`supabase migration list` should show matching local/remote columns) — it would try to re-apply every local migration.
  - Per the project rule below, describe the change and get confirmation before any write to the Supabase project (DDL, RLS, data, functions).

## Project rules (from `.agent/rules/paket.md`)

- Always install current Expo-compatible package versions (`npx expo install <pkg>`).
- **Ask before changing anything in Supabase** (schema, RLS, functions, data).
- Respect theme colors: new components must use `useTheme().colors` / `isDark` from `context/ThemeContext.tsx` so they work in light and dark mode (primary is `#FACC15`, default theme is dark).
- Every new module/feature must add strings for **all** app languages in `lib/i18n.ts`: `en, tr, ja, ru, de, ar, es, pt, id, hi`.

## Architecture

**Routing** (`app/`, Expo Router file-based). `app/_layout.tsx` wraps everything in providers in this order: Theme → Network → Language → Auth → RevenueCat → Walkthrough, then an `AuthGuard` that redirects to `/login` when there is no session (only `login` and `reset-password` are public). Main UI lives in `app/(tabs)/` (home, calendar, favorites, watching, profile). Other stacks: `anime/[id]`, `lists/`, `arena/` (bracket-voting game), `users/[id]`, `settings/`, `subscription` (modal paywall).

**Anime data — AniList only, behind a Jikan-shaped facade.** The Jikan (MyAnimeList) REST API shut down in September 2026; AniList GraphQL is the only anime data source. Never add calls to `api.jikan.moe` — remaining ones are dead code: `services/jikanApi.ts`, the "ultimate fallback" in `services/anilist/api.ts` (`getAnimeDetails`), `test-jikan.js`, `scripts/seed_arena_pools.js`, `scripts/generate-anime-pages.js`. Screens still import `{ Anime, jikanApi }` from `lib/jikan.ts`, which now delegates to `services/anilist/api.ts`; `services/anilist/normalizer.ts` converts AniList media into the Jikan-shaped `Anime` type (incl. `mal_id`, Jikan genre-ID → AniList genre-name mapping). Keep that contract when adding fields. `services/anilist/client.ts#fetchGraphQL` is the single HTTP entry point: global request throttling (350 ms spacing), 429 retry/back-off, and an in-memory cache via `cacheKey`. Avoid firing many parallel AniList queries — rate-limit loops have been a recurring bug. `services/anilistApi.ts` is a separate airing-schedule fetcher used by the calendar tab. The `jikanApi` / `mal_id` names are historical; IDs passed around are resolved against AniList (`idMal` first, then AniList `id`).

**Supabase** (`lib/supabase.ts`, AsyncStorage-persisted auth). Main tables: `profiles`, `user_anime_list` (watching/favorites/status), `lists` + `list_items` + `list_collaborators` (shared lists), `reviews`, `watch_activity` (feeds Home "Anime Pulse"), `arena_pools` / `arena_results` (Arena saves only the final quiz winner; per-match stats were intentionally dropped — the legacy `arena_stats` table is unused), `anime_translations` (cached synopsis translations used by `lib/translation.ts`). Migrations are in `supabase/migrations/` plus loose `supabase/*_migration.sql` files. Auth: email, Google, Apple (`lib/appleAuth.native.ts`).

**Platform-split modules.** Native-only features use `.native.ts` / `.web.ts` / base `.ts` variants (e.g. `hooks/useInterstitialAd.*`, `lib/tracking.*`, `lib/appleAuth.*`). Ads (`react-native-google-mobile-ads`) are `require`d lazily inside the native hook; the ATT prompt is deferred until the first ad. Premium status comes from `RevenueCatProvider` and suppresses ads.

**Analytics (PostHog).** `lib/analytics.ts` holds the client, the typed `AnalyticsEvent` catalog and helpers; `context/AnalyticsProvider.tsx` (inside RevenueCat in `_layout.tsx`) tracks screen views by route pattern, foreground `session_summary`, identity (guest anon id → `identify(user.id)` on sign-in, `reset()` on sign-out) and global properties. Add new events to the `AnalyticsEvent` union and call `analytics.track(...)`; never send emails, names or free text. Key: `EXPO_PUBLIC_POSTHOG_KEY` (empty = off; dev only logs unless `EXPO_PUBLIC_POSTHOG_DEV=1`). Event catalog and dashboard recipes: `docs/analytics.md`.

**i18n.** `lib/i18n.ts` (i18n-js) is one large translations object; `LanguageContext` exposes the current locale and `t`. Root-level `update_*_i18n.js` and `scripts/update_*i18n*.js` are one-off codemods that regex-inject keys into `lib/i18n.ts` — prefer editing the file directly.

**Other directories.** `web/` is a separate static marketing site (landing pages, privacy/delete-account pages, SEO anime pages generated by `scripts/generate-anime-pages.js`); it is not part of the Expo bundle and is excluded from EAS builds via `.easignore`. `scripts/seed_arena_*.js` populate arena pools in Supabase.

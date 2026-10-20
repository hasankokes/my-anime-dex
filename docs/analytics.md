# Analytics (PostHog)

Code: `lib/analytics.ts` (client, event catalog, helpers) and `context/AnalyticsProvider.tsx`
(screen views, sessions, identity, global properties). Screens call `analytics.track('event', {...})`.

## Setup

1. Create a project on PostHog Cloud **EU** (https://eu.posthog.com), copy the *Project API key* (`phc_...`).
2. Put it in `.env` as `EXPO_PUBLIC_POSTHOG_KEY` (`.env` is uploaded to EAS because `.easignore` does not exclude it).
3. New native build required (`expo-application`, `expo-device`, `expo-file-system` were added) — an OTA update is not enough.
4. Dev builds only log events to the console. Set `EXPO_PUBLIC_POSTHOG_DEV=1` to send them from dev.
5. Update the App Store privacy labels ("Product Interaction", "Device ID", linked to user) and the Play Data safety form, and mention PostHog in the privacy policy (`web/`). No ATT prompt is needed: this is first-party analytics, not cross-app tracking.

## How a user is followed

- First launch creates an anonymous id. Guests are fully tracked.
- On sign-in, `identify(supabase user id)` merges the guest history into the user, so a funnel can start before sign-up.
- Sign-out calls `reset()` (new anonymous id).
- No emails, names or search text are sent. Search is reduced to `query_length`.

Properties on every event: `auth_status` (guest/authenticated), `is_premium`, `app_language`, `app_theme`,
`app_open_number` (how many times this device opened the app), `days_since_first_open`, `first_open_date`, `$screen_name`
(current screen), plus the SDK's device/app version fields.

## Event catalog

| Area | Events |
|---|---|
| Lifecycle (SDK) | `Application Installed`, `Application Opened` (`from_background`), `Application Backgrounded` (has `$screen_name` = exit screen), `$screen` |
| Journey | `first_open`, `session_summary` (`duration_s`, `screens_viewed`, `unique_screens`, `anime_viewed`, `actions`, `exit_screen`, `bounced`), `$autocapture` taps |
| Walkthrough | `walkthrough_started`, `walkthrough_step_viewed` (`step`), `walkthrough_completed`, `walkthrough_skipped` (`step` where they skipped) |
| Auth funnel | `auth_wall_hit` (`reason`), `login_viewed`, `login_method_selected` (`method`), `signup_submitted`, `login_failed` (`method`, `error`), `login_dismissed`, `signup_completed` / `login_completed` (`method`, `trigger_reason`), `logout`, `password_reset_requested` |
| Anime | `anime_viewed` (`anime_id`, `genres`, `from_screen`), `anime_load_failed`, `anime_favorited`, `anime_unfavorited`, `anime_list_status_changed` (`from`, `to`), `anime_episode_progress`, `anime_trailer_played`, `review_submitted`, `review_deleted` |
| Discovery | `search_performed` (`source`), `search_result_clicked` (`position`), `home_section_clicked` (`section`: trending/fall/upcoming/grid/category_filter/for_you/dice/pulse/arena_fab), `dice_rolled`, `calendar_day_changed` |
| Lists | `list_created`, `list_deleted`, `list_item_added` (`source`), `list_item_removed`, `list_shared`, `list_collaborator_added` |
| Arena | `arena_setup_started`, `arena_game_started`, `arena_game_completed`, `arena_game_abandoned` (`picks` / `total_picks`), `arena_result_shared` |
| Profile | `profile_edited` (`field`), `progress_reset`, `account_deleted` |
| Settings | `language_changed`, `theme_changed` |
| Money | `paywall_viewed` (`source`), `paywall_dismissed` (`seconds_open`), `purchase_started` / `_completed` / `_cancelled` / `_failed`, `restore_completed` / `_failed`, `ad_shown` / `ad_failed` (`trigger`), `rate_prompt_shown` / `_accepted` / `_later` |

## Dashboard to build in PostHog ("New users")

1. **Activation funnel** (Funnel, 7-day window, filter `days_since_first_open = 0` for day-1 cohort):
   `first_open` → `anime_viewed` → `auth_wall_hit` → `login_viewed` → `signup_completed` → `anime_list_status_changed` (or `anime_favorited`).
   Shows how far new users get and at which step they drop.
2. **Where do they leave** (Trends on `Application Backgrounded`, breakdown by `$screen_name`, filter `app_open_number = 1`):
   exit screen of the first session. `session_summary` broken down by `exit_screen` / `bounced` gives the same with duration.
3. **Did they come back** (Retention): start event `first_open`, return event `Application Opened`, daily, D1/D7/D30.
   Breakdown by `auth_status` or by "did `signup_completed` on day 0" to see if signing up drives return.
4. **User paths** (Paths): start at `first_open` (or `$screen` home), event type `$screen`, to see the screen-by-screen journey and where it ends.
5. **Auth wall conversion** (Funnel): `auth_wall_hit` → `signup_completed`, breakdown by `reason` — which guest action converts best.
6. **Walkthrough drop-off** (Trends on `walkthrough_skipped`, breakdown by `walkthrough` and `step`).
7. **Lifecycle** (Lifecycle insight on `Application Opened`): new / returning / resurrecting / dormant users per week.
8. **Paywall** (Funnel): `paywall_viewed` → `purchase_started` → `purchase_completed`.
9. **Arena completion**: `arena_game_started` vs `arena_game_completed`, and `arena_game_abandoned` by `picks`.

Optional later: session replay (`posthog-react-native-session-replay` + `enableSessionReplay: true`) to watch real new-user sessions.

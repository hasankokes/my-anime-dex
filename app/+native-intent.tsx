// Rewrites incoming links before Expo Router matches them to a route.
// Anime share links are myanimedex.com/a/<id> because /anime/<slug>/ is taken by the website's SEO pages;
// list links (myanimedex.com/lists/<id>) already match app/lists/[id].tsx. Every other link passes through.
const ANIME_SHARE = /^(?:https?:\/\/(?:www\.)?myanimedex\.com)?\/a\/([^/?#]+)/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const match = path.match(ANIME_SHARE);
    return match ? `/anime/${match[1]}` : path;
  } catch {
    return path;
  }
}

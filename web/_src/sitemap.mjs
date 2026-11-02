// Writes web/sitemap.xml from the pages in web/.
//   node web/_src/sitemap.mjs
// lastmod = the page's last git commit, or today when it has uncommitted changes, so Google
// sees a date only when a page really changed. Localized pages carry hreflang alternates.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://myanimedex.com';
const today = new Date().toISOString().slice(0, 10);
const git = (...args) => execFileSync('git', args, { cwd: web, encoding: 'utf8' }).trim();

const lastmod = (file) => {
  const rel = relative(web, join(web, file));
  if (git('status', '--porcelain', '--', rel)) return today;
  return git('log', '-1', '--format=%cs', '--', rel) || today;
};

// [hreflang, file, url] groups; a group of one has no alternates.
// Landing + contact pages exist in 9 languages; the legal pages and the Top 100 index in the first 4.
const LANGS = [['en', ''], ['tr', 'tr'], ['ja', 'jp'], ['id', 'id']];
const LANDING_LANGS = [...LANGS, ['es', 'es'], ['pt-BR', 'pt'], ['de', 'de'], ['fr', 'fr'], ['ru', 'ru']];
const groups = [
  LANDING_LANGS.map(([l, c]) => [l, c ? `${c}.html` : 'index.html', `/${c}`]),
  LANDING_LANGS.map(([l, c]) => [l, c ? `contact-${c}.html` : 'contact.html', c ? `/contact-${c}` : '/contact']),
  LANGS.map(([l, c]) => [l, c ? `privacy_${c}.html` : 'privacy.html', c ? `/privacy_${c}` : '/privacy']),
  LANGS.map(([l, c]) => [l, c ? `delete-account_${c}.html` : 'delete-account.html', c ? `/delete-account_${c}` : '/delete-account']),
  LANGS.map(([l, c]) => [l, c ? `anime/index_${c}.html` : 'anime/index.html', c ? `/anime/index_${c}` : '/anime/']),
  [['en', 'terms.html', '/terms']],
  [['en', 'myanimelist-alternative.html', '/myanimelist-alternative']],
  [['en', 'season/index.html', '/season/']],
  ...readdirSync(join(web, 'season'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(web, 'season', d.name, 'index.html')))
    .map((d) => [['en', `season/${d.name}/index.html`, `/season/${d.name}/`]]),
  ...readdirSync(join(web, 'anime'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(web, 'anime', d.name, 'index.html')))
    .map((d) => d.name)
    .sort()
    .map((slug) => [['en', `anime/${slug}/index.html`, `/anime/${slug}/`]]),
];

const entries = groups.flatMap((group) =>
  group.map(([, file, url]) => {
    const alts =
      group.length > 1
        ? [...group.map(([l, , u]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${u}"/>`),
           `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${group[0][2]}"/>`]
        : [];
    return [`  <url>`, `    <loc>${SITE}${url}</loc>`, `    <lastmod>${lastmod(file)}</lastmod>`, ...alts, `  </url>`].join('\n');
  }),
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
writeFileSync(join(web, 'sitemap.xml'), xml);
console.log(`wrote sitemap.xml (${entries.length} URLs)`);

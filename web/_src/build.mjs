// Generates the localized landing pages from a template + strings.json.
//   node web/_src/build.mjs            v2 (current design) → index.html, tr.html, jp.html, id.html + contact pages
//   node web/_src/build.mjs v2 --preview  v2 → v2.html, tr-v2.html, ... (noindex, for trying changes)
//   node web/_src/build.mjs v1         previous design → index.html, tr.html, ... (rollback)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const variant = process.argv[2] === 'v1' ? 'v1' : 'v2';
const live = !process.argv.includes('--preview');

const read = (p) => readFileSync(join(here, p), 'utf8');
// CSS is inlined (a few KB gzipped) so the first paint needs no extra request.
const minify = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
const tpl = read(variant === 'v2' ? 'v2/landing.html' : 'landing.html');
const css = minify(read('landing.css') + (variant === 'v2' ? read('v2/landing.css') : ''));
const strings = JSON.parse(read('strings.json'));
const contactTpl = read('contact.html');
const contactCss = minify(read('landing.css') + read('v2/landing.css') + read('contact.css'));
const globe = (read('landing.html').match(/<summary><svg[\s\S]*?<\/svg>/) || [''])[0].replace('<summary>', '');
const version = Date.now().toString(36);

const APP_STORE = 'https://apps.apple.com/app/id6758043488';
const PLAY = 'https://play.google.com/store/apps/details?id=com.myanimedex.app';
const url = (s) => (s.file === 'index.html' ? 'https://myanimedex.com/' : `https://myanimedex.com/${s.file.replace('.html', '')}`);
const outFile = (s) => (live ? s.file : s.file === 'index.html' ? 'v2.html' : s.file.replace('.html', '-v2.html'));
const clips = ['tracker', 'calendar', 'lists', 'profile', 'dice', null];
const stills = ['tracker', 'calendar', 'lists', 'profile', 'dice', 'favorites'];
const esc = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const miniPhone = (i) => {
  const still = stills[i];
  const media = clips[i] ? `<video muted loop playsinline preload="none" data-clip="${clips[i]}"></video>` : '';
  return `<div class="step-media" aria-hidden="true"><div class="mini-phone"><img src="assets/clips/${still}.webp" srcset="assets/clips/${still}-300.webp 300w, assets/clips/${still}.webp 540w" sizes="(min-width: 900px) 280px, min(62vw, 270px)" alt="" width="540" height="1174" loading="lazy" decoding="async">${media}</div></div>`;
};

const speedLines = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2 + (i % 2) * 0.05;
  const r1 = 46 + (i % 3) * 7;
  const r2 = 92 + (i % 4) * 6;
  const f = (n) => n.toFixed(1);
  return `<line x1="${f(Math.cos(a) * r1)}" y1="${f(Math.sin(a) * r1)}" x2="${f(Math.cos(a) * r2)}" y2="${f(Math.sin(a) * r2)}" stroke-width="${i % 3 === 0 ? 1.4 : 0.7}"/>`;
}).join('');

// strings the browser script needs
const JS_KEYS = ['trackCompleted', 'calError', 'calAiring', 'calFav', 'calNone', 'listNew1', 'diceRoll', 'diceAgain', 'diceErr', 'levelUp', 'ctaXp', 'ctaXpZero', 'cardLevel'];

for (const [code, s] of Object.entries(strings)) {
  const others = Object.values(strings);
  const hreflang = [
    ...others.map((o) => `<link rel="alternate" hreflang="${o.htmlLang}" href="${url(o)}">`),
    `<link rel="alternate" hreflang="x-default" href="${url(strings.en)}">`,
  ].join('\n');
  const langLinks = others
    .map((o) => `<a href="${outFile(o)}" hreflang="${o.htmlLang}" lang="${o.htmlLang}"${o === s ? ' aria-current="page"' : ''}>${o.label}</a>`)
    .join('');
  const badges =
    `<a class="badge" href="${APP_STORE}" data-store="ios" rel="noopener"><img src="assets/badges/app-store.svg" width="150" height="50" alt="${esc(s.badgeApple)}"></a>` +
    `<a class="badge" href="${PLAY}" data-store="android" rel="noopener"><img src="assets/badges/google-play.png" width="169" height="50" alt="${esc(s.badgeGoogle)}"></a>`;

  // v1 steps (copy + mini phone)
  const steps = stills
    .map((_, i) => {
      const n = i + 1;
      return `<article class="step" data-step="${i}">
        <div class="step-copy">
          <p class="step-tag"><span>0${n}</span>${s[`s${n}Tag`]}</p>
          <h3>${s[`s${n}Title`]}</h3>
          <p>${s[`s${n}Body`]}</p>
        </div>
        ${miniPhone(i)}
      </article>`;
    })
    .join('\n');
  const dots = stills.map((_, i) => `<li${i === 0 ? ' class="on"' : ''}></li>`).join('');
  const tags = [s.s1Tag, s.s2Tag, s.s3Tag, s.s4Tag, s.s5Tag, s.s6Tag];
  const marquee = [...tags, ...tags].map((t) => `<span>${t}</span>`).join('');
  const heroTitleLines = (variant === 'v2' ? s.hero2Title : s.heroTitle)
    .split('<br>')
    .map((l) => `<span class="line"><span>${l}</span></span>`)
    .join('');
  const jsStrings = JSON.stringify({
    locale: s.htmlLang,
    ...Object.fromEntries(JS_KEYS.map((k) => [k, s[k]])),
  }).replace(/</g, '\\u003c');

  const vars = {
    ...s,
    canonical: url(s),
    robots: live ? '' : '<meta name="robots" content="noindex">',
    home: outFile(s),
    file: outFile(s),
    hreflang,
    langLinks,
    langLinksPlain: langLinks,
    badges,
    steps,
    dots,
    marquee,
    heroTitleLines,
    speedLines,
    jsStrings,
    version,
    css,
    heroPitch: variant === 'v2' ? s.hero2Pitch : s.heroPitch,
    heroFit: s.heroFit || 12,
    contactFile: s.contactFileName,
    description: esc(s.description),
    title: esc(s.title),
    ...Object.fromEntries(stills.map((_, i) => [`media${i}`, miniPhone(i)])),
  };
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`[${code}] missing key ${k}`);
    return vars[k];
  });
  writeFileSync(join(web, outFile(s)), html);
  console.log('wrote', outFile(s));

  // contact page (always live; links back to the live landing page)
  const curl = (o) => `https://myanimedex.com/${o.contactFileName.replace('.html', '')}`;
  const cvars = {
    ...s,
    css: contactCss,
    globe,
    home: s.file,
    contactFile: s.contactFileName,
    contactCanonical: curl(s),
    contactHreflang: [...others.map((o) => `<link rel="alternate" hreflang="${o.htmlLang}" href="${curl(o)}">`), `<link rel="alternate" hreflang="x-default" href="${curl(strings.en)}">`].join('\n'),
    langLinks: others.map((o) => `<a href="${o.contactFileName}" hreflang="${o.htmlLang}" lang="${o.htmlLang}"${o === s ? ' aria-current="page"' : ''}>${o.label}</a>`).join(''),
    contactLede: s.contactLede,
    jsSending: JSON.stringify(s.jsSending), jsSent: JSON.stringify(s.jsSent), jsError: JSON.stringify(s.jsError),
  };
  writeFileSync(join(web, s.contactFileName), contactTpl.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in cvars)) throw new Error(`[${code}] contact: missing key ${k}`);
    return cvars[k];
  }));
  console.log('wrote', s.contactFileName);
}

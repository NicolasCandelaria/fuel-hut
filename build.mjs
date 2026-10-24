// Builds the static site into dist/.
// Menu data comes from data/menu.csv, or from a published Google Sheet
// when SHEET_CSV_URL is set (File > Share > Publish to web > CSV).
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function loadMenu() {
  const url = process.env.SHEET_CSV_URL;
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('Menu: Google Sheet');
      return parseCSV(await res.text());
    } catch (e) {
      console.warn(`Menu: sheet fetch failed (${e.message}), using data/menu.csv`);
    }
  }
  console.log('Menu: data/menu.csv');
  return parseCSV(await read('data/menu.csv'));
}

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sun = (cls = '') => `<svg class="${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <g class="rays">${Array.from({ length: 16 }, (_, i) => `<path d="M100 6 L108 40 L92 40 Z" transform="rotate(${i * 22.5} 100 100)"/>`).join('')}</g>
  <circle cx="100" cy="100" r="52"/>
</svg>`;

function plate(item) {
  return `<li>
    <button class="plate" type="button" data-slug="${esc(item.Slug)}">
      <span class="plate-img">${item.Image ? `<img src="${esc(item.Image)}" alt="" loading="lazy" decoding="async" width="320" height="320">` : ''}</span>
      <span class="plate-name">${esc(item.Title)}</span>
      ${item.Tag ? `<span class="plate-tag">${esc(item.Tag)}</span>` : ''}
      <span class="plate-ing">${esc(item.Ingredients)}</span>
      ${item.Price && !/^\$?(9\.49|12\.99|6\.99)$/.test(item.Price) ? `<span class="plate-price">${esc(item.Price)}</span>` : ''}
    </button>
  </li>`;
}

function boardRow(item) {
  return `<li class="row">
    <span class="row-name">${esc(item.Title)}</span>
    ${item.Ingredients ? `<span class="row-ing">${esc(item.Ingredients)}</span>` : ""}
    <span class="row-price">${esc(item.Price)}</span>
  </li>`;
}

function shelfItem(item) {
  return `<li class="shelf-item">
    ${item.Image ? `<img src="${esc(item.Image)}" alt="${esc(item.Title)}" loading="lazy" decoding="async" width="200" height="240">` : ''}
    <span class="shelf-brand">${esc(item.Tag)}</span>
    <span class="shelf-name">${esc(item.Title)}</span>
  </li>`;
}

function section(cat, items, site) {
  const prices = (cat.prices || []).map((p) => `<span class="chip"><span>${esc(p.label)}</span> <strong>${esc(p.price)}</strong></span>`).join('');
  const notes = (cat.notes || []).map((n) => `<li>${esc(n)}</li>`).join('');
  let list = '';
  if (cat.layout === 'plates') list = `<ul class="plates">${items.map(plate).join('')}</ul>`;
  if (cat.layout === 'board') list = `<ul class="board">${items.map(boardRow).join('')}</ul>`;
  if (cat.layout === 'shelf') list = `<ul class="shelf">${items.map(shelfItem).join('')}</ul>`;
  const combos = cat.id === 'wraps' && site.combos?.length
    ? `<div class="combo"><p class="combo-title">Make it a combo</p><ul>${site.combos.map((c) => `<li><span>${esc(c.label)}</span><strong>${esc(c.price)}</strong></li>`).join('')}</ul></div>`
    : '';
  const soon = cat.id === 'acai-bowls' && site.comingSoon ? `<p class="soon">Coming soon: ${esc(site.comingSoon)}.</p>` : '';
  return `<section class="cat cat-${cat.layout}" id="${cat.id}" aria-labelledby="${cat.id}-h">
    <div class="cat-head">
      <h2 id="${cat.id}-h">${esc(cat.name)}</h2>
      ${prices ? `<div class="chips">${prices}</div>` : ''}
      <p class="cat-intro">${esc(cat.intro || '')}</p>
      ${notes ? `<ul class="notes">${notes}</ul>` : ''}
    </div>
    ${list}${combos}${soon}
  </section>`;
}

const site = JSON.parse(await read('data/site.json'));
const menu = (await loadMenu()).filter((r) => r.Title).sort((a, b) => Number(a.Sort || 0) - Number(b.Sort || 0));
const byCat = (name) => menu.filter((m) => m.Category.toLowerCase() === name.toLowerCase());
const live = process.env.SITE_LIVE === '1';

const hours = site.hours?.length
  ? `<dl class="hours">${site.hours.map((h) => `<dt>${esc(h.days)}</dt><dd>${esc(h.time)}</dd>`).join('')}</dl>`
  : `<p class="hours-tbc">Hours vary. <a href="tel:${site.phone}">Call ahead</a> to check today's.</p>`;

const items = Object.fromEntries(menu.filter((m) => m.Image).map((m) => [m.Slug, {
  t: m.Title, c: m.Category, g: m.Tag, i: m.Ingredients, p: m.Price, s: m.Size, x: m.Extra, d: m.Description, img: m.Image,
}]));

const ld = {
  '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', name: site.name, url: site.url,
  telephone: site.phone, email: site.email, servesCuisine: ['Smoothies', 'Acai bowls', 'Wraps'],
  address: { '@type': 'PostalAddress', streetAddress: site.address.line1, addressLocality: 'New Westminster', addressRegion: 'BC', postalCode: 'V3M 0G3', addressCountry: 'CA' },
  sameAs: [site.instagram],
};

const html = `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(site.description)}">
${live ? '' : '<meta name="robots" content="noindex, nofollow">'}
<link rel="canonical" href="${site.url}/">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(site.description)}">
<meta property="og:image" content="${site.url}/images/site/smoothies-lineup.webp">
<meta property="og:type" content="website">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#menu">Skip to the menu</a>
<header class="bar">
  <a class="brand" href="/" aria-label="Fuel Hut home">${sun('brand-sun')}<span>fuel hut</span></a>
  <nav class="bar-nav" aria-label="Main">
    <a href="#menu">Menu</a><a href="#story">Our story</a><a href="#visit">Visit</a>
  </nav>
  <a class="btn btn-dark bar-order" href="${site.orderUrl}" rel="noopener">Order on Uber Eats</a>
</header>

<main>
<section class="hero" aria-labelledby="hero-h">
  <div class="hero-copy">
    <h1 id="hero-h">Fuel up before the train.</h1>
    <p class="lede">Protein smoothies, acai bowls, wraps and supplements at the New Westminster SkyTrain Station shops, beside Dynamic Health &amp; Fitness.</p>
    <div class="board-price" role="group" aria-label="Smoothie prices">
      <div><span class="size">16 oz</span><span class="amt">$9.49</span></div>
      <div><span class="size">24 oz</span><span class="amt">$10.99</span></div>
      <p>One scoop of protein in every smoothie. No sugar added.</p>
    </div>
    <div class="hero-actions">
      <a class="btn btn-dark" href="${site.orderUrl}" rel="noopener">Order on Uber Eats</a>
      <a class="btn btn-line" href="#menu">See the full menu</a>
    </div>
  </div>
  <div class="hero-art" aria-hidden="true">
    ${sun('hero-sun')}
    <img src="/images/menu/espresso-energizer.webp" alt="" fetchpriority="high">
  </div>
</section>

<nav class="cats" aria-label="Menu sections">
  <ul>${site.categories.map((c) => `<li><a href="#${c.id}">${esc(c.name)}</a></li>`).join('')}</ul>
</nav>

<div id="menu" class="menu">
${site.categories.map((c) => section(c, byCat(c.name), site)).join('\n')}
</div>

<section class="story" id="story" aria-labelledby="story-h">
  <img class="story-img" src="/images/site/smoothies-lineup.webp" alt="A row of Fuel Hut smoothies with fresh fruit" loading="lazy" width="1400" height="1400">
  <div class="story-copy">
    <h2 id="story-h">Next door to the gym, on purpose.</h2>
    <p>Fuel Hut is an extension of Dynamic Health &amp; Fitness, which has looked after New Westminster's health and fitness for over two decades. Training was only half of it. What you eat does the rest, so we built a menu around it.</p>
    <p>Every smoothie is blended with whey isolate protein and no added sugar. The supplements on our shelf are the ones we use ourselves.</p>
    <ul class="facts">
      <li>No sugar added</li>
      <li>Whey isolate protein</li>
      <li>Keto-friendly options</li>
      <li>Canadian and family owned</li>
    </ul>
  </div>
</section>

<section class="visit" id="visit" aria-labelledby="visit-h">
  <div class="visit-copy">
    <h2 id="visit-h">Find us at the station.</h2>
    <address>
      <p class="addr">${esc(site.address.line1)}<br>${esc(site.address.line2)}</p>
      <p class="landmark">${esc(site.address.landmark)}</p>
    </address>
    ${hours}
    <ul class="contact">
      <li><a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></li>
      <li><a href="mailto:${site.email}">${esc(site.email)}</a></li>
      <li><a href="${site.instagram}" rel="noopener">${esc(site.instagramHandle)} on Instagram</a></li>
      <li><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(site.address.mapsQuery)}" rel="noopener">Get directions</a></li>
    </ul>
  </div>
  <iframe class="map" title="Map to Fuel Hut at New Westminster Station" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    src="https://maps.google.com/maps?q=${encodeURIComponent(site.address.mapsQuery)}&amp;z=16&amp;output=embed"></iframe>
</section>
</main>

<footer class="foot">
  <a class="brand" href="/" aria-label="Fuel Hut home">${sun('brand-sun')}<span>fuel hut</span></a>
  <p>Canadian and family owned. &copy; ${new Date().getFullYear()} Fuel Hut.</p>
</footer>

<dialog class="item" id="item" aria-labelledby="item-name">
  <form method="dialog"><button class="item-close" aria-label="Close">Close</button></form>
  <div class="item-img"><img alt="" id="item-img"></div>
  <div class="item-body">
    <p class="item-cat" id="item-cat"></p>
    <h3 id="item-name"></h3>
    <p class="item-ing" id="item-ing"></p>
    <p class="item-desc" id="item-desc"></p>
    <p class="item-price" id="item-price"></p>
    <p class="item-extra" id="item-extra"></p>
  </div>
</dialog>
<script>window.MENU=${JSON.stringify(items).replace(/</g, '\\u003c')};</script>
<script src="/app.js" defer></script>
</body>
</html>`;

await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
await cp(new URL('src/styles.css', root), new URL('dist/styles.css', root));
await cp(new URL('src/app.js', root), new URL('dist/app.js', root));
await writeFile(new URL('dist/index.html', root), html);
await writeFile(new URL('dist/robots.txt', root), live ? `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
await writeFile(new URL('dist/sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.url}/</loc></url></urlset>\n`);
console.log(`Built ${menu.length} menu items into dist/ (${live ? 'live' : 'preview, noindex'})`);

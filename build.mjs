// Gardens of AI: build the static site from posts/*.md into dist/.
//
//   node build.mjs            # build once
//   node build.mjs --drafts   # include posts with "draft: true"
//
// A post is a Markdown file with a front matter block:
//
//   ---
//   title: My title
//   date: 2026-10-10
//   summary: One line for the home page.
//   tags: radio, llm
//   draft: false
//   ---
//
// The file name (without .md and without a leading date) becomes the URL: /posts/<slug>/.
// No dependencies: the Markdown subset below covers what the posts use.
import fs from 'node:fs';
import path from 'node:path';
import { grow } from './tree.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const DRAFTS = process.argv.includes('--drafts');
const tpl = (name) => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
const fill = (t, vars) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');

// --- Markdown (subset) -------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(esc(c)) - 1}\u0000`);
  s = esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/ -- /g, ' &ndash; ');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${code[i]}</code>`);
}

function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^```(\w*)/))) {                       // fenced code
      const body = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i]);
      i++;
      out.push(`<pre${m[1] ? ` class="lang-${m[1]}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`);
    } else if ((m = line.match(/^(#{2,4})\s+(.*)/))) {           // headings (# is the title)
      const n = m[1].length, h = inline(m[2]);
      out.push(`<h${n} id="${slug(h)}">${h}</h${n}>`);
      i++;
    } else if (/^(---|\*\*\*)\s*$/.test(line)) {                // section break
      out.push('<hr>'); i++;
    } else if (line.startsWith('>')) {                         // quote
      const body = [];
      for (; i < lines.length && lines[i].startsWith('>'); i++) body.push(lines[i].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(body.join('\n'))}</blockquote>`);
    } else if (line.startsWith('|')) {                         // table
      const rows = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const [head, , ...body] = rows;
      out.push('<div class="table"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
    } else if (/^(\s*)([-*]|\d+\.)\s/.test(line)) {           // lists (one level)
      const ordered = /^\s*\d+\./.test(line), items = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i]); i++) {
        let item = lines[i].replace(/^\s*([-*]|\d+\.)\s/, '');
        while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i + 1])) item += ' ' + lines[++i].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else if ((m = line.match(/^:::\s*(\w+)\s*(.*)/))) {       // callout box:  ::: note Title ... :::
      const body = [];
      for (i++; i < lines.length && !/^:::\s*$/.test(lines[i]); i++) body.push(lines[i]);
      i++;
      out.push(`<aside class="callout ${m[1]}">${m[2] ? `<p class="callout-title">${inline(m[2])}</p>` : ''}${markdown(body.join('\n'))}</aside>`);
    } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {   // image on its own line: figure, alt text as caption
      out.push(`<figure><img src="${m[2]}" alt="${esc(m[1])}" loading="lazy"><figcaption>${inline(m[1])}</figcaption></figure>`);
      i++;
    } else {                                                   // paragraph
      const body = [];
      for (; i < lines.length && lines[i].trim() && !/^(```|#{2,4}\s|>|\||:::|(\s*)([-*]|\d+\.)\s|---\s*$)/.test(lines[i]); i++) body.push(lines[i].trim());
      out.push(`<p>${inline(body.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

// --- Posts -------------------------------------------------------------------------------------
function readPost(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front matter`);
  const meta = Object.fromEntries(m[1].split('\n').filter((l) => l.includes(':'))
    .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  const slug = path.basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const words = m[2].split(/\s+/).filter(Boolean).length;
  return { ...meta, slug, draft: meta.draft === 'true', tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    html: markdown(m[2]), minutes: Math.max(1, Math.round(words / 230)) };
}

const niceDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const abs = (u) => (/^https?:/.test(u) ? u : SITE.url + u);
// vars.path is the page's URL path; it gives the canonical URL. vars.head adds tags to <head> (JSON-LD).
const page = (vars) => fill(tpl('layout.html'), { site: SITE.title, tagline: SITE.tagline, author: esc(SITE.author), year: new Date().getFullYear(),
  ogType: 'website', ogTitle: vars.title, image: abs(SITE.image), head: '', ...vars, canonical: abs(vars.path),
  ...(vars.image && { image: abs(vars.image) }) });
const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...o }).replace(/</g, '\\u003c')}</script>`;
const person = { '@type': 'Person', name: SITE.author, url: `${SITE.url}/about/`, sameAs: ['https://uk.linkedin.com/in/dominic-searle-1661584'] };
const G = SITE.giscus || {};
const comments = G.repo && G.repoId && G.categoryId ? fill(tpl('comments.html'), G) : '';

const posts = fs.readdirSync(path.join(ROOT, 'posts')).filter((f) => f.endsWith('.md'))
  .map((f) => readPost(path.join(ROOT, 'posts', f)))
  .filter((p) => DRAFTS || !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date));

// Empty dist/ but keep the folder: the preview container mounts it, and a new folder would hide it.
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

for (const p of posts) {
  const tags = p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  const url = `/posts/${p.slug}/`;
  write(`posts/${p.slug}/index.html`, page({
    title: `${esc(p.title)} · ${SITE.title}`, ogTitle: esc(p.title), description: esc(p.summary || ''), path: url, ogType: 'article', image: p.image,
    head: `<meta property="article:published_time" content="${p.date}">\n<meta name="keywords" content="${esc(p.tags.join(', '))}">\n` + jsonld({
      '@type': 'BlogPosting', headline: p.title, description: p.summary, datePublished: p.date, dateModified: p.updated || p.date,
      author: person, image: abs(p.image || SITE.image), keywords: p.tags.join(', '), mainEntityOfPage: abs(url), inLanguage: 'en-GB' }),
    body: fill(tpl('post.html'), { title: esc(p.title), date: p.date, niceDate: niceDate(p.date), minutes: p.minutes, tags, content: p.html,
      draft: p.draft ? '<p class="draft">Draft</p>' : '', comments }),
  }));
}

// Pages: pages/<name>.md becomes /<name>/. Same Markdown and front matter as posts, no date.
for (const f of fs.readdirSync(path.join(ROOT, 'pages')).filter((f) => f.endsWith('.md'))) {
  const p = readPost(path.join(ROOT, 'pages', f));
  write(`${p.slug}/index.html`, page({ title: `${esc(p.title)} · ${SITE.title}`, description: esc(p.summary || SITE.description), path: `/${p.slug}/`,
    body: fill(tpl('page.html'), { title: esc(p.title), content: p.html }) }));
}

const list = posts.map((p) => fill(tpl('card.html'), { url: `/posts/${p.slug}/`, title: esc(p.title), summary: esc(p.summary || ''),
  date: p.date, niceDate: niceDate(p.date), minutes: p.minutes })).join('\n');
const { svg, blooms, ratio } = grow(posts);
// Labels face away from the trunk, but turn inward near the edges so they stay on screen.
const bloomLinks = blooms.map((b, i) => fill(tpl('bloom.html'), { url: `/posts/${b.post.slug}/`, title: esc(b.post.title), niceDate: niceDate(b.post.date),
  x: b.x.toFixed(2), y: b.y.toFixed(2), side: b.x < 50 ? (b.x < 22 ? 'right' : 'left') : (b.x > 78 ? 'left' : 'right'), i })).join('\n');
write('index.html', page({ title: `${SITE.title}: ${SITE.tagline}`, description: esc(SITE.description), path: '/',
  head: jsonld({ '@type': 'WebSite', name: SITE.title, url: SITE.url, description: SITE.description, author: person, inLanguage: 'en-GB' }),
  body: fill(tpl('home.html'), { intro: SITE.intro, tagline: esc(SITE.tagline), tree: svg, ratio: ratio.toFixed(3), blooms: bloomLinks, list }) }));

// 404, sitemap, robots, RSS, and the files GitHub Pages needs (CNAME: custom domain; .nojekyll: serve as is).
write('404.html', page({ title: `Not found · ${SITE.title}`, description: esc(SITE.description), path: '/404.html', body: tpl('404.html') }));
const pagesList = fs.readdirSync(path.join(ROOT, 'pages')).filter((f) => f.endsWith('.md')).map((f) => `/${path.basename(f, '.md')}/`);
const urls = [{ loc: '/', lastmod: posts[0]?.date }, ...posts.map((p) => ({ loc: `/posts/${p.slug}/`, lastmod: p.updated || p.date })), ...pagesList.map((loc) => ({ loc }))];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) =>
  `  <url><loc>${abs(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
const rfc822 = (d) => new Date(d + 'T09:00:00Z').toUTCString();
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(SITE.title)}</title><link>${SITE.url}/</link><description>${esc(SITE.description)}</description><language>en-gb</language>
<atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${abs(`/posts/${p.slug}/`)}</link><guid>${abs(`/posts/${p.slug}/`)}</guid><pubDate>${rfc822(p.date)}</pubDate><description>${esc(p.summary || '')}</description></item>`).join('\n')}
</channel></rss>\n`);
write('CNAME', new URL(SITE.url).host + '\n');
write('.nojekyll', '');

console.log(`built ${posts.length} post(s) into dist/`);

// The home page tree: an SVG tree that grows one main limb per post, with the post as a bloom at
// the limb's tip. Built at build time, so the page needs no JavaScript.
//
//   const { svg, blooms } = grow(posts);   // blooms: [{ post, x, y }] in % of the tree box
//
// The shape is seeded from the post slugs, so it only changes when a post is added or removed.
// Each branch carries its depth (--l) for the draw-in animation in style.css.

const W = 1000, H = 820;
const MIN_LIMBS = 7;   // a young blog still gets a full tree; posts take the limbs from the top down

function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 3432918353), h = (h << 13) | (h >>> 19);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const f = (n) => n.toFixed(1);

export function grow(posts) {
  const rand = rng(posts.map((p) => p.slug).join('|') || 'garden');
  const between = (a, b) => a + (b - a) * rand();
  const branches = [], leaves = [], tips = [];

  // A curved, tapered branch from (x, y) along angle a. Children fork off the end.
  function branch(x, y, a, len, width, depth, level, limb) {
    const bend = between(-0.25, 0.25);
    const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
    const cx = x + Math.sin(a + bend) * len * 0.55, cy = y - Math.cos(a + bend) * len * 0.55;
    branches.push({ d: `M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`, width, level });
    if (depth === 0) {
      tips.push({ x: x2, y: y2, limb });
      const n = 7 + Math.floor(rand() * 6);
      for (let i = 0; i < n; i++) {
        leaves.push({ x: x2 + between(-30, 30), y: y2 + between(-28, 18), r: between(6, 13), rot: between(0, 180),
          tone: Math.floor(rand() * 5), blossom: rand() < 0.035, level: level + 1 });
      }
      return;
    }
    const kids = depth > 4 ? 2 : 2 + (rand() < 0.35);
    const offsets = kids === 2 ? [-between(0.25, 0.5), between(0.25, 0.5)] : [-between(0.4, 0.6), between(-0.1, 0.1), between(0.4, 0.6)];
    for (const o of offsets) branch(x2, y2, a * 0.92 + o, len * between(0.7, 0.8), width * 0.68, depth - 1, level + 1, limb);   // 0.92: reach up
  }

  // Trunk, then limbs up its top half, alternating sides, lower limbs reaching wider.
  const limbs = Math.max(MIN_LIMBS, posts.length);
  const baseX = W / 2, baseY = H - 40, trunkTop = H - 330;
  branches.push({ d: `M${baseX - 4} ${baseY}C${baseX - 14} ${baseY - 120} ${baseX + 12} ${baseY - 200} ${baseX} ${trunkTop}`, width: 34, level: 0 });
  for (let i = 0; i < limbs; i++) {
    const t = limbs === 1 ? 0 : i / (limbs - 1);            // 0 = highest limb
    const side = i === 0 ? 0 : i % 2 ? -1 : 1;
    const y = trunkTop + t * 150;
    const a = side * (0.35 + t * 0.75) + between(-0.08, 0.08);
    const len = 120 + (1 - Math.abs(t - 0.45)) * 30;
    branch(baseX + side * 3, y, a, len * 1.15, 20 - t * 6, i === 0 ? 5 : 4, 1, i);
  }

  // A post's bloom sits on its limb's outermost tip, kept clear of the other blooms. Newest post on the top limb.
  const placed = [];
  const blooms = posts.map((post, i) => {
    const own = tips.filter((t) => t.limb === i)
      .sort((p, q) => Math.hypot(q.x - baseX, q.y - trunkTop) - Math.hypot(p.x - baseX, p.y - trunkTop));
    const tip = own.find((t) => placed.every((o) => Math.hypot(t.x - o.x, t.y - o.y) > 110)) || own[0];
    placed.push(tip);
    return { post, x: (tip.x / W) * 100, y: (tip.y / H) * 100 };
  });

  const grass = Array.from({ length: 70 }, () => {
    const x = between(220, 780), h = between(8, 22) * (1 - Math.abs(x - 500) / 400);
    return `<path d="M${f(x)} ${baseY + 2}q${f(between(-4, 4))} ${f(-h / 2)} ${f(between(-6, 6))} ${f(-h)}"/>`;
  }).join('');
  const pollen = Array.from({ length: 18 }, (_, i) =>
    `<circle class="pollen" cx="${f(between(200, 800))}" cy="${f(between(120, 560))}" r="${f(between(1.5, 3.2))}" style="--p:${i}"/>`).join('');

  // Fit the box to the canopy so the tree fills it whatever shape it grew into.
  const top = Math.min(...leaves.map((l) => l.y - l.r)) - 30;
  const left = Math.min(220, ...leaves.map((l) => l.x - l.r)) - 20, right = Math.max(780, ...leaves.map((l) => l.x + l.r)) + 20;
  const box = { x: left, y: top, w: right - left, h: H - top };
  for (const b of blooms) b.x = ((b.x / 100) * W - box.x) / box.w * 100, b.y = ((b.y / 100) * H - box.y) / box.h * 100;

  const svg = `<svg class="tree-svg" viewBox="${f(box.x)} ${f(box.y)} ${f(box.w)} ${f(box.h)}" data-ratio="${f(box.w / box.h)}" role="img" aria-label="A tree. Each blooming branch is a post.">
  <defs>
    <linearGradient id="bark" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6f6252"/><stop offset="1" stop-color="#9a8a76"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#eef3e8"/><stop offset="1" stop-color="#eef3e8" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="360" rx="420" ry="330" fill="url(#glow)"/>
  <ellipse class="shadow" cx="${W / 2}" cy="${baseY + 4}" rx="230" ry="14"/>
  <g class="grass">${grass}</g>
  <g class="sway">
    <g class="branches" stroke="url(#bark)" fill="none" stroke-linecap="round">${branches.map((b) =>
      `<path d="${b.d}" stroke-width="${f(Math.max(1.2, b.width))}" pathLength="1" style="--l:${b.level}"/>`).join('')}</g>
    <g class="leaves">${leaves.map((l) =>
      `<g transform="translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)})"><ellipse class="${l.blossom ? 'blossom' : `leaf t${l.tone}`}" rx="${f(l.r)}" ry="${f(l.r * (l.blossom ? 0.9 : 0.55))}" style="--l:${l.level}"/></g>`).join('')}</g>
  </g>
  <g class="pollen-field">${pollen}</g>
</svg>`;
  return { svg, blooms, ratio: box.w / box.h };
}

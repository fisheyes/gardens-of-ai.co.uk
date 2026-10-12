// The home page allotment: a raised bed for technical notes (posts with "type: note"), watered by an
// old tin robot. Each note is a plant in the bed, newest nearest the robot's can. Empty plots get seedlings.
//
//   const { svg, plants } = plot(notes);   // plants: [{ post, x, y }] in % of the bed box

const W = 720, H = 330;
const MIN_PLOTS = 4;
const TOP = 44, BOTTOM = 300;   // the drawn scene: robot antenna to the bed's bottom plank
const f = (n) => n.toFixed(1);
const LINE = 'stroke="#33372f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';

// A cabbage-like plant: overlapping round leaves around a pale heart.
const crop = (x, y, s) => `<g class="crop" transform="translate(${f(x)} ${f(y)}) scale(${s})">
  <path d="M0 0 C-34 -6 -40 -40 -14 -44 C-6 -60 14 -58 18 -42 C42 -40 38 -6 0 0Z" fill="#9db58f" ${LINE}/>
  <path d="M0 0 C-22 -8 -24 -30 -6 -32 C4 -40 18 -32 14 -20 C24 -14 16 -2 0 0Z" fill="#b9cca8" ${LINE}/>
  <path d="M-2 -10 q4 -10 10 -14" fill="none" stroke="#7f9f75" stroke-width="2" stroke-linecap="round"/>
</g>`;
// A small seedling for an empty plot: two leaves on a stem.
const seedling = (x, y) => `<g transform="translate(${f(x)} ${f(y)})" opacity=".85">
  <path d="M0 0 V-16" stroke="#7f9f75" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M0 -14 C-4 -24 -16 -24 -16 -18 C-12 -12 -4 -12 0 -14Z" fill="#b9cca8" stroke="#7f9f75" stroke-width="1.5"/>
  <path d="M0 -12 C4 -22 16 -22 16 -16 C12 -10 4 -10 0 -12Z" fill="#d3e0c6" stroke="#7f9f75" stroke-width="1.5"/>
</g>`;

const robot = `<g class="robot" transform="translate(40 40)">
  <!-- tracks -->
  <rect x="8" y="214" width="104" height="30" rx="15" fill="#6f7569" ${LINE}/>
  <g fill="#d3cbb8" stroke="#33372f" stroke-width="2"><circle cx="26" cy="229" r="8"/><circle cx="60" cy="229" r="8"/><circle cx="94" cy="229" r="8"/></g>
  <rect x="44" y="196" width="32" height="20" fill="#b9a68f" ${LINE}/>
  <!-- body -->
  <rect x="14" y="110" width="92" height="90" rx="12" fill="#b9cca8" ${LINE}/>
  <circle cx="44" cy="146" r="14" fill="#fbf9f4" ${LINE}/><path d="M44 146 l7 -8" stroke="#c0764f" stroke-width="2.5" stroke-linecap="round"/>
  <g fill="#c0764f" stroke="#33372f" stroke-width="2"><circle cx="80" cy="136" r="5"/><circle cx="80" cy="156" r="5" fill="#5f7d5a"/></g>
  <g stroke="#33372f" stroke-width="2" stroke-linecap="round"><path d="M30 180 H90"/><path d="M30 188 H90"/></g>
  <!-- neck + head -->
  <rect x="50" y="96" width="20" height="16" fill="#b9a68f" ${LINE}/>
  <rect x="22" y="40" width="76" height="58" rx="10" fill="#d3e0c6" ${LINE}/>
  <circle cx="44" cy="64" r="10" fill="#fff" ${LINE}/><circle cx="76" cy="64" r="10" fill="#fff" ${LINE}/>
  <circle class="eye" cx="46" cy="64" r="4" fill="#33372f"/><circle class="eye" cx="78" cy="64" r="4" fill="#33372f"/>
  <rect x="42" y="80" width="36" height="9" rx="2" fill="#fbf9f4" stroke="#33372f" stroke-width="2"/>
  <g stroke="#33372f" stroke-width="1.5"><path d="M51 80 v9"/><path d="M60 80 v9"/><path d="M69 80 v9"/></g>
  <rect x="12" y="56" width="10" height="20" rx="3" fill="#c0764f" ${LINE}/><rect x="98" y="56" width="10" height="20" rx="3" fill="#c0764f" ${LINE}/>
  <path d="M60 40 V18" stroke="#33372f" stroke-width="2.5"/><circle class="antenna" cx="60" cy="14" r="6" fill="#c0764f" ${LINE}/>
  <!-- arm holding the can -->
  <path d="M104 132 q22 -6 38 -24" fill="none" stroke="#33372f" stroke-width="9" stroke-linecap="round"/>
  <path d="M104 132 q22 -6 38 -24" fill="none" stroke="#b9a68f" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 3"/>
  <g class="can" transform="translate(150 96) rotate(22)">
    <path d="M-4 -26 q16 -18 32 0" fill="none" stroke="#33372f" stroke-width="3"/>
    <rect x="-10" y="-24" width="46" height="40" rx="8" fill="#c0764f" ${LINE}/>
    <path d="M36 -8 L84 -30 L88 -22 L36 6Z" fill="#c0764f" ${LINE}/>
    <ellipse cx="88" cy="-26" rx="5" ry="9" transform="rotate(-25 88 -26)" fill="#e8a988" ${LINE}/>
  </g>
  <!-- water -->
  <g class="water" fill="#9fc3cf">${[0, 1, 2, 3, 4, 5].map((i) =>
    `<ellipse cx="${236 + (i % 3) * 12}" cy="${50 + (i % 2) * 6}" rx="2.6" ry="4" style="--d:${i}"/>`).join('')}</g>
</g>`;

export function plot(notes) {
  const plots = Math.max(MIN_PLOTS, notes.length);
  const bedL = 220, bedR = W - 20, soilY = 240, step = (bedR - bedL - 80) / Math.max(1, plots - 1);
  const slots = Array.from({ length: plots }, (_, i) => ({ x: bedL + 40 + i * step + (i % 2 ? 6 : -6), y: soilY + (i % 2 ? 10 : 0) }));
  const plantsSvg = slots.map((s, i) => (i < notes.length ? crop(s.x, s.y, 1.25 + (i % 3) * 0.1) : seedling(s.x, s.y))).join('');
  const plants = notes.map((post, i) => ({ post, x: (slots[i].x / W) * 100, y: ((slots[i].y - 62 - TOP) / (BOTTOM - TOP)) * 100 }));

  const svg = `<svg class="allotment-svg" viewBox="0 ${TOP} ${W} ${BOTTOM - TOP}" role="img" aria-label="An old tin robot waters a raised bed. Each plant is a technical note.">
  <defs>
    <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a826b"/><stop offset="1" stop-color="#7d6957"/></linearGradient>
    <linearGradient id="plank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b896"/><stop offset="1" stop-color="#c19d7b"/></linearGradient>
  </defs>
  <rect x="${bedL - 14}" y="${soilY - 16}" width="${bedR - bedL + 28}" height="34" rx="12" fill="url(#soil)" ${LINE}/>
  <g fill="#6a5848" opacity=".5">${Array.from({ length: Math.floor((bedR - bedL) / 31) }, (_, i) => `<circle cx="${bedL + 10 + i * 31}" cy="${soilY - 4 + (i % 3) * 6}" r="2"/>`).join('')}</g>
  ${plantsSvg}
  <rect x="${bedL - 20}" y="${soilY + 12}" width="${bedR - bedL + 40}" height="46" rx="8" fill="url(#plank)" ${LINE}/>
  <path d="M${bedL - 20} ${soilY + 35} H${bedR + 20}" stroke="#a9876a" stroke-width="2"/>
  <g fill="#33372f"><circle cx="${bedL - 4}" cy="${soilY + 24}" r="2.5"/><circle cx="${bedL - 4}" cy="${soilY + 46}" r="2.5"/><circle cx="${bedR + 4}" cy="${soilY + 24}" r="2.5"/><circle cx="${bedR + 4}" cy="${soilY + 46}" r="2.5"/></g>
  ${robot}
</svg>`;
  return { svg, plants, ratio: W / (BOTTOM - TOP) };
}

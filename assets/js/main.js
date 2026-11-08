/* ============================================================
   CLAB · interactions
   ============================================================ */

// --- Sticky header shadow on scroll ---
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// --- Mobile nav toggle ---
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
// Close menu when a link is tapped
mainNav.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  })
);

// --- Language toggle (visual only for now) ---
document.querySelectorAll('.lang-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.documentElement.setAttribute('lang', btn.dataset.lang);
  })
);

// --- Scroll-reveal animations ---
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('in-view'));
}

// --- Menu links (and Home) go straight to their place, with no gliding ---
(function () {
  const headH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute('href').slice(1);
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    window.scrollTo(0, el ? Math.round(el.getBoundingClientRect().top + window.scrollY - headH()) : 0);
    if (history.replaceState) history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
  });
})();

// --- Research: the menu on the left has three titles; clicking one opens its three
//     options (closing the others) and its panel on the right. In Where
//     and How, a name in the menu or a part of the picture lights that part up and
//     shows its text; parts stay in colour once found ---
(function () {
  const rs = document.getElementById('rs');
  if (!rs) return;
  const groups = [...rs.querySelectorAll('.rs-group')];
  const panels = [...rs.querySelectorAll('.rs-panel')];
  const items = [...rs.querySelectorAll('.rs-item')];

  function open(part) {
    groups.forEach(g => {
      g.classList.toggle('is-open', g.dataset.part === part);
      g.querySelector('.rs-sub').inert = g.dataset.part !== part; // closed: its options are hidden
    });
    panels.forEach(p => p.classList.toggle('is-open', p.dataset.part === part));
    rs.querySelectorAll('.rs-head').forEach(h => h.setAttribute('aria-expanded', String(h.dataset.part === part)));
    document.dispatchEvent(new CustomEvent('rs-open', { detail: part }));
  }
  function pick(part, id) {
    open(part);
    const panel = panels.find(p => p.dataset.part === part);
    items.forEach(b => { if (b.dataset.part === part) b.classList.toggle('is-active', b.dataset.item === id); });
    items.forEach(b => { if (b.dataset.part === part) b.setAttribute('aria-current', String(b.dataset.item === id)); });
    if (part === 'what') { // the full list is shown; the chosen question lights up briefly
      panel.querySelectorAll('.what-item').forEach(it => {
        it.classList.remove('is-flash');
        if (it.dataset.item === id) { void it.offsetWidth; it.classList.add('is-flash'); }
      });
      return;
    }
    panel.querySelectorAll('.art-layer').forEach(l => {
      const match = l.dataset.item === id;
      l.classList.toggle('is-active', match);
      if (match) l.classList.add('is-revealed');
    });
    panel.querySelectorAll('.rs-desc').forEach(d => d.classList.toggle('is-active', d.dataset.item === id));
    panel.querySelector('.rs-text').classList.add('has-pick');
    document.dispatchEvent(new CustomEvent('rs-pick', { detail: { part, id } }));
  }

  rs.querySelectorAll('.rs-head').forEach(h => h.addEventListener('click', () => open(h.dataset.part)));
  items.forEach(b => b.addEventListener('click', () => pick(b.dataset.part, b.dataset.item)));
  panels.forEach(p => {
    p.querySelectorAll('.art-hot').forEach(h => h.addEventListener('click', () => pick(p.dataset.part, h.dataset.item)));
    // the live network: any tap or click on it, on a node too (a touch on a node gives no 'click')
    p.querySelectorAll('.art-live').forEach(h => h.addEventListener('net-tap', () => pick(p.dataset.part, h.dataset.item)));
  });
  open('what');
})();

// --- Research > How: a small, live copy of the hero network. Picking "Computational
//     modelling" sends a spark through it; it runs only while it can be seen ---
(function () {
  const cvs = document.getElementById('howNet');
  if (!cvs || !cvs.getContext) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panel = cvs.closest('.rs-panel');
  let W = 0, H = 0, running = false, visible = false, quietSince = 0;
  const shown = () => visible && !document.hidden && (!panel || getComputedStyle(panel).visibility !== 'hidden');
  const net = makeNetwork(cvs, { reduce, scale: .72, count: () => 8, size: () => [W, H], box: () => ({ x1: W * .1, y1: H * .1, x2: W * .9, y2: H * .9 }), avoid: () => false, wake: () => wake() });
  function frame(now) {
    running = false;
    if (!shown()) return;
    net.hold(now);
    const energy = net.step(now);
    net.draw(now);
    if (reduce && !net.busy() && energy < .5) { if (!quietSince) quietSince = now; if (now - quietSince > 400) return; }
    else quietSince = 0;
    running = true;
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && shown()) { running = true; requestAnimationFrame(frame); } }
  function layout() {
    const r = cvs.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H) return;
    net.build(); net.draw(performance.now()); wake();
  }
  new ResizeObserver(layout).observe(cvs);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(cvs);
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('rs-open', () => setTimeout(wake, 60));
  document.addEventListener('rs-pick', e => {
    if (e.detail.id !== 'model' || !W) return;
    setTimeout(() => { net.spark(-1, W * Math.random(), H * Math.random(), performance.now()); wake(); }, 120);
  });
  window.__howNet = { graph: net.graph, waves: net.waves, running: () => running };
})();

// --- Resources: the four main circles open on CLICK; leaving one resets to four ---
(function () {
  const deck = document.querySelector('.res-deck');
  if (!deck) return;
  const circles = Array.from(deck.querySelectorAll('.res-circle'));

  function openCircle(circle) {
    deck.classList.add('has-open');
    circles.forEach(c => c.classList.toggle('is-open', c === circle));
  }

  circles.forEach(circle => {
    circle.setAttribute('tabindex', '0');
    circle.setAttribute('role', 'button');
    // Click to open; clicking another circle switches. The open one stays open.
    circle.addEventListener('click', () => openCircle(circle));
    circle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCircle(circle); }
    });
  });
})();

// --- "Our Values": hover a bubble to switch the text below ---
(function () {
  const row = document.getElementById('valuesRow');
  if (!row) return;
  const bubbles = row.querySelectorAll('.value-bubble');
  const texts = document.querySelectorAll('.res-values .value-text');
  function show(v) {
    bubbles.forEach(b => b.classList.toggle('is-active', b.dataset.v === v));
    texts.forEach(t => t.classList.toggle('is-active', t.dataset.v === v));
  }
  bubbles.forEach(b => {
    b.addEventListener('mouseenter', () => show(b.dataset.v));
    b.addEventListener('focus', () => show(b.dataset.v));
    b.addEventListener('click', () => show(b.dataset.v)); // a tap
  });
  if (window.matchMedia('(max-width: 760px)').matches && bubbles.length) show(bubbles[0].dataset.v);
})();

// --- Clicking shouldn't "lock" hover-driven UIs ---
// Mouse focus is what makes a clicked element stay open while you hover another.
// Suppress mouse focus anywhere inside these hover-driven sections (links still
// navigate on click; keyboard Tab navigation is unaffected since it has no mousedown).
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.rs, .res-deck, .people-grid')) e.preventDefault();
});

// --- "Open positions" popup (no openings right now) ---
(function () {
  const openBtn = document.getElementById('openPositionsBtn');
  const dialog = document.getElementById('positionsDialog');
  if (!openBtn || !dialog) return;
  openBtn.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
})();

// --- News: the arrows scroll the cards (newest left, oldest right) ---
(function () {
  const track = document.getElementById('newsTrack');
  const prev = document.getElementById('newsPrev');
  const next = document.getElementById('newsNext');
  if (!track || !prev || !next) return;
  function step() {
    const card = track.querySelector('.news-card');
    return card ? card.offsetWidth + 24 : 300;
  }
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft < 8;
    next.hidden = track.scrollLeft > max - 8;
  }
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  window.addEventListener('load', updateArrows);
  updateArrows();
})();

// --- Footer map: nothing is requested from Google until the visitor clicks ---
(function () {
  const box = document.getElementById('findusMap');
  const btn = document.getElementById('mapLoadBtn');
  const consent = document.getElementById('mapConsent');
  if (!box || !btn || !consent) return;
  btn.addEventListener('click', () => {
    const map = document.createElement('iframe');
    map.title = 'Map to the Max Planck Institute for Evolutionary Anthropology';
    map.src = 'https://www.google.com/maps?q=Max+Planck+Institute+for+Evolutionary+Anthropology,+Deutscher+Platz+6,+Leipzig&output=embed';
    map.referrerPolicy = 'no-referrer-when-downgrade';
    box.prepend(map);
    consent.hidden = true;
  });
})();

// --- Current year in footer ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- The network: nodes on springs, linked to their nearest neighbours (always one
//     piece), with electric sparks that run through it. Drag a node to keep sparking,
//     click for a single spark. Used by the hero, and in small in Research > How. ---
// cfg: size() -> [width, height]; box() -> the area for the nodes; avoid(x, y) -> true where
// links must not pass; wake() -> restart the animation loop; count(width) -> number of nodes;
// scale -> 1 for the hero, smaller for small copies; reduce -> reduced motion.
function makeNetwork(cvs, cfg) {
  const ctx = cvs.getContext('2d');
  const reduce = !!cfg.reduce, k = cfg.scale || 1;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const pad = (b, p) => ({ x1: b.x1 - p, y1: b.y1 - p, x2: b.x2 + p, y2: b.y2 + p });
  const keepIn = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const margin = n => n.rad * 1.5 + 4; // how close to the canvas edge a node may get
  const wake = () => cfg.wake();
  let W = 0, H = 0;
  const C = { graphite: hex('#2E343B'), slate: hex('#6D747E'), violet: hex('#6B5BA6'), lilac: hex('#B8AEDB'), moss: hex('#3F6B4E'), silver: hex('#9BA2AA'), white: [255, 255, 255] };
  let nodes = [], edges = [], adj = [], dpr = 1, waves = [];
  let drag = null, down = null, hoverI = -1, idleSpark = null, nextIdle = 0;
  const pointer = { x: -1e4, y: -1e4, inside: false };

  function crossesTitle(a, b) {
    for (let s = 1; s < 16; s++) {
      const u = s / 16;
      if (cfg.avoid(a.hx + (b.hx - a.hx) * u, a.hy + (b.hy - a.hy) * u)) return true;
    }
    return false;
  }
  function addEdge(i, j, key) {
    const id = Math.min(i, j) + '-' + Math.max(i, j);
    if (key.has(id)) return;
    key.add(id);
    edges.push({ a: i, b: j, rest: Math.hypot(nodes[i].hx - nodes[j].hx, nodes[i].hy - nodes[j].hy) });
    adj[i].push(j); adj[j].push(i);
  }
  function buildNetwork() {
    [W, H] = cfg.size();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    const b = pad(cfg.box(), -14 * k), bw = b.x2 - b.x1, bh = b.y2 - b.y1;
    const N = cfg.count ? cfg.count(W) : W < 760 ? 11 : 20, minD = .62 * Math.sqrt(bw * bh / N);
    nodes = [];
    for (let tries = 0; nodes.length < N && tries < 5000; tries++) {
      const x = b.x1 + bw * Math.random(), y = b.y1 + bh * Math.random();
      if (cfg.avoid(x, y)) continue;
      if (nodes.some(n => Math.hypot(n.hx - x, n.hy - y) < minD * (tries > 2500 ? .6 : 1))) continue;
      const z = .25 + Math.random() * .75, r = Math.random();
      const kind = r < .55 ? 'graphite' : r < .72 ? 'slate' : r < .88 ? 'violet' : 'moss';
      nodes.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, z, rad: (2.4 + 4.6 * z) * (.4 + .6 * k), col: C[kind],
        d: [0, 1, 2, 3].map(() => ({ a: (4 + Math.random() * 11) * k, f: .12 + Math.random() * .25, p: Math.random() * 6.28 })) });
    }
    const key = new Set();
    edges = []; adj = nodes.map(() => []);
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => [j, Math.hypot(m.hx - n.hx, m.hy - n.hy)])
        .filter(([j]) => j !== i && !crossesTitle(n, nodes[j])).sort((p, q) => p[1] - q[1]);
      near.slice(0, 2 + (Math.random() < .35 ? 1 : 0)).forEach(([j]) => addEdge(i, j, key));
    });
    // join separate pieces by their shortest link, so the network is always one piece
    for (;;) {
      const comp = nodes.map(() => -1);
      let nc = 0;
      nodes.forEach((n, i) => {
        if (comp[i] >= 0) return;
        const q = [i]; comp[i] = nc;
        while (q.length) { const k = q.pop(); for (const j of adj[k]) if (comp[j] < 0) { comp[j] = nc; q.push(j); } }
        nc++;
      });
      if (nc <= 1) break;
      let best = null;
      for (const strict of [true, false]) {
        nodes.forEach((a, i) => nodes.forEach((c, j) => {
          if (comp[i] !== 0 || comp[j] === 0 || (strict && crossesTitle(a, c))) return;
          const d = Math.hypot(a.hx - c.hx, a.hy - c.hy);
          if (!best || d < best[2]) best = [i, j, d];
        }));
        if (best) break;
      }
      addEdge(best[0], best[1], key);
    }
    waves = [];
  }

  function nodeAt(x, y) {
    let best = -1, bd = 24;
    nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd && d < n.rad + 16) { bd = d; best = i; } });
    return best;
  }

  // A spark: lightning jumps from node to node through the whole network
  function sendSpark(from, x, y, now) {
    if (from < 0) {
      let bd = Infinity;
      nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; from = i; } });
    }
    if (from < 0) return;
    const hop = nodes.map(() => -1), parent = nodes.map(() => -1), q = [from];
    hop[from] = 0;
    while (q.length) { const i = q.shift(); for (const j of adj[i]) if (hop[j] < 0) { hop[j] = hop[i] + 1; parent[j] = i; q.push(j); } }
    waves.push({ start: now, hop, parent, step: 85, jolted: new Set(), maxHop: Math.max(...hop) });
    if (waves.length > 6) waves.shift();
    wake();
  }
  const arrival = (w, i) => w.start + w.hop[i] * w.step;
  function flashOf(i, now) {
    let k = 0;
    for (const w of waves) {
      if (w.hop[i] < 0) continue;
      const t = now - arrival(w, i);
      if (t >= 0) k = Math.max(k, Math.exp(-t / 260));
    }
    return k;
  }

  let last = 0;
  function stepNetwork(now) {
    const dt = Math.min(.033, (now - (last || now)) / 1000), t = now / 1000;
    last = now;
    let energy = 0;
    for (const n of nodes) {
      let tx = n.hx, ty = n.hy;
      if (!reduce) {
        tx += n.d[0].a * Math.sin(t * n.d[0].f + n.d[0].p) + n.d[1].a * .5 * Math.sin(t * n.d[1].f * 1.7 + n.d[1].p);
        ty += n.d[2].a * Math.sin(t * n.d[2].f + n.d[2].p) + n.d[3].a * .5 * Math.sin(t * n.d[3].f * 1.6 + n.d[3].p);
      }
      n.fx = (tx - n.x) * 5; n.fy = (ty - n.y) * 5;
      if (pointer.inside && !drag && !reduce) {
        const dx = pointer.x - n.x, dy = pointer.y - n.y, d = Math.hypot(dx, dy);
        if (d < 190 * k) { n.fx += dx * 2.2 * (1 - d / (190 * k)); n.fy += dy * 2.2 * (1 - d / (190 * k)); }
      }
    }
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = 3.2 * (d - e.rest) / d;
      a.fx += dx * k; a.fy += dy * k; b.fx -= dx * k; b.fy -= dy * k;
    }
    if (!reduce) for (const w of waves) nodes.forEach((n, i) => { // a node twitches when a spark reaches it
      if (w.hop[i] >= 0 && now >= arrival(w, i) && !w.jolted.has(i)) {
        w.jolted.add(i); n.vx += (Math.random() - .5) * 150; n.vy += (Math.random() - .5) * 150;
      }
    });
    const damp = Math.exp(-5.5 * dt);
    nodes.forEach((n, i) => {
      if (drag && drag.i === i) { n.x = drag.x; n.y = drag.y; n.vx = n.vy = 0; return; }
      n.vx = (n.vx + n.fx * dt) * damp; n.vy = (n.vy + n.fy * dt) * damp;
      n.x += n.vx * dt; n.y += n.vy * dt;
      const m = margin(n); // never pushed out of sight
      if (n.x < m || n.x > W - m) { n.x = keepIn(n.x, m, W - m); n.vx = 0; }
      if (n.y < m || n.y > H - m) { n.y = keepIn(n.y, m, H - m); n.vy = 0; }
      energy += Math.abs(n.vx) + Math.abs(n.vy) + Math.abs(n.fx) * .02 + Math.abs(n.fy) * .02;
    });
    return energy;
  }

  // jagged lightning, redrawn every frame so it crackles
  function boltPts(ax, ay, bx, by, amp) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const n = Math.max(2, Math.round(len / 11)), pts = [[ax, ay]];
    for (let i = 1; i < n; i++) {
      const u = i / n, j = (Math.random() * 2 - 1) * amp * Math.sin(Math.PI * u);
      pts.push([ax + dx * u + nx * j, ay + dy * u + ny * j]);
    }
    pts.push([bx, by]);
    return pts;
  }
  function strokeBolt(pts, a) {
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(C.lilac, .45 * a); ctx.lineWidth = 7; path();
    ctx.strokeStyle = rgba(C.violet, .95 * a); ctx.lineWidth = 2.2; path();
    ctx.strokeStyle = rgba(C.white, .95 * a); ctx.lineWidth = .9; path();
  }
  function drawNetwork(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const px = pointer.inside && !reduce ? (pointer.x - W / 2) / W : 0, py = pointer.inside && !reduce ? (pointer.y - H / 2) / H : 0;
    const P = nodes.map(n => ({ x: n.x + px * (n.z - .5) * 40 * k, y: n.y + py * (n.z - .5) * 30 * k }));
    const fl = nodes.map((n, i) => flashOf(i, now));
    ctx.lineCap = 'round';
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b], k = Math.min(fl[e.a], fl[e.b]);
      ctx.strokeStyle = rgba(mix(C.silver, C.violet, Math.min(1, k * 1.4)), .22 + .3 * Math.min(a.z, b.z) + .3 * k);
      ctx.lineWidth = .9 + .8 * Math.min(a.z, b.z) + k;
      ctx.beginPath(); ctx.moveTo(P[e.a].x, P[e.a].y); ctx.lineTo(P[e.b].x, P[e.b].y); ctx.stroke();
    }
    // sparks travelling outwards: bolts grow along each link, then flicker out
    waves = waves.filter(w => now - w.start < (w.maxHop + 1) * w.step + 1500);
    for (const w of waves) {
      nodes.forEach((n, i) => {
        const p = w.parent[i];
        if (p < 0) return;
        const t0 = arrival(w, p);
        if (now < t0) return;
        const u = Math.min(1, (now - t0) / w.step), age = now - t0 - w.step;
        let a = age < 0 ? 1 : Math.exp(-age / 150);
        if (a < .04) return;
        a *= .55 + .45 * Math.random();
        const ex = P[p].x + (P[i].x - P[p].x) * u, ey = P[p].y + (P[i].y - P[p].y) * u;
        strokeBolt(boltPts(P[p].x, P[p].y, ex, ey, (5 + Math.random() * 5) * k), a);
        if (u < 1 && Math.random() < .3) { // side crackle at the front of the spark
          const ang = Math.random() * 6.28, l = (8 + Math.random() * 12) * k;
          strokeBolt(boltPts(ex, ey, ex + Math.cos(ang) * l, ey + Math.sin(ang) * l, 3), a * .7);
        }
      });
    }
    // now and then a tiny discharge on a random link, while idle
    if (!reduce && !waves.length && edges.length) {
      if (!nextIdle) nextIdle = now + 4000 + Math.random() * 5000;
      if (now > nextIdle) { idleSpark = { e: edges[Math.floor(Math.random() * edges.length)], t: now }; nextIdle = now + 5000 + Math.random() * 6000; }
      if (idleSpark && now - idleSpark.t < 260) {
        const e = idleSpark.e;
        strokeBolt(boltPts(P[e.a].x, P[e.a].y, P[e.b].x, P[e.b].y, 4), (.4 + .4 * Math.random()) * (1 - (now - idleSpark.t) / 260));
      }
    }
    const order = nodes.map((n, i) => i).sort((a, b) => nodes[a].z - nodes[b].z);
    for (const i of order) {
      const n = nodes[i], k = fl[i], { x, y } = P[i];
      const col = mix(n.col, C.violet, Math.min(1, k * 1.6)), halo = n.rad * (3.4 + 3 * k);
      const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
      g.addColorStop(0, rgba(k > .2 ? C.lilac : col, .16 + .12 * n.z + .45 * k)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, halo, 0, 6.29); ctx.fill();
      ctx.fillStyle = rgba(col, .35 + .55 * n.z + .1 * k);
      ctx.beginPath(); ctx.arc(x, y, n.rad + 1.5 * k, 0, 6.29); ctx.fill();
      if (k > .3) { // white-hot centre and a quick shock ring
        ctx.fillStyle = rgba(C.white, Math.min(1, k)); ctx.beginPath(); ctx.arc(x, y, n.rad * .45, 0, 6.29); ctx.fill();
        ctx.strokeStyle = rgba(C.lilac, k * .8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, n.rad + 4 + 18 * (1 - k), 0, 6.29); ctx.stroke();
      }
      if ((hoverI === i && !drag) || (drag && drag.i === i)) {
        ctx.strokeStyle = rgba(C.violet, .9); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, n.rad + 5, 0, 6.29); ctx.stroke();
      }
    }
  }

  /* Pointer: hold and drag a node (sparks keep flowing while held); click or tap
     empty space for a single spark. Touch only captures when it lands on a node. */
  const local = e => { const r = cvs.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cvs.addEventListener('pointermove', e => {
    const p = local(e);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
    if (drag) { // a held node follows the pointer, but stays inside the canvas
      const m = margin(nodes[drag.i]);
      drag.x = keepIn(p.x, m, W - m); drag.y = keepIn(p.y, m, H - m);
      if (down && Math.hypot(p.x - down.x, p.y - down.y) > 4) down.moved = true;
    } else { hoverI = nodeAt(p.x, p.y); cvs.style.cursor = hoverI >= 0 ? 'grab' : 'pointer'; }
    wake();
  });
  cvs.addEventListener('pointerleave', () => { pointer.inside = false; hoverI = -1; });
  cvs.addEventListener('pointerdown', e => {
    const p = local(e), i = nodeAt(p.x, p.y), now = performance.now();
    down = { x: p.x, y: p.y, i, moved: false };
    if (i >= 0) {
      drag = { i, x: p.x, y: p.y, lastSpark: now };
      sendSpark(i, 0, 0, now);
      cvs.setPointerCapture(e.pointerId);
      cvs.style.cursor = 'grabbing';
    }
    wake();
  });
  const release = cancelled => {
    if (down && down.i < 0 && !down.moved && !cancelled) sendSpark(-1, down.x, down.y, performance.now());
    if (down && !cancelled) cvs.dispatchEvent(new CustomEvent('net-tap')); // the page may react to it
    drag = null; down = null;
    cvs.style.cursor = hoverI >= 0 ? 'grab' : 'pointer';
  };
  cvs.addEventListener('pointerup', () => release(false));
  cvs.addEventListener('pointercancel', () => release(true));
  cvs.addEventListener('touchstart', e => {
    const r = cvs.getBoundingClientRect(), t = e.touches[0];
    if (nodeAt(t.clientX - r.left, t.clientY - r.top) >= 0) e.preventDefault(); // hold the node instead of scrolling
  }, { passive: false });

  return {
    build: buildNetwork, step: stepNetwork, draw: drawNetwork, spark: sendSpark,
    // while a node is held, sparks keep coming
    hold(now) { if (drag && now - drag.lastSpark > 420) { sendSpark(drag.i, 0, 0, now); drag.lastSpark = now; } },
    busy: () => !!drag || waves.length > 0,
    graph: () => ({ n: nodes.length, adj: adj.map(a => a.slice()), pos: nodes.map(n => [Math.round(n.x), Math.round(n.y)]) }),
    waves: () => waves.length
  };
}

// --- Hero: a playful network (computation) and walking footprints (nature) ---
// Everything here is decorative: hidden from screen readers, paused while off
// screen, and still when the visitor's system asks for reduced motion.
(function () {
  const hero = document.getElementById('hero');
  const cvs = document.getElementById('heroNet');
  const tracks = document.getElementById('heroTracks');
  const trail = document.getElementById('pageTrail');
  const inner = document.getElementById('heroInner');
  const hint = document.getElementById('heroHint');
  if (!hero || !cvs || !tracks || !trail || !inner || !cvs.getContext) return;
  if (hint) hint.hidden = false;

  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const f = v => v.toFixed(1);
  const wrapAng = a => Math.atan2(Math.sin(a), Math.cos(a));
  const pad = (b, p) => ({ x1: b.x1 - p, y1: b.y1 - p, x2: b.x2 + p, y2: b.y2 + p });
  const inBox = (x, y, b) => x > b.x1 && x < b.x2 && y > b.y1 && y < b.y2;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // Footprint shapes, drawn pointing up (the direction of travel), as a right foot
  const defs = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute' }, document.body);
  defs.innerHTML =
    '<symbol id="fp-human" viewBox="0 0 100 100"><g fill="currentColor"><path d="M48 98C38 98 33 90 34 79C35 70 40 64 40 56C40 49 34 44 34 35C34 26 41 21 50 21C60 21 67 27 67 37C67 48 60 56 60 66C60 76 62 82 61 88C60 94 55 98 48 98Z"/><ellipse cx="40" cy="11" rx="6.5" ry="8"/><ellipse cx="51" cy="8.5" rx="4.2" ry="5"/><ellipse cx="59" cy="10.5" rx="3.7" ry="4.4"/><ellipse cx="65.5" cy="15" rx="3.3" ry="3.9"/><ellipse cx="70" cy="21.5" rx="2.9" ry="3.4"/></g></symbol>' +
    '<symbol id="fp-dog" viewBox="0 0 100 100"><g fill="currentColor"><path d="M50 93C38 93 29 87 30 77C31 69 39 66 43 62C47 58 47 54 50 54C53 54 53 58 57 62C61 66 69 69 70 77C71 87 62 93 50 93Z"/><ellipse cx="27" cy="50" rx="7" ry="9" transform="rotate(-22 27 50)"/><ellipse cx="41" cy="34" rx="7" ry="9.5" transform="rotate(-7 41 34)"/><ellipse cx="59" cy="34" rx="7" ry="9.5" transform="rotate(7 59 34)"/><ellipse cx="73" cy="50" rx="7" ry="9" transform="rotate(22 73 50)"/></g></symbol>' +
    '<symbol id="fp-bird" viewBox="0 0 100 100"><path d="M50 62L50 12M50 62L22 28M50 62L78 28M50 62L50 94" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></symbol>';

  /* ---------- layout: the title area, the network's area, and the rest for footprints ---------- */
  let W = 0, H = 0, titleBox = null, headBox = null, tagBox = null, netBox = null, hintBox = null, netBlocks = true, wide = true, scale = 1;

  // the box around some elements' text lines (not their full-width blocks), in hero coordinates
  function boxOf(selector) {
    const hr = hero.getBoundingClientRect(), rects = [];
    inner.querySelectorAll(selector).forEach(c => {
      if (c.tagName === 'IMG') { rects.push(c.getBoundingClientRect()); return; }
      const rg = document.createRange(); rg.selectNodeContents(c); rects.push(...rg.getClientRects());
    });
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const r of rects) {
      if (!r.width) continue;
      x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    }
    return { x1: x1 - hr.left, y1: y1 - hr.top, x2: x2 - hr.left, y2: y2 - hr.top };
  }
  function setZones() {
    titleBox = pad(boxOf('.hero-logo, .hero-title, .hero-tagline'), 22);
    headBox = pad(boxOf('.hero-logo, .hero-title'), 22);
    tagBox = boxOf('.hero-tagline');
    scale = W < 760 ? .8 : 1;
    netBlocks = true;
    // wide screens: the network has the space beside the logo and title, down to the tagline's row
    netBox = { x1: Math.max(headBox.x2 + 20, W * .42), y1: H * .06, x2: W - 24, y2: tagBox.y1 - 14 };
    wide = W >= 900 && netBox.x2 - netBox.x1 > 300 && netBox.y2 - netBox.y1 > 220;
    if (!wide) {
      // narrow screens: the network sits under the title, footprints below it
      netBox = { x1: 20, y1: titleBox.y2 + 6, x2: W - 20, y2: Math.min(H - 190, Math.max(titleBox.y2 + 150, H * .68)) };
      if (netBox.y2 - netBox.y1 < 120) { // very short screens: share the space
        netBox = { x1: 20, y1: titleBox.y2 + 6, x2: W - 20, y2: Math.min(H, window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72)) - 50 };
        netBlocks = false;
      }
    }
    placeHint();
  }
  // the instructions sit under the network; on wide screens on the same row as the tagline
  function placeHint() {
    hintBox = null;
    if (!hint) return;
    const hw = hint.offsetWidth, hh = hint.offsetHeight;
    let cx = wide ? clamp(netBox.x2 - hw / 2, hw / 2 + 12, W - hw / 2 - 12) : W / 2; // right-aligned with the network; centred on narrow screens
    // keep it on the first screen, even when the hero is taller than the window
    const seen = Math.min(H, window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72));
    let top = Math.min(netBox.y2 + 10, seen - hh - 12);
    if (wide) {
      cx = clamp(Math.max(cx, tagBox.x2 + 32 + hw / 2), hw / 2 + 12, W - hw / 2 - 12);
      if (cx - hw / 2 > tagBox.x2 + 16) top = (tagBox.y1 + tagBox.y2) / 2 - hh / 2; // room beside the tagline
    }
    hint.style.left = Math.round(cx) + 'px';
    hint.style.top = Math.round(top) + 'px';
    hintBox = pad({ x1: cx - hw / 2, y1: top, x2: cx + hw / 2, y2: top + hh }, 10);
    hint.classList.toggle('note-up', top > seen * .7); // near the bottom, the (i) note opens upwards
  }
  // the logo and title block, or the tagline line (the network keeps clear of both)
  const inTitle = (x, y) => inBox(x, y, headBox) || inBox(x, y, pad(tagBox, 22));
  // where the bird goes back to at the top of the page: below the title (and the network on narrow screens)
  const clearY = () => wide || !netBlocks ? titleBox.y2 : Math.max(titleBox.y2, netBox.y2, hintBox ? hintBox.y2 : 0);


  /* ================= NETWORK (makeNetwork, above) ================= */
  const net = makeNetwork(cvs, { reduce, wake: () => wake(), size: () => [W, H], box: () => netBox, avoid: (x, y) => inTitle(x, y) });

  /* ================= FOOTPRINTS ================= */
  // Three walkers are always there: a human, a dog and a bird.
  // size: print length (px), step: distance per step, side: half the gap between
  // left and right prints, every: ms per step, turn: largest turn per step (degrees)
  const SPECIES = {
    human: { size: 45, step: 56, side: 11, every: 640, turn: 12, color: '#5A616A', op: .34, mirror: true, splay: 6, sharp: true },
    dog: { size: 18, step: 24, side: 6, every: 300, turn: 15, color: '#6F9E72', op: .45, mirror: false, splay: 4 },
    bird: { size: 16, step: 16, side: 4, every: 230, turn: 17, color: '#6B5BA6', op: .42, mirror: false, splay: 16 }
  };
  // Which walkers are on. Switched off for now: the human and the dog. To bring one back,
  // add it to this list, e.g. ['human', 'bird'] or ['human', 'bird', 'dog'].
  const KINDS = ['bird'];
  let walkers = [];

  function placePrint(svg, w, x, y, ang, delay, avoid) {
    const sp = SPECIES[w.kind], k = scale, size = sp.size * k;
    if (delay >= 10000) return null;
    const px = x - Math.sin(ang) * sp.side * k * w.foot, py = y + Math.cos(ang) * sp.side * k * w.foot;
    if (avoid && avoid.some(b => b && inBox(px, py, b))) return null; // passes behind the title or the network unseen
    const deg = ang * 180 / Math.PI + 90 + w.foot * sp.splay + (Math.random() - .5) * 4;
    const u = el('use', {
      href: '#fp-' + w.kind, width: f(size), height: f(size), x: f(-size / 2), y: f(-size / 2),
      transform: `translate(${f(px)} ${f(py)}) rotate(${f(deg)})${sp.mirror && w.foot < 0 ? ' scale(-1 1)' : ''}`,
      class: w.still ? 'fp still' : 'fp',
      style: `--o:${sp.op};color:${sp.color}` + (delay ? `;animation-delay:${-Math.round(delay)}ms` : '')
    }, svg);
    if (!w.still) u.addEventListener('animationend', () => u.remove());
    return u;
  }
  // prints show everywhere (behind the title too), except in the network area and under the instructions
  const heroAvoid = () => [netBlocks ? netBox : null, hintBox];

  function blocked(x, y, w) {
    if (x < 14 || x > W - 14) return true;
    if (!w.entered) return false; // still coming in from the top edge
    if (y < 14 || y > H - 14) return true;
    if (netBlocks && inBox(x, y, pad(netBox, 10))) return true;
    return !!hintBox && inBox(x, y, hintBox);
  }
  // Walkers enter from the top edge, above the logo, each at its own place
  function entryX(kind) {
    const logo = inner.querySelector('.hero-logo'), hr = hero.getBoundingClientRect();
    const r = logo ? logo.getBoundingClientRect() : { left: hr.left + W * .2, width: 80 };
    const cx = r.left - hr.left + r.width / 2, d = Math.max(56, r.width * .8);
    const slot = { human: -1, bird: 0, dog: 1 }[kind] || 0; // each keeps its own place, whichever are on
    return clamp(cx + slot * d, 18, W - 18);
  }
  // the human's line: below the text (and below the network on narrow screens)
  function laneY() {
    const top = (wide ? Math.max(tagBox.y2, hintBox ? hintBox.y2 : 0) : clearY()) + 34;
    const bottom = H - 34 - SPECIES.human.step * scale; // room for the way back, one line lower
    return bottom < top ? H - 70 : top + (bottom - top) * .35;
  }
  function newWalker(kind, next) {
    if (kind === 'human') { // comes in from the left, below the text, heading right
      return { kind, x: -24, y: laneY(), ang: 0, dir: 1, corner: false, foot: 1, entered: true, next };
    }
    return { kind, x: entryX(kind), y: -22, ang: Math.PI / 2 + (Math.random() - .5) * .2,
      wander: 0, pref: Math.random() < .5 ? -1 : 1, foot: 1, entered: false, leg: 3, next };
  }
  // One step. The dog and the bird wander in gentle curves; the human walks in
  // straight stretches with sharp corners. All keep away from the network and the edges.
  // The human walks straight across and back again. At each end it turns two sharp
  // corners onto a parallel line, so the way back runs just beside the way out.
  function stepHuman(w, delay) {
    const step = SPECIES.human.step * scale;
    if (w.corner) { w.ang = w.dir > 0 ? 0 : Math.PI; w.corner = false; }
    else if ((w.dir > 0 && w.x > W - 40) || (w.dir < 0 && w.x < 40)) {
      w.ang = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; // down at the right end, up at the left end
      w.dir = -w.dir; w.corner = true;
    }
    w.x += Math.cos(w.ang) * step; w.y += Math.sin(w.ang) * step;
    w.foot = -w.foot;
    placePrint(tracks, w, w.x, w.y, w.ang, delay, heroAvoid());
  }
  function stepWalker(w, delay) {
    if (w.kind === 'human') { stepHuman(w, delay); return; }
    const sp = SPECIES[w.kind], maxTurn = sp.turn * Math.PI / 180;
    let step = sp.step * scale;
    if (!w.entered && w.y > 30) w.entered = true;
    const look = step * 3 + 30;
    const free = a => !blocked(w.x + Math.cos(a) * look * .5, w.y + Math.sin(a) * look * .5, w) &&
                      !blocked(w.x + Math.cos(a) * look, w.y + Math.sin(a) * look, w);
    const firstFree = (from, by) => {
      for (let s = 1; s <= 12; s++) for (const sg of [w.pref, -w.pref]) { const a = from + sg * s * by; if (free(a)) return a; }
      return null;
    };
    if (sp.sharp) {
      let desired = w.entered ? w.ang : Math.PI / 2;
      if (w.entered && --w.leg <= 0) { // a corner: turn sharply, then walk straight again
        desired = w.ang + (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * .9);
        w.leg = 4 + Math.floor(Math.random() * 6);
      }
      if (!free(desired)) {
        const a = firstFree(desired, .35);
        desired = a === null ? w.ang + w.pref * Math.PI / 2 : a;
        w.leg = 3 + Math.floor(Math.random() * 4);
      }
      w.ang = desired;
    } else {
      w.wander = clamp(w.wander * .9 + (Math.random() * 2 - 1) * maxTurn * .5, -maxTurn, maxTurn);
      let desired = w.entered ? w.ang + w.wander : Math.PI / 2 + w.wander; // first: in from the top edge
      if (!free(desired)) {
        const a = firstFree(desired, .26);
        desired = a === null ? w.ang + w.pref * maxTurn : a;
      }
      w.ang += clamp(wrapAng(desired - w.ang), -maxTurn, maxTurn);
    }
    w.x += Math.cos(w.ang) * step; w.y += Math.sin(w.ang) * step;
    w.foot = -w.foot;
    placePrint(tracks, w, w.x, w.y, w.ang, delay, heroAvoid());
  }

  const lost = w => w.x > W + 60 || w.x < -60 || w.y > H + 60 || w.y < -80;

  function buildTracks(now) {
    tracks.textContent = '';
    tracks.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (reduce) { // still trails, one per walker
      walkers = [];
      KINDS.forEach(kind => {
        const w = newWalker(kind, 0);
        for (let i = 0; i < 6; i++) stepWalker(w, 1e9); // walk in unseen
        w.still = true;
        for (let i = 0; i < (kind === 'bird' ? 20 : 12); i++) stepWalker(w, 0);
      });
      return;
    }
    // the human comes in from the left, the bird from the top
    walkers = KINDS.map((kind, i) => newWalker(kind, now + 300 + i * 900));
  }
  function stepTracks(now) {
    for (const w of walkers) {
      if (w.hidden) { w.next = now; continue; }
      const sp = SPECIES[w.kind];
      if (now - w.next > 2000) w.next = now; // no burst of steps after a pause
      while (now >= w.next) {
        w.next += sp.every;
        stepWalker(w, 0);
        if (lost(w)) Object.assign(w, newWalker(w.kind, now + 1500)); // back in from the top
      }
    }
  }

  /* ---------- the bird walks down the page margin as the reader scrolls ---------- */
  // The same bird keeps walking: scrolling gives it steps, so it stops when
  // scrolling stops. It heads for the left margin (crossing the page if it has
  // to), weaves gently down it, and turns in a small U when the reader scrolls back.
  const FOLLOW_FROM = 30;
  let page = null;
  const shift = (b, dy) => b && { x1: b.x1, x2: b.x2, y1: b.y1 + dy, y2: b.y2 + dy };
  function enterPage() {
    const bird = walkers.find(w => w.kind === 'bird');
    if (!bird) return;
    const top = hero.getBoundingClientRect().top + window.scrollY;
    const foot = document.getElementById('findus');
    const end = (foot ? foot.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight) - 30;
    const vw = document.documentElement.clientWidth, g = Math.max(0, (vw - 1160) / 2) + 24; // left page margin
    trail.style.height = Math.ceil(end + 30) + 'px';
    bird.hidden = true;
    bird.y += top; // from here on, page coordinates
    page = { bird, top, end, lastY: window.scrollY, budget: 0, keep: [], heroBottom: top + H,
      // the right page margin; phones have almost none, so there the U-turn swings
      // towards the page and may brush its edge
      gx: vw - Math.max(12, g / 2), amp: clamp(g / 2 - 18, 0, 34),
      uc: g < 60 ? vw - (g + 22) : vw - g / 2, edge: g < 60 ? vw - (g + 56) : vw - g,
      avoid: heroAvoid().map(b => shift(b, top)) };
  }
  function leavePage() {
    const b = page.bird;
    page.keep.forEach(fadeOut);
    b.y -= page.top; b.hidden = false; b.entered = true; b.wander = 0; b.uSide = 0;
    page = null;
  }
  function fadeOut(u) { u.setAttribute('class', 'fp gone'); u.addEventListener('animationend', () => u.remove()); }
  function pageTarget() {
    const home = page.top + clearY() + 50; // just below the title, in the margin
    let ty = clamp(Math.max(window.scrollY + window.innerHeight * .6, home), 0, page.end);
    // still crossing the hero towards the margin: finish that inside the hero, so that no
    // steps fall on the content below it (those are not drawn, and the trail would break)
    const b = page.bird;
    if (b.x < page.edge + 8 && b.y < page.heroBottom) ty = Math.min(ty, Math.max(page.heroBottom - 60, b.y + 6));
    return { x: page.gx + page.amp * Math.sin(ty / 170), y: ty }; // a gentle wave down the margin
  }
  function pageStep(T) {
    const b = page.bird, sp = SPECIES.bird, step = sp.step * scale, maxTurn = sp.turn * Math.PI / 180;
    b.wander = clamp(b.wander * .85 + (Math.random() * 2 - 1) * maxTurn * .35, -maxTurn * .6, maxTurn * .6);
    let diff = wrapAng(Math.atan2(T.y - b.y, T.x - b.x) + b.wander - b.ang);
    // turning back: a small U, committed to the side that keeps it in the margin
    if (!b.uSide && Math.abs(diff) > 1.6) {
      const lean = sg => Math.cos(b.ang + sg * maxTurn) * (page.uc - b.x);
      b.uSide = lean(1) >= lean(-1) ? 1 : -1;
    }
    if (b.uSide) {
      if (Math.abs(diff) < .6) b.uSide = 0;
      else if (Math.sign(diff) !== b.uSide) diff += b.uSide * 2 * Math.PI;
    }
    const cap = maxTurn * 1.4; // a slightly tighter turn than in the hero
    b.ang += clamp(diff, -cap, cap);
    b.x += Math.cos(b.ang) * step; b.y += Math.sin(b.ang) * step;
    b.foot = -b.foot;
    page.k = (page.k || 0) + 1; // step number (prints carry it, for the automated checks)
    // below the hero, prints that would land on the content are skipped
    if (b.y > page.heroBottom && b.x < page.edge + 4) return;
    const u = placePrint(trail, { kind: 'bird', foot: b.foot, still: true }, b.x, b.y, b.ang, 0, page.avoid);
    if (u) { u.setAttribute('data-k', page.k); page.keep.push(u); while (page.keep.length > 2) fadeOut(page.keep.shift()); } // it stands on its last two
  }
  const near = T => Math.hypot(T.x - page.bird.x, T.y - page.bird.y);
  function updatePage() {
    if (reduce || !titleBox) return;
    const y = window.scrollY;
    if (!page) { if (y <= FOLLOW_FROM) return; enterPage(); if (!page) return; }
    const b = page.bird, step = SPECIES.bird.step * scale, moved = Math.abs(y - page.lastY);
    page.lastY = y;
    let T = pageTarget(), dist = near(T);
    if (moved > window.innerHeight * 1.2 && dist > 600) { // the page jumped (a menu link): land a few steps short
      const dir = T.y >= b.y ? 1 : -1;
      b.x = T.x; b.y = T.y - dir * 150; b.ang = dir * Math.PI / 2;
      page.budget = 170; dist = 150;
    }
    if (y <= FOLLOW_FROM) { // back at the top: the loop walks it home
      if (dist > 400) { const T2 = pageTarget(), dir = T2.y >= b.y ? 1 : -1; b.x = T2.x; b.y = T2.y - dir * 150; b.ang = dir * Math.PI / 2; }
      return;
    }
    page.budget += moved * (1.15 + clamp((dist - 120) / 300, 0, 1.4)); // catches up when it falls behind
    for (let n = 0; page.budget >= step && n < 60; n++) {
      page.budget -= step;
      T = pageTarget();
      if (near(T) < step * 1.5) { page.budget = 0; break; } // caught up: wait here
      pageStep(T);
    }
  }
  // back at the top of the page, the bird walks back under the title and wanders again
  let homeNext = 0;
  function walkHome(now) {
    if (now < homeNext) return;
    homeNext = now + SPECIES.bird.every / 2;
    const T = pageTarget();
    if (near(T) < SPECIES.bird.step * scale * 2) { leavePage(); return; }
    pageStep(T);
  }
  let trailQueued = false;
  window.addEventListener('scroll', () => {
    if (trailQueued) return;
    trailQueued = true;
    requestAnimationFrame(() => { trailQueued = false; updatePage(); });
  }, { passive: true });


  /* ================= LOOP: runs only while the hero is on screen ================= */
  let heroVisible = true, running = false, quietSince = 0;
  function frame(now) {
    running = false;
    if (!heroVisible || document.hidden) return;
    if (!reduce) stepTracks(now);
    if (page && window.scrollY <= FOLLOW_FROM) walkHome(now);
    net.hold(now); // keep sparking while a node is held
    const energy = net.step(now);
    net.draw(now);
    // with reduced motion the loop sleeps once everything has settled
    if (reduce && !net.busy() && energy < .5) { if (!quietSince) quietSince = now; if (now - quietSince > 400) return; }
    else quietSince = 0;
    running = true;
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && heroVisible) { running = true; last = 0; requestAnimationFrame(frame); } }
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; if (heroVisible) wake(); }).observe(hero);
  document.addEventListener('visibilitychange', wake);

  function layoutHero() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H) return;
    if (page) { page.keep.forEach(fadeOut); page = null; }
    setZones();
    const now = performance.now();
    net.build(); buildTracks(now); net.draw(now); wake();
    updatePage();
  }
  let rz = 0, lastW = 0, lastH = 0;
  new ResizeObserver(() => {
    const r = hero.getBoundingClientRect();
    // ignore small height changes from phone address bars
    if (Math.round(r.width) === lastW && Math.abs(Math.round(r.height) - lastH) < 80) return;
    lastW = Math.round(r.width); lastH = Math.round(r.height);
    cancelAnimationFrame(rz); rz = requestAnimationFrame(layoutHero);
  }).observe(hero);
  if (document.fonts) document.fonts.ready.then(() => requestAnimationFrame(layoutHero));

  // test hook for the automated checks
  window.__hero = {
    graph: net.graph,
    zones: () => ({ titleBox, headBox, tagBox, netBox, hintBox, netBlocks, wide }),
    walkers: () => walkers.map(w => ({ kind: w.kind, x: w.x, y: w.y, ang: w.ang, hidden: !!w.hidden, entered: w.entered })),
    page: () => page && { x: page.bird.x, y: page.bird.y, gx: page.gx, edge: page.edge },
    rebuild: layoutHero, waves: net.waves
  };
})();

// --- Network instructions: the (i) button shows where the idea came from ---
(function () {
  const btn = document.getElementById('hintInfo');
  const note = document.getElementById('hintNote');
  if (!btn || !note) return;
  const show = open => { note.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', e => { e.stopPropagation(); show(note.hidden); });
  document.addEventListener('click', e => { if (!note.hidden && !note.contains(e.target)) show(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !note.hidden) { show(false); btn.focus(); } });
})();

// --- Join Us: roots grow down both sides (the centre stays free for the text);
//     moving the mouse over them sends a small pulse down the nearest root ---
(function () {
  const sec = document.getElementById('join');
  if (!sec) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'join-roots');
  svg.setAttribute('aria-hidden', 'true');
  sec.prepend(svg);
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const f = v => v.toFixed(1);
  const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let tips = [], pulses = null, builtW = 0, builtH = 0, lastPulse = 0;

  function build() {
    const W = sec.clientWidth, H = sec.clientHeight;
    if (!W || !H || (W === builtW && Math.abs(H - builtH) < 20)) return;
    builtW = W; builtH = H;
    svg.textContent = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const rnd = seeded(11), lines = el('g', { fill: 'none', 'stroke-linecap': 'round' }, svg), dots = el('g', {}, svg);
    tips = [];
    function grow(x, y, ang, len, w, depth, chain, side) {
      const x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(ang) * len;
      const path = el('path', {
        d: `M${f(x)} ${f(y)}Q${f((x + x2) / 2 + (rnd() - .5) * len * .5)} ${f((y + y2) / 2)} ${f(x2)} ${f(y2)}`,
        stroke: depth > 2 && rnd() < .3 ? '#6D747E' : '#3F6B4E', 'stroke-opacity': (.55 - depth * .06).toFixed(2), 'stroke-width': f(w)
      }, lines);
      const next = chain.concat([path]);
      const kids = depth >= 5 || y2 > H - 8 ? 0 : rnd() < .55 ? 2 : 1;
      if (kids === 2) el('circle', { cx: f(x2), cy: f(y2), r: f(Math.max(1.6, w * .9)), fill: rnd() < .35 ? '#6B5BA6' : '#6F9E72', 'fill-opacity': .75 }, dots);
      if (!kids) { tips.push({ x: x2, y: y2, chain: next }); el('circle', { cx: f(x2), cy: f(y2), r: 1.8, fill: '#6F9E72', 'fill-opacity': .7 }, dots); return; }
      for (let k = 0; k < kids; k++) {
        const spread = kids === 2 ? (k ? 1 : -1) * (.25 + rnd() * .35) : (rnd() - .5) * .5;
        grow(x2, y2, ang * .6 + spread, len * (.72 + rnd() * .16), Math.max(.8, w * .68), depth + 1, next, side);
      }
    }
    // a few roots on each side, leaning outwards a little
    const sideW = W < 700 ? W * .16 : W * .24, n = Math.max(2, Math.round(sideW / 85));
    for (const side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const x = side < 0 ? (i + .5) * sideW / n : W - (i + .5) * sideW / n;
        grow(x + (rnd() - .5) * 20, -2, side * (.08 + rnd() * .22), H * (.2 + rnd() * .08), 2.8, 0, [], side);
      }
    }
    pulses = el('g', {}, svg);
  }
  function pulse(x, y) {
    if (reduce || !tips.length) return;
    const now = performance.now();
    if (now - lastPulse < 420) return;
    lastPulse = now;
    let best = tips[0], bd = Infinity;
    for (const t of tips) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
    if (bd > 260) return;
    const lens = best.chain.map(p => p.getTotalLength()), total = lens.reduce((a, b) => a + b, 0);
    const glow = el('circle', { r: 9, fill: '#E2B33C', 'fill-opacity': .3 }, pulses), dot = el('circle', { r: 3.2, fill: '#E2B33C' }, pulses);
    const t0 = performance.now(), dur = 900 + total * 1.2;
    (function tick(t) {
      const u = (t - t0) / dur;
      if (u >= 1) { glow.remove(); dot.remove(); return; }
      let d = u * total, k = 0;
      while (k < lens.length - 1 && d > lens[k]) { d -= lens[k]; k++; }
      const p = best.chain[k].getPointAtLength(Math.min(d, lens[k]));
      for (const c of [glow, dot]) { c.setAttribute('cx', f(p.x)); c.setAttribute('cy', f(p.y)); }
      requestAnimationFrame(tick);
    })(t0);
  }
  const local = e => { const r = sec.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  sec.addEventListener('pointermove', e => pulse(...local(e)));
  sec.addEventListener('pointerdown', e => { lastPulse = 0; pulse(...local(e)); });
  new ResizeObserver(build).observe(sec);
})();

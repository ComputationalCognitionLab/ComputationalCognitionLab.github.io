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

// --- Research themes: the divided "C" ---
(function () {
  const svg = document.getElementById('cArt');
  const stage = document.getElementById('themeStage');
  if (!svg || !stage) return;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const CX = 200, CY = 200, R_OUT = 188, R_IN = 104;
  const GAP = 3; // degrees of blank between sectors

  // Angles use the standard convention: 0 = right, 90 = top, counter-clockwise.
  // The C opens on the right (a 60 degree gap centred on 0 degrees).
  const THEMES = [
    { id: 'curiosity',  a0: 30,  a1: 180, color: '#1f9aa6', soft: '#e7f4f5' }, // 0 -> 180
    { id: 'creativity', a0: 180, a1: 270, color: '#d98a2b', soft: '#faf0df' }, // 180 -> 270
    { id: 'complexity', a0: 270, a1: 330, color: '#9b72cf', soft: '#f0eafa' }  // 270 -> 0
  ];

  const polar = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY - r * Math.sin(a)]; // minus: flip to screen y
  };

  function annulusPath(a0, a1) {
    const [ox0, oy0] = polar(R_OUT, a0);
    const [ox1, oy1] = polar(R_OUT, a1);
    const [ix1, iy1] = polar(R_IN, a1);
    const [ix0, iy0] = polar(R_IN, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    return [
      `M ${ox0} ${oy0}`,
      `A ${R_OUT} ${R_OUT} 0 ${large} 0 ${ox1} ${oy1}`,
      `L ${ix1} ${iy1}`,
      `A ${R_IN} ${R_IN} 0 ${large} 1 ${ix0} ${iy0}`,
      'Z'
    ].join(' ');
  }

  const softFor = {};
  const texts = Array.from(document.querySelectorAll('.theme-text'));

  function activate(id) {
    stage.classList.add('has-active');
    stage.style.background = softFor[id];
    svg.querySelectorAll('.c-seg').forEach(s => {
      const match = s.dataset.theme === id;
      s.classList.toggle('is-active', match);
      if (match) s.classList.add('is-revealed'); // stays coloured once explored
    });
    texts.forEach(t => t.classList.toggle('is-active', t.dataset.theme === id));
  }
  function clearActive() {
    stage.classList.remove('has-active');
    stage.style.background = '';
    svg.querySelectorAll('.c-seg').forEach(s => s.classList.remove('is-active'));
    texts.forEach(t => t.classList.remove('is-active'));
  }

  THEMES.forEach(t => {
    softFor[t.id] = t.soft;
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', annulusPath(t.a0 + GAP / 2, t.a1 - GAP / 2));
    p.setAttribute('fill', t.color);
    p.style.setProperty('--c-color', t.color);
    p.setAttribute('class', 'c-seg');
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', t.id.charAt(0).toUpperCase() + t.id.slice(1));
    p.dataset.theme = t.id;
    p.addEventListener('click', () => activate(t.id));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(t.id); }
    });
    svg.appendChild(p);
  });
})();

// --- "Where" card: layered globe / chimp / baby with halo + descriptions ---
(function () {
  const stage = document.getElementById('whereStage');
  if (!stage) return;
  const layers = stage.querySelectorAll('.where-layer');
  const texts = stage.querySelectorAll('.where-text');
  const hots = stage.querySelectorAll('.where-hot');

  function activate(id) {
    stage.classList.add('has-active');
    layers.forEach(l => {
      const match = l.classList.contains('where-' + id);
      l.classList.toggle('is-active', match);
      if (match) l.classList.add('is-revealed'); // stays coloured once explored
    });
    texts.forEach(t => t.classList.toggle('is-active', t.dataset.where === id));
  }
  // Click (buttons fire click on Enter/Space too) to reveal an element; it stays.
  hots.forEach(h => {
    h.addEventListener('click', () => activate(h.dataset.where));
  });
})();

// --- "How" tiles: click reveals colour + caption; moving away hides the caption
//     (the colour stays). ---
document.querySelectorAll('.how-tile').forEach(tile => {
  const show = () => { tile.classList.add('is-revealed'); tile.classList.add('is-active'); };
  const hideCaption = () => tile.classList.remove('is-active');
  tile.addEventListener('click', show);
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
  });
  tile.addEventListener('mouseleave', hideCaption);
  tile.addEventListener('blur', hideCaption);
});

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
  });
})();

// --- Clicking shouldn't "lock" hover-driven UIs ---
// Mouse focus is what makes a clicked element stay open while you hover another.
// Suppress mouse focus anywhere inside these hover-driven sections (links still
// navigate on click; keyboard Tab navigation is unaffected since it has no mousedown).
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.research-deck, .res-deck, .people-grid')) e.preventDefault();
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

// --- News carousel: scroll horizontally for older items ---
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

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft < 8;
    next.hidden = track.scrollLeft > max - 8;
  }
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
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
